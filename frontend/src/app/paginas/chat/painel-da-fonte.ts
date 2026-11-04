import { Component, computed, ElementRef, input, output, viewChild } from '@angular/core';

import { destacarFrases, frasesQueCitam, limparTrecho } from '../../core/destaque';
import { Citacao } from '../../core/modelos';
import { Icone } from '../shell/icone';
import { TipoDeArquivo } from '../shell/tipo-de-arquivo';

/**
 * Painel ao lado da conversa com o trecho que o assistente usou como fonte. A frase do trecho
 * mais parecida com o que a resposta afirmou aparece destacada.
 */
@Component({
  selector: 'app-painel-da-fonte',
  imports: [Icone, TipoDeArquivo],
  template: `
    <header>
      <span class="rotulo"><span class="numero">{{ citacao().numero }}</span>Fonte citada</span>
      <button type="button" class="botao-icone" aria-label="Fechar a fonte" title="Fechar (Esc)" (click)="fechar.emit()">
        <app-icone nome="fechar" />
      </button>
    </header>

    <div class="documento">
      <app-tipo-de-arquivo [nome]="citacao().documentoNome" />
      <div>
        <h2 id="titulo-fonte" #titulo tabindex="-1">{{ citacao().documentoNome }}</h2>
        @if (citacao().pagina) {
          <p>Página {{ citacao().pagina }}</p>
        }
      </div>
    </div>

    <div class="corpo">
      <h3>Trecho usado na resposta</h3>
      <!-- Numa linha só: o texto usa white-space: pre-wrap e qualquer espaço do template apareceria. -->
      <p class="trecho">@for (pedaco of pedacos(); track $index) {@if (pedaco.destaque) {<mark>{{ pedaco.texto }}</mark>} @else {<span>{{ pedaco.texto }}</span>}}</p>
      @if (temDestaque()) {
        <p class="legenda"><span class="amostra" aria-hidden="true"></span>Frase mais próxima do que a resposta afirma</p>
      }
    </div>

    <footer>
      <button type="button" class="botao-secundario" (click)="baixar.emit(citacao())">
        <app-icone nome="baixar" />
        Baixar o original
      </button>
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: var(--fundo);
      border-left: 1px solid var(--linha);
      animation: entrar 160ms ease-out;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 3.25rem;
      padding: 0 0.75rem 0 1.25rem;
      border-bottom: 1px solid var(--linha);
    }
    .rotulo {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--t-pequeno);
      font-weight: 500;
      color: var(--tinta-suave);
    }
    .numero {
      display: grid;
      place-items: center;
      min-width: 1.15rem;
      height: 1.15rem;
      border-radius: 4px;
      background: var(--botao);
      color: #fff;
      font-size: 0.6875rem;
      font-weight: 600;
    }
    .documento {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1.25rem 1.25rem 0;
    }
    .documento app-tipo-de-arquivo {
      margin-top: 0.05rem;
    }
    h2 {
      font-size: var(--t-base);
      font-weight: 600;
      overflow-wrap: anywhere;
    }
    .documento p {
      margin-top: 0.1rem;
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    h2:focus {
      box-shadow: none;
    }
    .corpo {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 1.25rem;
    }
    h3 {
      margin-bottom: 0.5rem;
      font-size: var(--t-mini);
      font-weight: 500;
      color: var(--tinta-fraca);
    }
    .trecho {
      padding: 0.875rem 1rem;
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      background: var(--fundo-lateral);
      font-size: var(--t-base);
      line-height: 1.7;
      color: var(--tinta-suave);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    mark {
      background: var(--marca-texto);
      color: var(--tinta);
      border-radius: 3px;
      padding: 0.1em 0.15em;
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
    }
    .legenda {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-top: 0.6rem;
      color: var(--tinta-fraca);
      font-size: var(--t-mini);
    }
    .amostra {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 3px;
      background: var(--marca-texto);
      border: 1px solid color-mix(in srgb, var(--atencao) 35%, transparent);
    }
    footer {
      padding: 0.875rem 1.25rem;
      border-top: 1px solid var(--linha);
    }
    footer .botao-secundario {
      width: 100%;
    }
    @keyframes entrar {
      from {
        transform: translateX(0.75rem);
        opacity: 0;
      }
    }
  `,
})
export class PainelDaFonte {
  readonly citacao = input.required<Citacao>();
  /** Texto completo da resposta que citou a fonte, para achar a frase correspondente no trecho. */
  readonly resposta = input('');
  readonly fechar = output<void>();
  readonly baixar = output<Citacao>();

  private readonly titulo = viewChild<ElementRef<HTMLElement>>('titulo');

  protected readonly pedacos = computed(() =>
    destacarFrases(limparTrecho(this.citacao().trecho), frasesQueCitam(this.resposta(), this.citacao().numero)),
  );

  protected readonly temDestaque = computed(() => this.pedacos().some((pedaco) => pedaco.destaque));

  focar(): void {
    this.titulo()?.nativeElement.focus();
  }
}
