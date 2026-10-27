package com.pedrobicas.sabia.chat;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Avaliação de uma resposta por quem fez a pergunta: útil ou não, com um comentário opcional.
 */
@Entity
@Table(name = "avaliacao")
public class Avaliacao {

    @Id
    @Column(name = "mensagem_id")
    private UUID mensagemId;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(nullable = false)
    private boolean util;

    @Column(length = 500)
    private String comentario;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected Avaliacao() {
    }

    public Avaliacao(UUID mensagemId, UUID usuarioId, boolean util, String comentario) {
        this.mensagemId = mensagemId;
        this.usuarioId = usuarioId;
        atualizar(util, comentario);
    }

    public void atualizar(boolean util, String comentario) {
        this.util = util;
        this.comentario = comentario == null || comentario.isBlank() ? null : comentario.strip();
        this.criadoEm = Instant.now();
    }

    public UUID getMensagemId() {
        return mensagemId;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public boolean isUtil() {
        return util;
    }

    public String getComentario() {
        return comentario;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
