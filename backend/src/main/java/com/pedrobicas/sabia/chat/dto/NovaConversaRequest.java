package com.pedrobicas.sabia.chat.dto;

import jakarta.validation.constraints.Size;

public record NovaConversaRequest(@Size(max = 200) String titulo) {
}
