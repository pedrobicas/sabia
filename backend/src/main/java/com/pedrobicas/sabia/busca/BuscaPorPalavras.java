package com.pedrobicas.sabia.busca;

import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

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
 *
 * <p>Hífens viram espaços dos dois lados: sem isso o PostgreSQL lê "SKU-4471" como "sku" e
 * "-4471" (número negativo), e quem pergunta por "4471" não encontra o trecho.
 *
 * <p>Palavras típicas de pergunta ("é", "você", "posso", "quanto") passam pelo dicionário de
 * palavras vazias do PostgreSQL. Numa consulta OU, elas trariam qualquer trecho com "é",
 * então saem antes da busca.
 */
@Component
public class BuscaPorPalavras {

    private static final String SQL = """
            SELECT id::text AS id, content, metadata::text AS metadata,
                   ts_rank_cd(to_tsvector('portuguese', translate(coalesce(content, ''), '-', ' ')), consulta, 32) AS relevancia
            FROM vector_store,
                 to_tsquery('simple', replace(plainto_tsquery('portuguese', translate(?, '-', ' '))::text, ' & ', ' | ')) AS consulta
            WHERE metadata ->> 'empresaId' = ?
              AND to_tsvector('portuguese', translate(coalesce(content, ''), '-', ' ')) @@ consulta
            ORDER BY relevancia DESC
            LIMIT ?
            """;

    private static final Set<String> PALAVRAS_DE_PERGUNTA = Set.of(
            "é", "eh", "pra", "pro", "pras", "pros", "ser", "ter", "tem", "têm", "há", "existe", "existem",
            "você", "vocês", "voce", "voces", "vc", "vcs", "posso", "pode", "podem", "podemos", "consigo",
            "onde", "qual", "quais", "quanto", "quanta", "quantos", "quantas", "como", "quando", "sobre",
            "gostaria", "queria", "quero", "preciso", "saber", "favor", "olá", "ola", "oi", "obrigado", "obrigada");

    private static final TypeReference<Map<String, Object>> MAPA = new TypeReference<>() {
    };

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public BuscaPorPalavras(JdbcTemplate jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    public List<TrechoEncontrado> buscar(UUID empresaId, String consulta, int limite) {
        String termos = semPalavrasDePergunta(consulta);
        if (termos.isBlank()) {
            return List.of();
        }
        return jdbc.query(SQL, (linha, numero) -> TrechoEncontrado.de(
                linha.getString("id"),
                linha.getString("content"),
                metadata(linha.getString("metadata")),
                linha.getDouble("relevancia")), termos, empresaId.toString(), limite);
    }

    /** Tira da consulta as palavras que só dizem que é uma pergunta. Pontuação vira espaço. */
    static String semPalavrasDePergunta(String consulta) {
        if (consulta == null) {
            return "";
        }
        return Arrays.stream(consulta.split("[^\\p{L}\\p{N}-]+"))
                .filter(palavra -> !palavra.isBlank())
                .filter(palavra -> !PALAVRAS_DE_PERGUNTA.contains(palavra.toLowerCase(Locale.ROOT)))
                .collect(Collectors.joining(" "));
    }

    private Map<String, Object> metadata(String texto) {
        try {
            return texto == null ? Map.of() : json.readValue(texto, MAPA);
        } catch (JsonProcessingException e) {
            return Map.of();
        }
    }
}
