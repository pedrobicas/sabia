package com.pedrobicas.sabia.chat;

/**
 * Monta o texto usado na busca dos trechos.
 *
 * <p>Perguntas de continuação costumam ser curtas e dependem da anterior: depois de "Que horas a
 * loja abre?", a pergunta "E aos domingos?" sozinha não diz do que se trata. Quando a pergunta é
 * curta, a busca usa também a última pergunta do usuário. O modelo continua recebendo só a
 * pergunta atual, junto com o histórico da conversa.
 */
final class ConsultaDeBusca {

    static final int PALAVRAS_DE_PERGUNTA_CURTA = 8;

    private ConsultaDeBusca() {
    }

    static String montar(String pergunta, String perguntaAnterior) {
        String atual = pergunta.strip();
        if (perguntaAnterior == null || perguntaAnterior.isBlank()) {
            return atual;
        }
        int palavras = atual.split("\\s+").length;
        return palavras <= PALAVRAS_DE_PERGUNTA_CURTA ? perguntaAnterior.strip() + " " + atual : atual;
    }
}
