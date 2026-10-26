package com.pedrobicas.sabia.documento;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.documento.DocumentoService.ArquivoBaixado;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/api/documentos")
@Tag(name = "Documentos")
public class DocumentoController {

    private final DocumentoService service;

    public DocumentoController(DocumentoService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Lista os documentos da empresa, com o status de processamento")
    public List<DocumentoResponse> listar(UsuarioAtual usuario) {
        return service.listar(usuario);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Envia um documento (PDF, DOCX, TXT ou Markdown, até 10 MB). O processamento é assíncrono.")
    public DocumentoResponse enviar(UsuarioAtual usuario, @RequestParam("arquivo") MultipartFile arquivo) {
        return service.enviar(usuario, arquivo);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Exclui o documento e todos os seus trechos do índice")
    public void remover(UsuarioAtual usuario, @PathVariable UUID id) {
        service.remover(usuario, id);
    }

    @PostMapping("/{id}/reprocessar")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Coloca o documento de novo na fila (útil depois de trocar o modelo de embedding)")
    public DocumentoResponse reprocessar(UsuarioAtual usuario, @PathVariable UUID id) {
        return service.reprocessar(usuario, id);
    }

    @GetMapping("/{id}/arquivo")
    @Operation(summary = "Baixa o arquivo original")
    public ResponseEntity<byte[]> baixar(UsuarioAtual usuario, @PathVariable UUID id) {
        ArquivoBaixado arquivo = service.baixar(usuario, id);
        ContentDisposition disposicao = ContentDisposition.attachment()
                .filename(arquivo.nome(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposicao.toString())
                .contentType(MediaType.parseMediaType(arquivo.mediaType()))
                .body(arquivo.conteudo());
    }
}
