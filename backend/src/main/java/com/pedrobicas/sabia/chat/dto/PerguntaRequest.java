package com.pedrobicas.sabia.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PerguntaRequest(@NotBlank @Size(max = 2000, message = "pode ter no máximo 2000 caracteres") String pergunta) {
}
