package com.pedrobicas.sabia.chat;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ConsultaDeBuscaTest {

    private static final String ANTERIOR = "Que horas a loja abre?";

    @Test
    void semPerguntaAnteriorUsaSoAPerguntaAtual() {
        assertThat(ConsultaDeBusca.montar("  E aos domingos? ", null)).isEqualTo("E aos domingos?");
    }

    @Test
    void perguntaQueComecaComConectorLevaAPerguntaAnterior() {
        assertThat(ConsultaDeBusca.montar("E aos domingos?", ANTERIOR)).isEqualTo("Que horas a loja abre? E aos domingos?");
    }

    @Test
    void perguntaQueApontaParaAlgoJaDitoLevaAPerguntaAnterior() {
        assertThat(ConsultaDeBusca.pareceContinuacao("Isso vale para os feriados também?")).isTrue();
        assertThat(ConsultaDeBusca.pareceContinuacao("Quem é o responsável por ela?")).isTrue();
    }

    @Test
    void perguntaMuitoCurtaLevaAPerguntaAnterior() {
        assertThat(ConsultaDeBusca.pareceContinuacao("Precisa de nota?")).isTrue();
    }

    @Test
    void perguntaCurtaECompletaNaoMisturaAssuntos() {
        assertThat(ConsultaDeBusca.montar("Qual é a senha do wifi?", ANTERIOR)).isEqualTo("Qual é a senha do wifi?");
    }

    @Test
    void perguntaLongaJaTemContextoSuficiente() {
        String pergunta = "E qual é a política de reembolso para compras feitas pelo aplicativo de entrega?";

        assertThat(ConsultaDeBusca.montar(pergunta, ANTERIOR)).isEqualTo(pergunta);
    }
}
