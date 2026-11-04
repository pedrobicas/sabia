import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';

import { Api, salvarArquivo } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { data, tamanho } from '../../core/formatos';
import { Documento, StatusDocumento } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { Icone } from '../shell/icone';
import { TipoDeArquivo } from '../shell/tipo-de-arquivo';
import { PainelDeTrechos } from './painel-de-trechos';

const ROTULO_DO_STATUS: Record<StatusDocumento, string> = {
  ENVIADO: 'Na fila',
  PROCESSANDO: 'Processando',
  PRONTO: 'Pronto',
  ERRO: 'Erro',
};

@Component({
  selector: 'app-documentos',
  imports: [PainelDeTrechos, Icone, TipoDeArquivo],
  host: {
    '(dragenter)': 'aoEntrarArrastando($event)',
    '(dragover)': '$event.preventDefault()',
    '(dragleave)': 'aoSairArrastando()',
    '(drop)': 'aoSoltar($event)',
  },
  template: `
    <div class="pagina">
      <header class="cabecalho-pagina">
        <div>
          <h1>Documentos</h1>
          <p class="subtitulo">{{ resumo() }}</p>
        </div>
        @if (sessao.admin()) {
          <input
            #seletor
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,.markdown"
            class="so-leitor-de-tela"
            tabindex="-1"
            aria-hidden="true"
            (change)="aoEscolher($event)"
          />
          <button type="button" class="botao" [disabled]="enviando()" (click)="seletor.click()">
            @if (enviando()) {
              <span class="girando claro" aria-hidden="true"></span>
              Enviando...
            } @else {
              <app-icone nome="enviar" />
              Enviar arquivos
            }
          </button>
        }
      </header>

      @if (sessao.admin()) {
        <p class="formatos">
          PDF, Word (.docx), texto ou Markdown, até 10 MB cada. Um arquivo com o mesmo nome de um documento existente
          substitui esse documento.
        </p>
      } @else {
        <p class="formatos">Só administradores enviam e excluem documentos. Você pode ver os trechos e baixar os originais.</p>
      }

      @if (erro()) {
        <p class="alerta-erro" role="alert">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p class="aviso-envio" role="status">{{ aviso() }}</p>
      }

      @if (carregado() && documentos().length === 0) {
        <div class="vazio">
          <app-icone nome="documento" [tamanho]="22" />
          <h2>Nenhum documento</h2>
          <p>
            @if (sessao.admin()) {
              Envie manuais, políticas ou perguntas frequentes. Depois do processamento, o Sabiá já responde com base neles.
            } @else {
              Peça para um administrador da empresa enviar os documentos.
            }
          </p>
        </div>
      } @else if (documentos().length > 0) {
        <div class="quadro-tabela">
          <table class="tabela tabela-documentos">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Situação</th>
                <th scope="col" class="direita">Trechos</th>
                <th scope="col" class="direita">Tamanho</th>
                <th scope="col">Atualizado em</th>
                <th scope="col"><span class="so-leitor-de-tela">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (documento of documentos(); track documento.id) {
                <tr>
                  <td class="nome">
                    <div class="celula-nome">
                      <app-tipo-de-arquivo [nome]="documento.nome" />
                      <div>
                        <span class="titulo">{{ documento.nome }}</span>
                        @if (documento.versao > 1) {
                          <span class="etiqueta" [title]="'Versão ' + documento.versao">v{{ documento.versao }}</span>
                        }
                        @if (documento.erro) {
                          <span class="erro-documento">{{ documento.erro }}</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td data-rotulo="Situação">
                    <span class="status" [attr.data-status]="documento.status">
                      @if (documento.status === 'PROCESSANDO') {
                        <span class="girando" aria-hidden="true"></span>
                      } @else {
                        <span class="ponto" aria-hidden="true"></span>
                      }
                      {{ rotulo(documento.status) }}
                    </span>
                  </td>
                  <td class="direita numero-tabular" data-rotulo="Trechos">
                    {{ documento.status === 'PRONTO' ? documento.totalTrechos : '–' }}
                  </td>
                  <td class="direita numero-tabular suave" data-rotulo="Tamanho">{{ tamanhoDe(documento) }}</td>
                  <td class="numero-tabular suave" data-rotulo="Atualizado em">{{ dataDe(documento) }}</td>
                  <td class="acoes">
                    <button
                      type="button"
                      class="botao-icone"
                      [attr.aria-label]="'Ver trechos de ' + documento.nome"
                      title="Ver trechos"
                      [disabled]="documento.status !== 'PRONTO'"
                      (click)="abrirTrechos(documento, $event)"
                    >
                      <app-icone nome="trechos" />
                    </button>
                    <button
                      type="button"
                      class="botao-icone"
                      [attr.aria-label]="'Baixar ' + documento.nome"
                      title="Baixar o original"
                      (click)="baixar(documento)"
                    >
                      <app-icone nome="baixar" />
                    </button>
                    @if (sessao.admin()) {
                      <button
                        type="button"
                        class="botao-icone"
                        [attr.aria-label]="'Reprocessar ' + documento.nome"
                        title="Reprocessar"
                        [disabled]="documento.status === 'ENVIADO' || documento.status === 'PROCESSANDO'"
                        (click)="reprocessar(documento)"
                      >
                        <app-icone nome="recarregar" />
                      </button>
                      <button
                        type="button"
                        class="botao-icone perigo"
                        [attr.aria-label]="'Excluir ' + documento.nome"
                        title="Excluir"
                        (click)="excluir(documento)"
                      >
                        <app-icone nome="lixeira" />
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (arrastando() && sessao.admin()) {
      <div class="soltar" aria-hidden="true">
        <div>
          <app-icone nome="enviar" [tamanho]="24" />
          <strong>Solte os arquivos para enviar</strong>
          <span>PDF, Word, texto ou Markdown, até 10 MB cada</span>
        </div>
      </div>
    }

    @if (trechosDe(); as documento) {
      <app-painel-de-trechos [documento]="documento" (fechar)="fecharTrechos()" />
    }
  `,
  styles: `
    :host {
      display: block;
      min-height: 100%;
    }
    .cabecalho-pagina {
      margin-bottom: 0.5rem;
    }
    .formatos {
      max-width: 46rem;
      margin-bottom: 1.25rem;
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    .alerta-erro,
    .aviso-envio {
      margin-bottom: 1rem;
    }
    .aviso-envio {
      padding: 0.55rem 0.75rem;
      border: 1px solid color-mix(in srgb, var(--acento) 25%, transparent);
      border-radius: var(--raio);
      background: var(--acento-suave);
      color: var(--tinta);
      font-size: var(--t-pequeno);
    }
    .girando.claro {
      border-color: rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
    }
    .vazio {
      display: grid;
      justify-items: center;
      gap: 0.4rem;
      padding: 3.5rem 1rem;
      border: 1px dashed var(--linha-forte);
      border-radius: var(--raio);
      text-align: center;
      color: var(--tinta-fraca);
    }
    .vazio h2 {
      margin-top: 0.25rem;
      font-size: var(--t-medio);
      color: var(--tinta);
    }
    .vazio p {
      max-width: 30rem;
      font-size: var(--t-pequeno);
    }
    .nome {
      min-width: 16rem;
    }
    .celula-nome {
      display: flex;
      align-items: flex-start;
      gap: 0.7rem;
    }
    .nome app-tipo-de-arquivo {
      margin-top: 0.05rem;
    }
    .titulo {
      font-weight: 500;
      word-break: break-word;
    }
    .nome .etiqueta {
      margin-left: 0.4rem;
      vertical-align: 0.05em;
    }
    .erro-documento {
      display: block;
      margin-top: 0.2rem;
      font-size: var(--t-pequeno);
      color: var(--erro);
    }
    .direita {
      text-align: right;
    }
    .suave {
      color: var(--tinta-suave);
      white-space: nowrap;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      white-space: nowrap;
      color: var(--tinta-suave);
    }
    .ponto {
      width: 0.45rem;
      height: 0.45rem;
      border-radius: 50%;
      background: var(--linha-forte);
    }
    .status[data-status='PRONTO'] .ponto {
      background: var(--sucesso);
    }
    .status[data-status='ERRO'] {
      color: var(--erro);
    }
    .status[data-status='ERRO'] .ponto {
      background: var(--erro);
    }
    .status .girando {
      width: 0.7rem;
      height: 0.7rem;
    }
    .acoes {
      width: 1%;
      white-space: nowrap;
      text-align: right;
      padding-top: 0.4rem;
      padding-bottom: 0.4rem;
    }
    .soltar {
      position: fixed;
      inset: 0;
      z-index: 25;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: color-mix(in srgb, var(--fundo) 80%, transparent);
      backdrop-filter: blur(2px);
      pointer-events: none;
    }
    .soltar div {
      display: grid;
      justify-items: center;
      gap: 0.4rem;
      width: min(32rem, 100%);
      padding: 3rem 1.5rem;
      border: 2px dashed var(--acento);
      border-radius: var(--raio-grande);
      background: var(--superficie);
      color: var(--acento);
      text-align: center;
    }
    .soltar strong {
      color: var(--tinta);
    }
    .soltar span {
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    /* No celular, cada documento vira um cartão em vez de uma linha larga demais. */
    @media (max-width: 680px) {
      .tabela-documentos thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      .tabela-documentos,
      .tabela-documentos tbody,
      .tabela-documentos td {
        display: block;
      }
      .tabela-documentos tr {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem 1rem;
        padding: 0.875rem;
        border-bottom: 1px solid var(--linha);
      }
      .tabela-documentos tbody tr:last-child {
        border-bottom: 0;
      }
      .tabela-documentos td {
        padding: 0;
        border: 0;
        text-align: left;
      }
      .tabela-documentos tbody tr:hover td {
        background: none;
      }
      .tabela-documentos td[data-rotulo]::before {
        content: attr(data-rotulo);
        display: block;
        font-size: var(--t-mini);
        color: var(--tinta-fraca);
      }
      .tabela-documentos .nome,
      .tabela-documentos .acoes {
        grid-column: 1 / -1;
        min-width: 0;
      }
      .tabela-documentos .acoes {
        width: auto;
        padding: 0;
        margin-left: -0.4rem;
      }
    }
  `,
})
export class Documentos implements OnInit, OnDestroy {
  private readonly api = inject(Api);
  protected readonly sessao = inject(Sessao);

