package com.pedrobicas.sabia.suporte;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/**
 * Banco para os testes de integração.
 *
 * <p>Por padrão sobe um PostgreSQL com pgvector via Testcontainers (precisa de Docker).
 * No CI usamos o banco do próprio GitHub Actions: com {@code SABIA_TESTE_BANCO_EXTERNO=true}
 * o container não sobe e valem as variáveis {@code SPRING_DATASOURCE_*}.
 */
@TestConfiguration(proxyBeanMethods = false)
public class ContainersDeTeste {

    @Bean
    @ServiceConnection
    @ConditionalOnProperty(name = "sabia.teste.banco-externo", havingValue = "false", matchIfMissing = true)
    PostgreSQLContainer<?> postgres() {
        return new PostgreSQLContainer<>(
                DockerImageName.parse("pgvector/pgvector:pg17").asCompatibleSubstituteFor("postgres"));
    }
}
