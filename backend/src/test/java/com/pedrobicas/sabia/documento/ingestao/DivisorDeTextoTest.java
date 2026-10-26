package com.pedrobicas.sabia.documento.ingestao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

class DivisorDeTextoTest {

    private final DivisorDeTexto divisor = new DivisorDeTexto(200, 40);

    @Test
    void textoCurtoViraUmUnicoTrecho() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(1, "Horário de funcionamento: das 7h às 20h.")));

        assertThat(trechos).hasSize(1);
        assertThat(trechos.get(0).texto()).isEqualTo("Horário de funcionamento: das 7h às 20h.");
        assertThat(trechos.get(0).pagina()).isEqualTo(1);
    }

    @Test
    void nenhumTrechoPassaDoTamanhoMaximo() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(null, textoLongo(60))));

        assertThat(trechos).hasSizeGreaterThan(3);
        assertThat(trechos).allSatisfy(trecho -> assertThat(trecho.texto().length()).isLessThanOrEqualTo(200));
    }

    @Test
    void nenhumaPalavraSePerdeNaDivisao() {
        String texto = textoLongo(60);
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(null, texto)));

        String tudoJunto = trechos.stream().map(Trecho::texto).collect(Collectors.joining(" "));
        Arrays.stream(texto.split("\\s+")).forEach(palavra -> assertThat(tudoJunto).contains(palavra));
    }

    @Test
    void trechosVizinhosCompartilhamUmPedacoDeTexto() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(null, textoLongo(30))));

        for (int i = 1; i < trechos.size(); i++) {
            String anterior = trechos.get(i - 1).texto();
            String primeiraPalavra = trechos.get(i).texto().split("\\s+")[0];
            assertThat(anterior).contains(primeiraPalavra);
        }
    }

    @Test
    void cortaNoFimDeFraseQuandoPossivel() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(null, textoLongo(30))));

        assertThat(trechos.subList(0, trechos.size() - 1))
                .allSatisfy(trecho -> assertThat(trecho.texto()).endsWith("."));
    }

    @Test
    void trechosNaoAtravessamPaginasEGuardamONumeroDaPagina() {
        List<Trecho> trechos = divisor.dividir(List.of(
                new Pagina(1, "Conteúdo da primeira página."),
                new Pagina(2, "Conteúdo da segunda página.")));

        assertThat(trechos).extracting(Trecho::pagina).containsExactly(1, 2);
        assertThat(trechos).extracting(Trecho::ordem).containsExactly(0, 1);
    }

    @Test
    void paginasVaziasSaoIgnoradas() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(1, "   \n\n  "), new Pagina(2, "Texto.")));

        assertThat(trechos).hasSize(1);
        assertThat(trechos.get(0).pagina()).isEqualTo(2);
    }

    @Test
    void textoSemEspacosTambemTermina() {
        List<Trecho> trechos = divisor.dividir(List.of(new Pagina(null, "a".repeat(1000))));

        assertThat(trechos).isNotEmpty();
        assertThat(trechos).allSatisfy(trecho -> assertThat(trecho.texto().length()).isLessThanOrEqualTo(200));
    }

    @Test
    void normalizaEspacosELinhasEmBranco() {
        assertThat(DivisorDeTexto.normalizar("  Olá,\t\tmundo  \n\n\n\n\nSegunda   linha ")).isEqualTo("Olá, mundo\n\nSegunda linha");
    }

    @Test
    void recusaConfiguracaoInvalida() {
        assertThatThrownBy(() -> new DivisorDeTexto(50, 10)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DivisorDeTexto(200, 150)).isInstanceOf(IllegalArgumentException.class);
    }

    private static String textoLongo(int frases) {
        return IntStream.rangeClosed(1, frases)
                .mapToObj(i -> "Esta é a frase número " + i + " do manual do colaborador.")
                .collect(Collectors.joining(" "));
    }
}
