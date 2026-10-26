package com.pedrobicas.sabia.suporte;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;

/**
 * Modelo de embedding determinístico para testes: cada palavra cai numa posição do vetor (hashing).
 * Textos com palavras em comum ficam próximos, sem depender de nenhum serviço externo.
 */
public class EmbeddingFalso implements EmbeddingModel {

    public static final int DIMENSOES = 1024;

    @Override
    public EmbeddingResponse call(EmbeddingRequest request) {
        List<Embedding> embeddings = new ArrayList<>();
        List<String> textos = request.getInstructions();
        for (int i = 0; i < textos.size(); i++) {
            embeddings.add(new Embedding(vetor(textos.get(i)), i));
        }
        return new EmbeddingResponse(embeddings);
    }

    @Override
    public float[] embed(Document document) {
        return vetor(document.getText());
    }

    @Override
    public int dimensions() {
        return DIMENSOES;
    }

    static float[] vetor(String texto) {
        float[] vetor = new float[DIMENSOES];
        String semAcento = Normalizer.normalize(texto == null ? "" : texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT);
        for (String palavra : semAcento.split("[^a-z0-9]+")) {
            if (palavra.length() > 2) {
                vetor[Math.floorMod(palavra.hashCode(), DIMENSOES)] += 1f;
            }
        }
        double norma = 0;
        for (float v : vetor) {
            norma += v * v;
        }
        if (norma == 0) {
            vetor[0] = 1f;
            return vetor;
        }
        float raiz = (float) Math.sqrt(norma);
        for (int i = 0; i < vetor.length; i++) {
            vetor[i] /= raiz;
        }
        return vetor;
    }
}
