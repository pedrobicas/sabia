package com.pedrobicas.sabia.chat.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AvaliacaoRequest(
        @NotNull Boolean util,
        @Size(max = 500, message = "pode ter no máximo 500 caracteres") String comentario) {
}
