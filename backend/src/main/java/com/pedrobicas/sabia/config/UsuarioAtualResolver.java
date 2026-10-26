package com.pedrobicas.sabia.config;

import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.comum.ApiException;

/**
 * Permite declarar {@code UsuarioAtual usuario} como parâmetro de qualquer endpoint.
 */
@Component
public class UsuarioAtualResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parametro) {
        return UsuarioAtual.class.equals(parametro.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parametro, ModelAndViewContainer mavContainer,
            NativeWebRequest requisicao, WebDataBinderFactory binderFactory) {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao instanceof JwtAuthenticationToken token) {
            return UsuarioAtual.de(token.getToken());
        }
        throw ApiException.naoAutorizado("Entre na sua conta para continuar.");
    }
}
