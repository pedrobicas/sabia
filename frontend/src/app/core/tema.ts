import { effect, Injectable, signal } from '@angular/core';

export type PreferenciaDeTema = 'automatico' | 'claro' | 'escuro';

const CHAVE = 'sabia.tema';
const ORDEM: PreferenciaDeTema[] = ['automatico', 'claro', 'escuro'];

/**
 * Tema claro, escuro ou automático (segue o sistema). A escolha fica no localStorage e vira o
 * atributo data-tema do <html>; o index.html aplica o mesmo atributo antes do Angular carregar.
 */
@Injectable({ providedIn: 'root' })
export class Tema {
  readonly preferencia = signal<PreferenciaDeTema>(lerPreferencia());

  constructor() {
    effect(() => {
      const preferencia = this.preferencia();
      const raiz = document.documentElement;
      if (preferencia === 'automatico') {
        raiz.removeAttribute('data-tema');
      } else {
        raiz.setAttribute('data-tema', preferencia);
      }
      try {
        if (preferencia === 'automatico') {
          localStorage.removeItem(CHAVE);
        } else {
          localStorage.setItem(CHAVE, preferencia);
        }
      } catch {
        // Armazenamento bloqueado: o tema vale só até recarregar.
      }
    });
  }

  alternar(): void {
    const atual = ORDEM.indexOf(this.preferencia());
    this.preferencia.set(ORDEM[(atual + 1) % ORDEM.length]);
  }

  proxima(): PreferenciaDeTema {
    return ORDEM[(ORDEM.indexOf(this.preferencia()) + 1) % ORDEM.length];
  }
}

function lerPreferencia(): PreferenciaDeTema {
  try {
    const salva = localStorage.getItem(CHAVE);
    return salva === 'claro' || salva === 'escuro' ? salva : 'automatico';
  } catch {
    return 'automatico';
  }
}
