-- Visitantes da demonstração pública.
-- Cada clique em "Entrar como ..." cria um usuário temporário, para um visitante não ver as conversas
-- de outro nem gastar o limite de perguntas dele. Depois de visitante_ate, uma tarefa agendada apaga
-- o usuário, e as conversas, mensagens e avaliações dele vão junto (ON DELETE CASCADE).
ALTER TABLE usuario ADD COLUMN visitante_ate TIMESTAMPTZ;

CREATE INDEX idx_usuario_visitante ON usuario (visitante_ate) WHERE visitante_ate IS NOT NULL;
