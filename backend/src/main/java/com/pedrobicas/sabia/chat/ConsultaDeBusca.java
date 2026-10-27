package com.pedrobicas.sabia.chat;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;

/**
 * Monta o texto usado na busca dos trechos.
 *
 * <p>Perguntas de continuação dependem da anterior: depois de "Que horas a loja abre?", a
 * pergunta "E aos domingos?" sozinha não diz do que se trata. Nesses casos a busca usa também a
 * última pergunta do usuário. O modelo continua recebendo só a pergunta atual, junto com o
 * histórico da conversa.
 *
 * <p>Uma pergunta curta e completa ("Qual é a senha do wifi?") não é continuação: misturar a
 * anterior traria trechos do assunto antigo. Por isso só conta como continuação a pergunta curta
 * que começa com um conector ("e", "mas", "também"), que aponta para algo já dito ("isso",
 * "dele", "nesse caso") ou que tem no máximo três palavras ("Precisa de nota?").
 */
final class ConsultaDeBusca {

    static final int PALAVRAS_DE_PERGUNTA_CURTA = 8;
    static final int PALAVRAS_DE_PERGUNTA_MINIMA = 3;

    private static final Set<String> CONECTORES = Set.of(
            "e", "mas", "também", "tambem", "então", "entao", "só", "so", "ainda", "porém", "porem", "aí", "ai");

    private static final Set<String> REFERENCIAS = Set.of(
            "isso", "disso", "nisso", "isto", "disto", "nisto",
            "esse", "essa", "esses", "essas", "desse", "dessa", "desses", "dessas", "nesse", "nessa",
            "este", "esta", "estes", "estas", "deste", "desta", "neste", "nesta",
            "aquele", "aquela", "daquele", "daquela", "naquele", "naquela",
            "ele", "ela", "eles", "elas", "dele", "dela", "deles", "delas", "nele", "nela",
            "mesmo", "mesma", "lá", "ali");

    private ConsultaDeBusca() {
    }

    static String montar(String pergunta, String perguntaAnterior) {
        String atual = pergunta.strip();
        if (perguntaAnterior == null || perguntaAnterior.isBlank()) {
            return atual;
        }
        return pareceContinuacao(atual) ? perguntaAnterior.strip() + " " + atual : atual;
    }

    static boolean pareceContinuacao(String pergunta) {
        String[] palavras = Arrays.stream(pergunta.toLowerCase(Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
                .filter(palavra -> !palavra.isBlank())
                .toArray(String[]::new);
        if (palavras.length == 0 || palavras.length > PALAVRAS_DE_PERGUNTA_CURTA) {
            return false;
        }
        if (palavras.length <= PALAVRAS_DE_PERGUNTA_MINIMA || CONECTORES.contains(palavras[0])) {
            return true;
        }
        return Arrays.stream(palavras).anyMatch(REFERENCIAS::contains);
    }
}
