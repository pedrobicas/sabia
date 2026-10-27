package com.pedrobicas.sabia.chat.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.pedrobicas.sabia.chat.Citacao;
import com.pedrobicas.sabia.chat.PapelMensagem;

/**
 * Uma mensagem da conversa. {@code avaliacao} só existe em respostas que o usuário avaliou.
 */
public record MensagemResponse(
        UUID id,
        PapelMensagem papel,
        String conteudo,
        List<Citacao> citacoes,
        AvaliacaoResponse avaliacao,
        Instant criadoEm) {
}
