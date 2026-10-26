import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { Sessao } from '../../core/sessao';
import { Marca } from './marca';

/** Moldura das páginas logadas: barra superior com navegação e o conteúdo da rota. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Marca],
  template: `
    <header class="barra">
      <a routerLink="/chat" class="marca" aria-label="Sabiá, ir para as conversas">
        <app-marca />
      </a>
      <span class="empresa">{{ sessao.usuario()?.empresaNome }}</span>

      <nav aria-label="Principal">
        <a routerLink="/chat" routerLinkActive="ativo">Conversas</a>
        <a routerLink="/documentos" routerLinkActive="ativo">Documentos</a>
        @if (sessao.admin()) {
          <a routerLink="/membros" routerLinkActive="ativo">Membros</a>
        }
      </nav>

      <div class="usuario">
        <span class="nome-usuario">{{ sessao.usuario()?.nome }}</span>
        <button type="button" class="botao-texto" (click)="sair()">Sair</button>
      </div>
    </header>

    <main class="conteudo">
      <router-outlet />
    </main>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-rows: auto 1fr;
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
    }
    .conteudo {
      min-height: 0;
      overflow: auto;
    }
    @media (max-width: 760px) {
      .barra {
        flex-wrap: wrap;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
      }
      .empresa,
      .nome-usuario {
        display: none;
      }
      nav {
        order: 3;
        width: 100%;
        margin-left: 0;
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
  private readonly router = inject(Router);

  sair(): void {
    this.sessao.encerrar();
    this.router.navigate(['/entrar']);
  }
}
