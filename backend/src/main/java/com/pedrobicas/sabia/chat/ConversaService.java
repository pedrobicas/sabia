package com.pedrobicas.sabia.chat;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

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
import com.pedrobicas.sabia.chat.dto.AvaliacaoResponse;
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
    private final AvaliacaoRepository avaliacoes;
    private final ObjectMapper json;

    public ConversaService(ConversaRepository conversas, MensagemRepository mensagens, AvaliacaoRepository avaliacoes,
            ObjectMapper json) {
        this.conversas = conversas;
        this.mensagens = mensagens;
        this.avaliacoes = avaliacoes;
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

    @Transactional
    public ConversaResponse renomear(UsuarioAtual atual, UUID id, String titulo) {
        Conversa conversa = buscar(atual, id);
        conversa.renomear(titulo);
        return ConversaResponse.de(conversas.save(conversa));
    }

    @Transactional(readOnly = true)
    public List<MensagemResponse> mensagens(UsuarioAtual atual, UUID conversaId) {
        buscar(atual, conversaId);
        List<Mensagem> lista = mensagens.findAllByConversaIdOrderByCriadoEmAsc(conversaId);
        if (lista.isEmpty()) {
            return List.of();
        }
        Map<UUID, Avaliacao> avaliadas = avaliacoes.findAllByMensagemIdIn(lista.stream().map(Mensagem::getId).toList())
                .stream()
                .collect(Collectors.toMap(Avaliacao::getMensagemId, avaliacao -> avaliacao));
        return lista.stream().map(mensagem -> paraResposta(mensagem, avaliadas.get(mensagem.getId()))).toList();
    }

    /** Registra (ou troca) a avaliação de uma resposta. Só quem fez a pergunta pode avaliar. */
    @Transactional
    public AvaliacaoResponse avaliar(UsuarioAtual atual, UUID conversaId, UUID mensagemId, boolean util,
            String comentario) {
        Mensagem resposta = buscarResposta(atual, conversaId, mensagemId);
        Avaliacao avaliacao = avaliacoes.findById(resposta.getId())
                .map(existente -> {
                    existente.atualizar(util, comentario);
                    return existente;
                })
                .orElseGet(() -> new Avaliacao(resposta.getId(), atual.id(), util, comentario));
        return AvaliacaoResponse.de(avaliacoes.save(avaliacao));
    }

    @Transactional
    public void removerAvaliacao(UsuarioAtual atual, UUID conversaId, UUID mensagemId) {
        Mensagem resposta = buscarResposta(atual, conversaId, mensagemId);
        avaliacoes.findById(resposta.getId()).ifPresent(avaliacoes::delete);
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
        return paraResposta(mensagens.save(Mensagem.doUsuario(conversaId, pergunta.strip())), null);
    }

    @Transactional
    public MensagemResponse registrarResposta(UUID conversaId, String pergunta, String resposta, List<Citacao> citacoes) {
        conversas.findById(conversaId).ifPresent(conversa -> {
            conversa.tocar();
            conversas.save(conversa);
        });
        boolean semResposta = MontadorDePrompt.disseQueNaoEncontrou(resposta);
        return paraResposta(mensagens.save(
                Mensagem.doAssistente(conversaId, pergunta.strip(), resposta, paraJson(citacoes), semResposta)), null);
    }

    private Conversa buscar(UsuarioAtual atual, UUID id) {
        return conversas.findByIdAndUsuarioIdAndEmpresaId(id, atual.id(), atual.empresaId())
                .orElseThrow(() -> ApiException.naoEncontrado("Conversa não encontrada."));
    }

    private Mensagem buscarResposta(UsuarioAtual atual, UUID conversaId, UUID mensagemId) {
        buscar(atual, conversaId);
        Mensagem mensagem = mensagens.findByIdAndConversaId(mensagemId, conversaId)
                .orElseThrow(() -> ApiException.naoEncontrado("Mensagem não encontrada."));
        if (mensagem.getPapel() != PapelMensagem.ASSISTENTE) {
            throw ApiException.requisicaoInvalida("Só respostas do assistente podem ser avaliadas.");
        }
        return mensagem;
    }

    private MensagemResponse paraResposta(Mensagem mensagem, Avaliacao avaliacao) {
        return new MensagemResponse(mensagem.getId(), mensagem.getPapel(), mensagem.getConteudo(),
                deJson(mensagem.getCitacoes()), AvaliacaoResponse.de(avaliacao), mensagem.getCriadoEm());
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
