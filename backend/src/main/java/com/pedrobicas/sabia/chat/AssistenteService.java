package com.pedrobicas.sabia.chat;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.busca.BuscaDeTrechos;
import com.pedrobicas.sabia.busca.TrechoEncontrado;
import com.pedrobicas.sabia.chat.dto.MensagemResponse;

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
    private final ObjectMapper json;

    public AssistenteService(ChatClient chatClient, BuscaDeTrechos busca, MontadorDePrompt montador,
            ConversaService conversas, LimitadorDePerguntas limitador, ObjectMapper json) {
        this.chatClient = chatClient;
        this.busca = busca;
        this.montador = montador;
        this.conversas = conversas;
        this.limitador = limitador;
        this.json = json;
    }

    public SseEmitter responder(UsuarioAtual usuario, UUID conversaId, String pergunta) {
        limitador.registrar(usuario.id());
        List<Message> historico = conversas.historicoParaOModelo(usuario, conversaId);
        conversas.registrarPergunta(usuario, conversaId, pergunta);

        List<TrechoEncontrado> trechos = busca.buscar(usuario.empresaId(), pergunta);
        SseEmitter emissor = new SseEmitter(TEMPO_MAXIMO);

        // Nada relevante nos documentos: responde sem chamar o modelo (e sem custo).
        if (trechos.isEmpty()) {
            enviar(emissor, "citacoes", List.of());
            enviar(emissor, "token", MontadorDePrompt.SEM_INFORMACAO);
            enviar(emissor, "fim", conversas.registrarResposta(conversaId, MontadorDePrompt.SEM_INFORMACAO, List.of()));
            emissor.complete();
            return emissor;
        }

        List<Citacao> candidatas = montador.citacoes(trechos);
        enviar(emissor, "citacoes", candidatas);

        StringBuilder resposta = new StringBuilder();
        chatClient.prompt()
                .system(MontadorDePrompt.SISTEMA)
                .messages(historico)
                .user(montador.montarPergunta(pergunta, trechos))
                .stream()
                .content()
                // Tira o processamento das threads de rede: salvar no banco é uma operação bloqueante.
                .publishOn(Schedulers.boundedElastic())
                .subscribe(
                        pedaco -> {
                            resposta.append(pedaco);
                            enviar(emissor, "token", pedaco);
                        },
                        erro -> {
                            log.warn("Falha ao gerar resposta da conversa {}", conversaId, erro);
                            enviar(emissor, "erro", "O serviço de IA não respondeu. Tente de novo em instantes.");
                            emissor.complete();
                        },
                        () -> {
                            String texto = resposta.toString().strip();
                            if (texto.isEmpty()) {
                                texto = MontadorDePrompt.SEM_INFORMACAO;
                            }
                            MensagemResponse salva = conversas.registrarResposta(
                                    conversaId, texto, montador.citacoesUsadas(texto, candidatas));
                            enviar(emissor, "fim", salva);
                            emissor.complete();
                        });
        return emissor;
    }

    private void enviar(SseEmitter emissor, String evento, Object dados) {
        try {
            // JSON preserva quebras de linha e espaços dos pedaços de texto.
            emissor.send(SseEmitter.event().name(evento).data(json.writeValueAsString(dados)));
        } catch (JsonProcessingException e) {
            log.error("Não foi possível serializar o evento {}", evento, e);
        } catch (IOException | IllegalStateException e) {
            // O navegador fechou a conexão. A resposta continua sendo gerada e salva no histórico.
            log.debug("Cliente desconectou durante o streaming: {}", e.getMessage());
        }
    }
}
