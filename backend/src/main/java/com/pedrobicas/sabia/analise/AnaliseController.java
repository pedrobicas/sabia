package com.pedrobicas.sabia.analise;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.comum.ApiException;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@Tag(name = "Análises")
public class AnaliseController {

    private final AnaliseService analises;

    public AnaliseController(AnaliseService analises) {
        this.analises = analises;
    }

    @GetMapping("/api/analises")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Painel do administrador: perguntas, lacunas na documentação e avaliações")
    public PainelDeAnalises painel(UsuarioAtual usuario, @RequestParam(defaultValue = "30") int dias) {
        if (dias < 1 || dias > 365) {
            throw ApiException.requisicaoInvalida("O período precisa ter entre 1 e 365 dias.");
        }
        return analises.painel(usuario.empresaId(), dias);
    }

    @GetMapping("/api/sugestoes")
    @Operation(summary = "Perguntas frequentes da empresa, para sugerir na tela de conversa")
    public List<String> sugestoes(UsuarioAtual usuario) {
        return analises.sugestoes(usuario.empresaId(), 4);
    }
}