  protected readonly documentos = signal<Documento[]>([]);
  protected readonly carregado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly arrastando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);
  protected readonly trechosDe = signal<Documento | null>(null);
  private origemDosTrechos: HTMLElement | null = null;
  /** dragenter e dragleave disparam em cada elemento filho; o contador diz se ainda está sobre a página. */
  private profundidadeDoArraste = 0;
  private readonly temPendentes = computed(() =>
    this.documentos().some((d) => d.status === 'ENVIADO' || d.status === 'PROCESSANDO'),
  );
  private atualizacao: ReturnType<typeof setInterval> | null = null;

  protected readonly resumo = computed(() => {
    const lista = this.documentos();
    if (!this.carregado()) {
      return '';
    }
    const total = lista.length === 1 ? '1 documento' : `${lista.length} documentos`;
    const prontos = lista.filter((d) => d.status === 'PRONTO').length;
    return prontos === lista.length ? total : `${total} · ${prontos} ${prontos === 1 ? 'pronto' : 'prontos'}`;
  });

  ngOnInit(): void {
    this.carregar();
    // Enquanto houver documento na fila, atualiza a lista a cada 3 segundos.
    this.atualizacao = setInterval(() => {
      if (this.temPendentes()) {
        this.carregar();
      }
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.atualizacao) {
      clearInterval(this.atualizacao);
    }
  }

  protected rotulo(status: StatusDocumento): string {
    return ROTULO_DO_STATUS[status];
  }

  protected tamanhoDe(documento: Documento): string {
    return tamanho(documento.tamanhoBytes);
  }

  protected dataDe(documento: Documento): string {
    return data(documento.atualizadoEm);
  }

  protected abrirTrechos(documento: Documento, evento: Event): void {
    this.origemDosTrechos = evento.currentTarget as HTMLElement;
    this.trechosDe.set(documento);
  }

  protected fecharTrechos(): void {
    this.trechosDe.set(null);
    // Devolve o foco para o botão que abriu o painel.
    this.origemDosTrechos?.focus();
    this.origemDosTrechos = null;
  }

  protected aoEscolher(evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    void this.enviar(Array.from(campo.files ?? []));
    campo.value = '';
  }

  protected aoEntrarArrastando(evento: DragEvent): void {
    if (!this.sessao.admin() || !evento.dataTransfer?.types.includes('Files')) {
      return;
    }
    evento.preventDefault();
    this.profundidadeDoArraste++;
    this.arrastando.set(true);
  }

  protected aoSairArrastando(): void {
    this.profundidadeDoArraste = Math.max(0, this.profundidadeDoArraste - 1);
    if (this.profundidadeDoArraste === 0) {
      this.arrastando.set(false);
    }
  }

  protected aoSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.profundidadeDoArraste = 0;
    this.arrastando.set(false);
    if (this.sessao.admin()) {
      void this.enviar(Array.from(evento.dataTransfer?.files ?? []));
    }
  }

  protected baixar(documento: Documento): void {
    this.api.baixarDocumento(documento.id).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, documento.nome),
      error: (falha) => this.erro.set(mensagemDeErro(falha, 'Não foi possível baixar o documento.')),
    });
  }

  protected reprocessar(documento: Documento): void {
    this.api.reprocessarDocumento(documento.id).subscribe({
      next: () => this.carregar(),
      error: (falha) => this.erro.set(mensagemDeErro(falha)),
    });
  }

  protected excluir(documento: Documento): void {
    if (!confirm(`Excluir "${documento.nome}"? O Sabiá deixa de usar este documento nas respostas.`)) {
      return;
    }
    this.api.excluirDocumento(documento.id).subscribe({
      next: () => this.documentos.update((lista) => lista.filter((d) => d.id !== documento.id)),
      error: (falha) => this.erro.set(mensagemDeErro(falha)),
    });
  }

  private async enviar(arquivos: File[]): Promise<void> {
    if (arquivos.length === 0) {
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.aviso.set(null);
    const falhas: string[] = [];
    const atualizados: string[] = [];
    let novos = 0;
    for (const arquivo of arquivos) {
      try {
        const documento = await new Promise<Documento>((resolver, rejeitar) => {
          this.api.enviarDocumento(arquivo).subscribe({ next: resolver, error: rejeitar });
        });
        if (documento.versao > 1) {
          atualizados.push(`${documento.nome} (versão ${documento.versao})`);
        } else {
          novos++;
        }
      } catch (falha) {
        falhas.push(`${arquivo.name}: ${mensagemDeErro(falha)}`);
      }
    }
    this.enviando.set(false);
    if (falhas.length > 0) {
      this.erro.set(falhas.join(' '));
    }
    this.aviso.set(resumoDoEnvio(novos, atualizados));
    this.carregar();
  }

  private carregar(): void {
    this.api.documentos().subscribe({
      next: (lista) => {
        this.documentos.set(lista);
        this.carregado.set(true);
      },
      error: (falha) => this.erro.set(mensagemDeErro(falha, 'Não foi possível carregar os documentos.')),
    });
  }
}

function resumoDoEnvio(novos: number, atualizados: string[]): string | null {
  const partes: string[] = [];
  if (novos > 0) {
    partes.push(novos === 1 ? '1 documento novo na fila.' : `${novos} documentos novos na fila.`);
  }
  if (atualizados.length > 0) {
    partes.push(`Atualizado: ${atualizados.join(', ')}. As respostas passam a usar a versão nova assim que o processamento terminar.`);
  }
  return partes.length > 0 ? partes.join(' ') : null;
}
