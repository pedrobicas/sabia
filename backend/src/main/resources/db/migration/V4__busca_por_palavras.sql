-- Índice de texto completo (em português) para a busca por palavra-chave,
-- que complementa a busca vetorial em nomes próprios, códigos e números.
CREATE INDEX idx_vector_store_texto
    ON vector_store USING gin (to_tsvector('portuguese', coalesce(content, '')));
