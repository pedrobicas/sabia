package com.pedrobicas.sabia.suporte;

import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Substitui os modelos de IA reais nos testes de integração: nada sai para a rede.
 */
@TestConfiguration(proxyBeanMethods = false)
public class IaFalsaDeTeste {

    @Bean
    @Primary
    EmbeddingModel embeddingFalso() {
        return new EmbeddingFalso();
    }

    @Bean
    @Primary
    ChatModel chatFalso() {
        return new ChatFalso();
    }
}
