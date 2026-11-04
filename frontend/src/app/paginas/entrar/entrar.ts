import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { ContaDemo, RespostaDeLogin } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { Icone } from '../shell/icone';
import { Marca } from '../shell/marca';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, Marca, Icone],
  template: `
    <div class="tela">
      <header>
        <app-marca />
      </header>

      <main>
        <h1>Entrar no Sabiá</h1>
        <p class="resumo">Respostas com base nos documentos da empresa, com a fonte de cada informação.</p>

        @if (contasDemo().length > 0) {
          <section class="demo" aria-labelledby="titulo-demo">
            <h2 id="titulo-demo">Demonstração</h2>
            <p>Empresas fictícias com documentos prontos. Cada acesso cria uma conta temporária, sem cadastro.</p>
            <ul>
              @for (conta of contasDemo(); track conta.empresa) {
                <li>
                  <button type="button" [disabled]="enviando()" (click)="entrarComo(conta)">
                    <span class="inicial" aria-hidden="true">{{ iniciais(conta.empresa) }}</span>
                    <span class="nome">Entrar como {{ conta.empresa }}</span>
                    @if (entrandoComo() === conta.empresa) {
                      <span class="girando" aria-hidden="true"></span>
                    } @else {
                      <app-icone nome="direita" [tamanho]="14" />
                    }
                  </button>
                </li>
              }
            </ul>
          </section>

          <p class="divisor"><span>ou entre com e-mail</span></p>
        }

        <form [formGroup]="formulario" (ngSubmit)="entrar()" novalidate>
          <div class="campo">
            <label for="email">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="username" />
          </div>
          <div class="campo">
            <label for="senha">Senha</label>
            <input id="senha" type="password" formControlName="senha" autocomplete="current-password" />
          </div>

          @if (erro()) {
            <p class="alerta-erro" role="alert">{{ erro() }}</p>
          }

          <button type="submit" class="botao" [disabled]="enviando()">
            {{ enviando() && !entrandoComo() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        @if (cadastroAberto()) {
          <p class="cadastro">Ainda não tem conta? <a routerLink="/cadastro">Cadastre sua empresa</a></p>
        }
      </main>

      <footer>
        <a href="https://github.com/pedrobicas/sabia" target="_blank" rel="noopener">
          Código no GitHub
          <app-icone nome="externo" [tamanho]="13" />
        </a>
      </footer>
    </div>
  `,
  styles: `
    .tela {
      min-height: 100dvh;
      display: grid;
      grid-template-rows: auto 1fr auto;
      padding: 1.25rem 1.5rem;
    }
    main {
      align-self: center;
      width: 100%;
      max-width: 22.5rem;
      margin: 2.5rem auto;
    }
    h1 {
      font-size: 1.375rem;
      letter-spacing: -0.02em;
    }
    .resumo {
      margin-top: 0.4rem;
      color: var(--tinta-fraca);
    }
    .demo {
      margin-top: 1.75rem;
    }
    .demo h2 {
      font-size: var(--t-base);
    }
    .demo p {
      margin: 0.2rem 0 0.75rem;
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    .demo ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .demo button {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      width: 100%;
      padding: 0.6rem 0.75rem 0.6rem 0.6rem;
      border: 1px solid var(--linha-forte);
      border-radius: var(--raio);
      background: var(--superficie);
      box-shadow: var(--sombra-1);
      color: var(--tinta);
      font: inherit;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition:
        border-color 120ms ease,
        background-color 120ms ease;
    }
    .demo button:hover:not(:disabled) {
      border-color: var(--tinta-fraca);
      background: var(--fundo-lateral);
    }
    .demo button:disabled {
      cursor: progress;
      opacity: 0.7;
    }
    .demo button app-icone {
      color: var(--tinta-fraca);
    }
    .inicial {
      display: grid;
      place-items: center;
      flex: none;
      width: 2rem;
      height: 2rem;
      border-radius: var(--raio-pequeno);
      background: var(--acento-suave);
      color: var(--acento);
      font-size: 0.75rem;
      font-weight: 650;
    }
    .nome {
      flex: 1;
    }
    .divisor {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 1.75rem 0 1.25rem;
      color: var(--tinta-fraca);
      font-size: var(--t-mini);
    }
    .divisor::before,
    .divisor::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--linha);
    }
    form {
      display: grid;
      gap: 0.875rem;
    }
    .resumo + form {
      margin-top: 1.5rem;
    }
    form .botao {
      margin-top: 0.25rem;
    }
    .cadastro {
      margin-top: 1.25rem;
      font-size: var(--t-pequeno);
      color: var(--tinta-fraca);
    }
    footer {
      display: flex;
      justify-content: center;
      font-size: var(--t-pequeno);
    }
    footer a {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      color: var(--tinta-fraca);
    }
    footer a:hover {
      color: var(--tinta);
    }
  `,
})
export class Entrar implements OnInit {
  private readonly api = inject(Api);
  private readonly sessao = inject(Sessao);
  private readonly router = inject(Router);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });
  protected readonly enviando = signal(false);
  protected readonly entrandoComo = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly contasDemo = signal<ContaDemo[]>([]);
  protected readonly cadastroAberto = signal(false);

  ngOnInit(): void {
    this.api.configuracao().subscribe({
      next: (configuracao) => {
        this.contasDemo.set(configuracao.contasDemo);
        this.cadastroAberto.set(configuracao.cadastroAberto);
      },
    });
  }

  protected iniciais(nome: string): string {
    const palavras = nome.trim().split(/\s+/);
    return ((palavras[0]?.[0] ?? '') + (palavras.length > 1 ? palavras[palavras.length - 1][0] : '')).toUpperCase();
  }

  entrar(): void {
    if (this.formulario.invalid) {
      this.erro.set('Preencha o e-mail e a senha.');
      return;
    }
    const { email, senha } = this.formulario.getRawValue();
    this.enviarLogin(this.api.entrar(email, senha));
  }

  /** Cada clique cria uma conta temporária só deste visitante, sem senha. */
  entrarComo(conta: ContaDemo): void {
    this.entrandoComo.set(conta.empresa);
    this.enviarLogin(this.api.entrarNaDemonstracao(conta.empresa));
  }

  private enviarLogin(login: Observable<RespostaDeLogin>): void {
    this.enviando.set(true);
    this.erro.set(null);
    login.subscribe({
      next: (resposta) => {
        this.sessao.iniciar(resposta);
        this.router.navigate(['/chat']);
      },
      error: (falha) => {
        this.erro.set(mensagemDeErro(falha));
        this.enviando.set(false);
        this.entrandoComo.set(null);
      },
    });
  }
}
