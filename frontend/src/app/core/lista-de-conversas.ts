import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { Api } from './api';
import { Conversa } from './modelos';

/**
 * Conversas de quem está logado. A barra lateral mostra a lista e a tela de conversa a altera
 * (pergunta nova, renomear, excluir), então as duas leem daqui.
 */
@Injectable({ providedIn: 'root' })
export class ListaDeConversas {
  private readonly api = inject(Api);

  readonly itens = signal<Conversa[]>([]);
  readonly carregada = signal(false);

  carregar(): void {
    this.api.conversas().subscribe({
      next: (lista) => {
        this.itens.set(lista);
        this.carregada.set(true);
      },
    });
  }

  renomear(id: string, titulo: string): Observable<Conversa> {
    return this.api
      .renomearConversa(id, titulo)
      .pipe(tap((atualizada) => this.itens.update((lista) => lista.map((c) => (c.id === id ? atualizada : c)))));
  }

  excluir(id: string): Observable<void> {
    return this.api
      .excluirConversa(id)
      .pipe(tap(() => this.itens.update((lista) => lista.filter((c) => c.id !== id))));
  }

  limpar(): void {
    this.itens.set([]);
    this.carregada.set(false);
  }
}
