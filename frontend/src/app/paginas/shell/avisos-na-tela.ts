import { Component, inject } from '@angular/core';

import { Avisos } from '../../core/avisos';

@Component({
  selector: 'app-avisos-na-tela',
  template: `
    <div class="pilha" role="status" aria-live="polite">
      @for (aviso of avisos.lista(); track aviso.id) {
        <div class="aviso" [class.erro]="aviso.tipo === 'erro'">
          <span>{{ aviso.texto }}</span>
          <button type="button" (click)="avisos.fechar(aviso.id)" aria-label="Fechar aviso">×</button>
        </div>
      }
    </div>
  `,
  styles: `
    /* Canto inferior esquerdo, longe do campo de pergunta. No celular, no topo. */
    .pilha {
      position: fixed;
      left: 1.25rem;
      bottom: 1.25rem;
      z-index: 50;
      display: grid;
      gap: 0.5rem;
      width: max-content;
      max-width: calc(100vw - 2rem);
      pointer-events: none;
    }
    .aviso {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.6rem 0.6rem 0.95rem;
      border-radius: var(--raio);
      background: var(--tinta);
      color: var(--papel);
      font-size: var(--t-pequeno);
      box-shadow: 0 8px 24px var(--sombra);
      pointer-events: auto;
      animation: aparecer 160ms ease-out;
    }
    .aviso.erro {
      background: var(--erro);
      color: var(--papel);
    }
    button {
      border: 0;
      background: none;
      color: inherit;
      font-size: 1.1rem;
      line-height: 1;
      padding: 0.15rem 0.35rem;
      border-radius: var(--raio);
      cursor: pointer;
      opacity: 0.75;
    }
    button:hover {
      opacity: 1;
    }
    @media (max-width: 760px) {
      .pilha {
        left: 50%;
        top: 0.75rem;
        bottom: auto;
        transform: translateX(-50%);
      }
    }
    @keyframes aparecer {
      from {
        transform: translateY(0.5rem);
        opacity: 0;
      }
    }
  `,
})
export class AvisosNaTela {
  protected readonly avisos = inject(Avisos);
}
