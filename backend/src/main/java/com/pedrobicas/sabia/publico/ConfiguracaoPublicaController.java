package com.pedrobicas.sabia.publico;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.config.PropriedadesSabia;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * O que a tela de entrada precisa saber antes do login: se o cadastro está aberto e quais contas de demonstração existem.
 */
@RestController
@RequestMapping("/api/config")
@Tag(name = "Configuração pública")
public class ConfiguracaoPublicaController {

    private final PropriedadesSabia propriedades;

    public ConfiguracaoPublicaController(PropriedadesSabia propriedades) {
        this.propriedades = propriedades;
    }

    @GetMapping
    @Operation(summary = "Configurações visíveis antes do login")
    public ConfiguracaoPublica configuracao() {
        return new ConfiguracaoPublica(propriedades.cadastroAberto(), List.of());
    }

    public record ConfiguracaoPublica(boolean cadastroAberto, List<ContaDemo> contasDemo) {
    }

    public record ContaDemo(String empresa, String email, String senha) {
    }
}
