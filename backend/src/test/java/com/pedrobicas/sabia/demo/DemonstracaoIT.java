package com.pedrobicas.sabia.demo;

import static com.pedrobicas.sabia.suporte.ApiDeTeste.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
@TestPropertySource(properties = "sabia.demo.habilitada=true")
class DemonstracaoIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    VisitantesDaDemonstracao visitantes;

    @Test
    void telaDeEntradaRecebeAsEmpresasDeDemonstracaoSemSenha() throws Exception {
        mvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contasDemo.length()").value(2))
                .andExpect(jsonPath("$.contasDemo[0].empresa").value("Café Aurora"))
                .andExpect(jsonPath("$.contasDemo[0].email").doesNotExist())
                .andExpect(jsonPath("$.contasDemo[0].senha").doesNotExist());
    }

    @Test
    void documentosDaDemonstracaoSaoCarregadosEProcessados() throws Exception {
        String token = entrarComo("Café Aurora");

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
    void visitanteDaDemonstracaoNaoPodeGerenciarMembros() throws Exception {
        String token = entrarComo("Livraria Horizonte");

        mvc.perform(get("/api/usuarios").header("Authorization", bearer(token)))
                .andExpect(status().isForbidden());
    }

    @Test
    void cadaVisitanteTemUmaContaSoDeleENaoVeAsConversasDoOutro() throws Exception {
        String primeiro = entrarComo("Café Aurora");
        String segundo = entrarComo("Café Aurora");

        JsonNode eu1 = lerJson(mvc.perform(get("/api/auth/eu").header("Authorization", bearer(primeiro)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        JsonNode eu2 = lerJson(mvc.perform(get("/api/auth/eu").header("Authorization", bearer(segundo)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(eu1.get("id").asText()).isNotEqualTo(eu2.get("id").asText());
        assertThat(eu1.get("empresaId").asText()).isEqualTo(eu2.get("empresaId").asText());
        assertThat(eu1.get("visitante").asBoolean()).isTrue();
        assertThat(eu1.get("papel").asText()).isEqualTo("MEMBRO");

        String conversaDoPrimeiro = novaConversa(primeiro);

        JsonNode conversasDoSegundo = lerJson(mvc.perform(get("/api/conversas").header("Authorization", bearer(segundo)))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode conversa : conversasDoSegundo) {
            assertThat(conversa.get("id").asText()).isNotEqualTo(conversaDoPrimeiro);
        }
        mvc.perform(get("/api/conversas/" + conversaDoPrimeiro + "/mensagens").header("Authorization", bearer(segundo)))
                .andExpect(status().isNotFound());
    }

    @Test
    void visitanteNaoTemSenhaParaTrocar() throws Exception {
        String token = entrarComo("Café Aurora");

        mvc.perform(put("/api/auth/senha")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("senhaAtual", "qualquer-coisa", "novaSenha", "nova-senha-123"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void empresaQueNaoEDaDemonstracaoNaoAceitaVisitante() throws Exception {
        mvc.perform(post("/api/auth/demo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("empresa", "Empresa que não existe"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void visitanteVencidoEApagadoJuntoComAsConversas() throws Exception {
        String token = entrarComo("Café Aurora");
        UUID id = UUID.fromString(lerJson(mvc.perform(get("/api/auth/eu").header("Authorization", bearer(token)))
                .andReturn().getResponse().getContentAsString()).get("id").asText());
        novaConversa(token);
        jdbc.update("UPDATE usuario SET visitante_ate = now() - interval '1 minute' WHERE id = ?", id);

        visitantes.apagarVencidos();

        assertThat(jdbc.queryForObject("SELECT count(*) FROM usuario WHERE id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM conversa WHERE usuario_id = ?", Integer.class, id)).isZero();
        mvc.perform(get("/api/auth/eu").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    private String entrarComo(String empresa) throws Exception {
        String resposta = mvc.perform(post("/api/auth/demo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("empresa", empresa))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return lerJson(resposta).get("token").asText();
    }

    private String novaConversa(String token) throws Exception {
        String resposta = mvc.perform(post("/api/conversas").header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return lerJson(resposta).get("id").asText();
    }

    private JsonNode lerJson(String conteudo) throws Exception {
        return json.readTree(conteudo);
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
