package com.pedrobicas.sabia.usuario.dto;

import java.time.Instant;
import java.util.UUID;

import com.pedrobicas.sabia.usuario.Papel;
import com.pedrobicas.sabia.usuario.Usuario;

public record MembroResponse(UUID id, String nome, String email, Papel papel, Instant criadoEm) {

    public static MembroResponse de(Usuario usuario) {
        return new MembroResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPapel(),
                usuario.getCriadoEm());
    }
}
