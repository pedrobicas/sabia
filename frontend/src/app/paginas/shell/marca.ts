import { Component, input } from '@angular/core';

/** Logotipo: a silhueta de um sabiá com o peito marcado em amarelo de marca-texto. */
@Component({
  selector: 'app-marca',
  template: `
    <svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--musgo)" />
      <path d="M7 19c2-6 8-9 13-8l5-3-2 5c1 5-3 10-10 10H7l3-2c-2 0-3-1-3-2z" fill="var(--papel)" />
      <circle cx="20.5" cy="13" r="1.3" fill="var(--musgo)" />
      <path d="M12 20c2-1 5-1 7-3" stroke="var(--marca-texto)" stroke-width="2.2" stroke-linecap="round" fill="none" />
    </svg>
    <span class="nome">Sabiá</span>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
    }
    .nome {
      font-family: var(--fonte-leitura);
      font-weight: 650;
      font-size: var(--t-medio);
      letter-spacing: -0.01em;
    }
  `,
})
export class Marca {
  readonly tamanho = input(28);
}
