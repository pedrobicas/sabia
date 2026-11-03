package com.pedrobicas.sabia.publico;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.pedrobicas.sabia.config.PropriedadesSabia;
import com.pedrobicas.sabia.demo.CargaDeDemonstracao;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * O que a tela de entrada precisa saber antes do login: se o cadastro está aberto e quais empresas de demonstração existem.
 */
@RestController
@RequestMapping("/api/config")
@Tag(name = "Configuração pública")
public class ConfiguracaoPublicaController {

    private final PropriedadesSabia propriedades;
    private final CargaDeDemonstracao demonstracao;

    public ConfiguracaoPublicaController(PropriedadesSabia propriedades, CargaDeDemonstracao demonstracao) {
        this.propriedades = propriedades;
        this.demonstracao = demonstracao;
    }

    @GetMapping
    @Operation(summary = "Configurações visíveis antes do login")
    public ConfiguracaoPublica configuracao() {
        return new ConfiguracaoPublica(propriedades.cadastroAberto(), demonstracao.contas());
    }

    public record ConfiguracaoPublica(boolean cadastroAberto, List<ContaDemo> contasDemo) {
    }

    /** Uma empresa de demonstração. Não há senha: cada visitante entra por POST /api/auth/demo. */
    public record ContaDemo(String empresa) {
    }
}
