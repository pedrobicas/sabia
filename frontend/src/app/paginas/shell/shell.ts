import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { agruparPorData } from '../../core/agrupar-conversas';
import { mensagemDeErro } from '../../core/autenticacao';
import { Avisos } from '../../core/avisos';
import { ListaDeConversas } from '../../core/lista-de-conversas';
import { Conversa } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { PreferenciaDeTema, Tema } from '../../core/tema';
import { normalizar } from '../../core/texto';
import { AvisosNaTela } from './avisos-na-tela';
import { Icone } from './icone';
import { Marca } from './marca';

const NOME_DO_TEMA: Record<PreferenciaDeTema, string> = {
  automatico: 'automático',
  claro: 'claro',
  escuro: 'escuro',
};

/** Moldura das páginas logadas: barra lateral com navegação e conversas, e o conteúdo da rota. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Marca, Icone, AvisosNaTela],
  host: {
    '(document:keydown.escape)': 'menuAberto.set(false)',
  },
  template: `
    <a class="pular" href="#conteudo" (click)="pularParaOConteudo($event)">Pular para o conteúdo</a>

    <div class="moldura" [class.menu-aberto]="menuAberto()">
      <aside class="lateral" id="menu-lateral" aria-label="Menu">
        <div class="cabeca">
          <a routerLink="/chat" class="marca" aria-label="Sabiá, nova conversa"><app-marca /></a>
          <button type="button" class="botao-icone so-celular" aria-label="Fechar menu" (click)="menuAberto.set(false)">
            <app-icone nome="fechar" />
          </button>
        </div>

        <div class="empresa">
          <span class="inicial" aria-hidden="true">{{ iniciais(sessao.usuario()?.empresaNome ?? '') }}</span>
          <div class="dados">
            <strong>{{ sessao.usuario()?.empresaNome }}</strong>
            <span>{{ descricaoDoAcesso() }}</span>
          </div>
        </div>

        <a routerLink="/chat" class="nova-conversa" [class.atual]="naConversaNova()">
          <app-icone nome="mais" />
          Nova conversa
        </a>

        <nav class="navegacao" aria-label="Principal">
          <a routerLink="/documentos" routerLinkActive="ativo" ariaCurrentWhenActive="page">
            <app-icone nome="documento" />Documentos
          </a>
          @if (sessao.admin()) {
            <a routerLink="/analises" routerLinkActive="ativo" ariaCurrentWhenActive="page">
              <app-icone nome="grafico" />Análises
            </a>
            <a routerLink="/membros" routerLinkActive="ativo" ariaCurrentWhenActive="page">
              <app-icone nome="pessoas" />Membros
            </a>
          }
        </nav>

        <section class="conversas" aria-label="Conversas">
          @if (lista.itens().length > 6) {
            <div class="filtro">
              <app-icone nome="busca" [tamanho]="14" />
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

          @for (grupo of grupos(); track grupo.titulo) {
            <h2>{{ grupo.titulo }}</h2>
            <ul>
              @for (conversa of grupo.conversas; track conversa.id) {
                <li>
                  <a
                    [routerLink]="['/chat', conversa.id]"
                    routerLinkActive="ativa"
                    ariaCurrentWhenActive="page"
                    [title]="conversa.titulo"
                  >{{ conversa.titulo }}</a>
                  <button
                    type="button"
                    class="botao-icone pequeno excluir"
                    [attr.aria-label]="'Excluir a conversa ' + conversa.titulo"
                    title="Excluir"
                    (click)="excluir(conversa)"
                  >
                    <app-icone nome="lixeira" [tamanho]="14" />
                  </button>
                </li>
              }
            </ul>
          } @empty {
            @if (lista.carregada()) {
              <p class="vazio">
                @if (filtro().trim()) {
                  Nenhuma conversa com "{{ filtro().trim() }}".
                } @else {
                  As conversas aparecem aqui.
                }
              </p>
            }
          }
        </section>

        <div class="conta">
          <a routerLink="/conta" routerLinkActive="ativa" class="pessoa" title="Minha conta">
            <span class="avatar" aria-hidden="true">{{ iniciais(sessao.usuario()?.nome ?? '') }}</span>
            <span class="dados">
              <strong>{{ sessao.usuario()?.nome }}</strong>
              <span>{{ sessao.usuario()?.visitante ? 'Conta temporária' : sessao.usuario()?.email }}</span>
            </span>
          </a>
          <button
            type="button"
            class="botao-icone"
            [attr.aria-label]="'Tema ' + nomeDoTema(tema.preferencia()) + '. Mudar para ' + nomeDoTema(tema.proxima()) + '.'"
            [title]="'Tema ' + nomeDoTema(tema.preferencia())"
            (click)="tema.alternar()"
          >
            @switch (tema.preferencia()) {
              @case ('claro') {
                <app-icone nome="sol" />
              }
              @case ('escuro') {
                <app-icone nome="lua" />
              }
              @default {
                <app-icone nome="automatico" />
              }
            }
          </button>
          <button type="button" class="botao-icone" aria-label="Sair" title="Sair" (click)="sair()">
            <app-icone nome="sair" />
          </button>
        </div>
      </aside>

      <div class="veu" aria-hidden="true" (click)="menuAberto.set(false)"></div>

      <div class="principal">
        <header class="barra-movel">
          <button
            type="button"
            class="botao-icone"
            aria-label="Abrir menu"
            aria-controls="menu-lateral"
            [attr.aria-expanded]="menuAberto()"
            (click)="menuAberto.set(true)"
          >
            <app-icone nome="menu" [tamanho]="18" />
          </button>
          <a routerLink="/chat" class="marca" aria-label="Sabiá, nova conversa"><app-marca /></a>
          <a routerLink="/chat" class="botao-icone" aria-label="Nova conversa" title="Nova conversa">
            <app-icone nome="mais" [tamanho]="18" />
          </a>
        </header>

        <main class="conteudo" id="conteudo" tabindex="-1">
          <router-outlet />
        </main>
      </div>
    </div>

    <app-avisos-na-tela />
  `,
  styles: `
    :host {
      display: block;
      height: 100dvh;
    }
    .moldura {
      display: grid;
      grid-template-columns: 16.5rem minmax(0, 1fr);
      height: 100%;
    }

    /* Barra lateral */
    .lateral {
      display: flex;
      flex-direction: column;
      min-height: 0;
      padding: 0.75rem 0.625rem 0.625rem;
      background: var(--fundo-lateral);
      border-right: 1px solid var(--linha);
    }
    .cabeca {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 2rem;
      padding: 0 0.375rem;
    }
    .marca {
      display: inline-flex;
      border-radius: var(--raio-pequeno);
    }
    .marca:hover {
      text-decoration: none;
    }
    .empresa {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin: 0.875rem 0 0.75rem;
      padding: 0.5rem;
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      background: var(--superficie);
    }
    .inicial {
      display: grid;
      place-items: center;
      flex: none;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: var(--raio-pequeno);
      background: var(--acento-suave);
      color: var(--acento);
      font-size: 0.6875rem;
      font-weight: 650;
    }
    .dados {
      display: grid;
      min-width: 0;
      line-height: 1.3;
    }
    .dados strong {
      font-weight: 550;
      font-size: var(--t-pequeno);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dados span {
      color: var(--tinta-fraca);
      font-size: var(--t-mini);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .nova-conversa,
    .navegacao a {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      height: 2rem;
      padding: 0 0.5rem;
      border-radius: var(--raio-pequeno);
      color: var(--tinta-suave);
      font-weight: 500;
    }
    .nova-conversa:hover,
    .navegacao a:hover {
      color: var(--tinta);
      background: var(--superficie-3);
      text-decoration: none;
    }
    .nova-conversa.atual,
    .navegacao a.ativo {
      color: var(--tinta);
      background: var(--superficie-3);
    }
    .nova-conversa {
      color: var(--tinta);
    }
    .navegacao {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1px;
      margin-top: 1px;
    }

    /* Conversas */
    .conversas {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      margin: 1rem -0.625rem 0;
      padding: 0 0.625rem 0.5rem;
      scrollbar-width: thin;
    }
    .conversas h2 {
      margin: 0.75rem 0 0.25rem;
      padding: 0 0.5rem;
      font-size: var(--t-mini);
      font-weight: 500;
      color: var(--tinta-fraca);
    }
    .conversas h2:first-of-type {
      margin-top: 0;
    }
    .conversas ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 1px;
    }
    .conversas li {
      position: relative;
      display: flex;
      align-items: center;
      border-radius: var(--raio-pequeno);
    }
    .conversas li a {
      flex: 1;
      min-width: 0;
      height: 2rem;
      line-height: 2rem;
      padding: 0 0.5rem;
      border-radius: var(--raio-pequeno);
      color: var(--tinta-suave);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .conversas li:hover a,
    .conversas li:focus-within a {
      padding-right: 2rem;
    }
    .conversas li a:hover {
      text-decoration: none;
    }
    .conversas li:hover,
    .conversas li:focus-within {
      background: var(--superficie-3);
    }
    .conversas li:has(a.ativa) {
      background: var(--superficie-3);
    }
    .conversas li a.ativa {
      color: var(--tinta);
      font-weight: 500;
    }
    .excluir {
      position: absolute;
      right: 0.15rem;
      opacity: 0;
    }
    .conversas li:hover .excluir,
    .excluir:focus-visible {
      opacity: 1;
    }
    .filtro {
      position: relative;
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
      color: var(--tinta-fraca);
    }
    .filtro app-icone {
      position: absolute;
      left: 0.55rem;
      pointer-events: none;
    }
    .filtro input {
      width: 100%;
      height: 1.875rem;
      padding: 0 0.5rem 0 1.85rem;
      border: 1px solid var(--linha);
      border-radius: var(--raio-pequeno);
      background: var(--superficie);
      color: var(--tinta);
      font: inherit;
      font-size: var(--t-pequeno);
    }
    .filtro input:focus {
      outline: none;
      border-color: var(--acento);
      box-shadow: var(--foco);
    }
    .vazio {
      padding: 0 0.5rem;
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }

    /* Conta */
    .conta {
      display: flex;
      align-items: center;
      gap: 0.125rem;
      margin: 0 -0.625rem;
      padding: 0.625rem 0.625rem 0;
      border-top: 1px solid var(--linha);
    }
    .pessoa {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.3rem 0.375rem;
      border-radius: var(--raio-pequeno);
      color: var(--tinta);
    }
    .pessoa:hover,
    .pessoa.ativa {
      background: var(--superficie-3);
      text-decoration: none;
    }

    /* Conteúdo */
    .principal {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      min-width: 0;
      min-height: 0;
    }
    .conteudo {
      grid-row: 2;
      min-height: 0;
      overflow: auto;
    }
    .conteudo:focus {
      outline: none;
      box-shadow: none;
    }
    .barra-movel,
    .so-celular,
    .veu {
      display: none;
    }
    .pular {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 60;
      padding: 0.5rem 0.9rem;
      border-radius: var(--raio);
      background: var(--botao);
      color: #fff;
      font-weight: 600;
      transform: translateY(-200%);
    }
    .pular:focus {
      transform: none;
    }

    @media (max-width: 900px) {
      .moldura {
        grid-template-columns: minmax(0, 1fr);
      }
      .lateral {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 40;
        width: min(18rem, 86vw);
        transform: translateX(-100%);
        visibility: hidden;
        transition:
          transform 180ms ease,
          visibility 0s linear 180ms;
      }
      .menu-aberto .lateral {
        transform: none;
        visibility: visible;
        box-shadow: var(--sombra-2);
        transition: transform 180ms ease;
      }
      .menu-aberto .veu {
        display: block;
        position: fixed;
        inset: 0;
        z-index: 39;
        background: var(--veu);
      }
      .so-celular {
        display: inline-grid;
      }
      .barra-movel {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 3rem;
        padding: 0 0.5rem;
        border-bottom: 1px solid var(--linha);
        background: var(--fundo);
      }
      .excluir {
        opacity: 1;
      }
      .conversas li a {
        padding-right: 2rem;
      }
    }
  `,
})
export class Shell implements OnInit {
  protected readonly sessao = inject(Sessao);
  protected readonly tema = inject(Tema);
  protected readonly lista = inject(ListaDeConversas);
  private readonly avisos = inject(Avisos);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly menuAberto = signal(false);
  protected readonly filtro = signal('');
  private readonly url = signal(this.router.url);

  protected readonly naConversaNova = computed(() => this.url().split('?')[0] === '/chat');

  protected readonly grupos = computed(() => {
    const termo = normalizar(this.filtro().trim());
    const conversas = termo
      ? this.lista.itens().filter((conversa) => normalizar(conversa.titulo).includes(termo))
      : this.lista.itens();
    return agruparPorData(conversas);
  });

  protected readonly descricaoDoAcesso = computed(() => {
    const usuario = this.sessao.usuario();
    if (usuario?.visitante) {
      return 'Demonstração';
    }
    return usuario?.papel === 'ADMIN' ? 'Administrador' : 'Membro';
  });

  ngOnInit(): void {
    this.lista.carregar();
    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((evento) => {
        this.url.set(evento.urlAfterRedirects);
        this.menuAberto.set(false);
      });
  }

  protected nomeDoTema(preferencia: PreferenciaDeTema): string {
    return NOME_DO_TEMA[preferencia];
  }

  protected iniciais(nome: string): string {
    const palavras = nome.trim().split(/\s+/).filter(Boolean);
    const primeira = palavras[0]?.[0] ?? '';
    const ultima = palavras.length > 1 ? palavras[palavras.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  protected pularParaOConteudo(evento: Event): void {
    evento.preventDefault();
    document.getElementById('conteudo')?.focus();
  }

  protected excluir(conversa: Conversa): void {
    if (!confirm(`Excluir a conversa "${conversa.titulo}"? Não dá para desfazer.`)) {
      return;
    }
    this.lista.excluir(conversa.id).subscribe({
      next: () => {
        this.avisos.mostrar('Conversa excluída.');
        if (this.url().startsWith(`/chat/${conversa.id}`)) {
          this.router.navigate(['/chat']);
        }
      },
      error: (falha) => this.avisos.erro(mensagemDeErro(falha, 'Não foi possível excluir a conversa.')),
    });
  }

  sair(): void {
    this.sessao.encerrar();
    this.lista.limpar();
    this.router.navigate(['/entrar']);
  }
}
