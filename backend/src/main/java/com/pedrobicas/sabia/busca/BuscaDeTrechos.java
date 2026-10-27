package com.pedrobicas.sabia.busca;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;

import com.pedrobicas.sabia.config.PropriedadesSabia;

/**
 * Único ponto do sistema que busca trechos. Toda busca recebe o empresaId e filtra por ele.
 *
 * <p>É uma busca híbrida:
 * <ol>
 * <li>busca vetorial (significado), com o limiar de similaridade mínima;</li>
 * <li>busca por palavra-chave (termos exatos), pelo full-text search do PostgreSQL;</li>
 * <li>as duas listas são combinadas com Reciprocal Rank Fusion.</li>
 * </ol>
 *
 * <p>O limiar da busca vetorial continua sendo a porta do "não encontrei": se nenhum trecho passa
 * por ele, a resposta é vazia. A exceção são perguntas com termos exatos (números, códigos ou
 * trechos entre aspas), em que a busca por palavra-chave sozinha é confiável.
 */
@Service
public class BuscaDeTrechos {

    private static final Pattern TERMO_EXATO = Pattern.compile("\\d|\"[^\"]+\"");

    private final VectorStore vectorStore;
    private final BuscaPorPalavras buscaPorPalavras;
    private final PropriedadesSabia.Rag rag;

    public BuscaDeTrechos(VectorStore vectorStore, BuscaPorPalavras buscaPorPalavras, PropriedadesSabia propriedades) {
        this.vectorStore = vectorStore;
        this.buscaPorPalavras = buscaPorPalavras;
        this.rag = propriedades.rag();
    }

    public List<TrechoEncontrado> buscar(UUID empresaId, String consulta) {
        int candidatos = rag.trechosPorBusca() * 2;
        List<TrechoEncontrado> vetoriais = buscarPorSignificado(empresaId, consulta, candidatos);
        if (vetoriais.isEmpty() && !temTermoExato(consulta)) {
            return List.of();
        }
        List<TrechoEncontrado> porPalavras = somenteDaEmpresa(empresaId,
                buscaPorPalavras.buscar(empresaId, consulta, candidatos));
        return FusaoDeRanking.combinar(vetoriais, porPalavras, rag.trechosPorBusca());
    }

    static boolean temTermoExato(String consulta) {
        return consulta != null && TERMO_EXATO.matcher(consulta).find();
    }

    private List<TrechoEncontrado> buscarPorSignificado(UUID empresaId, String consulta, int limite) {
        Filter.Expression somenteDaEmpresa = new FilterExpressionBuilder()
                .eq(MetadadosDoTrecho.EMPRESA, empresaId.toString())
                .build();
        SearchRequest pedido = SearchRequest.builder()
                .query(consulta)
                .topK(limite)
                .similarityThreshold(rag.similaridadeMinima())
                .filterExpression(somenteDaEmpresa)
                .build();
        List<Document> encontrados = Optional.ofNullable(vectorStore.similaritySearch(pedido)).orElse(List.of());
        return somenteDaEmpresa(empresaId, encontrados.stream().map(TrechoEncontrado::de).toList());
    }

    /** Segunda trava: mesmo com o filtro na consulta, nada de outra empresa sai daqui. */
    private static List<TrechoEncontrado> somenteDaEmpresa(UUID empresaId, List<TrechoEncontrado> trechos) {
        return trechos.stream().filter(trecho -> empresaId.equals(trecho.empresaId())).toList();
    }
}
