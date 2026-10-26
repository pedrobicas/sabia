package com.pedrobicas.sabia.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MensagemRepository extends JpaRepository<Mensagem, UUID> {

    List<Mensagem> findAllByConversaIdOrderByCriadoEmAsc(UUID conversaId);

    List<Mensagem> findByConversaIdOrderByCriadoEmDesc(UUID conversaId, Pageable pagina);
}
