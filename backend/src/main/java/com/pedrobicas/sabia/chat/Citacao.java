package com.pedrobicas.sabia.chat;

import java.util.UUID;

/**
 * Fonte de uma resposta. {@code numero} é o [n] que aparece no texto da resposta.
 */
public record Citacao(
        int numero,
        UUID documentoId,
        String documentoNome,
        Integer pagina,
        String trecho,
        double similaridade) {
}
