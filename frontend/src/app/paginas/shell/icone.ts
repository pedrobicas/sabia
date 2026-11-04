import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Traços dos ícones, desenhados numa grade de 20 x 20. */
const TRACOS = {
  conversa: 'M4 4.5h12A1.5 1.5 0 0 1 17.5 6v7a1.5 1.5 0 0 1-1.5 1.5H9.5L6 17.5v-3H4A1.5 1.5 0 0 1 2.5 13V6A1.5 1.5 0 0 1 4 4.5Z',
  documento: 'M5.5 2.5h6L15.5 6.5v9.5A1.5 1.5 0 0 1 14 17.5H6A1.5 1.5 0 0 1 4.5 16V3.5a1 1 0 0 1 1-1Z M11.5 2.5v4h4 M7.5 10.5h5 M7.5 13.5h3.5',
  grafico: 'M3.5 16.5h13 M6 13.5v-3.5 M10 13.5V5.5 M14 13.5V8',
  pessoas:
    'M10.5 6.75a2.75 2.75 0 1 1-5.5 0 2.75 2.75 0 0 1 5.5 0Z M2.75 16.5c.55-2.6 2.55-4.25 5-4.25s4.45 1.65 5 4.25 M12.75 4.25a2.5 2.5 0 0 1 0 5 M14.25 12.4c1.45.55 2.45 1.9 2.75 4.1',
  mais: 'M10 4.5v11 M4.5 10h11',
  busca: 'M14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z M12.75 12.75 16.5 16.5',
  sair: 'M8 3.5H5.5A1.5 1.5 0 0 0 4 5v10a1.5 1.5 0 0 0 1.5 1.5H8 M12.5 6.5 16 10l-3.5 3.5 M16 10H8',
  sol: 'M13 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M10 2.5v1.75 M10 15.75v1.75 M2.5 10h1.75 M15.75 10h1.75 M4.7 4.7l1.25 1.25 M14.05 14.05l1.25 1.25 M4.7 15.3l1.25-1.25 M14.05 5.95l1.25-1.25',
  lua: 'M16.25 12.4A6.75 6.75 0 0 1 7.6 3.75a6.75 6.75 0 1 0 8.65 8.65Z',
  automatico: 'M16.5 10a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z M10 3.5v13',
  copiar:
    'M7.5 7.5h8a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z M13.5 7.5V4.5a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2',
  util: 'M6.5 9v7.5h-2a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1h2Zm0 0 2.9-5.4a1.6 1.6 0 0 1 2.95 1.15L11.7 8h3.75a1.5 1.5 0 0 1 1.47 1.8l-1.1 5.5a1.5 1.5 0 0 1-1.47 1.2H6.5',
  fechar: 'M5.5 5.5l9 9 M14.5 5.5l-9 9',
  baixar: 'M10 3.5v9 M6.5 9 10 12.5 13.5 9 M4 16.5h12',
  enviar: 'M10 13V3.5 M6.5 7 10 3.5 13.5 7 M4 13v2a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 16 15v-2',
  recarregar: 'M15.75 8.5A6 6 0 0 0 4.6 7 M4.25 3.5V7h3.5 M4.25 11.5A6 6 0 0 0 15.4 13 M15.75 16.5V13h-3.5',
  lixeira:
    'M3.5 5.5h13 M8 5.5V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5 M5 5.5l.75 10.1A1.5 1.5 0 0 0 7.25 17h5.5a1.5 1.5 0 0 0 1.5-1.4L15 5.5 M8.5 9v4.5 M11.5 9v4.5',
  trechos: 'M7.5 5.5h9 M7.5 10h9 M7.5 14.5h6 M3.75 5.5h.01 M3.75 10h.01 M3.75 14.5h.01',
  lapis: 'M12.5 4.25 15.75 7.5 7 16.25H3.75V13L12.5 4.25Z M10.75 6 14 9.25',
  seta: 'M10 15.5v-11 M5.5 9 10 4.5 14.5 9',
  direita: 'M8 5.5 12.5 10 8 14.5',
  menu: 'M3.5 6h13 M3.5 10h13 M3.5 14h13',
  externo: 'M8.5 4.5h-3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3 M11.5 4.5h4v4 M15.5 4.5 9.5 10.5',
} as const;

export type NomeDoIcone = keyof typeof TRACOS | 'nao-util' | 'parar';

/** Ícone de traço, na cor do texto. Decorativo: quem usa dá o nome acessível ao botão. */
@Component({
  selector: 'app-icone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="tamanho()" [attr.height]="tamanho()" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      @if (nome() === 'parar') {
        <rect x="5.5" y="5.5" width="9" height="9" rx="1.5" class="cheio" />
      } @else {
        <path [attr.d]="tracado()" [attr.transform]="nome() === 'nao-util' ? 'rotate(180 10 10)' : null" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .cheio {
      fill: currentColor;
      stroke: none;
    }
  `,
})
export class Icone {
  readonly nome = input.required<NomeDoIcone>();
  readonly tamanho = input(16);

  protected readonly tracado = computed(() => {
    const nome = this.nome();
    return nome === 'nao-util' ? TRACOS.util : nome === 'parar' ? '' : TRACOS[nome];
  });
}
