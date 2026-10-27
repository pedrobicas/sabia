package com.pedrobicas.sabia.busca;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;

import com.pedrobicas.sabia.config.PropriedadesSabia;

class BuscaDeTrechosTest {

    private final UUID empresa = UUID.randomUUID();
    private final VectorStore vectorStore = mock(VectorStore.class);
    private final BuscaPorPalavras buscaPorPalavras = mock(BuscaPorPalavras.class);
    private final BuscaDeTrechos busca = new BuscaDeTrechos(vectorStore, buscaPorPalavras, new PropriedadesSabia(
            new PropriedadesSabia.Token("x".repeat(32), Duration.ofHours(1)), true, 0,
            new PropriedadesSabia.Rag(3, 0.4, 1200, 200), null, null));

    @Test
    void semResultadoVetorialRespondeVazioSemConsultarPalavras() {
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());

        assertThat(busca.buscar(empresa, "Qual é o salário de um barista?")).isEmpty();
        verify(buscaPorPalavras, never()).buscar(any(), anyString(), anyInt());
    }

    @Test
    void perguntaComCodigoUsaABuscaPorPalavrasMesmoSemResultadoVetorial() {
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of());
        when(buscaPorPalavras.buscar(eq(empresa), anyString(), anyInt()))
                .thenReturn(List.of(trecho("k1", empresa, "Código do produto: SKU-4471")));

        assertThat(busca.buscar(empresa, "Qual é o preço do produto 4471?"))
                .extracting(TrechoEncontrado::id).containsExactly("k1");
    }

    @Test
    void combinaAsDuasBuscasENuncaDevolveTrechoDeOutraEmpresa() {
        Document vetorial = new Document("v1", "Trocas em até 7 dias.",
                Map.of(MetadadosDoTrecho.EMPRESA, empresa.toString(), MetadadosDoTrecho.DOCUMENTO, UUID.randomUUID().toString()));
        when(vectorStore.similaritySearch(any(SearchRequest.class))).thenReturn(List.of(vetorial));
        when(buscaPorPalavras.buscar(eq(empresa), anyString(), anyInt())).thenReturn(List.of(
                trecho("k1", empresa, "Política de trocas"),
                trecho("intruso", UUID.randomUUID(), "Trecho de outra empresa")));

        List<TrechoEncontrado> encontrados = busca.buscar(empresa, "trocas");

        assertThat(encontrados).extracting(TrechoEncontrado::id).containsExactlyInAnyOrder("v1", "k1");
    }

    @Test
    void reconheceTermosExatos() {
        assertThat(BuscaDeTrechos.temTermoExato("produto 4471")).isTrue();
        assertThat(BuscaDeTrechos.temTermoExato("o que diz \"Clube Aurora\"?")).isTrue();
        assertThat(BuscaDeTrechos.temTermoExato("quantos dias de férias eu tenho")).isFalse();
    }

    private static TrechoEncontrado trecho(String id, UUID empresa, String texto) {
        return new TrechoEncontrado(id, empresa, UUID.randomUUID(), "doc.md", null, texto, 0.0);
    }
}
