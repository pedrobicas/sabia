package com.pedrobicas.sabia.busca;

import java.util.Map;
import java.util.UUID;

import org.springframework.ai.document.Document;

/**
 * Um trecho devolvido pela busca, já com os dados que a citação precisa.
 */
public record TrechoEncontrado(
        UUID empresaId,
        UUID documentoId,
        String documentoNome,
        Integer pagina,
        String texto,
        double similaridade) {

    static TrechoEncontrado de(Document documento) {
        Map<String, Object> metadata = documento.getMetadata();
        Double score = documento.getScore();
        return new TrechoEncontrado(
                uuid(metadata.get(MetadadosDoTrecho.EMPRESA)),
                uuid(metadata.get(MetadadosDoTrecho.DOCUMENTO)),
                String.valueOf(metadata.getOrDefault(MetadadosDoTrecho.NOME_DOCUMENTO, "Documento")),
                inteiro(metadata.get(MetadadosDoTrecho.PAGINA)),
                documento.getText(),
                score == null ? 0.0 : score);
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
