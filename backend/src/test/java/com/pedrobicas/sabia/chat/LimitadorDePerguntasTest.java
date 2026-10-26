package com.pedrobicas.sabia.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.pedrobicas.sabia.comum.ApiException;

class LimitadorDePerguntasTest {

    private final RelogioDeTeste relogio = new RelogioDeTeste(Instant.parse("2026-10-26T12:00:00Z"));
    private final LimitadorDePerguntas limitador = new LimitadorDePerguntas(3, relogio);
    private final UUID usuario = UUID.randomUUID();

    @Test
    void permiteAteOLimiteEDepoisRecusaCom429() {
        for (int i = 0; i < 3; i++) {
            limitador.registrar(usuario);
        }

        assertThatThrownBy(() -> limitador.registrar(usuario))
                .isInstanceOf(ApiException.class)
                .satisfies(erro -> assertThat(((ApiException) erro).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS))
                .hasMessageContaining("3 perguntas por hora")
                .hasMessageContaining("60 minuto(s)");
    }

    @Test
    void liberaDeNovoDepoisDeUmaHora() {
        for (int i = 0; i < 3; i++) {
            limitador.registrar(usuario);
        }
        relogio.avancar(Duration.ofMinutes(61));

        assertThatCode(() -> limitador.registrar(usuario)).doesNotThrowAnyException();
    }

    @Test
    void cadaUsuarioTemSuaPropriaContagem() {
        for (int i = 0; i < 3; i++) {
            limitador.registrar(usuario);
        }

        assertThatCode(() -> limitador.registrar(UUID.randomUUID())).doesNotThrowAnyException();
    }

    @Test
    void limiteZeroDesligaALimitacao() {
        LimitadorDePerguntas semLimite = new LimitadorDePerguntas(0, relogio);

        assertThatCode(() -> {
            for (int i = 0; i < 1000; i++) {
                semLimite.registrar(usuario);
            }
        }).doesNotThrowAnyException();
    }

    private static final class RelogioDeTeste extends Clock {

        private Instant agora;

        RelogioDeTeste(Instant agora) {
            this.agora = agora;
        }

        void avancar(Duration duracao) {
            agora = agora.plus(duracao);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zona) {
            return this;
        }

        @Override
        public Instant instant() {
            return agora;
        }
    }
}
