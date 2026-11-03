package com.pedrobicas.sabia.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Liga as tarefas agendadas (hoje, só a limpeza dos visitantes vencidos da demonstração). */
@Configuration
@EnableScheduling
public class AgendamentoConfig {
}
