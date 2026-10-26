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

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Mensagem() {
    }

    public Mensagem(UUID conversaId, PapelMensagem papel, String conteudo, String citacoes) {
        this.conversaId = conversaId;
        this.papel = papel;
        this.conteudo = conteudo;
        this.citacoes = citacoes;
        this.criadoEm = Instant.now();
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

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
