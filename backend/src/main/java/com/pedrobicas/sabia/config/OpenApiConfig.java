package com.pedrobicas.sabia.config;

import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.pedrobicas.sabia.auth.UsuarioAtual;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

/**
 * Documentação da API em /swagger-ui.html, com botão "Authorize" para colar o token JWT.
 */
@Configuration
public class OpenApiConfig {

    static {
        // UsuarioAtual vem do token, não é um parâmetro que o cliente envia.
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(UsuarioAtual.class);
    }

    @Bean
    OpenAPI documentacao() {
        return new OpenAPI()
                .info(new Info()
                        .title("Sabiá API")
                        .version("1.0.0")
                        .description("Assistente de base de conhecimento com RAG. Faça login em /api/auth/login "
                                + "e use o token no botão Authorize."))
                .components(new Components().addSecuritySchemes("bearer",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("bearer"));
    }
}
