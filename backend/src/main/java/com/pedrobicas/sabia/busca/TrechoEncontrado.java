package com.pedrobicas.sabia.busca;

import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;

/**
 * Um trecho devolvido pela busca, já com os dados que a citação precisa.
 */
public record TrechoEncontrado(
        String id,
        UUID empresaId,
        UUID documentoId,
        String documentoNome,
        Integer pagina,
        String texto,
        double similaridade) {

    static TrechoEncontrado de(Document documento) {
        Double score = documento.getScore();
        return de(documento.getId(), documento.getText(), documento.getMetadata(), score == null ? 0.0 : score);
    }

    static TrechoEncontrado de(String id, String texto, Map<String, Object> metadata, double similaridade) {
        return new TrechoEncontrado(
                id,
                uuid(metadata.get(MetadadosDoTrecho.EMPRESA)),
                uuid(metadata.get(MetadadosDoTrecho.DOCUMENTO)),
                String.valueOf(metadata.getOrDefault(MetadadosDoTrecho.NOME_DOCUMENTO, "Documento")),
                inteiro(metadata.get(MetadadosDoTrecho.PAGINA)),
                texto,
                similaridade);
    }

    private static UUID uuid(Object valor) {
        if (valor == null) {
            return null;
        }
        try {
            return UUID.fromString(valor.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Integer inteiro(Object valor) {
        if (valor instanceof Number numero) {
            return numero.intValue();
        }
        if (valor != null) {
            try {
                return Integer.valueOf(valor.toString());
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}
