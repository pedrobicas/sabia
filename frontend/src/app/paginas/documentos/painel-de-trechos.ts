import { Component, computed, ElementRef, inject, input, OnInit, output, signal, viewChild } from '@angular/core';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Documento, TrechoIndexado } from '../../core/modelos';

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
  host: {
    '(document:keydown.escape)': 'fechar.emit()',
  },
  template: `
    <div class="fundo" (click)="fechar.emit()" aria-hidden="true"></div>
    <aside class="painel" role="dialog" aria-modal="true" aria-labelledby="titulo-trechos">
      <header>
        <div>
          <p class="sobretitulo">Trechos indexados</p>
          <h2 id="titulo-trechos">{{ documento().nome }}</h2>
        </div>
        <button #botaoFechar type="button" class="botao-texto" (click)="fechar.emit()">Fechar</button>
      </header>

      <div class="busca">
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
        <span class="contagem" role="status">
          @if (carregando()) {
            Carregando...
          } @else if (busca().trim()) {
            {{ filtrados().length }} de {{ trechos().length }} trechos
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
              Trecho {{ trecho.ordem + 1 }}
              @if (trecho.pagina) {
                · página {{ trecho.pagina }}
              }
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
      background: rgba(30, 35, 24, 0.35);
    }
    .painel {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      z-index: 21;
      width: min(40rem, 100%);
      display: grid;
      grid-template-rows: auto auto auto 1fr;
      background: var(--superficie);
      border-left: 1px solid var(--linha);
      box-shadow: -12px 0 32px var(--sombra);
    }
    header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem 0.75rem;
    }
    header > div {
      flex: 1;
      min-width: 0;
    }
    .sobretitulo {
      margin: 0 0 0.2rem;
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
    }
    h2 {
      font-size: var(--t-grande);
      overflow-wrap: anywhere;
    }
    .busca {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1rem;
      padding: 0 1.5rem 1rem;
      border-bottom: 1px solid var(--linha);
    }
    .busca input {
      flex: 1 1 14rem;
      font: inherit;
      color: var(--tinta);
      background: var(--papel);
      border: 1px solid var(--linha-forte);
      border-radius: var(--raio);
      padding: 0.5rem 0.7rem;
    }
    .busca input:focus {
      outline: none;
      border-color: var(--musgo);
      box-shadow: var(--foco);
    }
    .contagem {
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    .alerta-erro {
      margin: 1rem 1.5rem 0;
    }
    .trechos {
      list-style: none;
      margin: 0;
      padding: 0.5rem 1.5rem 2rem;
      overflow-y: auto;
    }
    .trechos li {
      padding: 1rem 0;
      border-bottom: 1px solid var(--linha);
    }
    .meta {
      margin: 0 0 0.35rem;
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
    }
    .texto {
      margin: 0;
      font-family: var(--fonte-leitura);
      line-height: 1.65;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .destaque {
      background: var(--marca-texto-suave);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }
    .vazio {
      color: var(--tinta-suave);
      border-bottom: 0;
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

/** Minúsculas e sem acentos, caractere por caractere (o tamanho do texto não muda). */
export function normalizar(texto: string): string {
  return Array.from(texto, (letra) => letra.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() || letra).join('');
}
