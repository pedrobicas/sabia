package com.pedrobicas.sabia.auth.dto;

import java.util.UUID;

import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.usuario.Papel;
import com.pedrobicas.sabia.usuario.Usuario;

public record UsuarioResponse(UUID id, String nome, String email, Papel papel, UUID empresaId, String empresaNome) {

    public static UsuarioResponse de(Usuario usuario, Empresa empresa) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPapel(),
                empresa.getId(),
                empresa.getNome());
    }
}
