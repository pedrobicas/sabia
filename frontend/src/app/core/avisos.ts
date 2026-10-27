import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  texto: string;
  tipo: 'info' | 'erro';
}

/**
 * Avisos rápidos no canto da tela ("Resposta copiada", "Conversa renomeada").
 * Somem sozinhos; erros ficam um pouco mais.
 */
@Injectable({ providedIn: 'root' })
export class Avisos {
  readonly lista = signal<Aviso[]>([]);
  private proximoId = 1;

  mostrar(texto: string, tipo: Aviso['tipo'] = 'info'): void {
    const aviso = { id: this.proximoId++, texto, tipo };
    this.lista.update((lista) => [...lista.slice(-2), aviso]);
    setTimeout(() => this.fechar(aviso.id), tipo === 'erro' ? 7000 : 3500);
  }

  erro(texto: string): void {
    this.mostrar(texto, 'erro');
  }

  fechar(id: number): void {
    this.lista.update((lista) => lista.filter((aviso) => aviso.id !== id));
  }
}
