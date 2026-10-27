package com.pedrobicas.sabia.chat;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "conversa")
public class Conversa {

    public static final String TITULO_PADRAO = "Nova conversa";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Conversa() {
    }

    public Conversa(UUID empresaId, UUID usuarioId, String titulo) {
        this.empresaId = empresaId;
        this.usuarioId = usuarioId;
        this.titulo = titulo == null || titulo.isBlank() ? TITULO_PADRAO : titulo.strip();
        this.criadoEm = Instant.now();
        this.atualizadoEm = this.criadoEm;
    }

    /** Na primeira pergunta, a conversa ganha como título o começo da pergunta. */
    public void nomearPelaPrimeiraPergunta(String pergunta) {
        if (TITULO_PADRAO.equals(titulo)) {
            String limpa = pergunta.strip().replaceAll("\\s+", " ");
            this.titulo = limpa.length() > 60 ? limpa.substring(0, 57) + "..." : limpa;
        }
    }

    public void renomear(String novoTitulo) {
        this.titulo = novoTitulo == null || novoTitulo.isBlank() ? TITULO_PADRAO : novoTitulo.strip();
    }

    public void tocar() {
        this.atualizadoEm = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getEmpresaId() {
        return empresaId;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public String getTitulo() {
        return titulo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
