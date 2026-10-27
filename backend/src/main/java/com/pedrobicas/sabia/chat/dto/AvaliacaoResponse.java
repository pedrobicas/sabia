package com.pedrobicas.sabia.chat.dto;

import com.pedrobicas.sabia.chat.Avaliacao;

public record AvaliacaoResponse(boolean util, String comentario) {

    public static AvaliacaoResponse de(Avaliacao avaliacao) {
        return avaliacao == null ? null : new AvaliacaoResponse(avaliacao.isUtil(), avaliacao.getComentario());
    }
}
