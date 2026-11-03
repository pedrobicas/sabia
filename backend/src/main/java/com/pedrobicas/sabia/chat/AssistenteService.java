package com.pedrobicas.sabia.chat;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.busca.BuscaDeTrechos;
import com.pedrobicas.sabia.busca.TrechoEncontrado;
import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.demo.LimitadorDaDemonstracao;

import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

/**
 * O fluxo de RAG de ponta a ponta: busca os trechos da empresa, pergunta ao modelo e devolve
 * a resposta em streaming (Server-Sent Events).
 *
 * <p>Eventos enviados ao navegador, todos com dados em JSON:
 * <ul>
 * <li>{@code citacoes}: os trechos candidatos, numerados como no prompt;</li>
 * <li>{@code token}: um pedaço do texto da resposta;</li>
 * <li>{@code fim}: a mensagem salva, já com só as citações que a resposta usou;</li>
 * <li>{@code erro}: uma mensagem para mostrar ao usuário.</li>
 * </ul>
 *
 * <p>Se a pessoa fecha a página ou clica em "Parar", a geração é cancelada (para de consumir o
 * modelo) e o que já tinha sido escrito fica salvo no histórico, marcado como interrompido.
 */
@Service
public class AssistenteService {

    private static final Logger log = LoggerFactory.getLogger(AssistenteService.class);
    private static final long TEMPO_MAXIMO = Duration.ofMinutes(3).toMillis();

    private final ChatClient chatClient;
    private final BuscaDeTrechos busca;
    private final MontadorDePrompt montador;
    private final ConversaService conversas;
    private final LimitadorDePerguntas limitador;
    private final LimitadorDaDemonstracao limitadorDaDemonstracao;
    private final ObjectMapper json;

    public AssistenteService(ChatClient chatClient, BuscaDeTrechos busca, MontadorDePrompt montador,
            ConversaService conversas, LimitadorDePerguntas limitador, LimitadorDaDemonstracao limitadorDaDemonstracao,
            ObjectMapper json) {
        this.chatClient = chatClient;
        this.busca = busca;
        this.montador = montador;
        this.conversas = conversas;
        this.limitador = limitador;
        this.limitadorDaDemonstracao = limitadorDaDemonstracao;
        this.json = json;
    }

    public SseEmitter responder(UsuarioAtual usuario, UUID conversaId, String pergunta) {
        limitador.registrar(usuario.id());
        if (usuario.visitante()) {
            // Na demonstração pública, também há um teto somando todos os visitantes (a busca já chama a IA).
            limitadorDaDemonstracao.registrarPergunta();
        }
        List<Message> historico = conversas.historicoParaOModelo(usuario, conversaId);
        String consulta = ConsultaDeBusca.montar(pergunta, ultimaPerguntaDoUsuario(historico));
        List<TrechoEncontrado> trechos = buscar(usuario.empresaId(), consulta);
        conversas.registrarPergunta(usuario, conversaId, pergunta);

        Geracao geracao = new Geracao(conversaId, pergunta, montador.citacoes(trechos));

        // Nada relevante nos documentos: responde sem chamar o modelo (e sem custo).
        if (trechos.isEmpty()) {
            geracao.responderSemModelo(MontadorDePrompt.SEM_INFORMACAO);
            return geracao.emissor;
        }

        geracao.iniciar(chatClient.prompt()
                .system(MontadorDePrompt.SISTEMA)
                .messages(historico)
                .user(montador.montarPergunta(pergunta, trechos))
                .stream()
                .content());
        return geracao.emissor;
    }

    private List<TrechoEncontrado> buscar(UUID empresaId, String consulta) {
        try {
            return busca.buscar(empresaId, consulta);
        } catch (RuntimeException e) {
            // A busca precisa do modelo de embedding: se ele estiver fora do ar, avisamos com clareza.
            log.warn("Falha ao buscar trechos", e);
            throw ApiException.indisponivel("O serviço de IA não está respondendo agora. Tente de novo em instantes.");
        }
    }

