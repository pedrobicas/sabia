package com.pedrobicas.sabia.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.pedrobicas.sabia.chat.Citacao;
import com.pedrobicas.sabia.chat.PapelMensagem;

public record MensagemResponse(UUID id, PapelMensagem papel, String conteudo, List<Citacao> citacoes, Instant criadoEm) {
}
