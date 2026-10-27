package com.pedrobicas.sabia.documento;

import java.time.Instant;
import java.util.UUID;

public record DocumentoResponse(
        UUID id,
        String nome,
        TipoDocumento tipo,
        long tamanhoBytes,
        StatusDocumento status,
        String erro,
        int totalTrechos,
        int versao,
        Instant criadoEm,
        Instant atualizadoEm) {

    public static DocumentoResponse de(Documento documento) {
        return new DocumentoResponse(
                documento.getId(),
                documento.getNome(),
                documento.getTipo(),
                documento.getTamanhoBytes(),
                documento.getStatus(),
                documento.getErro(),
                documento.getTotalTrechos(),
                documento.getVersao(),
                documento.getCriadoEm(),
                documento.getAtualizadoEm());
    }
}
