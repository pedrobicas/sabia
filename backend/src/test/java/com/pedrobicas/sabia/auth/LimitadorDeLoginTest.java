package com.pedrobicas.sabia.auth;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.pedrobicas.sabia.comum.ApiException;

class LimitadorDeLoginTest {

    private static final String EMAIL = "ana@exemplo.com";
    private static final String IP = "203.0.113.7";

    private final RelogioDeTeste relogio = new RelogioDeTeste(Instant.parse("2026-10-26T12:00:00Z"));
    private final LimitadorDeLogin limitador = new LimitadorDeLogin(3, 10, 15, relogio);

    @Test
    void bloqueiaOEmailDepoisDoLimiteEDizQuandoLibera() {
        errar(EMAIL, IP, 3);

        assertThatThrownBy(() -> limitador.verificar(EMAIL, IP))
                .isInstanceOf(ApiException.class)
                .hasMessage("Muitas tentativas com senha errada. Tente de novo em 15 minutos.");

        relogio.avancar(Duration.ofMinutes(14).plusSeconds(30));
        assertThatThrownBy(() -> limitador.verificar(EMAIL, IP)).hasMessageEndingWith("em 1 minuto.");
    }

    @Test
    void liberaQuandoAsFalhasSaemDaJanela() {
        errar(EMAIL, IP, 3);
        relogio.avancar(Duration.ofMinutes(15).plusSeconds(1));

        assertThatCode(() -> limitador.verificar(EMAIL, IP)).doesNotThrowAnyException();
    }

    @Test
    void acertarASenhaZeraAsFalhasDoEmail() {
        errar(EMAIL, IP, 2);
        limitador.registrarSucesso(EMAIL);
        errar(EMAIL, IP, 2);

        assertThatCode(() -> limitador.verificar(EMAIL, IP)).doesNotThrowAnyException();
    }

    @Test
    void muitasContasDiferentesDoMesmoIpTambemBloqueiam() {
        for (int conta = 0; conta < 10; conta++) {
            limitador.registrarFalha("conta" + conta + "@exemplo.com", IP);
        }

        assertThatThrownBy(() -> limitador.verificar("mais-uma@exemplo.com", IP)).isInstanceOf(ApiException.class);
        assertThatCode(() -> limitador.verificar("mais-uma@exemplo.com", "198.51.100.1")).doesNotThrowAnyException();
    }

    private void errar(String email, String ip, int vezes) {
        for (int i = 0; i < vezes; i++) {
            limitador.registrarFalha(email, ip);
            relogio.avancar(Duration.ofSeconds(1));
        }
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
