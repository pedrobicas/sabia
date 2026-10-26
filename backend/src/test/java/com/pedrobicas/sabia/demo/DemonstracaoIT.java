package com.pedrobicas.sabia.demo;

import static com.pedrobicas.sabia.suporte.ApiDeTeste.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
@TestPropertySource(properties = { "sabia.demo.habilitada=true", "sabia.demo.senha=senha-da-demo" })
class DemonstracaoIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Test
    void telaDeEntradaRecebeAsContasDeDemonstracao() throws Exception {
        mvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contasDemo.length()").value(2))
                .andExpect(jsonPath("$.contasDemo[0].empresa").value("Café Aurora"))
                .andExpect(jsonPath("$.contasDemo[0].senha").value("senha-da-demo"));
    }

    @Test
    void documentosDaDemonstracaoSaoCarregadosEProcessados() throws Exception {
        String token = entrar("demo@cafeaurora.com");

        JsonNode documentos = esperarTodosProntos(token);

        assertThat(documentos).hasSize(5);
        JsonNode manual = null;
        for (JsonNode documento : documentos) {
            if (documento.get("nome").asText().equals("manual-do-colaborador.pdf")) {
                manual = documento;
            }
        }
        assertThat(manual).isNotNull();
        assertThat(manual.get("tipo").asText()).isEqualTo("PDF");
        assertThat(manual.get("totalTrechos").asInt()).isGreaterThanOrEqualTo(5);
    }

    @Test
    void visitanteDaDemonstracaoNaoPodeEnviarNemGerenciarMembros() throws Exception {
        String token = entrar("demo@livrariahorizonte.com");

        mvc.perform(get("/api/usuarios").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    private String entrar(String email) throws Exception {
        String resposta = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", "senha-da-demo"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("token").asText();
    }

    private JsonNode esperarTodosProntos(String token) throws Exception {
        JsonNode documentos = null;
        for (int tentativa = 0; tentativa < 75; tentativa++) {
            String lista = mvc.perform(get("/api/documentos").header("Authorization", bearer(token)))
                    .andReturn().getResponse().getContentAsString();
            documentos = json.readTree(lista);
            boolean todosProntos = documentos.size() > 0;
            for (JsonNode documento : documentos) {
                todosProntos &= documento.get("status").asText().equals("PRONTO");
            }
            if (todosProntos) {
                return documentos;
            }
            Thread.sleep(200);
        }
        throw new AssertionError("Os documentos da demonstração não ficaram prontos: " + documentos);
    }
}
