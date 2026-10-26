import { Injectable } from '@angular/core';

/**
 * Guarda a primeira pergunta de uma conversa nova enquanto a página navega para a URL da conversa.
 */
@Injectable({ providedIn: 'root' })
export class PerguntasPendentes {
  private readonly pendentes = new Map<string, string>();

  guardar(conversaId: string, pergunta: string): void {
    this.pendentes.set(conversaId, pergunta);
  }

  retirar(conversaId: string): string | undefined {
    const pergunta = this.pendentes.get(conversaId);
    this.pendentes.delete(conversaId);
    return pergunta;
  }
}
