import { Component, inject, input, linkedSignal, output, signal } from '@angular/core';
import { Observable } from 'rxjs';

import { Api } from '../../core/api';
import { Avaliacao } from '../../core/modelos';

/**
 * "Esta resposta ajudou?" embaixo de cada resposta. O voto é salvo na hora; o comentário
 * (quando a resposta não ajudou) é opcional e vai num segundo envio.
 */
@Component({
  selector: 'app-avaliacao-resposta',
  template: `
    <div class="linha">
      <span class="pergunta" [id]="'avaliar-' + mensagemId()">Esta resposta ajudou?</span>
      <div class="opcoes" role="group" [attr.aria-labelledby]="'avaliar-' + mensagemId()">
        <button
          type="button"
          class="opcao"
          [class.marcada]="atual()?.util === true"
          [attr.aria-pressed]="atual()?.util === true"
          [disabled]="salvando()"
          (click)="votar(true)"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 9v8H4V9h3Zm2 8V9l3.2-5.6c.3-.5.9-.7 1.4-.4.6.3.8.9.7 1.5L13.6 8H17c.9 0 1.6.9 1.4 1.8l-1.3 5.6c-.2.9-1 1.6-1.9 1.6H9Z" /></svg>
          Sim
        </button>
        <button
          type="button"
          class="opcao"
          [class.marcada]="atual()?.util === false"
          [attr.aria-pressed]="atual()?.util === false"
          [disabled]="salvando()"
          (click)="votar(false)"
        >
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M13 11V3h3v8h-3Zm-2-8v8l-3.2 5.6c-.3.5-.9.7-1.4.4-.6-.3-.8-.9-.7-1.5L6.4 12H3c-.9 0-1.6-.9-1.4-1.8l1.3-5.6C3.1 3.7 3.9 3 4.8 3H11Z" /></svg>
          Não
        </button>
      </div>
      @if (mensagemDeRetorno()) {
        <span class="retorno" role="status">{{ mensagemDeRetorno() }}</span>
      }
    </div>

    @if (comentando()) {
      <form class="comentario" (submit)="$event.preventDefault(); enviarComentario()">
        <label [for]="'comentario-' + mensagemId()">O que faltou na resposta? (opcional)</label>
        <textarea
          [id]="'comentario-' + mensagemId()"
          #campo
          rows="2"
          maxlength="500"
          placeholder="Ex.: não falou do horário de sábado"
          [value]="comentario()"
          (input)="comentario.set(campo.value)"
          (keydown.escape)="comentando.set(false)"
        ></textarea>
        <div class="acoes">
          <button type="button" class="botao-texto" (click)="comentando.set(false)">Agora não</button>
          <button type="submit" class="botao-secundario" [disabled]="!comentario().trim() || salvando()">Enviar</button>
        </div>
      </form>
    }
  `,
  styles: `
    :host {
      display: block;
      margin-top: 0.6rem;
      max-width: 68ch;
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 0.75rem;
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    .opcoes {
      display: flex;
      gap: 0.35rem;
    }
    .opcao {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      min-height: 1.9rem;
      padding: 0 0.6rem;
      border: 1px solid var(--linha);
      border-radius: 999px;
      background: transparent;
      color: var(--tinta-suave);
      font: inherit;
      cursor: pointer;
    }
    .opcao svg {
      width: 0.95rem;
      height: 0.95rem;
      fill: currentColor;
    }
    .opcao:hover:not(:disabled) {
      border-color: var(--linha-forte);
      color: var(--tinta);
    }
    .opcao.marcada {
      border-color: var(--musgo);
      background: var(--musgo-claro);
      color: var(--musgo);
      font-weight: 700;
    }
    .opcao:disabled {
      cursor: progress;
    }
    .retorno {
      color: var(--musgo);
    }
    .comentario {
      display: grid;
      gap: 0.4rem;
      margin-top: 0.6rem;
      padding: 0.75rem;
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      background: var(--superficie);
    }
    label {
      font-size: var(--t-pequeno);
      font-weight: 700;
    }
    textarea {
      font: inherit;
      color: var(--tinta);
      background: var(--papel);
      border: 1px solid var(--linha-forte);
      border-radius: var(--raio);
      padding: 0.5rem 0.65rem;
      resize: vertical;
    }
    textarea:focus {
      outline: none;
      border-color: var(--musgo);
      box-shadow: var(--foco);
    }
    .acoes {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
    }
    .acoes .botao-secundario {
      min-height: 2rem;
    }
  `,
})
export class AvaliacaoResposta {
  readonly conversaId = input.required<string>();
  readonly mensagemId = input.required<string>();
  readonly avaliacao = input<Avaliacao | null>(null);
  readonly mudou = output<Avaliacao | null>();

  private readonly api = inject(Api);

  protected readonly atual = linkedSignal(() => this.avaliacao());
  protected readonly comentario = linkedSignal(() => this.avaliacao()?.comentario ?? '');
  protected readonly comentando = signal(false);
  protected readonly salvando = signal(false);
  protected readonly mensagemDeRetorno = signal<string | null>(null);

  protected votar(util: boolean): void {
    // Clicar de novo na opção marcada desfaz o voto.
    if (this.atual()?.util === util) {
      this.salvar(null);
      return;
    }
    this.salvar({ util, comentario: null });
  }

  protected enviarComentario(): void {
    this.salvar({ util: false, comentario: this.comentario().trim() });
  }

  private salvar(nova: Avaliacao | null): void {
    const anterior = this.atual();
    this.atual.set(nova);
    this.salvando.set(true);
    this.mensagemDeRetorno.set(null);
    const pedido: Observable<unknown> = nova
      ? this.api.avaliar(this.conversaId(), this.mensagemId(), nova)
      : this.api.removerAvaliacao(this.conversaId(), this.mensagemId());
    pedido.subscribe({
      next: () => {
        this.salvando.set(false);
        this.mudou.emit(nova);
        if (nova === null) {
          this.comentando.set(false);
        } else if (!nova.util && !nova.comentario) {
          this.comentando.set(true);
        } else {
          this.comentando.set(false);
          this.mensagemDeRetorno.set(nova.util ? 'Obrigado pelo retorno.' : 'Obrigado. Isso ajuda a melhorar os documentos.');
        }
      },
      error: () => {
        this.salvando.set(false);
        this.atual.set(anterior);
        this.mensagemDeRetorno.set('Não foi possível salvar sua avaliação.');
      },
    });
  }
}
