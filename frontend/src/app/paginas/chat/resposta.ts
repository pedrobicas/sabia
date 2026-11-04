import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { formatarResposta } from '../../core/formatar-resposta';
import { Citacao } from '../../core/modelos';

/**
 * Uma resposta do assistente: o texto, os marcadores [n] clicáveis e a lista de fontes.
 */
@Component({
  selector: 'app-resposta',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #linha let-partes>
      @for (parte of partes; track $index) {
        @switch (parte.tipo) {
          @case ('negrito') {
            <strong>{{ parte.valor }}</strong>
          }
          @case ('citacao') {
            @if (citacao(parte.numero); as fonte) {
              <button
                type="button"
                class="marcador"
                [class.ativo]="fonteAtiva() === parte.numero"
                [attr.aria-label]="'Ver fonte ' + parte.numero + ': ' + fonte.documentoNome"
                [title]="fonte.documentoNome"
                (click)="citar.emit(fonte)"
              >{{ parte.numero }}</button>
            } @else {
              <sup class="marcador inativo">{{ parte.numero }}</sup>
            }
          }
          @default {
            <ng-container>{{ parte.valor }}</ng-container>
          }
        }
      }
    </ng-template>

    <div class="texto">
      @for (bloco of blocos(); track $index) {
        <p [class]="bloco.tipo">
          <ng-container *ngTemplateOutlet="linha; context: { $implicit: bloco.partes }" />
        </p>
      }
      @if (digitando()) {
        <span class="cursor" aria-hidden="true"></span>
      }
    </div>

    @if (!digitando() && citacoes().length > 0) {
      <div class="fontes">
        <h3>Fontes</h3>
        <ul>
          @for (fonte of citacoes(); track fonte.numero) {
            <li>
              <button
                type="button"
                [class.ativo]="fonteAtiva() === fonte.numero"
                [attr.aria-pressed]="fonteAtiva() === fonte.numero"
                (click)="citar.emit(fonte)"
              >
                <span class="numero">{{ fonte.numero }}</span>
                <span class="documento">{{ fonte.documentoNome }}</span>
                @if (fonte.pagina) {
                  <span class="pag">p. {{ fonte.pagina }}</span>
                }
              </button>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .texto {
      font-size: var(--t-leitura);
      line-height: 1.7;
      color: var(--tinta);
    }
    p {
      margin: 0 0 0.75rem;
    }
    p:last-of-type {
      margin-bottom: 0;
    }
    strong {
      font-weight: 600;
    }
    p.item {
      position: relative;
      padding-left: 1.1rem;
      margin-bottom: 0.3rem;
    }
    p.item::before {
      content: '';
      position: absolute;
      left: 0.3rem;
      top: 0.72em;
      width: 0.3rem;
      height: 0.3rem;
      border-radius: 50%;
      background: var(--tinta-fraca);
    }
    p.item + p:not(.item) {
      margin-top: 0.75rem;
    }
    p.titulo {
      font-weight: 600;
      margin-top: 1rem;
    }
    p.nota {
      font-size: var(--t-pequeno);
      color: var(--tinta-fraca);
    }
    .marcador {
      display: inline-grid;
      place-items: center;
      min-width: 1.05rem;
      height: 1.05rem;
      margin: 0 0.05rem 0 0.15rem;
      padding: 0 0.2rem;
      border: 0;
      border-radius: 4px;
      background: var(--acento-suave);
      color: var(--acento);
      font: inherit;
      font-size: 0.6875rem;
      font-weight: 600;
      line-height: 1;
      vertical-align: 0.15em;
      cursor: pointer;
      font-variant-numeric: tabular-nums;
    }
    button.marcador:hover,
    .marcador.ativo {
      background: var(--botao);
      color: #fff;
    }
    .marcador.inativo {
      background: var(--superficie-2);
      color: var(--tinta-fraca);
      cursor: default;
    }
    .cursor {
      display: inline-block;
      width: 0.45rem;
      height: 1em;
      margin-left: 0.15rem;
      vertical-align: -0.12em;
      border-radius: 1px;
      background: var(--tinta-suave);
      animation: piscar 1s steps(2, start) infinite;
    }
    @keyframes piscar {
      to {
        visibility: hidden;
      }
    }
    .fontes {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      margin-top: 1rem;
    }
    h3 {
      flex: none;
      line-height: 1.75rem;
      font-size: var(--t-mini);
      font-weight: 500;
      color: var(--tinta-fraca);
    }
    ul {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      min-width: 0;
      max-width: 100%;
    }
    .fontes button {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      max-width: 100%;
      height: 1.75rem;
      padding: 0 0.55rem 0 0.3rem;
      border: 1px solid var(--linha);
      border-radius: var(--raio-pequeno);
      background: var(--superficie);
      color: var(--tinta-suave);
      font: inherit;
      font-size: var(--t-pequeno);
      cursor: pointer;
      text-align: left;
    }
    .fontes button:hover {
      border-color: var(--linha-forte);
      color: var(--tinta);
    }
    .fontes button.ativo {
      border-color: var(--acento);
      color: var(--tinta);
      box-shadow: 0 0 0 1px var(--acento);
    }
    .numero {
      display: grid;
      place-items: center;
      min-width: 1.1rem;
      height: 1.1rem;
      border-radius: 4px;
      background: var(--superficie-2);
      color: var(--tinta-suave);
      font-size: 0.6875rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .ativo .numero {
      background: var(--botao);
      color: #fff;
    }
    .documento {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .pag {
      color: var(--tinta-fraca);
      white-space: nowrap;
    }
  `,
})
export class Resposta {
  readonly texto = input.required<string>();
  readonly citacoes = input<Citacao[]>([]);
  readonly digitando = input(false);
  /** Número da fonte aberta no painel, para marcar o marcador e o item da lista. */
  readonly fonteAtiva = input<number | null>(null);
  readonly citar = output<Citacao>();

  protected readonly blocos = computed(() => formatarResposta(this.texto()));

  protected citacao(numero: number): Citacao | undefined {
    return this.citacoes().find((fonte) => fonte.numero === numero);
  }
}
