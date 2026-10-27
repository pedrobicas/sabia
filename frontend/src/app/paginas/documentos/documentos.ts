import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';

import { Api, salvarArquivo } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { data, tamanho } from '../../core/formatos';
import { Documento, StatusDocumento } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { PainelDeTrechos } from './painel-de-trechos';

const ROTULO_DO_STATUS: Record<StatusDocumento, string> = {
  ENVIADO: 'Na fila',
  PROCESSANDO: 'Processando',
  PRONTO: 'Pronto',
  ERRO: 'Erro',
};

const ROTULO_DO_TIPO: Record<Documento['tipo'], string> = {
  PDF: 'PDF',
  DOCX: 'Word',
  TXT: 'Texto',
  MARKDOWN: 'Markdown',
};

@Component({
  selector: 'app-documentos',
  imports: [PainelDeTrechos],
  template: `
    <div class="pagina">
      <header>
        <div>
          <h1>Documentos</h1>
          <p class="resumo">
            @if (documentos().length === 1) {
              1 documento. O Sabiá só responde com base no que estiver aqui.
            } @else {
              {{ documentos().length }} documentos. O Sabiá só responde com base no que estiver aqui.
            }
          </p>
        </div>
      </header>

      @if (sessao.admin()) {
        <label
          class="area-envio"
          [class.arrastando]="arrastando()"
          (dragover)="$event.preventDefault(); arrastando.set(true)"
          (dragleave)="arrastando.set(false)"
          (drop)="aoSoltar($event)"
        >
          <input type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown" (change)="aoEscolher($event)" />
          <strong>{{ enviando() ? 'Enviando...' : 'Escolha arquivos ou arraste para cá' }}</strong>
          <span>PDF, Word (.docx), texto ou Markdown, até 10 MB cada.</span>
          <span>Um arquivo com o mesmo nome de um documento existente atualiza esse documento.</span>
        </label>
      } @else {
        <p class="aviso-membro">Só administradores enviam e excluem documentos. Você pode consultar a lista e baixar os originais.</p>
      }

      @if (erro()) {
        <p class="alerta-erro" role="alert">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p class="aviso-envio" role="status">{{ aviso() }}</p>
      }

      @if (carregado() && documentos().length === 0) {
        <div class="vazio">
          <h2>Nenhum documento ainda</h2>
          <p>
            @if (sessao.admin()) {
              Envie manuais, políticas ou perguntas frequentes. Assim que o processamento terminar, o Sabiá já consegue responder sobre eles.
            } @else {
              Peça para um administrador da sua empresa enviar os documentos.
            }
          </p>
        </div>
      } @else if (documentos().length > 0) {
        <div class="rolagem-tabela">
          <table class="tabela">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Tipo</th>
                <th scope="col">Tamanho</th>
                <th scope="col">Situação</th>
                <th scope="col">Trechos</th>
                <th scope="col">Enviado em</th>
                <th scope="col"><span class="so-leitor-de-tela">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (documento of documentos(); track documento.id) {
                <tr>
                  <td class="nome">
                    {{ documento.nome }}
                    @if (documento.versao > 1) {
                      <span class="versao" [title]="'Atualizado em ' + atualizadoEm(documento)">versão {{ documento.versao }}</span>
                    }
                    @if (documento.erro) {
                      <span class="erro-documento">{{ documento.erro }}</span>
                    }
                  </td>
                  <td>{{ tipo(documento) }}</td>
                  <td class="numero">{{ tamanhoDe(documento) }}</td>
                  <td>
                    <span class="status" [attr.data-status]="documento.status">{{ rotulo(documento.status) }}</span>
                  </td>
                  <td class="numero">{{ documento.status === 'PRONTO' ? documento.totalTrechos : '' }}</td>
                  <td class="numero">{{ dataDe(documento) }}</td>
                  <td class="acoes">
                    @if (documento.status === 'PRONTO') {
                      <button type="button" class="botao-texto" (click)="abrirTrechos(documento, $event)">Ver trechos</button>
                    }
                    <button type="button" class="botao-texto" (click)="baixar(documento)">Baixar</button>
                    @if (sessao.admin()) {
                      <button
                        type="button"
                        class="botao-texto"
                        [disabled]="documento.status === 'ENVIADO' || documento.status === 'PROCESSANDO'"
                        (click)="reprocessar(documento)"
                      >Reprocessar</button>
                      <button type="button" class="botao-texto perigo" (click)="excluir(documento)">Excluir</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (trechosDe(); as documento) {
      <app-painel-de-trechos [documento]="documento" (fechar)="fecharTrechos()" />
    }
  `,
  styles: `
    .pagina {
      max-width: 72rem;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 4vw, 2.5rem) 4rem;
      display: grid;
      gap: 1.5rem;
    }
    h1 {
      font-size: var(--t-titulo);
    }
    .resumo {
      margin: 0.35rem 0 0;
      color: var(--tinta-suave);
    }
    .area-envio {
      display: grid;
      gap: 0.25rem;
      justify-items: center;
      padding: 1.75rem 1rem;
      border: 1.5px dashed var(--linha-forte);
      border-radius: var(--raio);
      background: var(--superficie);
      text-align: center;
      cursor: pointer;
    }
    .area-envio:hover,
    .area-envio.arrastando,
    .area-envio:focus-within {
      border-color: var(--musgo);
      background: var(--musgo-claro);
    }
    .area-envio input {
      position: absolute;
      opacity: 0;
      width: 1px;
      height: 1px;
    }
    .area-envio span {
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    .aviso-membro {
      margin: 0;
      color: var(--tinta-suave);
    }
    .aviso-envio {
      margin: 0;
      padding: 0.6rem 0.8rem;
      border-left: 3px solid var(--musgo);
      border-radius: 0 var(--raio) var(--raio) 0;
      background: var(--musgo-claro);
      color: var(--musgo-escuro);
      font-size: var(--t-pequeno);
    }
    .versao {
      display: inline-block;
      margin-left: 0.4rem;
      padding: 0 0.4rem;
      border: 1px solid var(--linha-forte);
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--tinta-suave);
      vertical-align: 0.1em;
    }
    .vazio {
      padding: 3rem 1rem;
      text-align: center;
    }
    .vazio h2 {
      font-size: var(--t-grande);
    }
    .vazio p {
      max-width: 36rem;
      margin: 0.5rem auto 0;
      color: var(--tinta-suave);
    }
    .rolagem-tabela {
      overflow-x: auto;
    }
    .nome {
      font-weight: 700;
      word-break: break-word;
      min-width: 12rem;
    }
    .erro-documento {
      display: block;
      margin-top: 0.25rem;
      font-weight: 400;
      font-size: var(--t-pequeno);
      color: var(--erro);
    }
    .numero {
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--t-pequeno);
      white-space: nowrap;
    }
    .status::before {
      content: '';
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background: var(--linha-forte);
    }
    .status[data-status='PRONTO']::before {
      background: var(--musgo);
    }
    .status[data-status='PROCESSANDO']::before {
      background: var(--marca-texto);
    }
    .status[data-status='ERRO'] {
      color: var(--erro);
    }
    .status[data-status='ERRO']::before {
      background: var(--erro);
    }
    .acoes {
      white-space: nowrap;
      text-align: right;
    }
    .acoes button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      text-decoration: none;
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
  private readonly temPendentes = computed(() =>
    this.documentos().some((d) => d.status === 'ENVIADO' || d.status === 'PROCESSANDO'),
  );
  private atualizacao: ReturnType<typeof setInterval> | null = null;

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

  protected tipo(documento: Documento): string {
    return ROTULO_DO_TIPO[documento.tipo];
  }

  protected tamanhoDe(documento: Documento): string {
    return tamanho(documento.tamanhoBytes);
  }

  protected dataDe(documento: Documento): string {
    return data(documento.criadoEm);
  }

  protected atualizadoEm(documento: Documento): string {
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

  protected aoSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastando.set(false);
    void this.enviar(Array.from(evento.dataTransfer?.files ?? []));
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
