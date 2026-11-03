package com.pedrobicas.sabia.config;

import java.time.Duration;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configurações próprias da aplicação, lidas do prefixo {@code sabia} no application.yml.
 */
@ConfigurationProperties(prefix = "sabia")
public record PropriedadesSabia(
        Token jwt,
        boolean cadastroAberto,
        int limitePerguntasPorHora,
        Rag rag,
        Cors cors,
        Demo demo) {

    public PropriedadesSabia {
        if (jwt == null) {
            jwt = new Token(null, Duration.ofHours(12));
        }
        if (rag == null) {
            rag = new Rag(5, 0.4, 1200, 200);
        }
        if (cors == null) {
            cors = new Cors(List.of());
        }
        if (demo == null) {
            demo = new Demo(false, 200, 20);
        }
    }

    /** Segredo usado para assinar os tokens (HS256) e por quanto tempo cada token vale. */
    public record Token(String segredo, Duration validade) {
    }

    /** Parâmetros da busca e da divisão dos documentos em trechos. */
    public record Rag(int trechosPorBusca, double similaridadeMinima, int tamanhoTrecho, int sobreposicao) {
    }

    /** Origens liberadas para chamar a API de outro domínio (vazio = mesmo domínio apenas). */
    public record Cors(List<String> origens) {

        public Cors {
            origens = origens == null ? List.of() : origens.stream().filter(o -> o != null && !o.isBlank()).toList();
        }
    }

    /**
     * Modo de demonstração: cria empresas fictícias com documentos prontos, e cada visitante entra com uma conta
     * temporária só dele.
     *
     * @param limitePerguntasPorHora perguntas que chegam ao modelo de IA por hora, somando todos os visitantes
     *        (0 desliga). Protege a conta do provedor de IA numa demonstração pública.
     * @param visitantesPorIpPorHora contas temporárias que um mesmo IP pode criar por hora (0 desliga)
     */
    public record Demo(boolean habilitada, int limitePerguntasPorHora, int visitantesPorIpPorHora) {
    }
}
