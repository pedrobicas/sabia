-- Empresas (inquilinos) e seus usuários.

CREATE TABLE empresa (
    id         UUID PRIMARY KEY,
    nome       VARCHAR(120) NOT NULL,
    criado_em  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE usuario (
    id          UUID PRIMARY KEY,
    empresa_id  UUID         NOT NULL REFERENCES empresa (id) ON DELETE CASCADE,
    nome        VARCHAR(120) NOT NULL,
    email       VARCHAR(180) NOT NULL UNIQUE,
    senha_hash  VARCHAR(100) NOT NULL,
    papel       VARCHAR(20)  NOT NULL CHECK (papel IN ('ADMIN', 'MEMBRO')),
    criado_em   TIMESTAMPTZ  NOT NULL
);

CREATE INDEX idx_usuario_empresa ON usuario (empresa_id);
