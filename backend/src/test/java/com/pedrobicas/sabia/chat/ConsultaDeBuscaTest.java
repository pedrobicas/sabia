package com.pedrobicas.sabia.chat;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConsultaDeBuscaTest {

    @Test
    void semPerguntaAnteriorUsaSoAPerguntaAtual() {
        assertThat(ConsultaDeBusca.montar("  E aos domingos? ", null)).isEqualTo("E aos domingos?");
    }

    @Test
    void perguntaCurtaDeContinuacaoLevaAPerguntaAnterior() {
        assertThat(ConsultaDeBusca.montar("E aos domingos?", "Que horas a loja abre?"))
                .isEqualTo("Que horas a loja abre? E aos domingos?");
    }

    @Test
    void perguntaLongaJaTemContextoSuficiente() {
        String pergunta = "Qual é a política de reembolso para compras feitas pelo aplicativo de entrega?";

        assertThat(ConsultaDeBusca.montar(pergunta, "Que horas a loja abre?")).isEqualTo(pergunta);
    }
}
