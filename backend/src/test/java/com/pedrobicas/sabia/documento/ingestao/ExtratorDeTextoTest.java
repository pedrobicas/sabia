package com.pedrobicas.sabia.documento.ingestao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.junit.jupiter.api.Test;

import com.pedrobicas.sabia.documento.TipoDocumento;

class ExtratorDeTextoTest {

    private final ExtratorDeTexto extrator = new ExtratorDeTexto();

    @Test
    void pdfEhLidoPaginaPorPagina() throws IOException {
        byte[] pdf = criarPdf("Politica de trocas", "Prazo de sete dias");

        List<Pagina> paginas = extrator.extrair(TipoDocumento.PDF, pdf);

        assertThat(paginas).hasSize(2);
        assertThat(paginas.get(0).numero()).isEqualTo(1);
        assertThat(paginas.get(0).texto()).contains("Politica de trocas");
        assertThat(paginas.get(1).numero()).isEqualTo(2);
        assertThat(paginas.get(1).texto()).contains("Prazo de sete dias");
    }

    @Test
    void docxViraUmaUnicaPaginaSemNumero() throws IOException {
        byte[] docx = criarDocx("Manual do colaborador", "O uniforme é obrigatório.");

        List<Pagina> paginas = extrator.extrair(TipoDocumento.DOCX, docx);

        assertThat(paginas).hasSize(1);
        assertThat(paginas.get(0).numero()).isNull();
        assertThat(paginas.get(0).texto()).contains("Manual do colaborador").contains("O uniforme é obrigatório.");
    }

    @Test
    void markdownETextoSaoLidosEmUtf8() throws IOException {
        byte[] markdown = "# Férias\r\n\r\nSão 30 dias por ano.".getBytes(StandardCharsets.UTF_8);

        List<Pagina> paginas = extrator.extrair(TipoDocumento.MARKDOWN, markdown);

        assertThat(paginas).singleElement().satisfies(pagina -> {
            assertThat(pagina.texto()).isEqualTo("# Férias\n\nSão 30 dias por ano.");
            assertThat(pagina.numero()).isNull();
        });
    }

    @Test
    void removeCaracteresNulosQueOPostgresRecusa() throws IOException {
        byte[] texto = "Antes\u0000depois".getBytes(StandardCharsets.UTF_8);

        assertThat(extrator.extrair(TipoDocumento.TXT, texto).get(0).texto()).isEqualTo("Antesdepois");
    }

    @Test
    void arquivoCorrompidoGeraErro() {
        byte[] lixo = "isto não é um pdf".getBytes(StandardCharsets.UTF_8);

        assertThatThrownBy(() -> extrator.extrair(TipoDocumento.PDF, lixo)).isInstanceOf(IOException.class);
    }

    private static byte[] criarPdf(String... textosPorPagina) throws IOException {
        try (PDDocument pdf = new PDDocument(); ByteArrayOutputStream saida = new ByteArrayOutputStream()) {
            PDType1Font fonte = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            for (String texto : textosPorPagina) {
                PDPage pagina = new PDPage();
                pdf.addPage(pagina);
                try (PDPageContentStream conteudo = new PDPageContentStream(pdf, pagina)) {
                    conteudo.beginText();
                    conteudo.setFont(fonte, 12);
                    conteudo.newLineAtOffset(72, 700);
                    conteudo.showText(texto);
                    conteudo.endText();
                }
            }
            pdf.save(saida);
            return saida.toByteArray();
        }
    }

    private static byte[] criarDocx(String... paragrafos) throws IOException {
        try (XWPFDocument docx = new XWPFDocument(); ByteArrayOutputStream saida = new ByteArrayOutputStream()) {
            for (String paragrafo : paragrafos) {
                docx.createParagraph().createRun().setText(paragrafo);
            }
            docx.write(saida);
            return saida.toByteArray();
        }
    }
}
