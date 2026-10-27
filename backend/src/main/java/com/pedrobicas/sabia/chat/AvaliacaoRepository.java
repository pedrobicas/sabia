package com.pedrobicas.sabia.chat;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, UUID> {

    List<Avaliacao> findAllByMensagemIdIn(Collection<UUID> mensagens);
}
