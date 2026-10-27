package com.pedrobicas.sabia.busca;

/** Um trecho guardado no índice, como aparece para quem confere o documento. */
public record TrechoIndexado(int ordem, Integer pagina, String texto) {
}
