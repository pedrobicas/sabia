package com.pedrobicas.sabia.busca;

import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Junta duas listas ordenadas com Reciprocal Rank Fusion (RRF).
 *
 * <p>Cada trecho ganha 1 / (60 + posição) em cada lista em que aparece. Quem aparece bem nas
 * duas buscas sobe; quem aparece só numa ainda entra. A vantagem do RRF é não precisar comparar
 * a escala da similaridade de cosseno com a relevância do full-text, que são incompatíveis.
 */
final class FusaoDeRanking {

    static final int CONSTANTE = 60;

    private FusaoDeRanking() {
    }

    static List<TrechoEncontrado> combinar(List<TrechoEncontrado> vetoriais, List<TrechoEncontrado> porPalavras,
            int limite) {
        Map<String, Double> pontos = new LinkedHashMap<>();
        Map<String, TrechoEncontrado> porId = new HashMap<>();
        somar(vetoriais, pontos, porId);
        somar(porPalavras, pontos, porId);
        return pontos.entrySet().stream()
                .sorted(Map.Entry.<String, Double>comparingByValue(Comparator.reverseOrder()))
                .limit(limite)
                .map(entrada -> porId.get(entrada.getKey()))
                .toList();
    }

    private static void somar(List<TrechoEncontrado> lista, Map<String, Double> pontos,
            Map<String, TrechoEncontrado> porId) {
        for (int posicao = 0; posicao < lista.size(); posicao++) {
            TrechoEncontrado trecho = lista.get(posicao);
            pontos.merge(trecho.id(), 1.0 / (CONSTANTE + posicao + 1), Double::sum);
            // Se o trecho veio das duas buscas, fica a versão da vetorial (que tem a similaridade de cosseno).
            porId.putIfAbsent(trecho.id(), trecho);
        }
    }
}
