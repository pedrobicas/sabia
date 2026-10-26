package com.pedrobicas.sabia.chat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pedrobicas.sabia.auth.UsuarioAtual;
import com.pedrobicas.sabia.chat.dto.ConversaResponse;
import com.pedrobicas.sabia.chat.dto.MensagemResponse;
import com.pedrobicas.sabia.comum.ApiException;

/**
 * Conversas e mensagens. Cada conversa pertence a um usuário; ninguém mais a enxerga.
 */
@Service
public class ConversaService {

    /** Quantas mensagens anteriores vão para o modelo, para ele entender perguntas de continuação. */
    private static final int MENSAGENS_DE_CONTEXTO = 6;

    private final ConversaRepository conversas;
    private final MensagemRepository mensagens;
    private final ObjectMapper json;

    public ConversaService(ConversaRepository conversas, MensagemRepository mensagens, ObjectMapper json) {
        this.conversas = conversas;
        this.mensagens = mensagens;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public List<ConversaResponse> listar(UsuarioAtual atual) {
        return conversas.findAllByUsuarioIdAndEmpresaIdOrderByAtualizadoEmDesc(atual.id(), atual.empresaId()).stream()
                .map(ConversaResponse::de)
                .toList();
    }

    @Transactional
    public ConversaResponse criar(UsuarioAtual atual, String titulo) {
        return ConversaResponse.de(conversas.save(new Conversa(atual.empresaId(), atual.id(), titulo)));
    }

    @Transactional
    public void remover(UsuarioAtual atual, UUID id) {
        conversas.delete(buscar(atual, id));
    }

    @Transactional(readOnly = true)
    public List<MensagemResponse> mensagens(UsuarioAtual atual, UUID conversaId) {
        buscar(atual, conversaId);
        return mensagens.findAllByConversaIdOrderByCriadoEmAsc(conversaId).stream().map(this::paraResposta).toList();
    }

    /** As últimas mensagens da conversa no formato do Spring AI. Também confere se a conversa é do usuário. */
    @Transactional(readOnly = true)
    public List<Message> historicoParaOModelo(UsuarioAtual atual, UUID conversaId) {
        buscar(atual, conversaId);
        List<Mensagem> ultimas = new ArrayList<>(
                mensagens.findByConversaIdOrderByCriadoEmDesc(conversaId, PageRequest.of(0, MENSAGENS_DE_CONTEXTO)));
        Collections.reverse(ultimas);
        return ultimas.stream()
                .map(mensagem -> mensagem.getPapel() == PapelMensagem.USUARIO
                        ? (Message) new UserMessage(mensagem.getConteudo())
                        : new AssistantMessage(mensagem.getConteudo()))
                .toList();
    }

    @Transactional
    public MensagemResponse registrarPergunta(UsuarioAtual atual, UUID conversaId, String pergunta) {
        Conversa conversa = buscar(atual, conversaId);
        conversa.nomearPelaPrimeiraPergunta(pergunta);
        conversa.tocar();
        conversas.save(conversa);
        return paraResposta(mensagens.save(new Mensagem(conversaId, PapelMensagem.USUARIO, pergunta.strip(), null)));
    }

    @Transactional
    public MensagemResponse registrarResposta(UUID conversaId, String resposta, List<Citacao> citacoes) {
        conversas.findById(conversaId).ifPresent(conversa -> {
            conversa.tocar();
            conversas.save(conversa);
        });
        return paraResposta(mensagens.save(
                new Mensagem(conversaId, PapelMensagem.ASSISTENTE, resposta, paraJson(citacoes))));
    }

    private Conversa buscar(UsuarioAtual atual, UUID id) {
        return conversas.findByIdAndUsuarioIdAndEmpresaId(id, atual.id(), atual.empresaId())
                .orElseThrow(() -> ApiException.naoEncontrado("Conversa não encontrada."));
    }

    private MensagemResponse paraResposta(Mensagem mensagem) {
        return new MensagemResponse(mensagem.getId(), mensagem.getPapel(), mensagem.getConteudo(),
                deJson(mensagem.getCitacoes()), mensagem.getCriadoEm());
    }

    private String paraJson(List<Citacao> citacoes) {
        try {
            return json.writeValueAsString(citacoes == null ? List.of() : citacoes);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Não foi possível gravar as citações", e);
        }
    }

    private List<Citacao> deJson(String citacoes) {
        if (citacoes == null || citacoes.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(citacoes, new TypeReference<List<Citacao>>() {
            });
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }
}
