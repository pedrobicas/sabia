package com.pedrobicas.sabia.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenomearConversaRequest(@NotBlank @Size(max = 200) String titulo) {
}
