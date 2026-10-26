package com.pedrobicas.sabia.usuario.dto;

import com.pedrobicas.sabia.usuario.Papel;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NovoMembroRequest(
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 8, max = 72, message = "precisa ter entre 8 e 72 caracteres") String senha,
        @NotNull Papel papel) {
}
