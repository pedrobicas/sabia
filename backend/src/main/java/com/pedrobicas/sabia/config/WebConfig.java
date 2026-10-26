package com.pedrobicas.sabia.config;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final UsuarioAtualResolver usuarioAtualResolver;

    public WebConfig(UsuarioAtualResolver usuarioAtualResolver) {
        this.usuarioAtualResolver = usuarioAtualResolver;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(usuarioAtualResolver);
    }
}
