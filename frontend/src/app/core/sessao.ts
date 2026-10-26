import { computed, Injectable, signal } from '@angular/core';

import { RespostaDeLogin, Usuario } from './modelos';

const CHAVE = 'sabia.sessao';

interface SessaoSalva {
  token: string;
  usuario: Usuario;
}

/**
 * Guarda o token e o usuário logado. Persiste no localStorage para sobreviver a um recarregamento.
 */
@Injectable({ providedIn: 'root' })
export class Sessao {
  readonly token = signal<string | null>(null);
  readonly usuario = signal<Usuario | null>(null);
  readonly autenticado = computed(() => this.token() !== null);
  readonly admin = computed(() => this.usuario()?.papel === 'ADMIN');

  constructor() {
    const salva = lerSessao();
    if (salva && !expirado(salva.token)) {
      this.token.set(salva.token);
      this.usuario.set(salva.usuario);
    } else if (salva) {
      apagarSessao();
    }
  }

  iniciar(resposta: RespostaDeLogin): void {
    this.token.set(resposta.token);
    this.usuario.set(resposta.usuario);
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ token: resposta.token, usuario: resposta.usuario }));
    } catch {
      // Navegação privada ou armazenamento bloqueado: a sessão vale só até recarregar a página.
    }
  }

  encerrar(): void {
    this.token.set(null);
    this.usuario.set(null);
    apagarSessao();
  }
}

function lerSessao(): SessaoSalva | null {
  try {
    const bruto = localStorage.getItem(CHAVE);
    return bruto ? (JSON.parse(bruto) as SessaoSalva) : null;
  } catch {
    return null;
  }
}

function apagarSessao(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a fazer
  }
}

/** Lê o "exp" do JWT (sem validar a assinatura: quem valida é o servidor). */
function expirado(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const dados = JSON.parse(atob(payload)) as { exp?: number };
    return dados.exp !== undefined && dados.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
