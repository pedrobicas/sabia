package com.pedrobicas.sabia.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.auth.dto.CadastroRequest;
import com.pedrobicas.sabia.auth.dto.LoginRequest;
import com.pedrobicas.sabia.auth.dto.TokenResponse;
import com.pedrobicas.sabia.auth.dto.TrocaDeSenhaRequest;
import com.pedrobicas.sabia.auth.dto.UsuarioResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Autenticação")
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria uma empresa e o primeiro administrador")
    public TokenResponse cadastrar(@Valid @RequestBody CadastroRequest pedido) {
        return auth.cadastrar(pedido);
    }

    @PostMapping("/login")
    @Operation(summary = "Entra com e-mail e senha e recebe um token JWT",
            description = "Depois de 5 senhas erradas seguidas para o mesmo e-mail, responde 429 por 15 minutos.")
    public TokenResponse entrar(@Valid @RequestBody LoginRequest pedido, HttpServletRequest requisicao) {
        // Com server.forward-headers-strategy=framework, getRemoteAddr já considera o X-Forwarded-For do proxy.
        return auth.entrar(pedido, requisicao.getRemoteAddr());
    }

    @PutMapping("/senha")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Troca a senha de quem está logado (pede a senha atual)")
    public void trocarSenha(UsuarioAtual usuario, @Valid @RequestBody TrocaDeSenhaRequest pedido,
            HttpServletRequest requisicao) {
        auth.trocarSenha(usuario, pedido, requisicao.getRemoteAddr());
    }

    @GetMapping("/eu")
    @Operation(summary = "Dados do usuário dono do token")
    public UsuarioResponse eu(UsuarioAtual usuario) {
        return auth.eu(usuario);
    }
}
