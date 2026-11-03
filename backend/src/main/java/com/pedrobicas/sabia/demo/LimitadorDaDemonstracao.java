package com.pedrobicas.sabia.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.config.PropriedadesSabia;

/**
 * Freios da demonstração pública, em janelas fixas de uma hora guardadas em memória.
 *
 * <p>O limite por usuário ({@code LimitadorDePerguntas}) não basta na demonstração, porque qualquer pessoa cria
 * quantos visitantes quiser. Por isso há dois limites a mais: quantas contas temporárias um IP cria por hora e
 * quantas perguntas, somando todos os visitantes, chegam ao modelo de IA por hora.
 */
@Component
public class LimitadorDaDemonstracao {

    private static final Duration JANELA = Duration.ofHours(1);
    private static final String TODOS = "*";

    private final int perguntasPorHora;
    private final int visitantesPorIpPorHora;
    private final Clock relogio;
    private final Map<String, Janela> perguntas = new ConcurrentHashMap<>();
    private final Map<String, Janela> visitantesPorIp = new ConcurrentHashMap<>();

    @Autowired
    public LimitadorDaDemonstracao(PropriedadesSabia propriedades, Clock relogio) {
        this(propriedades.demo().limitePerguntasPorHora(), propriedades.demo().visitantesPorIpPorHora(), relogio);
    }

    public LimitadorDaDemonstracao(int perguntasPorHora, int visitantesPorIpPorHora, Clock relogio) {
        this.perguntasPorHora = perguntasPorHora;
        this.visitantesPorIpPorHora = visitantesPorIpPorHora;
        this.relogio = relogio;
    }

    /** Conta mais uma pergunta de visitante que vai chegar ao modelo, ou recusa com 429. */
    public void registrarPergunta() {
        if (!contar(perguntas, TODOS, perguntasPorHora)) {
            throw ApiException.limiteExcedido("A demonstração atingiu o limite de perguntas desta hora. "
                    + "Tente de novo em " + minutosRestantes(perguntas, TODOS) + " minuto(s).");
        }
    }

    /** Conta mais uma conta temporária criada por este IP, ou recusa com 429. */
    public void registrarVisitante(String ip) {
        if (!contar(visitantesPorIp, ip, visitantesPorIpPorHora)) {
            throw ApiException.limiteExcedido("Muitas entradas na demonstração a partir desta rede. "
                    + "Tente de novo em " + minutosRestantes(visitantesPorIp, ip) + " minuto(s).");
        }
    }

    /** Esquece as janelas que já acabaram, para o mapa de IPs não crescer sem fim. */
    public void esquecerJanelasVencidas() {
        Instant agora = relogio.instant();
        perguntas.values().removeIf(janela -> !agora.isBefore(janela.inicio().plus(JANELA)));
        visitantesPorIp.values().removeIf(janela -> !agora.isBefore(janela.inicio().plus(JANELA)));
    }

    /** Devolve falso quando a contagem passou do limite. Limite zero ou negativo desliga o freio. */
    private boolean contar(Map<String, Janela> janelas, String chave, int limite) {
        if (limite <= 0) {
            return true;
        }
        Instant agora = relogio.instant();
        Janela janela = janelas.compute(chave, (k, atual) -> {
            if (atual == null || !agora.isBefore(atual.inicio().plus(JANELA))) {
                return new Janela(agora, 1);
            }
            return new Janela(atual.inicio(), atual.contagem() + 1);
        });
        return janela.contagem() <= limite;
    }

    private long minutosRestantes(Map<String, Janela> janelas, String chave) {
        Janela janela = janelas.get(chave);
        if (janela == null) {
            return 1;
        }
        return Math.max(1, Duration.between(relogio.instant(), janela.inicio().plus(JANELA)).toMinutes());
    }

    private record Janela(Instant inicio, int contagem) {
    }
}
