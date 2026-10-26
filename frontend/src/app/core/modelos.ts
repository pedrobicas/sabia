export type Papel = 'ADMIN' | 'MEMBRO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string;
  empresaNome: string;
}

export interface RespostaDeLogin {
  token: string;
  usuario: Usuario;
}

export interface ContaDemo {
  empresa: string;
  email: string;
  senha: string;
}

export interface ConfiguracaoPublica {
  cadastroAberto: boolean;
  contasDemo: ContaDemo[];
}

export type StatusDocumento = 'ENVIADO' | 'PROCESSANDO' | 'PRONTO' | 'ERRO';

export interface Documento {
  id: string;
  nome: string;
  tipo: 'PDF' | 'DOCX' | 'TXT' | 'MARKDOWN';
  tamanhoBytes: number;
  status: StatusDocumento;
  erro: string | null;
  totalTrechos: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  criadoEm: string;
}

export interface Conversa {
  id: string;
  titulo: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Citacao {
  numero: number;
  documentoId: string;
  documentoNome: string;
  pagina: number | null;
  trecho: string;
  similaridade: number;
}

export interface Mensagem {
  id: string;
  papel: 'USUARIO' | 'ASSISTENTE';
  conteudo: string;
  citacoes: Citacao[];
  criadoEm: string;
}
