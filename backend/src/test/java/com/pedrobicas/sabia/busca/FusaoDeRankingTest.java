package com.pedrobicas.sabia.busca;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class FusaoDeRankingTest {

    private final UUID empresa = UUID.randomUUID();

    @Test
    void trechoBemColocadoNasDuasBuscasFicaEmPrimeiro() {
        TrechoEncontrado a = trecho("a", 0.9);
        TrechoEncontrado b = trecho("b", 0.8);
        TrechoEncontrado c = trecho("c", 0.0);

        List<TrechoEncontrado> combinados = FusaoDeRanking.combinar(List.of(a, b), List.of(b, c), 3);

        assertThat(combinados).extracting(TrechoEncontrado::id).containsExactly("b", "a", "c");
    }

    @Test
    void trechoRepetidoApareceUmaVezSoComASimilaridadeDaBuscaVetorial() {
        TrechoEncontrado vetorial = trecho("x", 0.77);
        TrechoEncontrado porPalavra = trecho("x", 0.05);

        List<TrechoEncontrado> combinados = FusaoDeRanking.combinar(List.of(vetorial), List.of(porPalavra), 5);

        assertThat(combinados).singleElement().satisfies(t -> assertThat(t.similaridade()).isEqualTo(0.77));
    }

    @Test
    void respeitaOLimite() {
        List<TrechoEncontrado> combinados = FusaoDeRanking.combinar(
                List.of(trecho("1", 0.9), trecho("2", 0.8), trecho("3", 0.7)),
                List.of(trecho("4", 0.1), trecho("5", 0.1)), 2);

        assertThat(combinados).hasSize(2);
    }

    @Test
    void funcionaComUmaDasListasVazia() {
        assertThat(FusaoDeRanking.combinar(List.of(), List.of(trecho("k", 0.2)), 5))
                .extracting(TrechoEncontrado::id).containsExactly("k");
        assertThat(FusaoDeRanking.combinar(List.of(), List.of(), 5)).isEmpty();
    }

    private TrechoEncontrado trecho(String id, double similaridade) {
        return new TrechoEncontrado(id, empresa, UUID.randomUUID(), "doc.md", null, "texto " + id, similaridade);
    }
}
