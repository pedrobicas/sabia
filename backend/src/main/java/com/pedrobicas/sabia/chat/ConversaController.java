package com.pedrobicas.sabia.chat;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.chat.dto.ConversaResponse;
import com.pedrobicas.sabia.chat.dto.MensagemResponse;
import com.pedrobicas.sabia.chat.dto.NovaConversaRequest;
import com.pedrobicas.sabia.chat.dto.PerguntaRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/conversas")
@Tag(name = "Conversas")
public class ConversaController {

    private final ConversaService conversas;
    private final AssistenteService assistente;

    public ConversaController(ConversaService conversas, AssistenteService assistente) {
        this.conversas = conversas;
        this.assistente = assistente;
    }

    @GetMapping
    @Operation(summary = "Lista as conversas do usuário, da mais recente para a mais antiga")
    public List<ConversaResponse> listar(UsuarioAtual usuario) {
        return conversas.listar(usuario);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Cria uma conversa")
    public ConversaResponse criar(UsuarioAtual usuario, @Valid @RequestBody(required = false) NovaConversaRequest pedido) {
        return conversas.criar(usuario, pedido == null ? null : pedido.titulo());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Apaga a conversa e as mensagens dela")
    public void remover(UsuarioAtual usuario, @PathVariable UUID id) {
        conversas.remover(usuario, id);
    }

    @GetMapping("/{id}/mensagens")
    @Operation(summary = "Mensagens da conversa, em ordem cronológica, com as citações de cada resposta")
    public List<MensagemResponse> mensagens(UsuarioAtual usuario, @PathVariable UUID id) {
        return conversas.mensagens(usuario, id);
    }

    @PostMapping(value = "/{id}/perguntas", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Faz uma pergunta. A resposta chega em streaming (eventos citacoes, token, fim e erro).")
    public SseEmitter perguntar(UsuarioAtual usuario, @PathVariable UUID id, @Valid @RequestBody PerguntaRequest pedido) {
        return assistente.responder(usuario, id, pedido.pergunta());
    }
}
