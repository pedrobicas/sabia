import { Component, inject } from '@angular/core';

import { Avisos } from '../../core/avisos';
import { Icone } from './icone';

@Component({
  selector: 'app-avisos-na-tela',
  imports: [Icone],
  template: `
    <div class="pilha" role="status" aria-live="polite">
      @for (aviso of avisos.lista(); track aviso.id) {
        <div class="aviso" [class.erro]="aviso.tipo === 'erro'">
          <span>{{ aviso.texto }}</span>
          <button type="button" (click)="avisos.fechar(aviso.id)" aria-label="Fechar aviso"><app-icone nome="fechar" [tamanho]="14" /></button>
        </div>
      }
    </div>
  `,
  styles: `
    /* Embaixo, no centro da área de conteúdo. No celular, no topo. */
    .pilha {
      position: fixed;
      left: calc(50% + 8.25rem);
      bottom: 6.5rem;
      z-index: 50;
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      width: max-content;
      max-width: calc(100vw - 2rem);
      transform: translateX(-50%);
      pointer-events: none;
    }
    .aviso {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.45rem 0.45rem 0.45rem 0.85rem;
      border-radius: var(--raio);
      background: var(--tinta);
      color: var(--fundo);
      font-size: var(--t-pequeno);
      box-shadow: var(--sombra-2);
      pointer-events: auto;
      animation: aparecer 160ms ease-out;
    }
    .aviso.erro {
      background: var(--erro);
      color: #fff;
    }
    button {
      display: grid;
      place-items: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      border-radius: var(--raio-pequeno);
      cursor: pointer;
      opacity: 0.7;
    }
    button:hover {
      opacity: 1;
    }
    @media (max-width: 900px) {
      .pilha {
        left: 50%;
        top: 3.5rem;
        bottom: auto;
      }
    }
    @keyframes aparecer {
      from {
        transform: translateY(0.4rem);
        opacity: 0;
      }
    }
  `,
})
export class AvisosNaTela {
  protected readonly avisos = inject(Avisos);
}
