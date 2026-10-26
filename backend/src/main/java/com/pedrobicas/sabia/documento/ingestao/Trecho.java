package com.pedrobicas.sabia.documento.ingestao;

/**
 * Pedaço de texto que vira um vetor no índice. Nunca atravessa duas páginas, para a citação apontar a página certa.
 */
public record Trecho(Integer pagina, int ordem, String texto) {
}
