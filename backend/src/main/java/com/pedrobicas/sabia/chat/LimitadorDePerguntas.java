package com.pedrobicas.sabia.chat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.config.PropriedadesSabia;

/**
 * Limite simples de perguntas por usuário a cada hora (janela fixa, em memória).
 *
 * <p>Existe para a demo pública não gerar uma conta alta no provedor de IA. Com mais de uma
 * instância da aplicação, o próximo passo seria guardar as contagens no Redis.
 */
@Component
public class LimitadorDePerguntas {

    private static final Duration JANELA = Duration.ofHours(1);

    private final int limitePorHora;
    private final Clock relogio;
    private final Map<UUID, Janela> janelas = new ConcurrentHashMap<>();

    @Autowired
    public LimitadorDePerguntas(PropriedadesSabia propriedades, Clock relogio) {
        this(propriedades.limitePerguntasPorHora(), relogio);
    }

    public LimitadorDePerguntas(int limitePorHora, Clock relogio) {
        this.limitePorHora = limitePorHora;
        this.relogio = relogio;
    }

    /** Conta mais uma pergunta do usuário ou recusa com 429 se ele passou do limite. Zero desliga o limite. */
    public void registrar(UUID usuarioId) {
        if (limitePorHora <= 0) {
            return;
        }
        Instant agora = relogio.instant();
        Janela janela = janelas.compute(usuarioId, (id, atual) -> {
            if (atual == null || !agora.isBefore(atual.inicio().plus(JANELA))) {
                return new Janela(agora, 1);
            }
            return new Janela(atual.inicio(), atual.contagem() + 1);
        });
        if (janela.contagem() > limitePorHora) {
            long minutos = Math.max(1, Duration.between(agora, janela.inicio().plus(JANELA)).toMinutes());
            throw ApiException.limiteExcedido("Você chegou ao limite de " + limitePorHora
                    + " perguntas por hora. Tente de novo em " + minutos + " minuto(s).");
        }
    }

    private record Janela(Instant inicio, int contagem) {
    }
}
