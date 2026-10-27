-- Dados para o painel de análises e a avaliação das respostas.

-- Cada resposta guarda a pergunta que respondeu e se foi um "não encontrei".
ALTER TABLE mensagem ADD COLUMN pergunta TEXT;
ALTER TABLE mensagem ADD COLUMN sem_resposta BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE mensagem
SET sem_resposta = TRUE
WHERE papel = 'ASSISTENTE' AND conteudo LIKE 'Não encontrei essa informação%';

CREATE INDEX idx_mensagem_analise ON mensagem (criado_em) WHERE papel = 'ASSISTENTE';

-- Avaliação de uma resposta (útil ou não) por quem perguntou.
CREATE TABLE avaliacao (
    mensagem_id  UUID PRIMARY KEY REFERENCES mensagem (id) ON DELETE CASCADE,
    usuario_id   UUID         NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    util         BOOLEAN      NOT NULL,
    comentario   VARCHAR(500),
    criado_em    TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_avaliacao_data ON avaliacao (criado_em);
