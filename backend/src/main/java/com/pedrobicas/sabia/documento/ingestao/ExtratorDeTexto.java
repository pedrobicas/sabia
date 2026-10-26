package com.pedrobicas.sabia.documento.ingestao;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.documento.TipoDocumento;

/**
 * Extrai o texto de cada formato suportado. PDFs são lidos página por página para a citação apontar a página.
 */
@Component
public class ExtratorDeTexto {

    public List<Pagina> extrair(TipoDocumento tipo, byte[] conteudo) throws IOException {
        return switch (tipo) {
            case PDF -> extrairPdf(conteudo);
            case DOCX -> List.of(new Pagina(null, limpar(extrairDocx(conteudo))));
            case TXT, MARKDOWN -> List.of(new Pagina(null, limpar(new String(conteudo, StandardCharsets.UTF_8))));
        };
    }

    private List<Pagina> extrairPdf(byte[] conteudo) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(conteudo)) {
            PDFTextStripper leitor = new PDFTextStripper();
            leitor.setSortByPosition(true);
            List<Pagina> paginas = new ArrayList<>();
            for (int numero = 1; numero <= pdf.getNumberOfPages(); numero++) {
                leitor.setStartPage(numero);
                leitor.setEndPage(numero);
                String texto = limpar(leitor.getText(pdf));
                if (!texto.isBlank()) {
                    paginas.add(new Pagina(numero, texto));
                }
            }
            return paginas;
        }
    }

    private String extrairDocx(byte[] conteudo) throws IOException {
        try (XWPFDocument docx = new XWPFDocument(new ByteArrayInputStream(conteudo));
                XWPFWordExtractor leitor = new XWPFWordExtractor(docx)) {
            return leitor.getText();
        }
    }

    /** O PostgreSQL não aceita o caractere nulo em colunas de texto, e alguns PDFs o produzem. */
    private static String limpar(String texto) {
        return texto == null ? "" : texto.replace("\u0000", "").replace("\r\n", "\n").replace('\r', '\n');
    }
}
