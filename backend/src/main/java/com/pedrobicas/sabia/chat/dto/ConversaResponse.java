package com.pedrobicas.sabia.chat.dto;

import java.time.Instant;
import java.util.UUID;

import com.pedrobicas.sabia.chat.Conversa;

public record ConversaResponse(UUID id, String titulo, Instant criadoEm, Instant atualizadoEm) {

    public static ConversaResponse de(Conversa conversa) {
        return new ConversaResponse(conversa.getId(), conversa.getTitulo(), conversa.getCriadoEm(),
                conversa.getAtualizadoEm());
    }
}
