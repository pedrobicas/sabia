package com.pedrobicas.sabia.config;

import java.io.IOException;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

/**
 * Serve o front-end Angular (copiado para classpath:/static no build da imagem Docker).
 *
 * <p>Rotas do Angular como /chat/123 não existem como arquivo: nesses casos devolvemos o
 * index.html e o roteador do Angular cuida do resto. Assim front e back sobem num único serviço.
 */
@Configuration
public class FrontEndConfig implements WebMvcConfigurer {

    private static final Resource INDEX = new ClassPathResource("/static/index.html");

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String caminho, Resource local) throws IOException {
                        Resource solicitado = local.createRelative(caminho);
                        if (solicitado.exists() && solicitado.isReadable()) {
                            return solicitado;
                        }
                        // API, Swagger e arquivos com extensão que não existem continuam dando 404.
                        boolean ehRotaDoAngular = !caminho.startsWith("api/") && !caminho.contains(".");
                        return ehRotaDoAngular && INDEX.exists() ? INDEX : null;
                    }
                });
    }
}
