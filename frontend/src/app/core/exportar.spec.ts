import { conversaEmMarkdown, fontesEmTexto, nomeDeArquivo, respostaParaCopiar } from './exportar';
import { Citacao, Mensagem } from './modelos';

const FONTES: Citacao[] = [
  { numero: 1, documentoId: 'd1', documentoNome: 'politica-de-trocas.md', pagina: null, trecho: '...', similaridade: 0.8 },
  { numero: 2, documentoId: 'd2', documentoNome: 'manual.pdf', pagina: 4, trecho: '...', similaridade: 0.6 },
];

function mensagem(papel: Mensagem['papel'], conteudo: string, citacoes: Citacao[] = []): Mensagem {
  return { id: conteudo, papel, conteudo, citacoes, criadoEm: '2026-10-26T12:00:00Z' };
}

describe('exportar', () => {
  it('lista as fontes com a página quando existe', () => {
    expect(fontesEmTexto(FONTES)).toBe('[1] politica-de-trocas.md\n[2] manual.pdf, página 4');
  });

  it('copia a resposta com as fontes no fim', () => {
    expect(respostaParaCopiar({ conteudo: ' Pode trocar [1]. ', citacoes: FONTES.slice(0, 1) })).toBe(
      'Pode trocar [1].\n\nFontes:\n[1] politica-de-trocas.md',
    );
    expect(respostaParaCopiar({ conteudo: 'Não encontrei.', citacoes: [] })).toBe('Não encontrei.');
  });

  it('monta a conversa em Markdown com perguntas como títulos', () => {
    const markdown = conversaEmMarkdown(
      'Trocas',
      [mensagem('USUARIO', 'Posso trocar\nsem nota?'), mensagem('ASSISTENTE', 'Pode [1] [2].', FONTES)],
      new Date(2026, 9, 26, 15, 30),
    );

    expect(markdown).toContain('# Trocas');
    expect(markdown).toContain('26 de outubro de 2026');
    expect(markdown).toContain('## Posso trocar sem nota?');
    expect(markdown).toContain('Pode [1] [2].\n\n**Fontes**\n\n- [1] politica-de-trocas.md\n- [2] manual.pdf, página 4');
    expect(markdown.endsWith('\n')).toBe(true);
  });

  it('gera nomes de arquivo sem acentos nem símbolos', () => {
    expect(nomeDeArquivo('Férias: quantos dias?', 'md')).toBe('ferias-quantos-dias.md');
    expect(nomeDeArquivo('???', 'md')).toBe('conversa.md');
    expect(nomeDeArquivo('a'.repeat(80), 'md')).toBe(`${'a'.repeat(60)}.md`);
  });
});
