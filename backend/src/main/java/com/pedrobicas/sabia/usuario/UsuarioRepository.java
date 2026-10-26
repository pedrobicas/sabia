package com.pedrobicas.sabia.usuario;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, UUID> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    List<Usuario> findAllByEmpresaIdOrderByNomeAsc(UUID empresaId);

    Optional<Usuario> findByIdAndEmpresaId(UUID id, UUID empresaId);
}
