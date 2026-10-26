package com.pedrobicas.sabia.documento.ingestao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import com.pedrobicas.sabia.busca.IndiceDeTrechos;
import com.pedrobicas.sabia.documento.Documento;
import com.pedrobicas.sabia.documento.DocumentoArquivo;
import com.pedrobicas.sabia.documento.DocumentoArquivoRepository;
import com.pedrobicas.sabia.documento.DocumentoRepository;

/**
 * Pipeline de ingestão: extrai o texto, divide em trechos e indexa. Roda fora da requisição do upload.
 */
@Component
public class ProcessadorDeDocumentos {

    private static final Logger log = LoggerFactory.getLogger(ProcessadorDeDocumentos.class);

    private final DocumentoRepository documentos;
    private final DocumentoArquivoRepository arquivos;
    private final ExtratorDeTexto extrator;
    private final DivisorDeTexto divisor;
    private final IndiceDeTrechos indice;

    public ProcessadorDeDocumentos(DocumentoRepository documentos, DocumentoArquivoRepository arquivos,
            ExtratorDeTexto extrator, DivisorDeTexto divisor, IndiceDeTrechos indice) {
        this.documentos = documentos;
        this.arquivos = arquivos;
        this.extrator = extrator;
        this.divisor = divisor;
        this.indice = indice;
    }

    /** Disparado só depois que a transação do upload confirma, para o documento já existir no banco. */
    @Async("executorIngestao")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void aoEnviarDocumento(DocumentoEnviadoEvent evento) {
        processar(evento.documentoId());
    }

    @Async("executorIngestao")
    public void processarEmSegundoPlano(UUID documentoId) {
        processar(documentoId);
    }

    public void processar(UUID documentoId) {
        Optional<Documento> encontrado = documentos.findById(documentoId);
        if (encontrado.isEmpty()) {
            return;
        }
        Documento documento = encontrado.get();
        documento.marcarProcessando();
        documentos.save(documento);

        List<Trecho> trechos;
        try {
            byte[] conteudo = arquivos.findById(documentoId)
                    .map(DocumentoArquivo::getConteudo)
                    .orElseThrow(() -> new IllegalStateException("Arquivo original não encontrado."));
            trechos = divisor.dividir(extrator.extrair(documento.getTipo(), conteudo));
        } catch (Exception e) {
            log.warn("Não foi possível ler o documento {}", documentoId, e);
            finalizar(documentoId, d -> d.marcarErro(
                    "Não foi possível ler este arquivo. Ele pode estar corrompido ou protegido por senha."));
            return;
        }

        if (trechos.isEmpty()) {
            finalizar(documentoId, d -> d.marcarErro(
                    "Nenhum texto encontrado. Se for um PDF escaneado (imagem), ele precisa passar por OCR antes."));
            return;
        }

        try {
            indice.substituirTrechos(documento, trechos);
        } catch (Exception e) {
            log.warn("Falha ao gerar os vetores do documento {}", documentoId, e);
            finalizar(documentoId, d -> d.marcarErro(
                    "O serviço de IA não conseguiu gerar os vetores. Confira IA_BASE_URL, IA_API_KEY e se o "
                            + "modelo de embedding está disponível, e depois reprocesse o documento."));
            return;
        }

        int total = trechos.size();
        finalizar(documentoId, d -> d.marcarPronto(total));
        log.info("Documento {} pronto com {} trechos", documentoId, total);
    }

    /** Aplica o status final. Se o documento foi excluído no meio do caminho, limpa os trechos que sobraram. */
    private void finalizar(UUID documentoId, Consumer<Documento> mudanca) {
        documentos.findById(documentoId).ifPresentOrElse(documento -> {
            mudanca.accept(documento);
            documentos.save(documento);
        }, () -> indice.removerTrechosDoDocumento(documentoId));
    }
}
