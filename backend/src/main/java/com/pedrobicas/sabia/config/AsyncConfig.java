package com.pedrobicas.sabia.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

/**
 * Processamento de documentos em segundo plano: o upload responde na hora e a ingestão roda aqui.
 * Duas threads bastam para um projeto pequeno e evitam sobrecarregar o serviço de embeddings.
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "executorIngestao")
    ThreadPoolTaskExecutor executorIngestao() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("ingestao-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        return executor;
    }
}