    private static String ultimaPerguntaDoUsuario(List<Message> historico) {
        for (int i = historico.size() - 1; i >= 0; i--) {
            if (historico.get(i) instanceof UserMessage pergunta) {
                return pergunta.getText();
            }
        }
        return null;
    }

    /** Estado de uma resposta em andamento. Garante que ela termina uma única vez, de um único jeito. */
    private final class Geracao {

        private final SseEmitter emissor = new SseEmitter(TEMPO_MAXIMO);
        private final UUID conversaId;
        private final String pergunta;
        private final List<Citacao> candidatas;
        private final StringBuffer resposta = new StringBuffer();
        private final AtomicBoolean encerrada = new AtomicBoolean(false);
        private volatile Disposable assinatura;

        Geracao(UUID conversaId, String pergunta, List<Citacao> candidatas) {
            this.conversaId = conversaId;
            this.pergunta = pergunta;
            this.candidatas = candidatas;
        }

        void responderSemModelo(String texto) {
            encerrada.set(true);
            enviar("citacoes", List.of());
            enviar("token", texto);
            enviar("fim", conversas.registrarResposta(conversaId, pergunta, texto, List.of()));
            emissor.complete();
        }

        void iniciar(Flux<String> fluxo) {
            emissor.onTimeout(() -> interromper("tempo máximo atingido"));
            emissor.onError(erro -> interromper("conexão encerrada"));
            enviar("citacoes", candidatas);
            assinatura = fluxo
                    // Tira o processamento das threads de rede: salvar no banco é uma operação bloqueante.
                    .publishOn(Schedulers.boundedElastic())
                    .subscribe(this::aoReceber, this::aoFalhar, this::aoTerminar);
            if (encerrada.get()) {
                assinatura.dispose();
            }
        }

        private void aoReceber(String pedaco) {
            if (encerrada.get()) {
                return;
            }
            resposta.append(pedaco);
            if (!enviar("token", pedaco)) {
                interromper("cliente desconectou");
            }
        }

        private void aoFalhar(Throwable erro) {
            if (!encerrada.compareAndSet(false, true)) {
                return;
            }
            log.warn("Falha ao gerar resposta da conversa {}", conversaId, erro);
            enviar("erro", "O serviço de IA não respondeu. Tente de novo em instantes.");
            completar();
        }

        private void aoTerminar() {
            if (!encerrada.compareAndSet(false, true)) {
                return;
            }
            String texto = resposta.toString().strip();
            if (texto.isEmpty()) {
                texto = MontadorDePrompt.SEM_INFORMACAO;
            }
            enviar("fim", conversas.registrarResposta(conversaId, pergunta, texto, montador.citacoesUsadas(texto, candidatas)));
            completar();
        }

        /** Cancela a geração no modelo e guarda o que já tinha sido escrito. */
        private void interromper(String motivo) {
            if (!encerrada.compareAndSet(false, true)) {
                return;
            }
            Disposable atual = assinatura;
            if (atual != null) {
                atual.dispose();
            }
            String parcial = resposta.toString().strip();
            if (!parcial.isEmpty()) {
                conversas.registrarResposta(conversaId, pergunta, parcial + "\n\n" + MontadorDePrompt.RESPOSTA_INTERROMPIDA,
                        montador.citacoesUsadas(parcial, candidatas));
            }
            log.debug("Resposta da conversa {} interrompida: {}", conversaId, motivo);
            completar();
        }

        /** Envia um evento. Devolve false se o navegador já fechou a conexão. */
        private boolean enviar(String evento, Object dados) {
            try {
                // JSON preserva quebras de linha e espaços dos pedaços de texto.
                emissor.send(SseEmitter.event().name(evento).data(json.writeValueAsString(dados)));
                return true;
            } catch (JsonProcessingException e) {
                log.error("Não foi possível serializar o evento {}", evento, e);
                return true;
            } catch (IOException | IllegalStateException e) {
                return false;
            }
        }

        private void completar() {
            try {
                emissor.complete();
            } catch (IllegalStateException e) {
                // Já encerrado pelo próprio servidor (tempo esgotado ou conexão perdida).
            }
        }
    }
}
