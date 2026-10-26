package com.pedrobicas.sabia.documento.ingestao;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.documento.Documento;
import com.pedrobicas.sabia.documento.DocumentoRepository;
import com.pedrobicas.sabia.documento.StatusDocumento;

/**
 * Se a aplicação reiniciar no meio de um processamento (deploy, queda), os documentos pendentes
 * voltam para a fila na próxima subida.
 */
@Component
public class RecuperacaoDeIngestao {

    private static final Logger log = LoggerFactory.getLogger(RecuperacaoDeIngestao.class);

    private final DocumentoRepository documentos;
    private final ProcessadorDeDocumentos processador;

    public RecuperacaoDeIngestao(DocumentoRepository documentos, ProcessadorDeDocumentos processador) {
        this.documentos = documentos;
        this.processador = processador;
    }

    @Order(1)
    @EventListener(ApplicationReadyEvent.class)
    public void retomarPendentes() {
        List<Documento> pendentes = documentos.findAllByStatusIn(
                List.of(StatusDocumento.ENVIADO, StatusDocumento.PROCESSANDO));
        if (!pendentes.isEmpty()) {
            log.info("Retomando o processamento de {} documento(s) pendente(s)", pendentes.size());
        }
        pendentes.forEach(documento -> processador.processarEmSegundoPlano(documento.getId()));
    }
}
