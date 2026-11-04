import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { siglaDoArquivo } from '../../core/formatos';

/** Quadradinho com a sigla do tipo do arquivo (PDF, DOCX, MD, TXT). */
@Component({
  selector: 'app-tipo-de-arquivo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tipo]': 'sigla()',
    'aria-hidden': 'true',
  },
  template: `{{ sigla() }}`,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      flex: none;
      width: 2rem;
      height: 1.375rem;
      border-radius: 4px;
      color: var(--tinta-suave);
      background: color-mix(in srgb, currentColor 11%, transparent);
      font-size: 0.5625rem;
      font-weight: 650;
      letter-spacing: 0.02em;
    }
    :host([data-tipo='PDF']) {
      color: #d1472f;
    }
    :host([data-tipo='DOCX']) {
      color: var(--acento);
    }
  `,
})
export class TipoDeArquivo {
  readonly nome = input.required<string>();
  protected readonly sigla = computed(() => siglaDoArquivo(this.nome()));
}
