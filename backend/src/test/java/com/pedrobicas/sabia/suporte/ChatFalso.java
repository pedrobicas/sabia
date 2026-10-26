package com.pedrobicas.sabia.suporte;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import reactor.core.publisher.Flux;

/**
 * Modelo de chat falso: responde sempre o mesmo texto, em pedaços, e guarda o último prompt recebido.
 */
public class ChatFalso implements ChatModel {

    public static final String RESPOSTA = "O expediente começa às 7h [1].";

    private final AtomicInteger chamadas = new AtomicInteger();
    private final AtomicReference<Prompt> ultimoPrompt = new AtomicReference<>();

    @Override
    public ChatResponse call(Prompt prompt) {
        registrar(prompt);
        return resposta(RESPOSTA);
    }

    @Override
    public Flux<ChatResponse> stream(Prompt prompt) {
        registrar(prompt);
        return Flux.just("O expediente ", "começa às 7h ", "[1].").map(ChatFalso::resposta);
    }

    public int chamadas() {
        return chamadas.get();
    }

    public Prompt ultimoPrompt() {
        return ultimoPrompt.get();
    }

    private void registrar(Prompt prompt) {
        chamadas.incrementAndGet();
        ultimoPrompt.set(prompt);
    }

    private static ChatResponse resposta(String texto) {
        return new ChatResponse(List.of(new Generation(new AssistantMessage(texto))));
    }
}
