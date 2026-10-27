package com.pedrobicas.sabia.auth;

import java.util.Locale;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pedrobicas.sabia.auth.dto.CadastroRequest;
import com.pedrobicas.sabia.auth.dto.LoginRequest;
import com.pedrobicas.sabia.auth.dto.TokenResponse;
import com.pedrobicas.sabia.auth.dto.TrocaDeSenhaRequest;
import com.pedrobicas.sabia.auth.dto.UsuarioResponse;
import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.config.PropriedadesSabia;
import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.empresa.EmpresaRepository;
import com.pedrobicas.sabia.usuario.Papel;
import com.pedrobicas.sabia.usuario.Usuario;
import com.pedrobicas.sabia.usuario.UsuarioRepository;

@Service
public class AuthService {

    private final EmpresaRepository empresas;
    private final UsuarioRepository usuarios;
    private final PasswordEncoder senhas;
    private final TokenService tokens;
    private final PropriedadesSabia propriedades;
    private final LimitadorDeLogin limitador;

    public AuthService(EmpresaRepository empresas, UsuarioRepository usuarios, PasswordEncoder senhas,
            TokenService tokens, PropriedadesSabia propriedades, LimitadorDeLogin limitador) {
        this.empresas = empresas;
        this.usuarios = usuarios;
        this.senhas = senhas;
        this.tokens = tokens;
        this.propriedades = propriedades;
        this.limitador = limitador;
    }

    /** Cria uma empresa nova e o primeiro administrador dela. */
    @Transactional
    public TokenResponse cadastrar(CadastroRequest pedido) {
        if (!propriedades.cadastroAberto()) {
            throw ApiException.proibido("O cadastro de novas empresas está desativado nesta instalação.");
        }
        String email = normalizarEmail(pedido.email());
        if (usuarios.existsByEmail(email)) {
            throw ApiException.conflito("Já existe uma conta com este e-mail.");
        }
        Empresa empresa = empresas.save(new Empresa(pedido.nomeEmpresa().strip()));
        Usuario admin = usuarios.save(new Usuario(
                empresa.getId(), pedido.nome().strip(), email, senhas.encode(pedido.senha()), Papel.ADMIN));
        return new TokenResponse(tokens.gerar(admin), UsuarioResponse.de(admin, empresa));
    }

    /** Confere e-mail e senha. Depois de várias falhas seguidas, o e-mail (e o IP) ficam bloqueados por um tempo. */
    @Transactional(readOnly = true)
    public TokenResponse entrar(LoginRequest pedido, String ip) {
        String email = normalizarEmail(pedido.email());
        limitador.verificar(email, ip);
        Usuario usuario = usuarios.findByEmail(email)
                .filter(u -> senhas.matches(pedido.senha(), u.getSenhaHash()))
                .orElseThrow(() -> {
                    limitador.registrarFalha(email, ip);
                    return ApiException.naoAutorizado("E-mail ou senha inválidos.");
                });
        limitador.registrarSucesso(email);
        Empresa empresa = buscarEmpresa(usuario);
        return new TokenResponse(tokens.gerar(usuario), UsuarioResponse.de(usuario, empresa));
    }

    /** Troca a senha de quem está logado. Pede a senha atual para um token esquecido aberto não bastar. */
    @Transactional
    public void trocarSenha(UsuarioAtual atual, TrocaDeSenhaRequest pedido, String ip) {
        Usuario usuario = usuarios.findByIdAndEmpresaId(atual.id(), atual.empresaId())
                .orElseThrow(() -> ApiException.naoAutorizado("Sua conta não existe mais. Entre novamente."));
        limitador.verificar(usuario.getEmail(), ip);
        if (!senhas.matches(pedido.senhaAtual(), usuario.getSenhaHash())) {
            limitador.registrarFalha(usuario.getEmail(), ip);
            throw ApiException.requisicaoInvalida("A senha atual não confere.");
        }
        if (pedido.novaSenha().equals(pedido.senhaAtual())) {
            throw ApiException.requisicaoInvalida("A nova senha precisa ser diferente da atual.");
        }
        usuario.trocarSenha(senhas.encode(pedido.novaSenha()));
        usuarios.save(usuario);
    }

    @Transactional(readOnly = true)
    public UsuarioResponse eu(UsuarioAtual atual) {
        Usuario usuario = usuarios.findByIdAndEmpresaId(atual.id(), atual.empresaId())
                .orElseThrow(() -> ApiException.naoAutorizado("Sua conta não existe mais. Entre novamente."));
        return UsuarioResponse.de(usuario, buscarEmpresa(usuario));
    }

    public static String normalizarEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private Empresa buscarEmpresa(Usuario usuario) {
        return empresas.findById(usuario.getEmpresaId())
                .orElseThrow(() -> ApiException.naoAutorizado("A empresa desta conta não existe mais."));
    }
}
