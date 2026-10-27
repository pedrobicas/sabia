package com.pedrobicas.sabia.documento;

import static com.pedrobicas.sabia.suporte.ApiDeTeste.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.suporte.ApiDeTeste;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
class DocumentosApiIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    ApiDeTeste api;

    @BeforeEach
    void preparar() {
        api = new ApiDeTeste(mvc, json);
    }

    @Test
    void uploadEntraNaFilaEFicaProntoEmSegundoPlano() throws Exception {
        String token = api.novaEmpresa("Cafeteria");

        String id = enviar(token, "manual.md", "# Manual\n\nO expediente começa às 7h. O uniforme é obrigatório.");

        JsonNode documento = esperarStatusFinal(token, id);
        assertThat(documento.get("status").asText()).isEqualTo("PRONTO");
        assertThat(documento.get("totalTrechos").asInt()).isPositive();
        assertThat(documento.get("tipo").asText()).isEqualTo("MARKDOWN");
    }

    @Test
    void formatoNaoSuportadoDevolve400() throws Exception {
        String token = api.novaEmpresa("Cafeteria");

        mvc.perform(multipart("/api/documentos")
                .file(new MockMultipartFile("arquivo", "planilha.xlsx", "application/octet-stream", new byte[] { 1, 2 }))
                .header("Authorization", bearer(token)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void membroPodeListarMasNaoPodeEnviar() throws Exception {
        String tokenAdmin = api.novaEmpresa("Cafeteria");
        String tokenMembro = api.novoMembro(tokenAdmin);

        mvc.perform(get("/api/documentos").header("Authorization", bearer(tokenMembro)))
                .andExpect(status().isOk());
        mvc.perform(multipart("/api/documentos")
                .file(arquivo("faq.txt", "Perguntas frequentes"))
                .header("Authorization", bearer(tokenMembro)))
                .andExpect(status().isForbidden());
    }

    @Test
    void outraEmpresaNaoVeNaoBaixaENaoApagaODocumento() throws Exception {
        String tokenCafeteria = api.novaEmpresa("Cafeteria");
        String tokenLivraria = api.novaEmpresa("Livraria");
        String id = enviar(tokenCafeteria, "segredo.txt", "Receita secreta do bolo de fubá.");

        mvc.perform(get("/api/documentos").header("Authorization", bearer(tokenLivraria)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + id + "')]").isEmpty());
        mvc.perform(get("/api/documentos/" + id + "/arquivo").header("Authorization", bearer(tokenLivraria)))
                .andExpect(status().isNotFound());
        mvc.perform(delete("/api/documentos/" + id).header("Authorization", bearer(tokenLivraria)))
                .andExpect(status().isNotFound());

        // A dona do documento continua conseguindo baixar o original.
        byte[] original = mvc.perform(get("/api/documentos/" + id + "/arquivo")
                .header("Authorization", bearer(tokenCafeteria)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(original, StandardCharsets.UTF_8)).isEqualTo("Receita secreta do bolo de fubá.");
    }

    @Test
    void excluirRemoveDaLista() throws Exception {
        String token = api.novaEmpresa("Cafeteria");
        String id = enviar(token, "antigo.txt", "Documento que será apagado.");
        esperarStatusFinal(token, id);

        mvc.perform(delete("/api/documentos/" + id).header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/documentos").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$[?(@.id == '" + id + "')]").isEmpty());
    }

    @Test
    void reenviarComOMesmoNomeAtualizaODocumentoEmVezDeDuplicar() throws Exception {
        String token = api.novaEmpresa("Cafeteria que atualiza");
        String id = enviar(token, "horarios.md", "A loja abre às 7h.");
        esperarStatusFinal(token, id);

        String resposta = mvc.perform(multipart("/api/documentos")
                .file(arquivo("horarios.md", "A loja abre às 8h a partir de novembro."))
                .header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.versao").value(2))
                .andReturn().getResponse().getContentAsString();
        assertThat(api.ler(resposta).get("status").asText()).isEqualTo("ENVIADO");

        assertThat(esperarStatusFinal(token, id).get("status").asText()).isEqualTo("PRONTO");
        mvc.perform(get("/api/documentos").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$.length()").value(1));
        String trechos = mvc.perform(get("/api/documentos/" + id + "/trechos").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(trechos).contains("8h a partir de novembro").doesNotContain("abre às 7h");
    }

    @Test
    void trechosVemNaOrdemDoDocumentoESoParaAMesmaEmpresa() throws Exception {
        String tokenCafeteria = api.novaEmpresa("Cafeteria com trechos");
        String tokenLivraria = api.novaEmpresa("Livraria curiosa");
        String tokenMembro = api.novoMembro(tokenCafeteria);
        String texto = "Primeira parte do manual. ".repeat(60) + "\n\n" + "Segunda parte do manual. ".repeat(60);
        String id = enviar(tokenCafeteria, "manual-longo.txt", texto);
        esperarStatusFinal(tokenCafeteria, id);

        String corpo = mvc.perform(get("/api/documentos/" + id + "/trechos").header("Authorization", bearer(tokenMembro)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode trechos = api.ler(corpo);
        assertThat(trechos.size()).isGreaterThan(1);
        assertThat(trechos.get(0).get("ordem").asInt()).isZero();
        assertThat(trechos.get(0).get("texto").asText()).startsWith("Primeira parte");
        assertThat(trechos.get(trechos.size() - 1).get("texto").asText()).contains("Segunda parte");

        mvc.perform(get("/api/documentos/" + id + "/trechos").header("Authorization", bearer(tokenLivraria)))
                .andExpect(status().isNotFound());
    }

    private String enviar(String token, String nome, String conteudo) throws Exception {
        String resposta = mvc.perform(multipart("/api/documentos")
                .file(arquivo(nome, conteudo))
                .header("Authorization", bearer(token)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("ENVIADO"))
                .andReturn().getResponse().getContentAsString();
        return api.ler(resposta).get("id").asText();
    }

    private JsonNode esperarStatusFinal(String token, String id) throws Exception {
        for (int tentativa = 0; tentativa < 50; tentativa++) {
            String lista = mvc.perform(get("/api/documentos").header("Authorization", bearer(token)))
                    .andReturn().getResponse().getContentAsString();
            for (JsonNode documento : api.ler(lista)) {
                if (documento.get("id").asText().equals(id)) {
                    String status = documento.get("status").asText();
                    if (status.equals("PRONTO") || status.equals("ERRO")) {
                        return documento;
                    }
                }
            }
            Thread.sleep(200);
        }
        throw new AssertionError("O documento não terminou de processar em 10 segundos.");
    }

    private static MockMultipartFile arquivo(String nome, String conteudo) {
        return new MockMultipartFile("arquivo", nome, "text/plain", conteudo.getBytes(StandardCharsets.UTF_8));
    }
}
