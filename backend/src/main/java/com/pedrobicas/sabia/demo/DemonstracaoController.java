package com.pedrobicas.sabia.demo;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.auth.dto.TokenResponse;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/auth/demo")
@Tag(name = "Autenticação")
public class DemonstracaoController {

    private final VisitantesDaDemonstracao visitantes;

    public DemonstracaoController(VisitantesDaDemonstracao visitantes) {
        this.visitantes = visitantes;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Entra numa empresa de demonstração com uma conta temporária só sua",
            description = "Só funciona com DEMO_HABILITADA=true. A conta é de membro, não tem senha e é apagada "
                    + "depois que o token vence.")
    public TokenResponse entrar(@Valid @RequestBody EntradaNaDemonstracao pedido, HttpServletRequest requisicao) {
        // Com server.forward-headers-strategy=framework, getRemoteAddr já considera o X-Forwarded-For do proxy.
        return visitantes.entrar(pedido.empresa(), requisicao.getRemoteAddr());
    }

    public record EntradaNaDemonstracao(@NotBlank String empresa) {
    }
}
