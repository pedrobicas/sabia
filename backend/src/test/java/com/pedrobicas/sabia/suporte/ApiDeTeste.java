package com.pedrobicas.sabia.suporte;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
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

    /** Envia um documento de texto e espera o processamento em segundo plano terminar. Devolve o ID. */
    public String enviarDocumentoProcessado(String token, String nome, String conteudo) throws Exception {
        String resposta = mvc.perform(multipart("/api/documentos")
                .file(new MockMultipartFile("arquivo", nome, "text/plain", conteudo.getBytes(StandardCharsets.UTF_8)))
                .header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(resposta).get("id").asText();
        for (int tentativa = 0; tentativa < 50; tentativa++) {
            String lista = mvc.perform(get("/api/documentos").header("Authorization", bearer(token)))
                    .andReturn().getResponse().getContentAsString();
            for (JsonNode documento : json.readTree(lista)) {
                if (documento.get("id").asText().equals(id) && documento.get("status").asText().equals("PRONTO")) {
                    return id;
                }
            }
            Thread.sleep(200);
        }
        throw new AssertionError("O documento " + nome + " não ficou pronto em 10 segundos.");
    }

    public String novaConversa(String token) throws Exception {
        String resposta = mvc.perform(post("/api/conversas").header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("id").asText();
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
