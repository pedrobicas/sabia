import { Citacao, Mensagem } from './modelos';

/** Lista de fontes em texto: "[1] manual.pdf, página 4". */
export function fontesEmTexto(citacoes: Citacao[]): string {
  return citacoes
    .map((fonte) => `[${fonte.numero}] ${fonte.documentoNome}${fonte.pagina ? `, página ${fonte.pagina}` : ''}`)
    .join('\n');
}

/** O que vai para a área de transferência ao copiar uma resposta: o texto e, se houver, as fontes. */
export function respostaParaCopiar(resposta: Pick<Mensagem, 'conteudo' | 'citacoes'>): string {
  const texto = resposta.conteudo.trim();
  return resposta.citacoes.length > 0 ? `${texto}\n\nFontes:\n${fontesEmTexto(resposta.citacoes)}` : texto;
}

/** A conversa inteira em Markdown, para baixar ou colar em outro lugar. */
export function conversaEmMarkdown(titulo: string, mensagens: Mensagem[], exportadaEm = new Date()): string {
  const data = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(exportadaEm);
  const partes = [`# ${titulo}`, `_Conversa exportada do Sabiá em ${data}._`];
  for (const mensagem of mensagens) {
    if (mensagem.papel === 'USUARIO') {
      partes.push(`## ${mensagem.conteudo.trim().replace(/\s*\n\s*/g, ' ')}`);
    } else {
      partes.push(mensagem.conteudo.trim());
      if (mensagem.citacoes.length > 0) {
        partes.push(`**Fontes**\n\n${mensagem.citacoes.map((fonte) => `- ${fontesEmTexto([fonte])}`).join('\n')}`);
      }
    }
  }
  return `${partes.join('\n\n')}\n`;
}

/** Nome de arquivo seguro a partir do título da conversa. */
export function nomeDeArquivo(titulo: string, extensao: string): string {
  const base = titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
  return `${base || 'conversa'}.${extensao}`;
}
