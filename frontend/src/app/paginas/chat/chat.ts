import { Component, effect, ElementRef, inject, input, OnDestroy, OnInit, signal, untracked, viewChild } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Api, salvarArquivo } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { ChatAoVivo } from '../../core/chat-ao-vivo';
import { Citacao, Conversa, Mensagem } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { PerguntasPendentes } from './perguntas-pendentes';
import { Resposta } from './resposta';

interface RespostaEmAndamento {
  pergunta: string;
  texto: string;
  citacoes: Citacao[];
}

const SUGESTOES = [
  'Qual é a política de trocas?',
  'Como funciona o programa de fidelidade?',
  'Quantos dias de férias eu tenho?',
];

@Component({
  selector: 'app-chat',
  imports: [RouterLink, RouterLinkActive, Resposta],
  template: `
    <div class="layout" [class.com-fonte]="fonteAberta()">
      <aside class="conversas" [class.aberta]="listaAberta()" aria-label="Conversas">
        <a routerLink="/chat" class="botao nova" (click)="listaAberta.set(false)">Nova conversa</a>
        @if (conversas().length === 0) {
          <p class="vazio-lista">Suas conversas aparecem aqui.</p>
        }
        <ul>
          @for (conversa of conversas(); track conversa.id) {
            <li>
              <a
                [routerLink]="['/chat', conversa.id]"
                routerLinkActive="ativa"
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

      <section class="fio">
        <button type="button" class="botao-texto alternar-lista" (click)="listaAberta.set(!listaAberta())">
          {{ listaAberta() ? 'Fechar lista' : 'Ver conversas' }}
        </button>

        <div class="mensagens" #rolagem aria-live="polite">
          @if (carregando()) {
            <p class="aviso">Carregando a conversa...</p>
          } @else if (mensagens().length === 0 && !emAndamento()) {
            <div class="boas-vindas">
              <h1>O que você quer saber?</h1>
              <p>O Sabiá responde usando os documentos de {{ sessao.usuario()?.empresaNome }} e mostra de onde tirou cada informação.</p>
              <div class="sugestoes">
                @for (sugestao of sugestoes; track sugestao) {
                  <button type="button" class="botao-secundario" (click)="usarSugestao(sugestao)">{{ sugestao }}</button>
                }
              </div>
            </div>
          }

          @for (mensagem of mensagens(); track mensagem.id) {
            @if (mensagem.papel === 'USUARIO') {
              <h2 class="pergunta">{{ mensagem.conteudo }}</h2>
            } @else {
              <app-resposta [texto]="mensagem.conteudo" [citacoes]="mensagem.citacoes" (citar)="abrirFonte($event)" />
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

        <form class="compositor" (submit)="$event.preventDefault(); perguntar()">
          <label for="pergunta" class="so-leitor-de-tela">Sua pergunta</label>
          <textarea
            id="pergunta"
            #campo
            rows="2"
            maxlength="2000"
            placeholder="Pergunte sobre os documentos da empresa"
            [value]="pergunta()"
            (input)="pergunta.set(campo.value)"
            (keydown.enter)="aoApertarEnter($any($event))"
          ></textarea>
          <div class="acoes">
            <span class="dica">Enter envia. Shift + Enter quebra a linha.</span>
            <button type="submit" class="botao" [disabled]="!pergunta().trim() || emAndamento() !== null">
              Perguntar
            </button>
          </div>
        </form>
      </section>

      @if (fonteAberta(); as fonte) {
        <aside class="fonte" aria-labelledby="titulo-fonte">
          <div class="cabecalho-fonte">
            <span class="numero">{{ fonte.numero }}</span>
            <div>
              <h2 id="titulo-fonte">{{ fonte.documentoNome }}</h2>
              @if (fonte.pagina) {
                <p class="pagina">Página {{ fonte.pagina }}</p>
              }
            </div>
            <button type="button" class="botao-texto fechar" (click)="fonteAberta.set(null)">Fechar</button>
          </div>
          <blockquote>{{ fonte.trecho }}</blockquote>
          <p class="explicacao">Este é o trecho do documento que o Sabiá usou para responder.</p>
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
  protected readonly sessao = inject(Sessao);

  protected readonly sugestoes = SUGESTOES;
  protected readonly conversas = signal<Conversa[]>([]);
  protected readonly mensagens = signal<Mensagem[]>([]);
  protected readonly emAndamento = signal<RespostaEmAndamento | null>(null);
  protected readonly pergunta = signal('');
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly fonteAberta = signal<Citacao | null>(null);
  protected readonly listaAberta = signal(false);

  private readonly rolagem = viewChild<ElementRef<HTMLElement>>('rolagem');
  private readonly campo = viewChild<ElementRef<HTMLTextAreaElement>>('campo');
  private cancelamento: AbortController | null = null;

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.abrirConversa(id));
    });
  }

  ngOnInit(): void {
    this.carregarConversas();
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

  protected aoApertarEnter(evento: KeyboardEvent): void {
    if (!evento.shiftKey) {
      evento.preventDefault();
      this.perguntar();
    }
  }

  protected usarSugestao(sugestao: string): void {
    this.pergunta.set(sugestao);
    this.campo()?.nativeElement.focus();
  }

  protected abrirFonte(citacao: Citacao): void {
    this.fonteAberta.set(citacao);
  }

  protected baixar(citacao: Citacao): void {
    this.api.baixarDocumento(citacao.documentoId).subscribe({
      next: (arquivo) => salvarArquivo(arquivo, citacao.documentoNome),
      error: (falha) => this.erro.set(mensagemDeErro(falha, 'Não foi possível baixar o documento.')),
    });
  }

  protected excluirConversa(conversa: Conversa): void {
    if (!confirm(`Excluir a conversa "${conversa.titulo}"? Não dá para desfazer.`)) {
      return;
    }
    this.api.excluirConversa(conversa.id).subscribe({
      next: () => {
        this.conversas.update((lista) => lista.filter((c) => c.id !== conversa.id));
        if (this.id() === conversa.id) {
          this.router.navigate(['/chat']);
        }
      },
      error: (falha) => this.erro.set(mensagemDeErro(falha)),
    });
  }

  private abrirConversa(id: string | undefined): void {
    this.cancelamento?.abort();
    this.emAndamento.set(null);
    this.fonteAberta.set(null);
    this.erro.set(null);
    if (!id) {
      this.mensagens.set([]);
      return;
    }
    this.carregando.set(true);
    this.api.mensagens(id).subscribe({
      next: (mensagens) => {
        this.mensagens.set(mensagens);
        this.carregando.set(false);
        this.rolarParaOFim();
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

  private async enviar(conversaId: string, texto: string): Promise<void> {
    this.erro.set(null);
    this.emAndamento.set({ pergunta: texto, texto: '', citacoes: [] });
    this.rolarParaOFim();
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
              this.mensagens.update((lista) => [...lista, mensagemDoUsuario(texto), evento.mensagem]);
              this.emAndamento.set(null);
              this.rolarParaOFim();
              break;
            case 'erro':
              this.erro.set(evento.mensagem);
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
        this.mensagens.update((lista) => [...lista, mensagemDoUsuario(texto)]);
        this.emAndamento.set(null);
      }
      this.carregarConversas();
    }
  }

  private carregarConversas(): void {
    this.api.conversas().subscribe({ next: (lista) => this.conversas.set(lista) });
  }

  private rolarParaOFim(): void {
    requestAnimationFrame(() => {
      const elemento = this.rolagem()?.nativeElement;
      if (elemento) {
        elemento.scrollTop = elemento.scrollHeight;
      }
    });
  }
}

function mensagemDoUsuario(texto: string): Mensagem {
  return {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    papel: 'USUARIO',
    conteudo: texto,
    citacoes: [],
    criadoEm: new Date().toISOString(),
  };
}
