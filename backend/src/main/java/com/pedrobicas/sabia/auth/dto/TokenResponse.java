package com.pedrobicas.sabia.auth.dto;

public record TokenResponse(String token, UsuarioResponse usuario) {
}
