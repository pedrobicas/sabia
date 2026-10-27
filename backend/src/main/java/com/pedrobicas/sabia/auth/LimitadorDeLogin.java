package com.pedrobicas.sabia.auth;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.pedrobicas.sabia.comum.ApiException;

/**
 * Freia tentativas de adivinhar senha. Conta as falhas por e-mail (protege uma conta) e por IP
 * (protege contra quem testa muitas contas de uma vez) numa janela deslizante.
 *
 * <p>Fica em memória: basta para uma instância só. Com várias instâncias atrás de um balanceador,
 * o contador precisaria ir para o banco ou para um Redis.
 */
@Component
public class LimitadorDeLogin {

    private static final int MAXIMO_DE_CHAVES = 50_000;

    private final int tentativasPorEmail;
    private final int tentativasPorIp;
    private final Duration janela;
    private final Clock relogio;
    private final Map<String, Deque<Instant>> falhas = new ConcurrentHashMap<>();

    public LimitadorDeLogin(
            @Value("${sabia.login.tentativas-por-email:5}") int tentativasPorEmail,
            @Value("${sabia.login.tentativas-por-ip:30}") int tentativasPorIp,
            @Value("${sabia.login.janela-minutos:15}") long janelaEmMinutos,
            Clock relogio) {
        this.tentativasPorEmail = tentativasPorEmail;
        this.tentativasPorIp = tentativasPorIp;
        this.janela = Duration.ofMinutes(janelaEmMinutos);
        this.relogio = relogio;
    }

    /** Lança 429 se o e-mail ou o IP já erraram demais na janela atual. */
    public void verificar(String email, String ip) {
        Instant agora = relogio.instant();
        Optional<Instant> liberaEm = bloqueadoAte(chaveDoEmail(email), tentativasPorEmail, agora)
                .or(() -> bloqueadoAte(chaveDoIp(ip), tentativasPorIp, agora));
        if (liberaEm.isPresent()) {
            long minutos = Math.max(1, (Duration.between(agora, liberaEm.get()).toSeconds() + 59) / 60);
            throw ApiException.limiteExcedido("Muitas tentativas com senha errada. Tente de novo em "
                    + minutos + (minutos == 1 ? " minuto." : " minutos."));
        }
    }

    public void registrarFalha(String email, String ip) {
        Instant agora = relogio.instant();
        if (falhas.size() > MAXIMO_DE_CHAVES) {
            falhas.entrySet().removeIf(entrada -> semFalhasRecentes(entrada.getValue(), agora));
        }
        registrar(chaveDoEmail(email), agora);
        registrar(chaveDoIp(ip), agora);
    }

    /** Entrou com a senha certa: a conta volta a ter todas as tentativas. O contador do IP continua. */
    public void registrarSucesso(String email) {
        falhas.remove(chaveDoEmail(email));
    }

    private Optional<Instant> bloqueadoAte(String chave, int limite, Instant agora) {
        Deque<Instant> registro = falhas.get(chave);
        if (registro == null) {
            return Optional.empty();
        }
        synchronized (registro) {
            descartarAntigas(registro, agora);
            if (registro.size() < limite) {
                return Optional.empty();
            }
            // Libera quando sobrarem menos falhas que o limite, ou seja, quando a falha de posição
            // (tamanho - limite) sair da janela.
            return registro.stream().skip(registro.size() - limite).findFirst().map(falha -> falha.plus(janela));
        }
    }

    private void registrar(String chave, Instant agora) {
        Deque<Instant> registro = falhas.computeIfAbsent(chave, k -> new ArrayDeque<>());
        synchronized (registro) {
            descartarAntigas(registro, agora);
            registro.addLast(agora);
        }
    }

    private boolean semFalhasRecentes(Deque<Instant> registro, Instant agora) {
        synchronized (registro) {
            descartarAntigas(registro, agora);
            return registro.isEmpty();
        }
    }

    private void descartarAntigas(Deque<Instant> registro, Instant agora) {
        Instant limite = agora.minus(janela);
        while (!registro.isEmpty() && !registro.peekFirst().isAfter(limite)) {
            registro.pollFirst();
        }
    }

    private static String chaveDoEmail(String email) {
        return "email:" + email;
    }

    private static String chaveDoIp(String ip) {
        return "ip:" + (ip == null ? "desconhecido" : ip);
    }
}
