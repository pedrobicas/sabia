package com.pedrobicas.sabia.auth;

import java.time.Instant;

import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import com.pedrobicas.sabia.config.PropriedadesSabia;
import com.pedrobicas.sabia.usuario.Usuario;

/**
 * Gera os tokens JWT. A validação fica com o resource server do Spring Security (ver SegurancaConfig).
 */
@Service
public class TokenService {

    private final JwtEncoder encoder;
    private final PropriedadesSabia propriedades;

    public TokenService(JwtEncoder encoder, PropriedadesSabia propriedades) {
        this.encoder = encoder;
        this.propriedades = propriedades;
    }

    public String gerar(Usuario usuario) {
        Instant agora = Instant.now();
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer("sabia")
                .issuedAt(agora)
                .expiresAt(agora.plus(propriedades.jwt().validade()))
                .subject(usuario.getId().toString())
                .claim(UsuarioAtual.CLAIM_EMPRESA, usuario.getEmpresaId().toString())
                .claim(UsuarioAtual.CLAIM_PAPEL, usuario.getPapel().name())
                .claim(UsuarioAtual.CLAIM_NOME, usuario.getNome());
        if (usuario.isVisitante()) {
            claims.claim(UsuarioAtual.CLAIM_VISITANTE, true);
        }
        JwsHeader cabecalho = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(cabecalho, claims.build())).getTokenValue();
    }
}
