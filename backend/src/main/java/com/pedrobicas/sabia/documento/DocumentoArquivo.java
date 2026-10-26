package com.pedrobicas.sabia.documento;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Bytes do arquivo original. Fica no próprio PostgreSQL para o deploy precisar de um serviço a menos.
 * Para volumes grandes, a evolução natural é um armazenamento compatível com S3.
 */
@Entity
@Table(name = "documento_arquivo")
public class DocumentoArquivo {

    @Id
    @Column(name = "documento_id")
    private UUID documentoId;

    @Column(nullable = false)
    private byte[] conteudo;

    protected DocumentoArquivo() {
    }

    public DocumentoArquivo(UUID documentoId, byte[] conteudo) {
        this.documentoId = documentoId;
        this.conteudo = conteudo;
    }

    public UUID getDocumentoId() {
        return documentoId;
    }

    public byte[] getConteudo() {
        return conteudo;
    }
}
