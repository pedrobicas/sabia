package com.pedrobicas.sabia.busca;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Busca por palavra-chave com o full-text search do PostgreSQL (dicionário em português).
 *
 * <p>A busca vetorial entende sinônimos e paráfrases, mas erra com códigos, números e nomes
 * próprios ("produto 4471", "Clube Aurora"). Aqui a pergunta vira uma consulta OU entre os
 * termos, e os trechos com mais termos em comum aparecem primeiro. Sempre filtrada por empresa.
 */
@Component
public class BuscaPorPalavras {

    private static final String SQL = """
            SELECT id::text AS id, content, metadata::text AS metadata,
                   ts_rank_cd(to_tsvector('portuguese', coalesce(content, '')), consulta, 32) AS relevancia
            FROM vector_store,
                 to_tsquery('simple', replace(plainto_tsquery('portuguese', ?)::text, ' & ', ' | ')) AS consulta
            WHERE metadata ->> 'empresaId' = ?
              AND to_tsvector('portuguese', coalesce(content, '')) @@ consulta
            ORDER BY relevancia DESC
            LIMIT ?
            """;

    private static final TypeReference<Map<String, Object>> MAPA = new TypeReference<>() {
    };

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public BuscaPorPalavras(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public List<TrechoEncontrado> buscar(UUID empresaId, String consulta, int limite) {
        if (consulta == null || consulta.isBlank()) {
            return List.of();
        }
        return jdbc.query(SQL, (linha, numero) -> TrechoEncontrado.de(
                linha.getString("id"),
                linha.getString("content"),
                metadata(linha.getString("metadata")),
                linha.getDouble("relevancia")), consulta, empresaId.toString(), limite);
    }

    private Map<String, Object> metadata(String texto) {
        try {
            return texto == null ? Map.of() : json.readValue(texto, MAPA);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
