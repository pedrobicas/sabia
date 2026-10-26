package com.pedrobicas.sabia.documento;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.busca.IndiceDeTrechos;
import com.pedrobicas.sabia.comum.ApiException;
import com.pedrobicas.sabia.documento.ingestao.DocumentoEnviadoEvent;

@Service
public class DocumentoService {

    private final DocumentoRepository documentos;
    private final DocumentoArquivoRepository arquivos;
    private final IndiceDeTrechos indice;
    private final ApplicationEventPublisher eventos;

    public DocumentoService(DocumentoRepository documentos, DocumentoArquivoRepository arquivos,
            IndiceDeTrechos indice, ApplicationEventPublisher eventos) {
        this.documentos = documentos;
        this.arquivos = arquivos;
        this.indice = indice;
        this.eventos = eventos;
    }

    @Transactional(readOnly = true)
    public List<DocumentoResponse> listar(UsuarioAtual atual) {
        return documentos.findAllByEmpresaIdOrderByCriadoEmDesc(atual.empresaId()).stream()
                .map(DocumentoResponse::de)
                .toList();
    }

    @Transactional
    public DocumentoResponse enviar(UsuarioAtual atual, MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw ApiException.requisicaoInvalida("Escolha um arquivo para enviar.");
        }
        try {
            String nome = arquivo.getOriginalFilename() == null ? "documento" : arquivo.getOriginalFilename();
            return registrar(atual.empresaId(), atual.id(), nome, arquivo.getBytes());
        } catch (IOException e) {
            throw ApiException.requisicaoInvalida("Não foi possível ler o arquivo enviado.");
        }
    }

    /**
     * Salva o documento e o arquivo original e coloca na fila de processamento.
     * Usado pelo upload e pela carga de dados de demonstração.
     */
    @Transactional
    public DocumentoResponse registrar(UUID empresaId, UUID enviadoPor, String nomeOriginal, byte[] conteudo) {
        String nome = limparNome(nomeOriginal);
        TipoDocumento tipo = TipoDocumento.doNomeDoArquivo(nome).orElseThrow(() -> ApiException.requisicaoInvalida(
                "Formato não suportado. Envie PDF, DOCX, TXT ou Markdown (.md)."));
        if (conteudo.length == 0) {
            throw ApiException.requisicaoInvalida("O arquivo está vazio.");
        }
        Documento documento = documentos.save(new Documento(empresaId, nome, tipo, conteudo.length, enviadoPor));
        arquivos.save(new DocumentoArquivo(documento.getId(), conteudo));
        eventos.publishEvent(new DocumentoEnviadoEvent(documento.getId()));
        return DocumentoResponse.de(documento);
    }

    @Transactional
    public void remover(UsuarioAtual atual, UUID id) {
        Documento documento = buscar(atual.empresaId(), id);
        indice.removerTrechosDoDocumento(documento.getId());
        // O arquivo original sai junto (ON DELETE CASCADE na tabela documento_arquivo).
        documentos.delete(documento);
    }

    @Transactional
    public DocumentoResponse reprocessar(UsuarioAtual atual, UUID id) {
        Documento documento = buscar(atual.empresaId(), id);
        if (documento.getStatus().naFila()) {
            throw ApiException.conflito("Este documento já está sendo processado.");
        }
        documento.voltarParaFila();
        documentos.save(documento);
        eventos.publishEvent(new DocumentoEnviadoEvent(documento.getId()));
        return DocumentoResponse.de(documento);
    }

    @Transactional(readOnly = true)
    public ArquivoBaixado baixar(UsuarioAtual atual, UUID id) {
        Documento documento = buscar(atual.empresaId(), id);
        byte[] conteudo = arquivos.findById(documento.getId())
                .map(DocumentoArquivo::getConteudo)
                .orElseThrow(() -> ApiException.naoEncontrado("Arquivo original não encontrado."));
        return new ArquivoBaixado(documento.getNome(), documento.getTipo().mediaType(), conteudo);
    }

    private Documento buscar(UUID empresaId, UUID id) {
        return documentos.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Documento não encontrado."));
    }

    /** Remove caminhos ("C:\\pasta\\arquivo.pdf" vira "arquivo.pdf") e limita o tamanho do nome. */
    static String limparNome(String nome) {
        String semCaminho = nome.replaceAll(".*[/\\\\]", "").strip();
        if (semCaminho.isEmpty()) {
            semCaminho = "documento";
        }
        return semCaminho.length() > 255 ? semCaminho.substring(semCaminho.length() - 255) : semCaminho;
    }

    public record ArquivoBaixado(String nome, String mediaType, byte[] conteudo) {
    }
}
