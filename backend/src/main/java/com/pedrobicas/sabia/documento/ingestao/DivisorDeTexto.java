package com.pedrobicas.sabia.documento.ingestao;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.config.PropriedadesSabia;

/**
 * Divide o texto em trechos de até {@code tamanho} caracteres, com {@code sobreposicao} entre trechos vizinhos.
 *
 * <p>O corte procura, nesta ordem, um fim de parágrafo, um fim de frase e um espaço, para não partir
 * palavras nem ideias no meio. A sobreposição evita que uma informação na fronteira entre dois trechos
 * se perca na busca.
 */
@Component
public class DivisorDeTexto {

    private final int tamanho;
    private final int sobreposicao;

    @Autowired
    public DivisorDeTexto(PropriedadesSabia propriedades) {
        this(propriedades.rag().tamanhoTrecho(), propriedades.rag().sobreposicao());
    }

    public DivisorDeTexto(int tamanho, int sobreposicao) {
        if (tamanho < 100) {
            throw new IllegalArgumentException("O tamanho do trecho precisa ser de pelo menos 100 caracteres.");
        }
        if (sobreposicao < 0 || sobreposicao >= tamanho / 2) {
            throw new IllegalArgumentException("A sobreposição precisa ser menor que metade do tamanho do trecho.");
        }
        this.tamanho = tamanho;
        this.sobreposicao = sobreposicao;
    }

    public List<Trecho> dividir(List<Pagina> paginas) {
        List<Trecho> trechos = new ArrayList<>();
        int ordem = 0;
        for (Pagina pagina : paginas) {
            String texto = normalizar(pagina.texto());
            int inicio = 0;
            while (inicio < texto.length()) {
                int fim = Math.min(inicio + tamanho, texto.length());
                if (fim < texto.length()) {
                    fim = melhorCorte(texto, inicio, fim);
                }
                String pedaco = texto.substring(inicio, fim).strip();
                if (!pedaco.isEmpty()) {
                    trechos.add(new Trecho(pagina.numero(), ordem++, pedaco));
                }
                if (fim >= texto.length()) {
                    break;
                }
                inicio = proximoInicio(texto, inicio, fim);
            }
        }
        return trechos;
    }

    /** Junta espaços repetidos e linhas em branco em excesso, preservando os parágrafos. */
    static String normalizar(String texto) {
        if (texto == null) {
            return "";
        }
        return texto
                .replaceAll("[ \\t\\x0B\\f]+", " ")
                .replaceAll(" *\\n *", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .strip();
    }

    private int melhorCorte(String texto, int inicio, int fim) {
        int minimo = inicio + tamanho / 2;

        int paragrafo = texto.lastIndexOf("\n\n", fim);
        if (paragrafo >= minimo) {
            return paragrafo;
        }
        for (int i = fim - 1; i >= minimo; i--) {
            char c = texto.charAt(i);
            boolean fimDeFrase = c == '.' || c == '!' || c == '?' || c == '\n';
            if (fimDeFrase && (i + 1 >= texto.length() || Character.isWhitespace(texto.charAt(i + 1)))) {
                return i + 1;
            }
        }
        int espaco = texto.lastIndexOf(' ', fim);
        if (espaco >= minimo) {
            return espaco;
        }
        return fim;
    }

    /** Volta {@code sobreposicao} caracteres e avança até o começo de uma palavra. Sempre avança em relação ao trecho anterior. */
    private int proximoInicio(String texto, int inicioAnterior, int fim) {
        int proximo = fim - sobreposicao;
        if (proximo <= inicioAnterior) {
            return fim;
        }
        while (proximo < fim && !Character.isWhitespace(texto.charAt(proximo - 1))) {
            proximo++;
        }
        return proximo;
    }
}
