import { Routes } from '@angular/router';

import { somenteAdmin, somenteLogado, somenteVisitante } from './core/autenticacao';

export const routes: Routes = [
  {
    path: 'entrar',
    canActivate: [somenteVisitante],
    title: 'Entrar · Sabiá',
    loadComponent: () => import('./paginas/entrar/entrar').then((m) => m.Entrar),
  },
  {
    path: 'cadastro',
    canActivate: [somenteVisitante],
    title: 'Criar conta · Sabiá',
    loadComponent: () => import('./paginas/cadastro/cadastro').then((m) => m.Cadastro),
  },
  {
    path: '',
    canActivate: [somenteLogado],
    loadComponent: () => import('./paginas/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'chat' },
      {
        path: 'chat',
        title: 'Conversas · Sabiá',
        loadComponent: () => import('./paginas/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'chat/:id',
        title: 'Conversas · Sabiá',
        loadComponent: () => import('./paginas/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'documentos',
        title: 'Documentos · Sabiá',
        loadComponent: () => import('./paginas/documentos/documentos').then((m) => m.Documentos),
      },
      {
        path: 'conta',
        title: 'Minha conta · Sabiá',
        loadComponent: () => import('./paginas/conta/conta').then((m) => m.Conta),
      },
      {
        path: 'analises',
        canActivate: [somenteAdmin],
        title: 'Análises · Sabiá',
        loadComponent: () => import('./paginas/analises/analises').then((m) => m.Analises),
      },
      {
        path: 'membros',
        canActivate: [somenteAdmin],
        title: 'Membros · Sabiá',
        loadComponent: () => import('./paginas/membros/membros').then((m) => m.Membros),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
