package com.pedrobicas.sabia.documento;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoArquivoRepository extends JpaRepository<DocumentoArquivo, UUID> {
}
