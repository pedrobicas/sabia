package com.pedrobicas.sabia.busca;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.documento.Documento;
import com.pedrobicas.sabia.documento.ingestao.Trecho;

/**
 * Escreve e apaga trechos no índice vetorial (tabela vector_store, via PgVectorStore do Spring AI).
 */
@Component
public class IndiceDeTrechos {

    private static final int TAMANHO_DO_LOTE = 32;

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbc;

    public IndiceDeTrechos(VectorStore vectorStore, JdbcTemplate jdbc) {
        this.vectorStore = vectorStore;
        this.jdbc = jdbc;
    }

    /** Remove os trechos antigos do documento e indexa os novos. O Spring AI gera os embeddings. */
    public void substituirTrechos(Documento documento, List<Trecho> trechos) {
        removerTrechosDoDocumento(documento.getId());
        List<Document> paraIndexar = trechos.stream().map(trecho -> paraDocument(documento, trecho)).toList();
        for (int i = 0; i < paraIndexar.size(); i += TAMANHO_DO_LOTE) {
            vectorStore.add(new ArrayList<>(paraIndexar.subList(i, Math.min(i + TAMANHO_DO_LOTE, paraIndexar.size()))));
        }
    }

    public void removerTrechosDoDocumento(UUID documentoId) {
        jdbc.update("DELETE FROM vector_store WHERE metadata ->> '" + MetadadosDoTrecho.DOCUMENTO + "' = ?",
                documentoId.toString());
    }

    static Document paraDocument(Documento documento, Trecho trecho) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put(MetadadosDoTrecho.EMPRESA, documento.getEmpresaId().toString());
        metadata.put(MetadadosDoTrecho.DOCUMENTO, documento.getId().toString());
        metadata.put(MetadadosDoTrecho.NOME_DOCUMENTO, documento.getNome());
        metadata.put(MetadadosDoTrecho.ORDEM, trecho.ordem());
        // O Spring AI não aceita valores nulos na metadata: a página só entra quando existe.
        if (trecho.pagina() != null) {
            metadata.put(MetadadosDoTrecho.PAGINA, trecho.pagina());
        }
        return new Document(UUID.randomUUID().toString(), trecho.texto(), metadata);
    }
}
