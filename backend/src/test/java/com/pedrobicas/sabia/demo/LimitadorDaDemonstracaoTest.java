package com.pedrobicas.sabia.demo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.pedrobicas.sabia.comum.ApiException;

class LimitadorDaDemonstracaoTest {

    private final RelogioDeTeste relogio = new RelogioDeTeste(Instant.parse("2026-11-03T12:00:00Z"));
    private final LimitadorDaDemonstracao limitador = new LimitadorDaDemonstracao(3, 2, relogio);

    @Test
    void perguntasSomamTodosOsVisitantesERecusamCom429() {
        for (int i = 0; i < 3; i++) {
            limitador.registrarPergunta();
        }

        assertThatThrownBy(limitador::registrarPergunta)
                .isInstanceOf(ApiException.class)
                .satisfies(erro -> assertThat(((ApiException) erro).getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS))
                .hasMessageContaining("limite de perguntas desta hora")
                .hasMessageContaining("60 minuto(s)");
    }

    @Test
    void perguntasLiberamDeNovoDepoisDeUmaHora() {
        for (int i = 0; i < 3; i++) {
            limitador.registrarPergunta();
        }
        relogio.avancar(Duration.ofMinutes(61));

        assertThatCode(limitador::registrarPergunta).doesNotThrowAnyException();
    }

    @Test
    void cadaIpCriaPoucosVisitantesPorHora() {
        limitador.registrarVisitante("10.0.0.1");
        limitador.registrarVisitante("10.0.0.1");

        assertThatThrownBy(() -> limitador.registrarVisitante("10.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("a partir desta rede");
        assertThatCode(() -> limitador.registrarVisitante("10.0.0.2")).doesNotThrowAnyException();
    }

    @Test
    void esquecerJanelasVencidasZeraAsContagensAntigas() {
        limitador.registrarVisitante("10.0.0.1");
        limitador.registrarVisitante("10.0.0.1");
        relogio.avancar(Duration.ofMinutes(61));

        limitador.esquecerJanelasVencidas();

        assertThatCode(() -> {
            limitador.registrarVisitante("10.0.0.1");
            limitador.registrarVisitante("10.0.0.1");
        }).doesNotThrowAnyException();
    }

    @Test
    void limiteZeroDesligaOsFreios() {
        LimitadorDaDemonstracao semLimite = new LimitadorDaDemonstracao(0, 0, relogio);

        assertThatCode(() -> {
            for (int i = 0; i < 1000; i++) {
                semLimite.registrarPergunta();
                semLimite.registrarVisitante("10.0.0.1");
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
