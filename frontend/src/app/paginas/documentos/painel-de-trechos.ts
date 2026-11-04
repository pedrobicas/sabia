import { Component, computed, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Documento, TrechoIndexado } from '../../core/modelos';
import { normalizar } from '../../core/texto';
import { Icone } from '../shell/icone';
import { TipoDeArquivo } from '../shell/tipo-de-arquivo';

interface Pedaco {
  texto: string;
  destaque: boolean;
}

/**
 * Painel lateral com os trechos de um documento, do jeito que o assistente os consulta.
 * Serve para conferir se o arquivo foi lido direito (PDF escaneado, tabela quebrada etc.).
 */
@Component({
  selector: 'app-painel-de-trechos',
  imports: [Icone, TipoDeArquivo],
  host: {
    '(document:keydown.escape)': 'fechar.emit()',
  },
  template: `
    <div class="fundo" (click)="fechar.emit()" aria-hidden="true"></div>
    <aside class="painel" role="dialog" aria-modal="true" aria-labelledby="titulo-trechos">
      <header>
        <app-tipo-de-arquivo [nome]="documento().nome" />
        <div class="titulo">
          <h2 id="titulo-trechos">{{ documento().nome }}</h2>
          <p>Trechos indexados, na ordem do documento</p>
        </div>
        <button #botaoFechar type="button" class="botao-icone" aria-label="Fechar" title="Fechar (Esc)" (click)="fechar.emit()">
          <app-icone nome="fechar" />
        </button>
      </header>

      <div class="busca">
        <div class="campo-busca">
          <app-icone nome="busca" [tamanho]="14" />
          <label for="busca-trechos" class="so-leitor-de-tela">Buscar nos trechos</label>
          <input
            id="busca-trechos"
            #campo
            type="search"
            placeholder="Buscar nos trechos"
            autocomplete="off"
            [value]="busca()"
            (input)="busca.set(campo.value)"
          />
        </div>
        <span class="contagem" role="status">
          @if (carregando()) {
            Carregando...
          } @else if (busca().trim()) {
            {{ filtrados().length }} de {{ trechos().length }}
          } @else {
            {{ trechos().length }} {{ trechos().length === 1 ? 'trecho' : 'trechos' }}
          }
        </span>
      </div>

      @if (erro()) {
        <p class="alerta-erro" role="alert">{{ erro() }}</p>
      }

      <ol class="trechos">
        @for (trecho of filtrados(); track trecho.ordem) {
          <li>
            <p class="meta">
              <span>#{{ trecho.ordem + 1 }}</span>
              @if (trecho.pagina) {
                <span>página {{ trecho.pagina }}</span>
              }
              <span>{{ trecho.texto.length }} caracteres</span>
            </p>
            <!-- Numa linha só: o texto usa white-space: pre-wrap e qualquer espaço do template apareceria. -->
            <p class="texto">@for (pedaco of destacar(trecho.texto); track $index) {<span [class.destaque]="pedaco.destaque">{{ pedaco.texto }}</span>}</p>
          </li>
        } @empty {
          @if (!carregando() && busca().trim()) {
            <li class="vazio">Nenhum trecho tem "{{ busca().trim() }}".</li>
          }
        }
      </ol>
    </aside>
  `,
  styles: `
    .fundo {
      position: fixed;
      inset: 0;
      z-index: 20;
      background: var(--veu);
      animation: aparecer 140ms ease-out;
    }
    .painel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 21;
      width: min(38rem, 100%);
      display: grid;
      grid-template-rows: auto auto auto minmax(0, 1fr);
      background: var(--fundo);
      border-left: 1px solid var(--linha);
      box-shadow: var(--sombra-2);
      animation: deslizar 180ms ease-out;
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem 0.75rem 1rem 1.25rem;
      border-bottom: 1px solid var(--linha);
    }
    header app-tipo-de-arquivo {
      margin-top: 0.1rem;
    }
    .titulo {
      flex: 1;
      min-width: 0;
    }
    h2 {
      font-size: var(--t-medio);
      overflow-wrap: anywhere;
    }
    .titulo p {
      margin-top: 0.1rem;
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    .busca {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      border-bottom: 1px solid var(--linha);
    }
    .campo-busca {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      color: var(--tinta-fraca);
    }
    .campo-busca app-icone {
      position: absolute;
      left: 0.65rem;
      pointer-events: none;
    }
    .campo-busca input {
      width: 100%;
      height: 2rem;
      padding: 0 0.6rem 0 2rem;
      border: 1px solid var(--linha-forte);
      border-radius: var(--raio-pequeno);
      background: var(--superficie);
      color: var(--tinta);
      font: inherit;
    }
    .campo-busca input:focus {
      outline: none;
      border-color: var(--acento);
      box-shadow: var(--foco);
    }
    .contagem {
      flex: none;
      font-size: var(--t-pequeno);
      color: var(--tinta-fraca);
      font-variant-numeric: tabular-nums;
    }
    .alerta-erro {
      margin: 1rem 1.25rem 0;
    }
    .trechos {
      list-style: none;
      margin: 0;
      padding: 0.25rem 1.25rem 2rem;
      overflow-y: auto;
    }
    .trechos li {
      padding: 1rem 0;
      border-bottom: 1px solid var(--linha);
    }
    .trechos li:last-child {
      border-bottom: 0;
    }
    .meta {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.4rem;
      font-size: var(--t-mini);
      color: var(--tinta-fraca);
      font-variant-numeric: tabular-nums;
    }
    .meta span:first-child {
      color: var(--tinta-suave);
      font-weight: 500;
    }
    .texto {
      font-size: var(--t-base);
      line-height: 1.65;
      color: var(--tinta);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .destaque {
      background: var(--marca-texto);
      border-radius: 2px;
      padding: 0.05em 1px;
    }
    .vazio {
      color: var(--tinta-fraca);
      border-bottom: 0;
    }
    @keyframes aparecer {
      from {
        opacity: 0;
      }
    }
    @keyframes deslizar {
      from {
        transform: translateX(1.5rem);
        opacity: 0;
      }
    }
  `,
})
export class PainelDeTrechos implements OnInit {
  readonly documento = input.required<Documento>();
  readonly fechar = output<void>();

