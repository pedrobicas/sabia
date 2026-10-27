package com.pedrobicas.sabia.busca;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.pedrobicas.sabia.documento.Documento;
import com.pedrobicas.sabia.documento.DocumentoRepository;
import com.pedrobicas.sabia.documento.TipoDocumento;
import com.pedrobicas.sabia.documento.ingestao.Trecho;
import com.pedrobicas.sabia.empresa.Empresa;
import com.pedrobicas.sabia.empresa.EmpresaRepository;
import com.pedrobicas.sabia.suporte.TesteDeIntegracao;

@TesteDeIntegracao
class BuscaPorPalavrasIT {

    @Autowired
    EmpresaRepository empresas;

    @Autowired
    DocumentoRepository documentos;

    @Autowired
    IndiceDeTrechos indice;

    @Autowired
    BuscaPorPalavras buscaPorPalavras;

    @Test
    void encontraCodigosENomesComRadicalEmPortugues() {
        Empresa loja = empresas.save(new Empresa("Loja"));
        indice.substituirTrechos(documento(loja, "catalogo.md"), List.of(
                new Trecho(null, 0, "O moedor elétrico tem o código SKU-4471 e garantia de um ano."),
                new Trecho(null, 1, "As entregas acontecem de segunda a sábado.")));

        assertThat(buscaPorPalavras.buscar(loja.getId(), "produto 4471", 5))
                .extracting(TrechoEncontrado::texto).singleElement().asString().contains("SKU-4471");
        // "entrega" e "entregas" têm o mesmo radical no dicionário em português.
        assertThat(buscaPorPalavras.buscar(loja.getId(), "Vocês fazem entrega?", 5))
                .extracting(TrechoEncontrado::texto).singleElement().asString().contains("entregas");
    }

    @Test
    void trechosComMaisTermosDaPerguntaVemPrimeiro() {
        Empresa loja = empresas.save(new Empresa("Loja ordenada"));
        indice.substituirTrechos(documento(loja, "faq.md"), List.of(
                new Trecho(null, 0, "O horário de funcionamento é das 8h às 18h."),
                new Trecho(null, 1, "Aos domingos, o horário de funcionamento é das 9h às 13h.")));

        List<TrechoEncontrado> encontrados = buscaPorPalavras.buscar(loja.getId(), "horário de funcionamento aos domingos", 5);

        assertThat(encontrados).hasSize(2);
        assertThat(encontrados.get(0).texto()).contains("domingos");
    }

    @Test
    void nuncaDevolveTrechoDeOutraEmpresa() {
        Empresa a = empresas.save(new Empresa("Empresa A"));
        Empresa b = empresas.save(new Empresa("Empresa B"));
        indice.substituirTrechos(documento(a, "a.md"), List.of(new Trecho(null, 0, "Senha do cofre: 9182.")));

        assertThat(buscaPorPalavras.buscar(b.getId(), "senha do cofre 9182", 5)).isEmpty();
        assertThat(buscaPorPalavras.buscar(a.getId(), "senha do cofre 9182", 5)).hasSize(1);
    }

    @Test
    void perguntaSoComPalavrasVaziasNaoQuebra() {
        Empresa loja = empresas.save(new Empresa("Loja sem termos"));

        assertThat(buscaPorPalavras.buscar(loja.getId(), "o que é de?", 5)).isEmpty();
        assertThat(buscaPorPalavras.buscar(loja.getId(), "   ", 5)).isEmpty();
    }

    private Documento documento(Empresa empresa, String nome) {
        Documento documento = new Documento(empresa.getId(), nome, TipoDocumento.doNomeDoArquivo(nome).orElseThrow(), 100, null);
        documento.marcarPronto(1);
        return documentos.save(documento);
    }
}
