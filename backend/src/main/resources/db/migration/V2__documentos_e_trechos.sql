-- Documentos enviados pelas empresas e os trechos (vetores) usados na busca.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documento (
    id             UUID PRIMARY KEY,
    empresa_id     UUID         NOT NULL REFERENCES empresa (id) ON DELETE CASCADE,
    nome           VARCHAR(255) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL,
    tamanho_bytes  BIGINT       NOT NULL,
    status         VARCHAR(20)  NOT NULL CHECK (status IN ('ENVIADO', 'PROCESSANDO', 'PRONTO', 'ERRO')),
    erro           TEXT,
    total_trechos  INT          NOT NULL DEFAULT 0,
    enviado_por    UUID         REFERENCES usuario (id) ON DELETE SET NULL,
    criado_em      TIMESTAMPTZ  NOT NULL,
    atualizado_em  TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_documento_empresa ON documento (empresa_id, criado_em DESC);
CREATE INDEX idx_documento_status ON documento (status);

-- Bytes do arquivo original, em tabela separada para não pesar nas listagens.
CREATE TABLE documento_arquivo (
    documento_id  UUID  PRIMARY KEY REFERENCES documento (id) ON DELETE CASCADE,
    conteudo      BYTEA NOT NULL
);

-- Tabela no formato que o PgVectorStore do Spring AI espera.
-- A metadata guarda empresaId, documentoId, documentoNome, ordem e pagina de cada trecho.
CREATE TABLE vector_store (
    id         UUID PRIMARY KEY,
    content    TEXT,
    metadata   JSONB,
    embedding  VECTOR(${dimensoes})
);

CREATE INDEX idx_vector_store_embedding ON vector_store USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_vector_store_empresa ON vector_store ((metadata ->> 'empresaId'));
CREATE INDEX idx_vector_store_documento ON vector_store ((metadata ->> 'documentoId'));
