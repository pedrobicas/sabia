package com.pedrobicas.sabia.usuario;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Usuario> findAllByEmpresaIdOrderByNomeAsc(UUID empresaId);

    Optional<Usuario> findByIdAndEmpresaId(UUID id, UUID empresaId);

    /**
     * Apaga os visitantes da demonstração que já passaram da validade. É um DELETE direto no banco:
     * conversas, mensagens e avaliações saem junto pelo ON DELETE CASCADE das chaves estrangeiras.
     */
    @Modifying
    @Query("delete from Usuario u where u.visitanteAte is not null and u.visitanteAte < :agora")
    int apagarVisitantesExpirados(@Param("agora") Instant agora);
}
