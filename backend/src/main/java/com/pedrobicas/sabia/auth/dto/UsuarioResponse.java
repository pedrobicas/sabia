package com.pedrobicas.sabia.auth.dto;

import java.util.UUID;

import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.usuario.Papel;
import com.pedrobicas.sabia.usuario.Usuario;

/** {@code visitante} é verdadeiro para quem entrou pela demonstração pública (conta temporária, sem senha). */
public record UsuarioResponse(UUID id, String nome, String email, Papel papel, UUID empresaId, String empresaNome,
        boolean visitante) {

    public static UsuarioResponse de(Usuario usuario, Empresa empresa) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPapel(),
                empresa.getId(),
                empresa.getNome(),
                usuario.isVisitante());
    }
}
