-- Índice de texto completo (em português) para a busca por palavra-chave,
-- que complementa a busca vetorial em nomes próprios, códigos e números.
-- Hífens viram espaços para que "SKU-4471" gere o termo "4471" (e não "-4471").
-- A expressão precisa ser idêntica à usada em BuscaPorPalavras para o índice ser aproveitado.
CREATE INDEX idx_vector_store_texto
    ON vector_store USING gin (to_tsvector('portuguese', translate(coalesce(content, ''), '-', ' ')));
