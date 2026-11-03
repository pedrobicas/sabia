export type Papel = 'ADMIN' | 'MEMBRO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string;
  empresaNome: string;
  /** Conta temporária da demonstração pública: não tem senha e é apagada depois de um tempo. */
  visitante?: boolean;
}

export interface RespostaDeLogin {
  token: string;
  usuario: Usuario;
}

/** Empresa de demonstração. Cada visitante entra com uma conta temporária só dele. */
export interface ContaDemo {
  empresa: string;
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
  /** Começa em 1 e sobe cada vez que um arquivo com o mesmo nome é reenviado. */
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface TrechoIndexado {
  ordem: number;
  pagina: number | null;
  texto: string;
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

export interface Avaliacao {
  util: boolean;
  comentario: string | null;
}

export interface Mensagem {
  id: string;
  papel: 'USUARIO' | 'ASSISTENTE';
  conteudo: string;
  citacoes: Citacao[];
  /** Só nas respostas que quem perguntou avaliou. */
  avaliacao?: Avaliacao | null;
  criadoEm: string;
}

export interface PerguntasDoDia {
  /** Data no formato AAAA-MM-DD, no fuso da empresa. */
  dia: string;
  total: number;
  semResposta: number;
}

export interface PerguntaSemResposta {
  pergunta: string;
  vezes: number;
  ultimaVez: string;
}

export interface RespostaMalAvaliada {
  pergunta: string | null;
  resposta: string;
  comentario: string | null;
  quando: string;
}

export interface DocumentoCitado {
  documento: string;
  respostas: number;
}

export interface PainelDeAnalises {
  periodoDias: number;
  totalPerguntas: number;
  semResposta: number;
  avaliacoesPositivas: number;
  avaliacoesNegativas: number;
  perguntasPorDia: PerguntasDoDia[];
  perguntasSemResposta: PerguntaSemResposta[];
  respostasMalAvaliadas: RespostaMalAvaliada[];
  documentosMaisCitados: DocumentoCitado[];
}
