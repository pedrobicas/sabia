package com.pedrobicas.sabia.documento.ingestao;

import java.util.UUID;

/** Publicado quando um documento entra na fila de processamento (upload ou reprocessamento). */
public record DocumentoEnviadoEvent(UUID documentoId) {
}
