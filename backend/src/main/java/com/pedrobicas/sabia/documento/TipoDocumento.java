package com.pedrobicas.sabia.documento;

import java.util.Locale;
import java.util.Optional;

public enum TipoDocumento {
    PDF("application/pdf"),
    DOCX("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    TXT("text/plain; charset=utf-8"),
    MARKDOWN("text/markdown; charset=utf-8");

    private final String mediaType;

    TipoDocumento(String mediaType) {
        this.mediaType = mediaType;
    }

    public String mediaType() {
        return mediaType;
    }

    /** Descobre o tipo pela extensão do arquivo. */
    public static Optional<TipoDocumento> doNomeDoArquivo(String nome) {
        String minusculo = nome.toLowerCase(Locale.ROOT);
        if (minusculo.endsWith(".pdf")) {
            return Optional.of(PDF);
        }
        if (minusculo.endsWith(".docx")) {
            return Optional.of(DOCX);
        }
        if (minusculo.endsWith(".txt")) {
            return Optional.of(TXT);
        }
        if (minusculo.endsWith(".md") || minusculo.endsWith(".markdown")) {
            return Optional.of(MARKDOWN);
        }
        return Optional.empty();
    }
}
