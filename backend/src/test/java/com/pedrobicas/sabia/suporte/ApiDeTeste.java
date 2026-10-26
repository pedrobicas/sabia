package com.pedrobicas.sabia.suporte;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Atalhos para criar empresas, membros e tokens nos testes de integração.
 */
public class ApiDeTeste {

    public static final String SENHA = "senha-forte-123";

    private final MockMvc mvc;
    private final ObjectMapper json;

    public ApiDeTeste(MockMvc mvc, ObjectMapper json) {
        this.mvc = mvc;
        this.json = json;
    }

    /** Cria uma empresa nova e devolve o token do administrador. */
    public String novaEmpresa(String nome) throws Exception {
        String resposta = mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "nomeEmpresa", nome, "nome", "Admin de " + nome, "email", emailUnico(), "senha", SENHA))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("token").asText();
    }

    /** Cria um membro com papel MEMBRO na empresa do administrador e devolve o token dele. */
    public String novoMembro(String tokenAdmin) throws Exception {
        String email = emailUnico();
        mvc.perform(post("/api/usuarios")
                .header("Authorization", bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "nome", "Membro", "email", email, "senha", SENHA, "papel", "MEMBRO"))))
                .andExpect(status().isCreated());
        String resposta = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", SENHA))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("token").asText();
    }

    public JsonNode ler(String conteudo) throws Exception {
        return json.readTree(conteudo);
    }

    public static String bearer(String token) {
        return "Bearer " + token;
    }

    public static String emailUnico() {
        return "teste-" + UUID.randomUUID() + "@exemplo.com";
    }
}
