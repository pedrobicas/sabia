import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';

import { formatarResposta } from '../../core/formatar-resposta';
import { Citacao } from '../../core/modelos';

/**
 * Uma resposta do assistente: texto em fonte de leitura, marcadores [n] clicáveis e a lista de fontes.
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
                [attr.aria-label]="'Ver fonte ' + parte.numero + ': ' + fonte.documentoNome"
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
              <button type="button" (click)="citar.emit(fonte)">
                <span class="numero">{{ fonte.numero }}</span>
                <span class="documento">{{ fonte.documentoNome }}</span>
                @if (fonte.pagina) {
                  <span class="pagina">página {{ fonte.pagina }}</span>
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
      font-family: var(--fonte-leitura);
      font-size: 1.075rem;
      line-height: 1.7;
      max-width: 68ch;
    }
    p {
      margin: 0 0 0.8rem;
    }
    p.item {
      position: relative;
      padding-left: 1.25rem;
      margin-bottom: 0.4rem;
    }
    p.item::before {
      content: '';
      position: absolute;
      left: 0.3rem;
      top: 0.75em;
      width: 0.35rem;
      height: 0.35rem;
      border-radius: 50%;
      background: var(--tinta-suave);
    }
    p.titulo {
      font-weight: 650;
      margin-top: 1rem;
    }
    .marcador {
      display: inline-block;
      margin: 0 0 0 0.12rem;
      padding: 0 0.35rem;
      border: 0;
      border-radius: 3px;
      background: var(--marca-texto);
      color: var(--tinta);
      font-family: var(--fonte-interface);
      font-size: 0.7rem;
      font-weight: 700;
      line-height: 1.5;
      vertical-align: super;
      cursor: pointer;
    }
    button.marcador:hover {
      background: var(--tinta);
      color: var(--marca-texto);
    }
    .marcador.inativo {
      background: var(--linha);
      cursor: default;
    }
    .cursor {
      display: inline-block;
      width: 0.5rem;
      height: 1.1em;
      margin-left: 0.15rem;
      vertical-align: text-bottom;
      background: var(--musgo);
      animation: piscar 1s steps(2, start) infinite;
    }
    @keyframes piscar {
      to {
        visibility: hidden;
      }
    }
    .fontes {
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--linha-forte);
      max-width: 68ch;
    }
    h3 {
      font-family: var(--fonte-interface);
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
      margin-bottom: 0.4rem;
    }
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem 1rem;
    }
    .fontes button {
      display: inline-flex;
      align-items: baseline;
      gap: 0.4rem;
      border: 0;
      background: none;
      padding: 0.15rem 0;
      font: inherit;
      font-size: var(--t-pequeno);
      color: var(--tinta);
      cursor: pointer;
      text-align: left;
    }
    .fontes button:hover .documento {
      text-decoration: underline;
    }
    .numero {
      display: inline-grid;
      place-items: center;
      min-width: 1.2rem;
      height: 1.2rem;
      border-radius: 3px;
      background: var(--marca-texto);
      font-weight: 700;
      font-size: 0.7rem;
    }
    .pagina {
      color: var(--tinta-suave);
    }
  `,
})
export class Resposta {
  readonly texto = input.required<string>();
  readonly citacoes = input<Citacao[]>([]);
  readonly digitando = input(false);
  readonly citar = output<Citacao>();

  protected readonly blocos = computed(() => formatarResposta(this.texto()));

  protected citacao(numero: number): Citacao | undefined {
    return this.citacoes().find((fonte) => fonte.numero === numero);
  }
}
