package com.pedrobicas.sabia.config;

import java.time.Clock;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class IaConfig {

    @Bean
    ChatClient chatClient(ChatClient.Builder construtor) {
        return construtor.build();
    }

    @Bean
    Clock relogio() {
        return Clock.systemUTC();
    }
}
