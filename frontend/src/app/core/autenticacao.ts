import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { Sessao } from './sessao';

/** Envia o token em toda chamada à API e manda para a tela de entrada quando ele não vale mais. */
export const interceptorDeAutenticacao: HttpInterceptorFn = (requisicao, proximo) => {
  const sessao = inject(Sessao);
  const router = inject(Router);
  const token = sessao.token();
  const pedido =
    token && requisicao.url.startsWith('/api')
      ? requisicao.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : requisicao;

  return proximo(pedido).pipe(
    catchError((erro: HttpErrorResponse) => {
      const ehLogin = requisicao.url.startsWith('/api/auth/');
      if (erro.status === 401 && !ehLogin) {
        sessao.encerrar();
        router.navigate(['/entrar']);
      }
      return throwError(() => erro);
    }),
  );
};

export const somenteLogado: CanActivateFn = () => {
  return inject(Sessao).autenticado() ? true : inject(Router).createUrlTree(['/entrar']);
};

export const somenteVisitante: CanActivateFn = () => {
  return inject(Sessao).autenticado() ? inject(Router).createUrlTree(['/chat']) : true;
};

export const somenteAdmin: CanActivateFn = () => {
  return inject(Sessao).admin() ? true : inject(Router).createUrlTree(['/chat']);
};

/** Extrai a mensagem que o back-end escreveu para o usuário (Problem Details) ou uma genérica. */
export function mensagemDeErro(erro: unknown, padrao = 'Não foi possível concluir. Tente de novo.'): string {
  if (erro instanceof HttpErrorResponse) {
    if (erro.status === 0) {
      return 'Sem conexão com o servidor. Confira sua internet e tente de novo.';
    }
    const detalhe = (erro.error as { detail?: string } | null)?.detail;
    if (detalhe) {
      return detalhe;
    }
  }
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }
  return padrao;
}
