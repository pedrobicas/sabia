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
public record UsuarioAtual(UUID id, UUID empresaId, Papel papel, String nome, boolean visitante) {

    public static final String CLAIM_EMPRESA = "empresaId";
    public static final String CLAIM_PAPEL = "papel";
    public static final String CLAIM_NOME = "nome";
    /** Presente (e verdadeiro) só nos tokens dos visitantes da demonstração pública. */
    public static final String CLAIM_VISITANTE = "visitante";

    public static UsuarioAtual de(Jwt jwt) {
        return new UsuarioAtual(
                UUID.fromString(jwt.getSubject()),
                UUID.fromString(jwt.getClaimAsString(CLAIM_EMPRESA)),
                Papel.valueOf(jwt.getClaimAsString(CLAIM_PAPEL)),
                jwt.getClaimAsString(CLAIM_NOME),
                Boolean.TRUE.equals(jwt.getClaimAsBoolean(CLAIM_VISITANTE)));
    }

    public boolean admin() {
        return papel == Papel.ADMIN;
    }
}
