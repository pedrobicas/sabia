package com.pedrobicas.sabia.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
import org.springframework.test.web.servlet.MockMvc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
class AuthApiIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Test
    void cadastroDevolveTokenQueDaAcessoAosDadosDoUsuario() throws Exception {
        String email = emailUnico();
        String token = cadastrar("Padaria Teste", email);

        mvc.perform(get("/api/auth/eu").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.papel").value("ADMIN"))
                .andExpect(jsonPath("$.empresaNome").value("Padaria Teste"));
    }

    @Test
    void emailRepetidoNoCadastroDevolve409() throws Exception {
        String email = emailUnico();
        cadastrar("Empresa A", email);

        mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "nomeEmpresa", "Empresa B", "nome", "Outra Pessoa", "email", email, "senha", "senha-forte-123"))))
                .andExpect(status().isConflict());
    }

    @Test
    void loginComSenhaErradaDevolve401() throws Exception {
        String email = emailUnico();
        cadastrar("Empresa", email);

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", "senha-errada"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rotasDaApiExigemToken() throws Exception {
        mvc.perform(get("/api/auth/eu")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/auth/eu").header("Authorization", "Bearer token-inventado"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void configuracaoPublicaNaoExigeToken() throws Exception {
        mvc.perform(get("/api/config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cadastroAberto").value(true));
    }

    @Test
    void membroNaoPodeGerenciarUsuarios() throws Exception {
        String tokenAdmin = cadastrar("Empresa", emailUnico());
        String emailMembro = emailUnico();
        criarMembro(tokenAdmin, emailMembro, "MEMBRO");
        String tokenMembro = entrar(emailMembro, "senha-do-membro-1");

        mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + tokenMembro))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminNaoEnxergaNemRemoveMembrosDeOutraEmpresa() throws Exception {
        String tokenEmpresaA = cadastrar("Empresa A", emailUnico());
        String tokenEmpresaB = cadastrar("Empresa B", emailUnico());
        String idMembroDeA = criarMembro(tokenEmpresaA, emailUnico(), "MEMBRO");

        String listaDeB = mvc.perform(get("/api/usuarios").header("Authorization", "Bearer " + tokenEmpresaB))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(listaDeB).doesNotContain(idMembroDeA);

        // Para a empresa B, o membro da empresa A simplesmente não existe.
        mvc.perform(delete("/api/usuarios/" + idMembroDeA).header("Authorization", "Bearer " + tokenEmpresaB))
                .andExpect(status().isNotFound());
    }

    @Test
    void trocaDeSenhaPedeASenhaAtual() throws Exception {
        String email = emailUnico();
        String token = cadastrar("Empresa que troca a senha", email);

        mvc.perform(put("/api/auth/senha")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("senhaAtual", "chute-errado-1", "novaSenha", "nova-senha-456"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("A senha atual não confere."));
        mvc.perform(put("/api/auth/senha")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("senhaAtual", "senha-forte-123", "novaSenha", "curta"))))
                .andExpect(status().isBadRequest());

        mvc.perform(put("/api/auth/senha")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("senhaAtual", "senha-forte-123", "novaSenha", "nova-senha-456"))))
                .andExpect(status().isNoContent());

        entrar(email, "nova-senha-456");
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", "senha-forte-123"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void muitasSenhasErradasBloqueiamOEmailPorUmTempo() throws Exception {
        String email = emailUnico();
        cadastrar("Empresa atacada", email);

        for (int tentativa = 0; tentativa < 5; tentativa++) {
            mvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("email", email, "senha", "chute-" + tentativa))))
                    .andExpect(status().isUnauthorized());
        }

        // Nem a senha certa entra enquanto o bloqueio durar.
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", "senha-forte-123"))))
                .andExpect(status().isTooManyRequests());

        // Outras contas não são afetadas.
        String outroEmail = emailUnico();
        cadastrar("Outra empresa", outroEmail);
        entrar(outroEmail, "senha-forte-123");
    }

    private String cadastrar(String empresa, String email) throws Exception {
        String resposta = mvc.perform(post("/api/auth/cadastro")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "nomeEmpresa", empresa, "nome", "Pessoa Admin", "email", email, "senha", "senha-forte-123"))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("token").asText();
    }

    private String entrar(String email, String senha) throws Exception {
        String resposta = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", senha))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).get("token").asText();
    }

    private String criarMembro(String tokenAdmin, String email, String papel) throws Exception {
        String resposta = mvc.perform(post("/api/usuarios")
                .header("Authorization", "Bearer " + tokenAdmin)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of(
                        "nome", "Pessoa Membro", "email", email, "senha", "senha-do-membro-1", "papel", papel))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode membro = json.readTree(resposta);
        return membro.get("id").asText();
    }

    private static String emailUnico() {
        return "teste-" + UUID.randomUUID() + "@exemplo.com";
    }
}
