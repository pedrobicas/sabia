package com.pedrobicas.sabia.suporte;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

/**
 * Configuração única dos testes de integração. Todas as classes usam a mesma,
 * então o Spring sobe um só contexto (e um só banco) para todas elas.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import({ ContainersDeTeste.class, IaFalsaDeTeste.class })
public @interface TesteDeIntegracao {
}
