import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Api, salvarArquivo } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Avisos } from '../../core/avisos';
import { ChatAoVivo } from '../../core/chat-ao-vivo';
import { conversaEmMarkdown, nomeDeArquivo, respostaParaCopiar } from '../../core/exportar';
import { RESPOSTA_INTERROMPIDA } from '../../core/formatar-resposta';
import { Avaliacao, Citacao, Conversa, Mensagem } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { normalizar } from '../../core/texto';
import { AvaliacaoResposta } from './avaliacao-resposta';
import { PerguntasPendentes } from './perguntas-pendentes';
import { Resposta } from './resposta';

interface RespostaEmAndamento {
  pergunta: string;
  texto: string;
  citacoes: Citacao[];
}

/** Distância do fim (em px) dentro da qual a conversa continua acompanhando o texto que chega. */
const PERTO_DO_FIM = 120;

@Component({
  selector: 'app-chat',
  imports: [RouterLink, RouterLinkActive, Resposta, AvaliacaoResposta],
  host: {
    '(document:keydown)': 'aoApertarTecla($event)',
  },
  template: `
    <div class="layout" [class.com-fonte]="fonteAberta()">
      <aside class="conversas" [class.aberta]="listaAberta()" aria-label="Conversas">
        <a routerLink="/chat" class="botao nova" (click)="listaAberta.set(false)">Nova conversa</a>
        @if (conversas().length > 3) {
          <div class="filtro">
            <label for="filtro-conversas" class="so-leitor-de-tela">Buscar conversas</label>
            <input
              id="filtro-conversas"
              #campoFiltro
              type="search"
              placeholder="Buscar conversas"
              autocomplete="off"
              [value]="filtro()"
              (input)="filtro.set(campoFiltro.value)"
            />
          </div>
        }
        @if (conversas().length === 0) {
          <p class="vazio-lista">Suas conversas aparecem aqui.</p>
        } @else if (conversasFiltradas().length === 0) {
          <p class="vazio-lista">Nenhuma conversa com "{{ filtro().trim() }}".</p>
        }
        <ul>
          @for (conversa of conversasFiltradas(); track conversa.id) {
            <li>
              <a
                [routerLink]="['/chat', conversa.id]"
                routerLinkActive="ativa"
                ariaCurrentWhenActive="page"
                [title]="conversa.titulo"
                (click)="listaAberta.set(false)"
              >{{ conversa.titulo }}</a>
              <button
                type="button"
                class="excluir"
                [attr.aria-label]="'Excluir a conversa ' + conversa.titulo"
                (click)="excluirConversa(conversa)"
              >Excluir</button>
            </li>
          }
        </ul>
      </aside>

      <section class="fio" [attr.aria-busy]="emAndamento() !== null">
        <div class="topo-fio" [class.vazio]="!conversaAtual()">
          <button
            type="button"
            class="botao-texto alternar-lista"
            [attr.aria-expanded]="listaAberta()"
            (click)="listaAberta.set(!listaAberta())"
          >
            {{ listaAberta() ? 'Fechar lista' : 'Ver conversas' }}
          </button>
          @if (conversaAtual(); as conversa) {
            @if (renomeando()) {
              <form class="renomear" (submit)="$event.preventDefault(); salvarTitulo(campoTitulo.value)">
                <label for="titulo-conversa" class="so-leitor-de-tela">Nome da conversa</label>
                <input
                  id="titulo-conversa"
                  #campoTitulo
                  maxlength="200"
                  [value]="conversa.titulo"
                  (keydown.escape)="$event.stopPropagation(); renomeando.set(false)"
                />
                <button type="submit" class="botao-texto">Salvar</button>
                <button type="button" class="botao-texto" (click)="renomeando.set(false)">Cancelar</button>
              </form>
            } @else {
              <h1 class="titulo-conversa" [title]="conversa.titulo">{{ conversa.titulo }}</h1>
              <div class="acoes-conversa">
                <button type="button" class="botao-texto" (click)="comecarARenomear()">Renomear</button>
                <button type="button" class="botao-texto" [disabled]="mensagens().length === 0" (click)="exportar()">
                  Exportar
                </button>
                <button type="button" class="botao-texto perigo" (click)="excluirConversa(conversa)">Excluir</button>
              </div>
            }
          }
        </div>

        <div class="mensagens" #rolagem>
          @if (carregando()) {
            <p class="aviso">Carregando a conversa...</p>
          } @else if (mensagens().length === 0 && !emAndamento()) {
            <div class="boas-vindas">
              <h1>O que você quer saber?</h1>
              <p>O Sabiá responde usando os documentos de {{ sessao.usuario()?.empresaNome }} e mostra de onde tirou cada informação.</p>
              @if (sugestoes().length > 0) {
                <h2 class="titulo-sugestoes">Perguntas frequentes por aqui</h2>
                <div class="sugestoes">
                  @for (sugestao of sugestoes(); track sugestao) {
                    <button type="button" class="botao-secundario" (click)="usarSugestao(sugestao)">{{ sugestao }}</button>
                  }
                </div>
              }
            </div>
          }

          @for (mensagem of mensagens(); track mensagem.id) {
            @if (mensagem.papel === 'USUARIO') {
              <h2 class="pergunta">{{ mensagem.conteudo }}</h2>
            } @else {
              <app-resposta [texto]="mensagem.conteudo" [citacoes]="mensagem.citacoes" (citar)="abrirFonte($event)" />
              <div class="rodape-resposta">
                @if (id() && !ehLocal(mensagem)) {
                  <app-avaliacao-resposta
                    [conversaId]="id()!"
                    [mensagemId]="mensagem.id"
                    [avaliacao]="mensagem.avaliacao ?? null"
                    (mudou)="guardarAvaliacao(mensagem.id, $event)"
                  />
                }
                <button type="button" class="botao-texto copiar" (click)="copiar(mensagem)">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="6.5" y="6.5" width="10" height="11" rx="1.5" /><path d="M13.5 6.5V4a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 4v9A1.5 1.5 0 0 0 5 14.5h1.5" /></svg>
                  Copiar
                </button>
              </div>
            }
          }

          @if (emAndamento(); as andamento) {
            <h2 class="pergunta">{{ andamento.pergunta }}</h2>
            @if (andamento.texto === '') {
              <p class="aviso">Procurando nos documentos...</p>
            } @else {
              <app-resposta
                [texto]="andamento.texto"
                [citacoes]="andamento.citacoes"
                [digitando]="true"
                (citar)="abrirFonte($event)"
              />
            }
          }

          @if (erro()) {
            <p class="alerta-erro" role="alert">{{ erro() }}</p>
          }
        </div>

        <p class="so-leitor-de-tela" aria-live="polite">{{ anuncio() }}</p>

        <form class="compositor" (submit)="$event.preventDefault(); perguntar()">
          <label for="pergunta" class="so-leitor-de-tela">Sua pergunta</label>
          <textarea
            id="pergunta"
            #campo
            rows="2"
            maxlength="2000"
            placeholder="Pergunte sobre os documentos da empresa"
            aria-describedby="dica-compositor"
            [value]="pergunta()"
            (input)="pergunta.set(campo.value)"
            (keydown.enter)="aoApertarEnter($any($event))"
          ></textarea>
          <div class="acoes">
            <span class="dica" id="dica-compositor">
              <kbd>Enter</kbd> envia · <kbd>Shift</kbd> + <kbd>Enter</kbd> quebra a linha · <kbd>/</kbd> volta para cá
            </span>
            @if (emAndamento()) {
              <button type="button" class="botao-secundario parar" (click)="parar()">
                <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="5" width="10" height="10" rx="1.5" /></svg>
                Parar
              </button>
            } @else {
              <button type="submit" class="botao" [disabled]="!pergunta().trim()">Perguntar</button>
            }
          </div>
        </form>
      </section>

      @if (fonteAberta(); as fonte) {
        <aside class="fonte" aria-labelledby="titulo-fonte">
          <div class="cabecalho-fonte">
            <span class="numero">{{ fonte.numero }}</span>
            <div>
              <h2 id="titulo-fonte" #tituloFonte tabindex="-1">{{ fonte.documentoNome }}</h2>
              @if (fonte.pagina) {
                <p class="pagina">Página {{ fonte.pagina }}</p>
              }
            </div>
            <button type="button" class="botao-texto fechar" (click)="fecharFonte()">Fechar</button>
          </div>
          <blockquote>{{ fonte.trecho }}</blockquote>
          <p class="explicacao">Este é o trecho do documento que o Sabiá usou para responder. <kbd>Esc</kbd> fecha.</p>
          <button type="button" class="botao-secundario" (click)="baixar(fonte)">Baixar o documento original</button>
        </aside>
      }
    </div>
  `,
  styleUrl: './chat.scss',
})
export class Chat implements OnInit, OnDestroy {
  /** ID da conversa, vindo da rota /chat/:id. */
  readonly id = input<string>();

