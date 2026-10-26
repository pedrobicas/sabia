package com.pedrobicas.sabia.documento.ingestao;

/**
 * Texto extraído de um documento. {@code numero} é a página no PDF, ou null para formatos sem página.
 */
public record Pagina(Integer numero, String texto) {
}
