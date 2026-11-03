package com.pedrobicas.sabia.demo;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pedrobicas.sabia.auth.TokenService;
import com.pedrobicas.sabia.auth.dto.TokenResponse;
import com.pedrobicas.sabia.auth.dto.UsuarioResponse;
import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.config.PropriedadesSabia;
import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.empresa.EmpresaRepository;
import com.pedrobicas.sabia.usuario.Usuario;
import com.pedrobicas.sabia.usuario.UsuarioRepository;

/**
 * Entrada na demonstração pública.
 *
 * <p>Cada visitante ganha um usuário temporário só dele, em vez de todos dividirem uma conta com senha
 * conhecida. Assim um visitante não vê as conversas de outro, não consegue trocar a senha de todo mundo e
 * não gasta o limite de perguntas alheio. O usuário dura um pouco mais que o token e depois é apagado.
 */
@Service
public class VisitantesDaDemonstracao {

    private static final Logger log = LoggerFactory.getLogger(VisitantesDaDemonstracao.class);

    /** Margem entre o fim do token e a remoção do visitante, para nunca apagar alguém com token válido. */
    private static final Duration MARGEM = Duration.ofHours(1);

    private final PropriedadesSabia propriedades;
    private final CargaDeDemonstracao demonstracao;
    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;
    private final TokenService tokens;
    private final LimitadorDaDemonstracao limitador;
    private final Clock relogio;

    public VisitantesDaDemonstracao(PropriedadesSabia propriedades, CargaDeDemonstracao demonstracao,
            EmpresaRepository empresas, UsuarioRepository usuarios, PasswordEncoder senhas, TokenService tokens,
            LimitadorDaDemonstracao limitador, Clock relogio) {
        this.propriedades = propriedades;
        this.demonstracao = demonstracao;
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.senhas = senhas;
        this.tokens = tokens;
        this.limitador = limitador;
        this.relogio = relogio;
    }

    /** Cria um visitante na empresa de demonstração escolhida e devolve o token dele. */
    @Transactional
    public TokenResponse entrar(String nomeDaEmpresa, String ip) {
        if (!propriedades.demo().habilitada()) {
            throw ApiException.naoEncontrado("A demonstração não está ligada nesta instalação.");
        }
        UUID empresaId = demonstracao.empresaPorNome(nomeDaEmpresa)
                .orElseThrow(() -> ApiException.naoEncontrado("Empresa de demonstração desconhecida."));
        Empresa empresa = empresas.findById(empresaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Empresa de demonstração desconhecida."));
        limitador.registrarVisitante(ip);

        Instant ate = Instant.now(relogio).plus(propriedades.jwt().validade()).plus(MARGEM);
        String email = "visitante-" + UUID.randomUUID() + "@demo.sabia";
        // Senha aleatória que ninguém conhece: o visitante só entra por aqui, nunca pelo login normal.
        String senhaHash = senhas.encode(UUID.randomUUID().toString());
        Usuario visitante = usuarios.save(Usuario.visitante(empresa.getId(), email, senhaHash, ate));
        return new TokenResponse(tokens.gerar(visitante), UsuarioResponse.de(visitante, empresa));
    }

    /** Apaga, de hora em hora, os visitantes vencidos (as conversas deles vão junto). */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    @Transactional
    public void apagarVencidos() {
        int apagados = usuarios.apagarVisitantesExpirados(Instant.now(relogio));
        limitador.esquecerJanelasVencidas();
        if (apagados > 0) {
            log.info("{} visitante(s) da demonstração apagado(s)", apagados);
        }
    }
}
