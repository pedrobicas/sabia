import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ChatAoVivo, EventoDoChat, interpretar } from './chat-ao-vivo';

describe('interpretar', () => {
  it('lê o nome do evento e o JSON dos dados', () => {
    expect(interpretar('event:token\ndata:"Olá"')).toEqual({ tipo: 'token', texto: 'Olá' });
    expect(interpretar('event: erro\ndata: "Falhou"')).toEqual({ tipo: 'erro', mensagem: 'Falhou' });
  });

  it('junta várias linhas de data com quebra de linha', () => {
    expect(interpretar('event:citacoes\ndata:[\ndata:]')).toEqual({ tipo: 'citacoes', citacoes: [] });
  });

  it('ignora blocos sem dados e eventos desconhecidos', () => {
    expect(interpretar(': comentário de keep-alive')).toBeNull();
    expect(interpretar('event:outro\ndata:{}')).toBeNull();
  });
});

describe('ChatAoVivo', () => {
  const fetchOriginal = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = fetchOriginal;
    localStorage.clear();
  });

  function servidorQueResponde(pedacos: string[], status = 200): void {
    globalThis.fetch = vi.fn(async () => {
      const corpo = new ReadableStream<Uint8Array>({
        start(controle) {
          const codificador = new TextEncoder();
          for (const pedaco of pedacos) {
            controle.enqueue(codificador.encode(pedaco));
          }
          controle.close();
        },
      });
      return new Response(corpo, { status, headers: { 'Content-Type': 'text/event-stream' } });
    }) as typeof fetch;
  }

  function chat(): ChatAoVivo {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    return TestBed.inject(ChatAoVivo);
  }

  it('entrega os eventos mesmo quando chegam quebrados no meio', async () => {
    servidorQueResponde([
      'event:citacoes\ndata:[]\n\nevent:tok',
      'en\ndata:"O expediente "\n\nevent:token\ndata:"começa às 7h."',
      '\n\nevent:fim\ndata:{"id":"m1","papel":"ASSISTENTE","conteudo":"O expediente começa às 7h.","citacoes":[],"criadoEm":"2026-10-26T12:00:00Z"}\n\n',
    ]);
    const eventos: EventoDoChat[] = [];

    await chat().perguntar('c1', 'Que horas abre?', (evento) => eventos.push(evento));

    expect(eventos.map((evento) => evento.tipo)).toEqual(['citacoes', 'token', 'token', 'fim']);
    expect(eventos.filter((e) => e.tipo === 'token').map((e) => (e as { texto: string }).texto).join('')).toBe(
      'O expediente começa às 7h.',
    );
  });

  it('aceita fim de linha \\r\\n', async () => {
    servidorQueResponde(['event:token\r\ndata:"a"\r\n\r\nevent:token\r\ndata:"b"\r\n\r\n']);
    const textos: string[] = [];

    await chat().perguntar('c1', 'Oi', (evento) => evento.tipo === 'token' && textos.push(evento.texto));

    expect(textos).toEqual(['a', 'b']);
  });

  it('transforma erro HTTP na mensagem do servidor', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'Limite de perguntas por hora atingido.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/problem+json' },
      }),
    ) as typeof fetch;

    await expect(chat().perguntar('c1', 'Oi', () => undefined)).rejects.toThrow('Limite de perguntas por hora atingido.');
  });
});