  private readonly api = inject(Api);
  private readonly chat = inject(ChatAoVivo);
  private readonly pendentes = inject(PerguntasPendentes);
  private readonly router = inject(Router);
  private readonly avisos = inject(Avisos);
  protected readonly sessao = inject(Sessao);

  protected readonly sugestoes = signal<string[]>([]);
  protected readonly conversas = signal<Conversa[]>([]);
  protected readonly mensagens = signal<Mensagem[]>([]);
  protected readonly emAndamento = signal<RespostaEmAndamento | null>(null);
  protected readonly pergunta = signal('');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly fonteAberta = signal<Citacao | null>(null);
  protected readonly listaAberta = signal(false);
  protected readonly filtro = signal('');
  protected readonly renomeando = signal(false);
  /** Texto lido por leitores de tela (o fio de mensagens não é uma região viva, para não ler cada palavra). */
  protected readonly anuncio = signal('');

  protected readonly conversaAtual = computed(() => this.conversas().find((conversa) => conversa.id === this.id()));

  protected readonly conversasFiltradas = computed(() => {
    const termo = normalizar(this.filtro().trim());
    return termo
      ? this.conversas().filter((conversa) => normalizar(conversa.titulo).includes(termo))
      : this.conversas();
  });

  private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly campoTitulo = viewChild<ElementRef<HTMLInputElement>>('campoTitulo');
  private readonly tituloFonte = viewChild<ElementRef<HTMLElement>>('tituloFonte');
  private cancelamento: AbortController | null = null;
  private origemDaFonte: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.abrirConversa(id));
    });
  }

  ngOnInit(): void {
    this.carregarConversas();
    this.api.sugestoes().subscribe({ next: (lista) => this.sugestoes.set(lista) });
  }

  ngOnDestroy(): void {
    this.cancelamento?.abort();
  }

  protected perguntar(): void {
    const texto = this.pergunta().trim();
    if (!texto || this.emAndamento()) {
      return;
    }
    this.pergunta.set('');
    const id = this.id();
    if (id) {
      void this.enviar(id, texto);
      return;
    }
    // Primeira pergunta: cria a conversa e continua na URL dela.
    this.api.criarConversa().subscribe({
      next: (conversa) => {
        this.pendentes.guardar(conversa.id, texto);
        this.router.navigate(['/chat', conversa.id]);
      },
      error: (falha) => {
        this.pergunta.set(texto);
        this.erro.set(mensagemDeErro(falha));
      },
    });
  }

  /** Interrompe a resposta. O servidor guarda o que já foi gerado; a tela mostra o mesmo na hora. */
  protected parar(): void {
    const andamento = this.emAndamento();
    const conversaId = this.id();
    if (!andamento || !conversaId) {
      return;
    }
    this.emAndamento.set(null);
    this.cancelamento?.abort();
    const parcial = parcialLocal(andamento);
    this.mensagens.update((lista) => [...lista, mensagemLocal('USUARIO', andamento.pergunta), ...parcial]);
    this.anuncio.set('Resposta interrompida.');
    this.campo()?.nativeElement.focus();
    // Depois de um instante, busca as mensagens salvas (com os IDs reais, para poder avaliar).
    setTimeout(() => {
      if (this.id() === conversaId && !this.emAndamento()) {
        this.recarregarMensagens(conversaId, parcial);
      }
    }, 1500);
  }

  protected aoApertarEnter(evento: KeyboardEvent): void {
    if (!evento.shiftKey && !evento.isComposing) {
      evento.preventDefault();
      this.perguntar();
    }
  }

  protected aoApertarTecla(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.fonteAberta()) {
      this.fecharFonte();
      return;
    }
    if (evento.key === '/' && !evento.ctrlKey && !evento.metaKey && !estaDigitando(evento.target)) {
      evento.preventDefault();
      this.campo()?.nativeElement.focus();
    }
  }

  protected usarSugestao(sugestao: string): void {
    this.pergunta.set(sugestao);
    this.perguntar();
  }

  protected guardarAvaliacao(mensagemId: string, avaliacao: Avaliacao | null): void {
    this.mensagens.update((lista) => lista.map((m) => (m.id === mensagemId ? { ...m, avaliacao } : m)));
  }

  protected ehLocal(mensagem: Mensagem): boolean {
    return mensagem.id.startsWith('local-');
  }

  protected abrirFonte(citacao: Citacao): void {
    if (!this.fonteAberta()) {
      this.origemDaFonte = document.activeElement as HTMLElement | null;
    }
    this.fonteAberta.set(citacao);
    setTimeout(() => this.tituloFonte()?.nativeElement.focus());
  }

  protected fecharFonte(): void {
    this.fonteAberta.set(null);
    if (this.origemDaFonte?.isConnected) {
      this.origemDaFonte.focus();
    }
    this.origemDaFonte = null;
  }

  protected baixar(citacao: Citacao): void {
    this.api.baixarDocumento(citacao.documentoId).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, citacao.documentoNome),
      error: (falha) => this.avisos.erro(mensagemDeErro(falha, 'Não foi possível baixar o documento.')),
    });
  }

  protected async copiar(mensagem: Mensagem): Promise<void> {
    try {
      await navigator.clipboard.writeText(respostaParaCopiar(mensagem));
      this.avisos.mostrar('Resposta copiada, com as fontes.');
    } catch {
      this.avisos.erro('Não foi possível copiar. Selecione o texto e copie manualmente.');
    }
  }

  protected exportar(): void {
    const conversa = this.conversaAtual();
    if (!conversa) {
      return;
    }
    const markdown = conversaEmMarkdown(conversa.titulo, this.mensagens());
    salvarArquivo(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }), nomeDeArquivo(conversa.titulo, 'md'));
    this.avisos.mostrar('Conversa exportada em Markdown.');
  }

  protected comecarARenomear(): void {
    this.renomeando.set(true);
    setTimeout(() => this.campoTitulo()?.nativeElement.select());
  }

  protected salvarTitulo(titulo: string): void {
    const conversa = this.conversaAtual();
    const limpo = titulo.trim();
    this.renomeando.set(false);
    if (!conversa || !limpo || limpo === conversa.titulo) {
      return;
    }
    this.api.renomearConversa(conversa.id, limpo).subscribe({
      next: (atualizada) => {
        this.conversas.update((lista) => lista.map((c) => (c.id === atualizada.id ? atualizada : c)));
        this.avisos.mostrar('Conversa renomeada.');
      },
      error: (falha) => this.avisos.erro(mensagemDeErro(falha, 'Não foi possível renomear a conversa.')),
    });
  }

  protected excluirConversa(conversa: Conversa): void {
    if (!confirm(`Excluir a conversa "${conversa.titulo}"? Não dá para desfazer.`)) {
      return;
    }
    this.api.excluirConversa(conversa.id).subscribe({
      next: () => {
        this.conversas.update((lista) => lista.filter((c) => c.id !== conversa.id));
        this.avisos.mostrar('Conversa excluída.');
        if (this.id() === conversa.id) {
          this.router.navigate(['/chat']);
        }
      },
      error: (falha) => this.avisos.erro(mensagemDeErro(falha, 'Não foi possível excluir a conversa.')),
    });
  }

  private abrirConversa(id: string | undefined): void {
    this.cancelamento?.abort();
    this.emAndamento.set(null);
    this.fonteAberta.set(null);
    this.renomeando.set(false);
    this.erro.set(null);
    if (!id) {
      this.mensagens.set([]);
      return;
    }
    if (!this.conversas().some((conversa) => conversa.id === id)) {
      this.carregarConversas();
    }
    this.carregando.set(true);
    this.api.mensagens(id).subscribe({
      next: (mensagens) => {
        this.mensagens.set(mensagens);
        this.carregando.set(false);
        this.rolarParaOFim(true);
        const pendente = this.pendentes.retirar(id);
        if (pendente) {
          void this.enviar(id, pendente);
        }
      },
      error: (falha) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível abrir esta conversa.'));
      },
    });
  }

  private recarregarMensagens(conversaId: string, parcial: Mensagem[]): void {
    this.api.mensagens(conversaId).subscribe({
      next: (mensagens) => {
        if (this.id() !== conversaId || this.emAndamento()) {
          return;
        }
        // Se o servidor ainda não salvou o pedaço gerado, mantém o que a tela já mostrava.
        const ultima = mensagens.at(-1);
        this.mensagens.set(ultima?.papel === 'USUARIO' ? [...mensagens, ...parcial] : mensagens);
      },
    });
  }

  private async enviar(conversaId: string, texto: string): Promise<void> {
    this.erro.set(null);
    this.emAndamento.set({ pergunta: texto, texto: '', citacoes: [] });
    this.anuncio.set('Procurando nos documentos...');
    this.rolarParaOFim(true);
    this.cancelamento = new AbortController();
    try {
      await this.chat.perguntar(
        conversaId,
        texto,
        (evento) => {
          switch (evento.tipo) {
            case 'citacoes':
              this.emAndamento.update((atual) => atual && { ...atual, citacoes: evento.citacoes });
              break;
            case 'token':
              this.emAndamento.update((atual) => atual && { ...atual, texto: atual.texto + evento.texto });
              this.rolarParaOFim();
              break;
            case 'fim':
              this.mensagens.update((lista) => [...lista, mensagemLocal('USUARIO', texto), evento.mensagem]);
              this.emAndamento.set(null);
              this.anuncio.set('Resposta pronta.');
              this.rolarParaOFim();
              break;
            case 'erro':
              this.erro.set(evento.mensagem);
              this.anuncio.set(evento.mensagem);
              break;
          }
        },
        this.cancelamento.signal,
      );
    } catch (falha) {
      if (!(falha instanceof DOMException && falha.name === 'AbortError')) {
        this.erro.set(mensagemDeErro(falha));
      }
    } finally {
      // Se a resposta não chegou ao fim, a pergunta continua visível (ela já foi salva no servidor).
      if (this.emAndamento() && this.id() === conversaId) {
        this.mensagens.update((lista) => [...lista, mensagemLocal('USUARIO', texto)]);
        this.emAndamento.set(null);
      }
      this.carregarConversas();
    }
  }

  private carregarConversas(): void {
    this.api.conversas().subscribe({ next: (lista) => this.conversas.set(lista) });
  }

  /** Rola até o fim, a não ser que a pessoa tenha subido para reler algo (aí respeita a posição). */
  private rolarParaOFim(forcar = false): void {
    const elemento = this.rolagem()?.nativeElement;
    if (!elemento) {
      return;
    }
    const pertoDoFim = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight < PERTO_DO_FIM;
    if (forcar || pertoDoFim) {
      requestAnimationFrame(() => (elemento.scrollTop = elemento.scrollHeight));
    }
  }
}

function mensagemLocal(papel: Mensagem['papel'], conteudo: string, citacoes: Citacao[] = []): Mensagem {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    papel,
    conteudo,
    citacoes,
    criadoEm: new Date().toISOString(),
  };
}

/** A parte da resposta que chegou antes de parar, do mesmo jeito que o servidor salva. */
function parcialLocal(andamento: RespostaEmAndamento): Mensagem[] {
  const texto = andamento.texto.trim();
  if (!texto) {
    return [];
  }
  const citadas = andamento.citacoes.filter((fonte) => texto.includes(`[${fonte.numero}]`));
  return [mensagemLocal('ASSISTENTE', `${texto}\n\n${RESPOSTA_INTERROMPIDA}`, citadas)];
}

function estaDigitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) {
    return false;
  }
  return alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
}
