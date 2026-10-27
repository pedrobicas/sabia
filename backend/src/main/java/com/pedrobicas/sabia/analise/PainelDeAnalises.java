package com.pedrobicas.sabia.analise;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * O que o administrador vê no painel: volume de perguntas, o que ficou sem resposta,
 * o que foi mal avaliado e quais documentos mais ajudam.
 */
public record PainelDeAnalises(
        int periodoDias,
        long totalPerguntas,
        long semResposta,
        long avaliacoesPositivas,
        long avaliacoesNegativas,
        List<PerguntasDoDia> perguntasPorDia,
        List<PerguntaSemResposta> perguntasSemResposta,
        List<RespostaMalAvaliada> respostasMalAvaliadas,
        List<DocumentoCitado> documentosMaisCitados) {

    public record PerguntasDoDia(LocalDate dia, long total, long semResposta) {
    }

    public record PerguntaSemResposta(String pergunta, long vezes, Instant ultimaVez) {
    }

    public record RespostaMalAvaliada(String pergunta, String resposta, String comentario, Instant quando) {
    }

    public record DocumentoCitado(String documento, long respostas) {
    }
}
