import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Avaliacao } from '../../core/modelos';
import { AvaliacaoResposta } from './avaliacao-resposta';

const URL = '/api/conversas/c1/mensagens/m1/avaliacao';

describe('AvaliacaoResposta', () => {
  let fixture: ComponentFixture<AvaliacaoResposta>;
  let http: HttpTestingController;
  let emitidas: (Avaliacao | null)[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    fixture = TestBed.createComponent(AvaliacaoResposta);
    fixture.componentRef.setInput('conversaId', 'c1');
    fixture.componentRef.setInput('mensagemId', 'm1');
    emitidas = [];
    fixture.componentInstance.mudou.subscribe((avaliacao) => emitidas.push(avaliacao));
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function botao(texto: string): HTMLButtonElement {
    const botoes = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const encontrado = botoes.find((b) => b.textContent?.trim() === texto);
    if (!encontrado) {
      throw new Error(`Botão "${texto}" não encontrado`);
    }
    return encontrado;
  }

  it('salva o voto útil na hora e agradece', async () => {
    botao('Sim').click();
    const pedido = http.expectOne(URL);
    expect(pedido.request.method).toBe('PUT');
    expect(pedido.request.body).toEqual({ util: true, comentario: null });
    pedido.flush({ util: true, comentario: null });
    await fixture.whenStable();

    expect(botao('Sim').getAttribute('aria-pressed')).toBe('true');
    expect(fixture.nativeElement.textContent).toContain('Obrigado pelo retorno.');
    expect(emitidas).toEqual([{ util: true, comentario: null }]);
  });

  it('depois do "Não", pede um comentário opcional e envia junto', async () => {
    botao('Não').click();
    http.expectOne(URL).flush({ util: false, comentario: null });
    await fixture.whenStable();

    const campo = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(campo).not.toBeNull();
    campo.value = 'Faltou o horário de sábado';
    campo.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    botao('Enviar').click();

    const pedido = http.expectOne(URL);
    expect(pedido.request.body).toEqual({ util: false, comentario: 'Faltou o horário de sábado' });
    pedido.flush(pedido.request.body);
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
  });

  it('clicar de novo na opção marcada desfaz o voto', async () => {
    fixture.componentRef.setInput('avaliacao', { util: true, comentario: null });
    await fixture.whenStable();

    botao('Sim').click();
    const pedido = http.expectOne(URL);
    expect(pedido.request.method).toBe('DELETE');
    pedido.flush(null);
    await fixture.whenStable();

    expect(botao('Sim').getAttribute('aria-pressed')).toBe('false');
    expect(emitidas).toEqual([null]);
  });

  it('se o servidor falhar, volta ao estado anterior e avisa', async () => {
    botao('Sim').click();
    http.expectOne(URL).flush({ detail: 'erro' }, { status: 500, statusText: 'Erro' });
    await fixture.whenStable();

    expect(botao('Sim').getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.textContent).toContain('Não foi possível salvar sua avaliação.');
  });
});
