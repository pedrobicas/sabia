package com.pedrobicas.sabia.chat;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "mensagem")
public class Mensagem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "conversa_id", nullable = false)
    private UUID conversaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PapelMensagem papel;

    @Column(nullable = false, columnDefinition = "text")
    private String conteudo;

    /** Citações em JSON. Ver {@link Citacao}. */
    @Column(columnDefinition = "text")
    private String citacoes;

    /** Nas respostas: a pergunta que originou a resposta (usada no painel de análises). */
    @Column(columnDefinition = "text")
    private String pergunta;

    /** Nas respostas: true quando o assistente não encontrou a informação nos documentos. */
    @Column(name = "sem_resposta", nullable = false)
    private boolean semResposta;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Mensagem() {
    }

    private Mensagem(UUID conversaId, PapelMensagem papel, String conteudo, String citacoes, String pergunta,
            boolean semResposta) {
        this.conversaId = conversaId;
        this.papel = papel;
        this.conteudo = conteudo;
        this.citacoes = citacoes;
        this.pergunta = pergunta;
        this.semResposta = semResposta;
        this.criadoEm = Instant.now();
    }

    public static Mensagem doUsuario(UUID conversaId, String pergunta) {
        return new Mensagem(conversaId, PapelMensagem.USUARIO, pergunta, null, null, false);
    }

    public static Mensagem doAssistente(UUID conversaId, String pergunta, String resposta, String citacoes,
            boolean semResposta) {
        return new Mensagem(conversaId, PapelMensagem.ASSISTENTE, resposta, citacoes, pergunta, semResposta);
    }

    public UUID getId() {
        return id;
    }

    public UUID getConversaId() {
        return conversaId;
    }

    public PapelMensagem getPapel() {
        return papel;
    }

    public String getConteudo() {
        return conteudo;
    }

    public String getCitacoes() {
        return citacoes;
    }

    public String getPergunta() {
        return pergunta;
    }

    public boolean isSemResposta() {
        return semResposta;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