  private readonly api = inject(Api);
  private readonly botaoFechar = viewChild<ElementRef<HTMLButtonElement>>('botaoFechar');

  protected readonly trechos = signal<TrechoIndexado[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly busca = signal('');

  private readonly termo = computed(() => normalizar(this.busca().trim()));

  protected readonly filtrados = computed(() => {
    const termo = this.termo();
    return termo ? this.trechos().filter((trecho) => normalizar(trecho.texto).includes(termo)) : this.trechos();
  });

  ngOnInit(): void {
    queueMicrotask(() => this.botaoFechar()?.nativeElement.focus());
    this.api.trechosDoDocumento(this.documento().id).subscribe({
      next: (trechos) => {
        this.trechos.set(trechos);
        this.carregando.set(false);
      },
      error: (falha) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível carregar os trechos.'));
      },
    });
  }

  /** Divide o texto em pedaços, marcando onde o termo buscado aparece (sem diferenciar acentos). */
  protected destacar(texto: string): Pedaco[] {
    const termo = this.termo();
    if (!termo) {
      return [{ texto, destaque: false }];
    }
    // normalizar() preserva o tamanho do texto, então as posições valem para o original.
    const comparavel = normalizar(texto);
    const pedacos: Pedaco[] = [];
    let inicio = 0;
    let achado = comparavel.indexOf(termo);
    while (achado >= 0) {
      if (achado > inicio) {
        pedacos.push({ texto: texto.slice(inicio, achado), destaque: false });
      }
      pedacos.push({ texto: texto.slice(achado, achado + termo.length), destaque: true });
      inicio = achado + termo.length;
      achado = comparavel.indexOf(termo, inicio);
    }
    if (inicio < texto.length) {
      pedacos.push({ texto: texto.slice(inicio), destaque: false });
    }
    return pedacos;
  }
}
