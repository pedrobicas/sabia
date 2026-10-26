-- Conversas de cada usuário com o assistente e o histórico de mensagens.

CREATE TABLE conversa (
    id             UUID PRIMARY KEY,
    empresa_id     UUID         NOT NULL REFERENCES empresa (id) ON DELETE CASCADE,
    usuario_id     UUID         NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    titulo         VARCHAR(200) NOT NULL,
    criado_em      TIMESTAMPTZ  NOT NULL,
    atualizado_em  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_conversa_usuario ON conversa (usuario_id, atualizado_em DESC);

CREATE TABLE mensagem (
    id           UUID PRIMARY KEY,
    conversa_id  UUID        NOT NULL REFERENCES conversa (id) ON DELETE CASCADE,
    papel        VARCHAR(20) NOT NULL CHECK (papel IN ('USUARIO', 'ASSISTENTE')),
    conteudo     TEXT        NOT NULL,
    -- Lista de citações em JSON: número, documento, página e trecho usados na resposta.
    citacoes     TEXT,
    criado_em    TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_mensagem_conversa ON mensagem (conversa_id, criado_em);
