package com.pedrobicas.sabia.chat;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ConversaRepository extends JpaRepository<Conversa, UUID> {

    List<Conversa> findAllByUsuarioIdAndEmpresaIdOrderByAtualizadoEmDesc(UUID usuarioId, UUID empresaId);

    Optional<Conversa> findByIdAndUsuarioIdAndEmpresaId(UUID id, UUID usuarioId, UUID empresaId);
}
