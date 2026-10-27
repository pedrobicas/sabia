import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Sessao } from '../../core/sessao';
import { PreferenciaDeTema, Tema } from '../../core/tema';
import { AvisosNaTela } from './avisos-na-tela';
import { Marca } from './marca';

const NOME_DO_TEMA: Record<PreferenciaDeTema, string> = {
  automatico: 'automático (segue o sistema)',
  claro: 'claro',
  escuro: 'escuro',
};

/** Moldura das páginas logadas: barra superior com navegação e o conteúdo da rota. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Marca, AvisosNaTela],
  template: `
    <a class="pular" href="#conteudo" (click)="pularParaOConteudo($event)">Pular para o conteúdo</a>
    <header class="barra">
      <a routerLink="/chat" class="marca" aria-label="Sabiá, ir para as conversas">
        <app-marca />
      </a>
      <span class="empresa">{{ sessao.usuario()?.empresaNome }}</span>

      <nav aria-label="Principal">
        <a routerLink="/chat" routerLinkActive="ativo">Conversas</a>
        <a routerLink="/documentos" routerLinkActive="ativo">Documentos</a>
        @if (sessao.admin()) {
          <a routerLink="/analises" routerLinkActive="ativo">Análises</a>
          <a routerLink="/membros" routerLinkActive="ativo">Membros</a>
        }
      </nav>

      <div class="usuario">
        <button
          type="button"
          class="tema"
          [attr.aria-label]="'Tema ' + nomeDoTema(tema.preferencia()) + '. Mudar para ' + nomeDoTema(tema.proxima()) + '.'"
          [title]="'Tema ' + nomeDoTema(tema.preferencia())"
          (click)="tema.alternar()"
        >
          @switch (tema.preferencia()) {
            @case ('claro') {
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6" /><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7" /></svg>
            }
            @case ('escuro') {
              <svg viewBox="0 0 20 20" aria-hidden="true"><path class="cheio" d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1Z" /></svg>
            }
            @default {
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" /><path class="cheio" d="M10 3a7 7 0 0 1 0 14Z" /></svg>
            }
          }
        </button>
        <a routerLink="/conta" routerLinkActive="ativo" class="nome-usuario" title="Minha conta">{{ sessao.usuario()?.nome }}</a>
        <button type="button" class="botao-texto" (click)="sair()">Sair</button>
      </div>
    </header>

    <main class="conteudo" id="conteudo" tabindex="-1">
      <router-outlet />
    </main>

    <app-avisos-na-tela />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
      grid-template-columns: minmax(0, 1fr);
      height: 100dvh;
    }
    .barra {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.6rem 1.25rem;
      border-bottom: 1px solid var(--linha);
      background: var(--superficie);
    }
    .marca {
      color: inherit;
      text-decoration: none;
    }
    .empresa {
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
      padding-left: 1rem;
      border-left: 1px solid var(--linha);
    }
    nav {
      display: flex;
      gap: 0.25rem;
      margin-left: auto;
    }
    nav a {
      color: var(--tinta-suave);
      text-decoration: none;
      padding: 0.4rem 0.75rem;
      border-radius: var(--raio);
      font-weight: 700;
    }
    nav a:hover {
      color: var(--tinta);
      background: var(--papel);
    }
    nav a.ativo {
      color: var(--musgo);
      background: var(--musgo-claro);
    }
    .usuario {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-left: 1rem;
      border-left: 1px solid var(--linha);
    }
    .nome-usuario {
      font-size: var(--t-pequeno);
      color: var(--tinta);
      text-decoration: none;
      padding: 0.25rem 0.4rem;
      border-radius: var(--raio);
    }
    .nome-usuario:hover,
    .nome-usuario.ativo {
      text-decoration: underline;
    }
    .conteudo {
      min-height: 0;
      overflow: auto;
    }
    .conteudo:focus {
      outline: none;
      box-shadow: none;
    }
    .pular {
      position: fixed;
      top: 0.5rem;
      left: 0.5rem;
      z-index: 60;
      padding: 0.5rem 0.9rem;
      border-radius: var(--raio);
      background: var(--musgo);
      color: var(--sobre-musgo);
      font-weight: 700;
      transform: translateY(-200%);
    }
    .pular:focus {
      transform: none;
    }
    .tema {
      display: grid;
      place-items: center;
      width: 2rem;
      height: 2rem;
      border: 0;
      border-radius: var(--raio);
      background: none;
      color: var(--tinta-suave);
      cursor: pointer;
    }
    .tema:hover {
      color: var(--tinta);
      background: var(--papel);
    }
    .tema svg {
      width: 1.15rem;
      height: 1.15rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.6;
      stroke-linecap: round;
    }
    .tema svg .cheio {
      fill: currentColor;
      stroke: none;
    }
    @media (max-width: 760px) {
      .barra {
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
      }
      .empresa {
        display: none;
      }
      .nome-usuario {
        max-width: 11rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      nav {
        order: 3;
        width: 100%;
        margin-left: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      nav a {
        flex: none;
        padding: 0.4rem 0.55rem;
        font-size: 0.9rem;
      }
      .usuario {
        margin-left: auto;
        border-left: 0;
      }
    }
  `,
})
export class Shell {
  protected readonly sessao = inject(Sessao);
  protected readonly tema = inject(Tema);
  private readonly router = inject(Router);

  protected nomeDoTema(preferencia: PreferenciaDeTema): string {
    return NOME_DO_TEMA[preferencia];
  }

  protected pularParaOConteudo(evento: Event): void {
    evento.preventDefault();
    document.getElementById('conteudo')?.focus();
  }

  sair(): void {
    this.sessao.encerrar();
    this.router.navigate(['/entrar']);
  }
}
