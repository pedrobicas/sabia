package com.pedrobicas.sabia.busca;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BuscaPorPalavrasTest {

    @Test
    void tiraPalavrasDePerguntaEPontuacao() {
        assertThat(BuscaPorPalavras.semPalavrasDePergunta("Qual é o horário? Vocês abrem no domingo?"))
                .isEqualTo("o horário abrem no domingo");
    }

    @Test
    void mantemCodigosComHifenENumeros() {
        assertThat(BuscaPorPalavras.semPalavrasDePergunta("Quanto custa o SKU-4471?")).isEqualTo("custa o SKU-4471");
    }

    @Test
    void perguntaSoComPalavrasDePerguntaFicaVazia() {
        assertThat(BuscaPorPalavras.semPalavrasDePergunta("Onde? Como? Quando?")).isEmpty();
        assertThat(BuscaPorPalavras.semPalavrasDePergunta(null)).isEmpty();
    }
}
