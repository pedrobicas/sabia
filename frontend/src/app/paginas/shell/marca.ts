import { Component, input } from '@angular/core';

/** Logotipo: um sabiá-laranjeira, com a barriga laranja. */
@Component({
  selector: 'app-marca',
  template: `
    <svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" class="fundo" />
      <g transform="matrix(1.12 0 0 1.12 -2.06 -1.61)">
        <path
          class="corpo"
          d="M5.5 15.5c0-3.3 2.6-5.8 5.9-5.8 1 0 1.9.2 2.6.6.5-1.7 2-2.8 3.7-2.8.6 0 1.1.1 1.6.4l-1.1 1.4 1.8.6-1.9.9c-.3 4-3.3 6.9-7.2 6.9H5.5l1.6-1.2c-1-.2-1.6-.5-1.6-1z"
        />
        <circle class="olho" cx="17.4" cy="9.1" r=".75" />
        <path class="peito" d="M9 14.6c1.7.2 3.4-.3 4.6-1.6" />
      </g>
    </svg>
    @if (comNome()) {
      <span class="nome">Sabiá</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }
    svg {
      flex: none;
    }
    .fundo,
    .olho {
      fill: var(--tinta);
    }
    .corpo {
      fill: var(--fundo);
    }
    .peito {
      fill: none;
      stroke: #f08c3a;
      stroke-width: 1.6;
      stroke-linecap: round;
    }
    .nome {
      font-weight: 650;
      font-size: 0.9375rem;
      letter-spacing: -0.015em;
      color: var(--tinta);
    }
  `,
})
export class Marca {
  readonly tamanho = input(22);
  readonly comNome = input(true);
}
