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

/**
 * O teste mais importante do projeto: duas empresas com documentos quase iguais,
 * e a busca de uma nunca pode devolver trecho da outra.
 */
@TesteDeIntegracao
class IsolamentoEntreEmpresasIT {

    @Autowired
    EmpresaRepository empresas;

    @Autowired
    DocumentoRepository documentos;

    @Autowired
    IndiceDeTrechos indice;

    @Autowired
    BuscaDeTrechos busca;

    @Test
    void buscaDeUmaEmpresaNuncaTrazTrechosDeOutra() {
        Empresa cafeteria = empresas.save(new Empresa("Cafeteria"));
        Empresa livraria = empresas.save(new Empresa("Livraria"));
        Documento politicaDaCafeteria = documento(cafeteria, "politica-cafeteria.md");
        Documento politicaDaLivraria = documento(livraria, "politica-livraria.md");

        indice.substituirTrechos(politicaDaCafeteria, List.of(
                new Trecho(null, 0, "Política de reembolso: devolvemos o dinheiro em até 7 dias corridos.")));
        indice.substituirTrechos(politicaDaLivraria, List.of(
                new Trecho(null, 0, "Política de reembolso: devolvemos o dinheiro em até 30 dias corridos.")));

        List<TrechoEncontrado> daCafeteria = busca.buscar(cafeteria.getId(), "Qual é a política de reembolso?");
        List<TrechoEncontrado> daLivraria = busca.buscar(livraria.getId(), "Qual é a política de reembolso?");

        assertThat(daCafeteria).isNotEmpty()
                .allSatisfy(trecho -> assertThat(trecho.empresaId()).isEqualTo(cafeteria.getId()))
                .noneMatch(trecho -> trecho.texto().contains("30 dias"));
        assertThat(daLivraria).isNotEmpty()
                .allSatisfy(trecho -> assertThat(trecho.empresaId()).isEqualTo(livraria.getId()))
                .noneMatch(trecho -> trecho.texto().contains("7 dias"));
    }

    @Test
    void trechoEncontradoTrazOsDadosDaCitacao() {
        Empresa empresa = empresas.save(new Empresa("Empresa com PDF"));
        Documento manual = documento(empresa, "manual.pdf");

        indice.substituirTrechos(manual, List.of(new Trecho(3, 0, "O uniforme completo é obrigatório no salão.")));

        List<TrechoEncontrado> encontrados = busca.buscar(empresa.getId(), "uniforme obrigatório");

        assertThat(encontrados).singleElement().satisfies(trecho -> {
            assertThat(trecho.documentoId()).isEqualTo(manual.getId());
            assertThat(trecho.documentoNome()).isEqualTo("manual.pdf");
            assertThat(trecho.pagina()).isEqualTo(3);
            assertThat(trecho.similaridade()).isGreaterThan(0.0);
        });
    }

    @Test
    void reprocessarSubstituiERemoverApagaOsTrechos() {
        Empresa empresa = empresas.save(new Empresa("Empresa que reprocessa"));
        Documento faq = documento(empresa, "faq.md");

        indice.substituirTrechos(faq, List.of(new Trecho(null, 0, "Versão antiga do horário de atendimento.")));
        indice.substituirTrechos(faq, List.of(new Trecho(null, 0, "Versão nova do horário de atendimento.")));
        assertThat(busca.buscar(empresa.getId(), "horário de atendimento"))
                .extracting(TrechoEncontrado::texto)
                .containsExactly("Versão nova do horário de atendimento.");

        indice.removerTrechosDoDocumento(faq.getId());
        assertThat(busca.buscar(empresa.getId(), "horário de atendimento")).isEmpty();
    }

    private Documento documento(Empresa empresa, String nome) {
        TipoDocumento tipo = TipoDocumento.doNomeDoArquivo(nome).orElseThrow();
        Documento documento = new Documento(empresa.getId(), nome, tipo, 100, null);
        documento.marcarPronto(1); // fora da fila: aqui os trechos são indexados direto pelo teste
        return documentos.save(documento);
    }
}
