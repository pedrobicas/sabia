import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { Citacao, Mensagem } from './modelos';
import { Sessao } from './sessao';

export type EventoDoChat =
  | { tipo: 'citacoes'; citacoes: Citacao[] }
  | { tipo: 'token'; texto: string }
  | { tipo: 'fim'; mensagem: Mensagem }
  | { tipo: 'erro'; mensagem: string };

/**
 * Envia uma pergunta e lê a resposta em streaming (Server-Sent Events).
 *
 * Usa fetch em vez de EventSource porque o EventSource não envia o cabeçalho Authorization
 * nem permite POST.
 */
@Injectable({ providedIn: 'root' })
export class ChatAoVivo {
  private readonly sessao = inject(Sessao);
  private readonly router = inject(Router);

  async perguntar(
    conversaId: string,
    pergunta: string,
    aoReceber: (evento: EventoDoChat) => void,
    cancelamento?: AbortSignal,
  ): Promise<void> {
    const resposta = await fetch(`/api/conversas/${conversaId}/perguntas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.sessao.token() ?? ''}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/problem+json, application/json',
      },
      body: JSON.stringify({ pergunta }),
      signal: cancelamento,
    });

    if (!resposta.ok || !resposta.body) {
      if (resposta.status === 401) {
        this.sessao.encerrar();
        this.router.navigate(['/entrar']);
      }
      throw new Error(await lerDetalhe(resposta));
    }

    const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
    let acumulado = '';
    for (;;) {
      const { value, done } = await leitor.read();
      if (done) {
        break;
      }
      acumulado += value;
      let fimDoEvento = acumulado.search(/\r?\n\r?\n/);
      while (fimDoEvento >= 0) {
        const bloco = acumulado.slice(0, fimDoEvento);
        acumulado = acumulado.slice(fimDoEvento).replace(/^\r?\n\r?\n/, '');
        const evento = interpretar(bloco);
        if (evento) {
          aoReceber(evento);
        }
        fimDoEvento = acumulado.search(/\r?\n\r?\n/);
      }
    }
  }
}

/** Converte um bloco "event: x / data: {...}" no evento tipado. */
export function interpretar(bloco: string): EventoDoChat | null {
  let nome = 'message';
  const dados: string[] = [];
  for (const linha of bloco.split(/\r?\n/)) {
    if (linha.startsWith('event:')) {
      nome = linha.slice(6).trim();
    } else if (linha.startsWith('data:')) {
      dados.push(linha.slice(5).replace(/^ /, ''));
    }
  }
  if (dados.length === 0) {
    return null;
  }
  const valor = JSON.parse(dados.join('\n'));
  switch (nome) {
    case 'citacoes':
      return { tipo: 'citacoes', citacoes: valor as Citacao[] };
    case 'token':
      return { tipo: 'token', texto: valor as string };
    case 'fim':
      return { tipo: 'fim', mensagem: valor as Mensagem };
    case 'erro':
      return { tipo: 'erro', mensagem: valor as string };
    default:
      return null;
  }
}

async function lerDetalhe(resposta: Response): Promise<string> {
  try {
    const problema = (await resposta.json()) as { detail?: string };
    if (problema.detail) {
      return problema.detail;
    }
  } catch {
    // corpo vazio ou não é JSON
  }
  return 'Não foi possível enviar a pergunta. Tente de novo.';
}
