import { normalizar } from './texto';

export interface Pedaco {
  texto: string;
  destaque: boolean;
}

/** Palavras que aparecem em quase toda frase e não dizem nada sobre o assunto. */
const PALAVRAS_VAZIAS = new Set(
  (
    'a o as os um uma uns umas de da do das dos em na no nas nos por para pra com sem sob sobre ' +
    'e ou mas que se ao aos à às é são ser foi está estão ter tem têm há como mais menos muito ' +
    'até depois antes quando onde qual quais seu sua seus suas ele ela eles elas isso esse essa ' +
    'este esta não sim já também só pelo pela pelos pelas cada todo toda todos todas outro outra'
  )
    .split(' ')
    .map(normalizar),
);

/**
 * As frases da resposta que citam a fonte [numero], sem os marcadores e sem o negrito.
 * Um marcador múltiplo como [1, 2] conta para as duas fontes.
 */
export function frasesQueCitam(resposta: string, numero: number): string[] {
  const marcador = new RegExp(`\\[(?:\\d+\\s*,\\s*)*${numero}(?:\\s*,\\s*\\d+)*\\]`);
  return dividirEmFrases(resposta)
    .map((frase) => frase.texto)
    .filter((frase) => marcador.test(frase))
    .map((frase) =>
      frase
        .replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, '')
        .replace(/\*\*/g, '')
        .trim(),
    );
}

/** Tira do trecho as marcações de título do Markdown ("## Sem nota fiscal" vira "Sem nota fiscal"). */
export function limparTrecho(trecho: string): string {
  return trecho.replace(/^#{1,6}\s+/gm, '').trim();
}

/**
 * Divide o trecho em pedaços e marca as frases mais parecidas com as frases da resposta.
 *
 * É uma aproximação por palavras em comum (sem acento, sem palavras vazias, comparando o começo
 * das palavras para "trocas" bater com "trocados"). Só destaca quando a frase do trecho divide pelo
 * menos duas palavras com a resposta; se nada passar disso, não destaca nada.
 */
export function destacarFrases(trecho: string, frasesDaResposta: string[], maximo = 3): Pedaco[] {
  const vocabulario = new Set(frasesDaResposta.flatMap(palavrasDe));
  const frases = dividirEmFrases(trecho);
  if (vocabulario.size === 0 || frases.length === 0) {
    return [{ texto: trecho, destaque: false }];
  }

  const pontuadas = frases.map((frase, indice) => {
    const palavras = [...new Set(palavrasDe(frase.texto))];
    const emComum = palavras.filter((palavra) => vocabulario.has(palavra)).length;
    return { indice, emComum, proporcao: palavras.length ? emComum / palavras.length : 0 };
  });
  const escolhidas = new Set(
    pontuadas
      .filter((frase) => frase.emComum >= 2 && frase.proporcao >= 0.25)
      .sort((a, b) => b.emComum - a.emComum || b.proporcao - a.proporcao)
      .slice(0, maximo)
      .map((frase) => frase.indice),
  );

  const pedacos: Pedaco[] = [];
  let posicao = 0;
  frases.forEach((frase, indice) => {
    if (frase.inicio > posicao) {
      // O espaço entre duas frases destacadas na mesma linha também fica destacado, sem buraco.
      const intervalo = trecho.slice(posicao, frase.inicio);
      const entreDestaques = escolhidas.has(indice - 1) && escolhidas.has(indice) && !intervalo.includes('\n');
      juntar(pedacos, { texto: intervalo, destaque: entreDestaques });
    }
    juntar(pedacos, { texto: frase.texto, destaque: escolhidas.has(indice) });
    posicao = frase.inicio + frase.texto.length;
  });
  if (posicao < trecho.length) {
    juntar(pedacos, { texto: trecho.slice(posicao), destaque: false });
  }
  return pedacos;
}

interface Frase {
  texto: string;
  inicio: number;
}

/** Frases com a posição no texto original. O espaço entre elas fica de fora. */
function dividirEmFrases(texto: string): Frase[] {
  const frases: Frase[] = [];
  // Termina em ponto, exclamação, interrogação ou dois-pontos seguidos de espaço, ou numa quebra de linha.
  // "R$ 6,00" e "5 km." não quebram no meio porque exigem espaço depois da pontuação.
  const padrao = /[^\n]+?(?:[.!?:](?=\s|$)|(?=\n)|$)/g;
  for (const encontrado of texto.matchAll(padrao)) {
    const bruto = encontrado[0];
    const inicio = (encontrado.index ?? 0) + (bruto.length - bruto.trimStart().length);
    const limpo = bruto.trim();
    if (limpo) {
      frases.push({ texto: limpo, inicio });
    }
  }
  return frases;
}

function palavrasDe(frase: string): string[] {
  return (normalizar(frase).match(/[a-z0-9]+(?:[.,][0-9]+)?/g) ?? [])
    .filter((palavra) => /\d/.test(palavra) || (palavra.length >= 3 && !PALAVRAS_VAZIAS.has(palavra)))
    .map((palavra) => (/\d/.test(palavra) ? palavra : palavra.slice(0, 5)));
}

function juntar(pedacos: Pedaco[], novo: Pedaco): void {
  const ultimo = pedacos.at(-1);
  if (ultimo && ultimo.destaque === novo.destaque) {
    ultimo.texto += novo.texto;
  } else {
    pedacos.push(novo);
  }
}
