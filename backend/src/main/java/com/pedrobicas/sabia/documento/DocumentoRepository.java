package com.pedrobicas.sabia.documento;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentoRepository extends JpaRepository<Documento, UUID> {

    List<Documento> findAllByEmpresaIdOrderByCriadoEmDesc(UUID empresaId);

    Optional<Documento> findByIdAndEmpresaId(UUID id, UUID empresaId);

    List<Documento> findAllByStatusIn(Collection<StatusDocumento> status);

    boolean existsByEmpresaIdAndNome(UUID empresaId, String nome);
}
