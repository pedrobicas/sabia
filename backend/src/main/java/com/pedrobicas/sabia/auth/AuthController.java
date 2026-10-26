package com.pedrobicas.sabia.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.auth.dto.CadastroRequest;
import com.pedrobicas.sabia.auth.dto.LoginRequest;
import com.pedrobicas.sabia.auth.dto.TokenResponse;
import com.pedrobicas.sabia.auth.dto.UsuarioResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
    @Operation(summary = "Entra com e-mail e senha e recebe um token JWT")
    public TokenResponse entrar(@Valid @RequestBody LoginRequest pedido) {
        return auth.entrar(pedido);
    }

    @GetMapping("/eu")
    @Operation(summary = "Dados do usuário dono do token")
    public UsuarioResponse eu(UsuarioAtual usuario) {
        return auth.eu(usuario);
    }
}
