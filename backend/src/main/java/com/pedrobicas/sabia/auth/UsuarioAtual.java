package com.pedrobicas.sabia.auth;

import java.util.UUID;

import org.springframework.security.oauth2.jwt.Jwt;

import com.pedrobicas.sabia.usuario.Papel;

/**
 * Quem está fazendo a requisição, lido do token JWT.
 *
 * <p>Regra de segurança central do projeto: o {@code empresaId} usado em qualquer consulta vem
 * sempre daqui, nunca do corpo da requisição ou da URL.
 */
public record UsuarioAtual(UUID id, UUID empresaId, Papel papel, String nome) {

    public static final String CLAIM_EMPRESA = "empresaId";
    public static final String CLAIM_PAPEL = "papel";
    public static final String CLAIM_NOME = "nome";

    public static UsuarioAtual de(Jwt jwt) {
        return new UsuarioAtual(
                UUID.fromString(jwt.getSubject()),
                UUID.fromString(jwt.getClaimAsString(CLAIM_EMPRESA)),
                Papel.valueOf(jwt.getClaimAsString(CLAIM_PAPEL)),
                jwt.getClaimAsString(CLAIM_NOME));
    }

    public boolean admin() {
        return papel == Papel.ADMIN;
    }
}
