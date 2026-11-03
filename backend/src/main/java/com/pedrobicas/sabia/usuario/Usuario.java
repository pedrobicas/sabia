package com.pedrobicas.sabia.usuario;

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
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "empresa_id", nullable = false)
    private UUID empresaId;

    @Column(nullable = false, length = 120)
    private String nome;

    @Column(nullable = false, length = 180, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Papel papel;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    /** Preenchido só para visitantes da demonstração: depois desse instante, o usuário é apagado. */
    @Column(name = "visitante_ate")
    private Instant visitanteAte;

    protected Usuario() {
    }

    public Usuario(UUID empresaId, String nome, String email, String senhaHash, Papel papel) {
        this.empresaId = empresaId;
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.papel = papel;
        this.criadoEm = Instant.now();
    }

    /** Usuário temporário da demonstração pública: membro comum, sem senha conhecida, com data para ser apagado. */
    public static Usuario visitante(UUID empresaId, String email, String senhaHash, Instant ate) {
        Usuario visitante = new Usuario(empresaId, "Visitante", email, senhaHash, Papel.MEMBRO);
        visitante.visitanteAte = ate;
        return visitante;
    }

    public void trocarSenha(String novoHash) {
        this.senhaHash = novoHash;
    }

    public UUID getId() {
        return id;
    }

    public UUID getEmpresaId() {
        return empresaId;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public Papel getPapel() {
        return papel;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getVisitanteAte() {
        return visitanteAte;
    }

    public boolean isVisitante() {
        return visitanteAte != null;
    }
}
