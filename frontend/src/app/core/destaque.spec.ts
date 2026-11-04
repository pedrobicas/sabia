import { destacarFrases, frasesQueCitam, limparTrecho } from './destaque';

const RESPOSTA =
  'Pode. Produtos embalados podem ser trocados em até **7 dias corridos** depois da compra [1]. ' +
  'Sem a nota, a loja localiza a compra pelo CPF informado no caixa [2].\n\n' +
  'Se o CPF não foi informado na compra, a troca depende da aprovação do gerente da loja [1, 2].';

const TRECHO =
  'Sem nota fiscal\n\nSem a nota fiscal, localizamos a compra pelo CPF informado no caixa. ' +
  'Se o CPF não foi informado na compra, a troca depende da aprovação do gerente da loja.\n\n' +
  'O que não é trocado\n\nBebidas preparadas e alimentos não podem ser trocados nem devolvidos.';

describe('frasesQueCitam', () => {
  it('pega só as frases com o marcador da fonte, sem marcadores e sem negrito', () => {
    expect(frasesQueCitam(RESPOSTA, 1)).toEqual([
      'Produtos embalados podem ser trocados em até 7 dias corridos depois da compra.',
      'Se o CPF não foi informado na compra, a troca depende da aprovação do gerente da loja.',
    ]);
  });

  it('conta o marcador múltiplo para cada fonte', () => {
    expect(frasesQueCitam(RESPOSTA, 2)).toHaveLength(2);
    expect(frasesQueCitam(RESPOSTA, 3)).toEqual([]);
  });
});

describe('destacarFrases', () => {
  it('marca as frases do trecho que sustentam a resposta', () => {
    const pedacos = destacarFrases(TRECHO, frasesQueCitam(RESPOSTA, 2));
    const destacados = pedacos.filter((p) => p.destaque).map((p) => p.texto);

    expect(destacados).toEqual([
      'Sem a nota fiscal, localizamos a compra pelo CPF informado no caixa. ' +
        'Se o CPF não foi informado na compra, a troca depende da aprovação do gerente da loja.',
    ]);
  });

  it('não perde nem troca nenhum caractere do trecho', () => {
    const pedacos = destacarFrases(TRECHO, frasesQueCitam(RESPOSTA, 2));
    expect(pedacos.map((p) => p.texto).join('')).toBe(TRECHO);
  });

  it('não destaca nada quando a resposta não tem palavras em comum suficientes', () => {
    const pedacos = destacarFrases(TRECHO, ['O horário de funcionamento é das 7h às 19h.']);
    expect(pedacos).toEqual([{ texto: TRECHO, destaque: false }]);
  });

  it('não corta frases em valores como R$ 6,00', () => {
    const trecho = 'A taxa de entrega é de R$ 6,00 e é grátis em pedidos acima de R$ 60,00. Aceitamos Pix.';
    const pedacos = destacarFrases(trecho, ['A taxa é de R$ 6,00 e sai grátis em pedidos acima de R$ 60,00']);
    expect(pedacos[0]).toEqual({
      texto: 'A taxa de entrega é de R$ 6,00 e é grátis em pedidos acima de R$ 60,00.',
      destaque: true,
    });
  });
});

describe('limparTrecho', () => {
  it('tira as marcações de título do Markdown', () => {
    expect(limparTrecho('## Sem nota fiscal\n\nTexto.\n### Outro')).toBe('Sem nota fiscal\n\nTexto.\nOutro');
  });
});
