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
import { Router, RouterLink } from '@angular/router';

import { Api, salvarArquivo } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Avisos } from '../../core/avisos';
import { ChatAoVivo } from '../../core/chat-ao-vivo';
import { conversaEmMarkdown, nomeDeArquivo, respostaParaCopiar } from '../../core/exportar';
import { RESPOSTA_INTERROMPIDA } from '../../core/formatar-resposta';
import { ListaDeConversas } from '../../core/lista-de-conversas';
import { Avaliacao, Citacao, Mensagem } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { Icone } from '../shell/icone';
import { AvaliacaoResposta } from './avaliacao-resposta';
import { PainelDaFonte } from './painel-da-fonte';
import { PerguntasPendentes } from './perguntas-pendentes';
import { Resposta } from './resposta';

interface RespostaEmAndamento {
  pergunta: string;
  texto: string;
  citacoes: Citacao[];
}

interface FonteAberta {
  citacao: Citacao;
  /** Mensagem que citou a fonte ("andamento" enquanto a resposta ainda está chegando). */
  mensagemId: string;
  resposta: string;
}

/** Distância do fim (em px) dentro da qual a conversa continua acompanhando o texto que chega. */
const PERTO_DO_FIM = 120;

@Component({
  selector: 'app-chat',
  imports: [RouterLink, Resposta, AvaliacaoResposta, PainelDaFonte, Icone],
  host: {
    '(document:keydown)': 'aoApertarTecla($event)',
  },
  template: `
    <div class="layout" [class.com-fonte]="fonteAberta()">
      <section class="fio" [attr.aria-busy]="emAndamento() !== null">
        <header class="topo">
          @if (conversaAtual(); as conversa) {
            @if (renomeando()) {
              <form class="renomear" (submit)="$event.preventDefault(); salvarTitulo(campoTitulo.value)">
                <label for="titulo-conversa" class="so-leitor-de-tela">Nome da conversa</label>
                <input
                  id="titulo-conversa"
                  #campoTitulo
                  class="entrada"
                  maxlength="200"
                  [value]="conversa.titulo"
                  (keydown.escape)="$event.stopPropagation(); renomeando.set(false)"
                />
                <button type="submit" class="botao">Salvar</button>
                <button type="button" class="botao-texto" (click)="renomeando.set(false)">Cancelar</button>
              </form>
            } @else {
              <h1 class="titulo" [title]="conversa.titulo">{{ conversa.titulo }}</h1>
              <div class="acoes-conversa">
                <button type="button" class="botao-icone" aria-label="Renomear a conversa" title="Renomear" (click)="comecarARenomear()">
                  <app-icone nome="lapis" />
                </button>
                <button
                  type="button"
                  class="botao-icone"
                  aria-label="Exportar a conversa em Markdown"
                  title="Exportar em Markdown"
                  [disabled]="mensagens().length === 0"
                  (click)="exportar()"
                >
                  <app-icone nome="baixar" />
                </button>
                <button
                  type="button"
                  class="botao-icone perigo"
                  aria-label="Excluir a conversa"
                  title="Excluir"
                  (click)="excluirConversa()"
                >
                  <app-icone nome="lixeira" />
                </button>
              </div>
            }
          } @else {
            <h1 class="titulo nova">Nova conversa</h1>
          }
        </header>

        <div class="mensagens" #rolagem>
          <div class="coluna">
            @if (carregando()) {
              <p class="status"><span class="girando" aria-hidden="true"></span>Carregando a conversa</p>
            } @else if (mensagens().length === 0 && !emAndamento()) {
              <div class="inicio">
                <h2>Pergunte sobre os documentos de {{ sessao.usuario()?.empresaNome }}</h2>
                <p class="contexto">
                  @if (documentosProntos() !== null) {
                    @switch (documentosProntos()) {
                      @case (0) {
                        Nenhum documento pronto ainda.
                      }
                      @case (1) {
                        1 documento disponível para consulta.
                      }
                      @default {
                        {{ documentosProntos() }} documentos disponíveis para consulta.
                      }
                    }
                    <a routerLink="/documentos">Ver documentos</a>
                  }
                </p>
                @if (sugestoes().length > 0) {
                  <h3>Perguntas frequentes</h3>
                  <ul class="sugestoes">
                    @for (sugestao of sugestoes(); track sugestao) {
                      <li>
                        <button type="button" (click)="usarSugestao(sugestao)">
                          <span>{{ sugestao }}</span>
                          <app-icone nome="direita" [tamanho]="14" />
                        </button>
                      </li>
                    }
                  </ul>
                }
              </div>
            }

            @for (mensagem of mensagens(); track mensagem.id) {
              @if (mensagem.papel === 'USUARIO') {
                <div class="pergunta">
                  <p>{{ mensagem.conteudo }}</p>
                </div>
              } @else {
                <div class="resposta">
                  <app-resposta
                    [texto]="mensagem.conteudo"
                    [citacoes]="mensagem.citacoes"
                    [fonteAtiva]="fonteAberta()?.mensagemId === mensagem.id ? fonteAberta()!.citacao.numero : null"
                    (citar)="abrirFonte($event, mensagem.id, mensagem.conteudo)"
                  />
                  <div class="acoes-resposta">
                    <button
                      type="button"
                      class="botao-icone pequeno"
                      aria-label="Copiar a resposta com as fontes"
                      title="Copiar"
                      (click)="copiar(mensagem)"
                    >
                      <app-icone nome="copiar" [tamanho]="15" />
                    </button>
                    @if (id() && !ehLocal(mensagem)) {
                      <app-avaliacao-resposta
                        [conversaId]="id()!"
                        [mensagemId]="mensagem.id"
                        [avaliacao]="mensagem.avaliacao ?? null"
                        (mudou)="guardarAvaliacao(mensagem.id, $event)"
                      />
                    }
                  </div>
                </div>
              }
            }

            @if (emAndamento(); as andamento) {
              <div class="pergunta">
                <p>{{ andamento.pergunta }}</p>
              </div>
              <div class="resposta">
                @if (andamento.texto === '') {
                  <p class="status"><span class="girando" aria-hidden="true"></span>Buscando nos documentos</p>
                } @else {
                  <app-resposta
                    [texto]="andamento.texto"
                    [citacoes]="andamento.citacoes"
                    [digitando]="true"
                    [fonteAtiva]="fonteAberta()?.mensagemId === 'andamento' ? fonteAberta()!.citacao.numero : null"
                    (citar)="abrirFonte($event, 'andamento', andamento.texto)"
                  />
                }
              </div>
            }

            @if (erro()) {
              <p class="alerta-erro" role="alert">{{ erro() }}</p>
            }
          </div>
        </div>

        <p class="so-leitor-de-tela" aria-live="polite">{{ anuncio() }}</p>

        <form class="compositor" (submit)="$event.preventDefault(); perguntar()">
          <div class="caixa" (click)="campo.focus()">
            <label for="pergunta" class="so-leitor-de-tela">Sua pergunta</label>
            <textarea
              id="pergunta"
              #campo
              rows="1"
              maxlength="2000"
              placeholder="Pergunte algo sobre os documentos"
              aria-describedby="dica-compositor"
              [value]="pergunta()"
              (input)="pergunta.set(campo.value)"
              (keydown.enter)="aoApertarEnter($any($event))"
            ></textarea>
            <div class="linha-envio">
              <span class="dica" id="dica-compositor"><kbd>Enter</kbd> envia · <kbd>Shift</kbd> + <kbd>Enter</kbd> nova linha</span>
              @if (emAndamento()) {
                <button type="button" class="enviar parar" aria-label="Parar a resposta" title="Parar" (click)="parar()">
                  <app-icone nome="parar" />
                </button>
              } @else {
                <button type="submit" class="enviar" aria-label="Enviar pergunta" title="Enviar" [disabled]="!pergunta().trim()">
                  <app-icone nome="seta" />
                </button>
              }
            </div>
          </div>
        </form>
      </section>

      @if (fonteAberta(); as fonte) {
        <div class="veu-fonte" aria-hidden="true" (click)="fecharFonte()"></div>
        <app-painel-da-fonte
          #painel
          class="painel-fonte"
          aria-labelledby="titulo-fonte"
          role="complementary"
          [citacao]="fonte.citacao"
          [resposta]="fonte.resposta"
          (fechar)="fecharFonte()"
          (baixar)="baixar($event)"
        />
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
  private readonly lista = inject(ListaDeConversas);
  protected readonly sessao = inject(Sessao);

  protected readonly sugestoes = signal<string[]>([]);
  protected readonly documentosProntos = signal<number | null>(null);
  protected readonly mensagens = signal<Mensagem[]>([]);
  protected readonly emAndamento = signal<RespostaEmAndamento | null>(null);
  protected readonly pergunta = signal('');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly fonteAberta = signal<FonteAberta | null>(null);
  protected readonly renomeando = signal(false);
  /** Texto lido por leitores de tela (o fio de mensagens não é uma região viva, para não ler cada palavra). */
  protected readonly anuncio = signal('');

  protected readonly conversaAtual = computed(() => this.lista.itens().find((conversa) => conversa.id === this.id()));

  private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private readonly campoTitulo = viewChild<ElementRef<HTMLInputElement>>('campoTitulo');
  private readonly painel = viewChild<PainelDaFonte>('painel');
  private cancelamento: AbortController | null = null;
  private origemDaFonte: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.abrirConversa(id));
    });
  }

  ngOnInit(): void {
    this.api.sugestoes().subscribe({ next: (lista) => this.sugestoes.set(lista) });
    this.api.documentos().subscribe({
      next: (documentos) => this.documentosProntos.set(documentos.filter((d) => d.status === 'PRONTO').length),
    });
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
        // O servidor usa a primeira pergunta como título; a lista já mostra o mesmo enquanto a resposta chega.
        this.lista.itens.update((lista) => [{ ...conversa, titulo: tituloDaPergunta(texto) }, ...lista]);
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
    if (this.fonteAberta()?.mensagemId === 'andamento') {
      this.fonteAberta.set(null);
    }
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

  protected abrirFonte(citacao: Citacao, mensagemId: string, resposta: string): void {
    if (!this.fonteAberta()) {
      this.origemDaFonte = document.activeElement as HTMLElement | null;
    }
    this.fonteAberta.set({ citacao, mensagemId, resposta });
    setTimeout(() => this.painel()?.focar());
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
    this.lista.renomear(conversa.id, limpo).subscribe({
      next: () => this.avisos.mostrar('Conversa renomeada.'),
      error: (falha) => this.avisos.erro(mensagemDeErro(falha, 'Não foi possível renomear a conversa.')),
    });
  }

  protected excluirConversa(): void {
    const conversa = this.conversaAtual();
    if (!conversa || !confirm(`Excluir a conversa "${conversa.titulo}"? Não dá para desfazer.`)) {
      return;
    }
    this.lista.excluir(conversa.id).subscribe({
      next: () => {
        this.avisos.mostrar('Conversa excluída.');
        this.router.navigate(['/chat']);
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
      // No celular, focar o campo abriria o teclado sem a pessoa pedir.
      if (matchMedia('(pointer: fine)').matches) {
        setTimeout(() => this.campo()?.nativeElement.focus());
      }
      return;
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
    this.anuncio.set('Buscando nos documentos...');
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
              // A fonte aberta durante a resposta passa a apontar para a mensagem salva.
              this.fonteAberta.update((fonte) =>
                fonte?.mensagemId === 'andamento'
                  ? { ...fonte, mensagemId: evento.mensagem.id, resposta: evento.mensagem.conteudo }
                  : fonte,
              );
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
      this.lista.carregar();
    }
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

/** Mesma regra do servidor (Conversa.java): uma linha só, até 60 caracteres. */
function tituloDaPergunta(pergunta: string): string {
  const limpa = pergunta.replace(/\s+/g, ' ').trim();
  return limpa.length > 60 ? `${limpa.slice(0, 57)}...` : limpa;
}

function estaDigitando(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) {
    return false;
  }
  return alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName);
}
