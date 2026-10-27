package com.pedrobicas.sabia.analise;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.pedrobicas.sabia.analise.PainelDeAnalises.DocumentoCitado;
import com.pedrobicas.sabia.analise.PainelDeAnalises.PerguntaSemResposta;
import com.pedrobicas.sabia.analise.PainelDeAnalises.PerguntasDoDia;
import com.pedrobicas.sabia.analise.PainelDeAnalises.RespostaMalAvaliada;
import com.pedrobicas.sabia.demo.CargaDeDemonstracao;
import com.pedrobicas.sabia.empresa.EmpresaRepository;

/**
 * Consultas agregadas sobre as perguntas da empresa. Usa SQL direto porque são relatórios,
 * não operações sobre entidades. Todas as consultas filtram pela empresa de quem pede.
 */
@Service
public class AnaliseService {

    private static final String BASE = """
            FROM mensagem m
            JOIN conversa c ON c.id = m.conversa_id
            WHERE c.empresa_id = ? AND m.papel = 'ASSISTENTE' AND m.criado_em >= ?
            """;

    private final JdbcTemplate jdbc;
    private final Clock relogio;
    private final ZoneId fuso;
    private final EmpresaRepository empresas;
    private final CargaDeDemonstracao demonstracao;

    public AnaliseService(JdbcTemplate jdbc, Clock relogio, @Value("${sabia.fuso-horario:America/Sao_Paulo}") String fuso,
            EmpresaRepository empresas, CargaDeDemonstracao demonstracao) {
        this.jdbc = jdbc;
        this.relogio = relogio;
        this.fuso = ZoneId.of(fuso);
        this.empresas = empresas;
        this.demonstracao = demonstracao;
    }

    @Transactional(readOnly = true)
    public PainelDeAnalises painel(UUID empresaId, int dias) {
        LocalDate hoje = LocalDate.now(relogio.withZone(fuso));
        LocalDate primeiroDia = hoje.minusDays(dias - 1L);
        Timestamp desde = Timestamp.from(primeiroDia.atStartOfDay(fuso).toInstant());

        Map<String, Object> totais = jdbc.queryForMap("""
                SELECT count(*) AS total, count(*) FILTER (WHERE m.sem_resposta) AS sem_resposta
                """ + BASE, empresaId, desde);

        Map<String, Object> avaliacoes = jdbc.queryForMap("""
                SELECT count(*) FILTER (WHERE a.util) AS positivas, count(*) FILTER (WHERE NOT a.util) AS negativas
                FROM avaliacao a
                JOIN mensagem m ON m.id = a.mensagem_id
                JOIN conversa c ON c.id = m.conversa_id
                WHERE c.empresa_id = ? AND a.criado_em >= ?
                """, empresaId, desde);

        Map<LocalDate, PerguntasDoDia> porDia = new HashMap<>();
        jdbc.query("""
                SELECT (m.criado_em AT TIME ZONE ?)::date AS dia, count(*) AS total,
                       count(*) FILTER (WHERE m.sem_resposta) AS sem_resposta
                FROM mensagem m
                JOIN conversa c ON c.id = m.conversa_id
                WHERE c.empresa_id = ? AND m.papel = 'ASSISTENTE' AND m.criado_em >= ?
                GROUP BY dia
                """, linha -> {
            LocalDate dia = linha.getDate("dia").toLocalDate();
            porDia.put(dia, new PerguntasDoDia(dia, linha.getLong("total"), linha.getLong("sem_resposta")));
        }, fuso.getId(), empresaId, desde);
        List<PerguntasDoDia> serie = new ArrayList<>();
        for (LocalDate dia = primeiroDia; !dia.isAfter(hoje); dia = dia.plusDays(1)) {
            serie.add(porDia.getOrDefault(dia, new PerguntasDoDia(dia, 0, 0)));
        }

        List<PerguntaSemResposta> semResposta = jdbc.query("""
                SELECT min(m.pergunta) AS pergunta, count(*) AS vezes, max(m.criado_em) AS ultima
                """ + BASE + """
                  AND m.sem_resposta AND m.pergunta IS NOT NULL
                GROUP BY lower(trim(m.pergunta))
                ORDER BY vezes DESC, ultima DESC
                LIMIT 20
                """, (linha, numero) -> new PerguntaSemResposta(linha.getString("pergunta"), linha.getLong("vezes"),
                instante(linha.getTimestamp("ultima"))), empresaId, desde);

        List<RespostaMalAvaliada> malAvaliadas = jdbc.query("""
                SELECT m.pergunta, m.conteudo, a.comentario, a.criado_em
                FROM avaliacao a
                JOIN mensagem m ON m.id = a.mensagem_id
                JOIN conversa c ON c.id = m.conversa_id
                WHERE c.empresa_id = ? AND NOT a.util AND a.criado_em >= ?
                ORDER BY a.criado_em DESC
                LIMIT 20
                """, (linha, numero) -> new RespostaMalAvaliada(linha.getString("pergunta"), linha.getString("conteudo"),
                linha.getString("comentario"), instante(linha.getTimestamp("criado_em"))), empresaId, desde);

        List<DocumentoCitado> documentos = jdbc.query("""
                SELECT citacao ->> 'documentoNome' AS documento, count(DISTINCT m.id) AS respostas
                FROM mensagem m
                JOIN conversa c ON c.id = m.conversa_id
                CROSS JOIN LATERAL jsonb_array_elements(
                    CASE WHEN m.citacoes IS NULL OR m.citacoes = '' THEN '[]'::jsonb ELSE m.citacoes::jsonb END
                ) AS citacao
                WHERE c.empresa_id = ? AND m.papel = 'ASSISTENTE' AND m.criado_em >= ?
                GROUP BY documento
                ORDER BY respostas DESC, documento
                LIMIT 10
                """, (linha, numero) -> new DocumentoCitado(linha.getString("documento"), linha.getLong("respostas")),
                empresaId, desde);

        return new PainelDeAnalises(dias, numero(totais.get("total")), numero(totais.get("sem_resposta")),
                numero(avaliacoes.get("positivas")), numero(avaliacoes.get("negativas")), serie, semResposta,
                malAvaliadas, documentos);
    }

    /**
     * Sugestões para a tela de conversa: as perguntas respondidas que a empresa mais faz.
     * Sem histórico ainda, usa as sugestões da empresa de demonstração (quando for o caso).
     */
    @Transactional(readOnly = true)
    public List<String> sugestoes(UUID empresaId, int quantidade) {
        Timestamp desde = Timestamp.from(Instant.now(relogio).minusSeconds(60L * 60 * 24 * 60));
        List<String> frequentes = jdbc.query("""
                SELECT min(m.pergunta) AS pergunta
                """ + BASE + """
                  AND NOT m.sem_resposta AND m.pergunta IS NOT NULL
                GROUP BY lower(trim(m.pergunta))
                ORDER BY count(*) DESC, max(m.criado_em) DESC
                LIMIT ?
                """, (linha, numero) -> linha.getString("pergunta"), empresaId, desde, quantidade);
        if (!frequentes.isEmpty()) {
            return frequentes;
        }
        return empresas.findById(empresaId)
                .map(empresa -> demonstracao.sugestoesPara(empresa.getNome()))
                .orElse(List.of());
    }

    private static long numero(Object valor) {
        return valor instanceof Number n ? n.longValue() : 0;
    }

    private static Instant instante(Timestamp valor) {
        return valor == null ? null : valor.toInstant();
    }
}
