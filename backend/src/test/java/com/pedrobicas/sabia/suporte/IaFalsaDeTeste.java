package com.pedrobicas.sabia.suporte;

import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Substitui o modelo de embedding real nos testes de integração.
 */
@TestConfiguration(proxyBeanMethods = false)
public class IaFalsaDeTeste {

    @Bean
    @Primary
    EmbeddingModel embeddingFalso() {
        return new EmbeddingFalso();
    }
}
