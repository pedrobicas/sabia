/**
 * Transforma o texto da resposta (um Markdown simples) em blocos para o template.
 *
 * Não usamos innerHTML: o texto vem de um modelo de IA, então cada pedaço é renderizado como
 * texto puro pelo Angular, e os marcadores [n] viram botões de citação.
 */
export type Parte =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'negrito'; valor: string }
  | { tipo: 'citacao'; numero: number };

export interface Bloco {
  tipo: 'paragrafo' | 'item' | 'titulo' | 'nota';
  partes: Parte[];
}

/** Aviso que o servidor acrescenta quando a resposta é interrompida; aparece como nota discreta. */
export const RESPOSTA_INTERROMPIDA = '(Resposta interrompida antes do fim.)';

const ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;
const TITULO = /^\s*#{1,6}\s+/;

export function formatarResposta(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) {
      const texto = paragrafo.join(' ');
      blocos.push({ tipo: texto === RESPOSTA_INTERROMPIDA ? 'nota' : 'paragrafo', partes: partesDaLinha(texto) });
      paragrafo = [];
    }
  };

  for (const linha of texto.split('\n')) {
    if (linha.trim() === '') {
      fecharParagrafo();
    } else if (ITEM.test(linha)) {
      fecharParagrafo();
      blocos.push({ tipo: 'item', partes: partesDaLinha(linha.replace(ITEM, '')) });
    } else if (TITULO.test(linha)) {
      fecharParagrafo();
      blocos.push({ tipo: 'titulo', partes: partesDaLinha(linha.replace(TITULO, '')) });
    } else {
      paragrafo.push(linha.trim());
    }
  }
  fecharParagrafo();
  return blocos;
}

export function partesDaLinha(linha: string): Parte[] {
  const partes: Parte[] = [];
  const padrao = /\*\*([^*]+)\*\*|\[(\d+(?:\s*,\s*\d+)*)\]/g;
  let inicio = 0;
  for (const encontrado of linha.matchAll(padrao)) {
    const posicao = encontrado.index ?? 0;
    if (posicao > inicio) {
      const texto = linha.slice(inicio, posicao);
      // Como numa nota de rodapé, o marcador encosta na palavra: "caixa [1]." vira "caixa¹."
      partes.push({ tipo: 'texto', valor: encontrado[2] !== undefined ? texto.trimEnd() : texto });
    }
    if (encontrado[1] !== undefined) {
      partes.push({ tipo: 'negrito', valor: encontrado[1] });
    } else {
      for (const numero of encontrado[2].split(',')) {
        partes.push({ tipo: 'citacao', numero: Number(numero.trim()) });
      }
    }
    inicio = posicao + encontrado[0].length;
  }
  if (inicio < linha.length) {
    partes.push({ tipo: 'texto', valor: linha.slice(inicio) });
  }
  return partes;
}
