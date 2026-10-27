package com.pedrobicas.sabia.analise;

import static com.pedrobicas.sabia.suporte.ApiDeTeste.bearer;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.suporte.ApiDeTeste;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
class AnalisesApiIT {

    private static final String RESPONDIVEL = "Que horas começa o expediente?";
    private static final String SEM_RESPOSTA = "Qual é a senha do wifi?";

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
    void painelMostraVolumeLacunasAvaliacoesEDocumentosCitados() throws Exception {
        String token = api.novaEmpresa("Cafeteria analisada");
        api.enviarDocumentoProcessado(token, "manual.md", "O expediente começa às 7h e termina às 16h.");
        String conversa = api.novaConversa(token);
        api.perguntar(token, conversa, RESPONDIVEL);
        api.perguntar(token, conversa, SEM_RESPOSTA);
        String resposta = idDaResposta(token, conversa, 1);
        avaliar(token, conversa, resposta, false, "Faltou dizer o horário de sábado.");

        String corpo = mvc.perform(get("/api/analises?dias=7").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        JsonNode painel = json.readTree(corpo);

        assertThat(painel.get("totalPerguntas").asLong()).isEqualTo(2);
        assertThat(painel.get("semResposta").asLong()).isEqualTo(1);
        assertThat(painel.get("avaliacoesNegativas").asLong()).isEqualTo(1);
        assertThat(painel.get("perguntasPorDia")).hasSize(7);
        assertThat(painel.get("perguntasPorDia").get(6).get("total").asLong()).isEqualTo(2);
        assertThat(painel.get("perguntasSemResposta").get(0).get("pergunta").asText()).isEqualTo(SEM_RESPOSTA);
        assertThat(painel.get("respostasMalAvaliadas").get(0).get("comentario").asText())
                .isEqualTo("Faltou dizer o horário de sábado.");
        assertThat(painel.get("documentosMaisCitados").get(0).get("documento").asText()).isEqualTo("manual.md");
    }

    @Test
    void membroNaoVeOPainel() throws Exception {
        String tokenAdmin = api.novaEmpresa("Empresa com membro");
        String tokenMembro = api.novoMembro(tokenAdmin);

        mvc.perform(get("/api/analises").header("Authorization", bearer(tokenMembro)))
                .andExpect(status().isForbidden());
    }

    @Test
    void sugestoesVemDasPerguntasRespondidasMaisFeitas() throws Exception {
        String token = api.novaEmpresa("Cafeteria com histórico");
        api.enviarDocumentoProcessado(token, "manual.md", "O expediente começa às 7h e termina às 16h.");
        String conversa = api.novaConversa(token);

        mvc.perform(get("/api/sugestoes").header("Authorization", bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        api.perguntar(token, conversa, RESPONDIVEL);
        api.perguntar(token, conversa, SEM_RESPOSTA);

        mvc.perform(get("/api/sugestoes").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$[0]").value(RESPONDIVEL))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void avaliacaoPodeSerTrocadaERemovida() throws Exception {
        String token = api.novaEmpresa("Cafeteria que avalia");
        String conversa = api.novaConversa(token);
        api.perguntar(token, conversa, SEM_RESPOSTA);
        String resposta = idDaResposta(token, conversa, 1);

        avaliar(token, conversa, resposta, false, null);
        avaliar(token, conversa, resposta, true, null);
        mvc.perform(get("/api/conversas/" + conversa + "/mensagens").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$[1].avaliacao.util").value(true));

        mvc.perform(delete("/api/conversas/" + conversa + "/mensagens/" + resposta + "/avaliacao")
                .header("Authorization", bearer(token)))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/conversas/" + conversa + "/mensagens").header("Authorization", bearer(token)))
                .andExpect(jsonPath("$[1].avaliacao").isEmpty());
    }

    @Test
    void soQuemPerguntouAvaliaESoRespostasPodemSerAvaliadas() throws Exception {
        String token = api.novaEmpresa("Dona da conversa");
        String intruso = api.novaEmpresa("Intrusa");
        String conversa = api.novaConversa(token);
        api.perguntar(token, conversa, SEM_RESPOSTA);
        String pergunta = idDaResposta(token, conversa, 0);
        String resposta = idDaResposta(token, conversa, 1);

        mvc.perform(put("/api/conversas/" + conversa + "/mensagens/" + resposta + "/avaliacao")
                .header("Authorization", bearer(intruso))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"util\": true}"))
                .andExpect(status().isNotFound());
        mvc.perform(put("/api/conversas/" + conversa + "/mensagens/" + pergunta + "/avaliacao")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"util\": true}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void conversaPodeSerRenomeada() throws Exception {
        String token = api.novaEmpresa("Empresa que renomeia");
        String conversa = api.novaConversa(token);

        mvc.perform(patch("/api/conversas/" + conversa)
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("titulo", "Dúvidas sobre férias"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titulo").value("Dúvidas sobre férias"));
    }

    private String idDaResposta(String token, String conversa, int posicao) throws Exception {
        String corpo = mvc.perform(get("/api/conversas/" + conversa + "/mensagens").header("Authorization", bearer(token)))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return json.readTree(corpo).get(posicao).get("id").asText();
    }

    private void avaliar(String token, String conversa, String mensagem, boolean util, String comentario)
            throws Exception {
        String corpo = comentario == null
                ? json.writeValueAsString(Map.of("util", util))
                : json.writeValueAsString(Map.of("util", util, "comentario", comentario));
        mvc.perform(put("/api/conversas/" + conversa + "/mensagens/" + mensagem + "/avaliacao")
                .header("Authorization", bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content(corpo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.util").value(util));
    }
}
