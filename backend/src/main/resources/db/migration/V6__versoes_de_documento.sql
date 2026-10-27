-- Reenviar um arquivo com o mesmo nome atualiza o documento em vez de criar uma cópia.
-- A versão conta quantas vezes ele foi substituído; as citações antigas continuam apontando para ele.
ALTER TABLE documento ADD COLUMN versao INTEGER NOT NULL DEFAULT 1;

CREATE INDEX idx_documento_nome ON documento (empresa_id, nome);
