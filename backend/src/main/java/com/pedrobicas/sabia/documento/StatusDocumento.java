package com.pedrobicas.sabia.documento;

/**
 * Ciclo de vida: ENVIADO → PROCESSANDO → PRONTO (ou ERRO). Reprocessar volta para ENVIADO.
 */
public enum StatusDocumento {
    ENVIADO,
    PROCESSANDO,
    PRONTO,
    ERRO;

    public boolean naFila() {
        return this == ENVIADO || this == PROCESSANDO;
    }
}
