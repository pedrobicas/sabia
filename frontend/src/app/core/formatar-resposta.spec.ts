import { formatarResposta, partesDaLinha, RESPOSTA_INTERROMPIDA } from './formatar-resposta';

describe('formatarResposta', () => {
  it('junta linhas seguidas num parágrafo e separa parágrafos por linha em branco', () => {
    const blocos = formatarResposta('Primeira linha\ncontinua aqui.\n\nSegundo parágrafo.');

    expect(blocos.map((bloco) => bloco.tipo)).toEqual(['paragrafo', 'paragrafo']);
    expect(blocos[0].partes).toEqual([{ tipo: 'texto', valor: 'Primeira linha continua aqui.' }]);
  });

  it('reconhece itens de lista com hífen, asterisco, marcador e número', () => {
    const blocos = formatarResposta('- um\n* dois\n• três\n1. quatro\n2) cinco');

    expect(blocos.every((bloco) => bloco.tipo === 'item')).toBe(true);
    expect(blocos.map((bloco) => bloco.partes[0])).toEqual([
      { tipo: 'texto', valor: 'um' },
      { tipo: 'texto', valor: 'dois' },
      { tipo: 'texto', valor: 'três' },
      { tipo: 'texto', valor: 'quatro' },
      { tipo: 'texto', valor: 'cinco' },
    ]);
  });

  it('transforma títulos em Markdown em blocos de título', () => {
    expect(formatarResposta('## Prazo de troca')[0]).toEqual({
      tipo: 'titulo',
      partes: [{ tipo: 'texto', valor: 'Prazo de troca' }],
    });
  });

  it('marca a nota de resposta interrompida', () => {
    const blocos = formatarResposta(`Começo da resposta\n\n${RESPOSTA_INTERROMPIDA}`);

    expect(blocos.map((bloco) => bloco.tipo)).toEqual(['paragrafo', 'nota']);
  });

  it('não interpreta HTML: o texto do modelo continua sendo texto', () => {
    expect(formatarResposta('<img src=x onerror=alert(1)>')[0].partes).toEqual([
      { tipo: 'texto', valor: '<img src=x onerror=alert(1)>' },
    ]);
  });
});

describe('partesDaLinha', () => {
  it('separa negrito e marcadores de citação', () => {
    expect(partesDaLinha('Vale por **7 dias** corridos [1].')).toEqual([
      { tipo: 'texto', valor: 'Vale por ' },
      { tipo: 'negrito', valor: '7 dias' },
      { tipo: 'texto', valor: ' corridos' },
      { tipo: 'citacao', numero: 1 },
      { tipo: 'texto', valor: '.' },
    ]);
  });

  it('abre citações agrupadas como [1, 3]', () => {
    expect(partesDaLinha('Confira [1, 3]').filter((parte) => parte.tipo === 'citacao')).toEqual([
      { tipo: 'citacao', numero: 1 },
      { tipo: 'citacao', numero: 3 },
    ]);
  });

  it('cola o marcador na palavra anterior, como numa nota de rodapé', () => {
    expect(partesDaLinha('no caixa [2]')[0]).toEqual({ tipo: 'texto', valor: 'no caixa' });
  });

  it('deixa colchetes que não são números como texto', () => {
    expect(partesDaLinha('Veja [anexo]')).toEqual([{ tipo: 'texto', valor: 'Veja [anexo]' }]);
  });
});
