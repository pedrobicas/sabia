package com.pedrobicas.sabia.busca;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import com.pedrobicas.sabia.config.PropriedadesSabia;

/**
 * Único ponto do sistema que consulta o índice vetorial.
 *
 * <p>Toda busca recebe o empresaId e aplica o filtro por empresa. Ninguém mais chama o VectorStore
 * para buscar, então não existe caminho que esqueça o filtro. Como segunda trava, o resultado é
 * conferido de novo antes de sair daqui.
 */
@Service
public class BuscaDeTrechos {

    private final VectorStore vectorStore;
    private final PropriedadesSabia.Rag rag;

    public BuscaDeTrechos(VectorStore vectorStore, PropriedadesSabia propriedades) {
        this.vectorStore = vectorStore;
        this.rag = propriedades.rag();
    }

    public List<TrechoEncontrado> buscar(UUID empresaId, String pergunta) {
        Filter.Expression somenteDaEmpresa = new FilterExpressionBuilder()
                .eq(MetadadosDoTrecho.EMPRESA, empresaId.toString())
                .build();
        SearchRequest pedido = SearchRequest.builder()
                .query(pergunta)
                .topK(rag.trechosPorBusca())
                .similarityThreshold(rag.similaridadeMinima())
                .filterExpression(somenteDaEmpresa)
                .build();
        List<Document> encontrados = Optional.ofNullable(vectorStore.similaritySearch(pedido)).orElse(List.of());
        return encontrados.stream()
                .map(TrechoEncontrado::de)
                .filter(trecho -> empresaId.equals(trecho.empresaId()))
                .toList();
    }
}
