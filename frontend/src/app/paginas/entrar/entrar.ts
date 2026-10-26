import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { ContaDemo } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { Marca } from '../shell/marca';
import { ExemploResposta } from './exemplo-resposta';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, Marca, ExemploResposta],
  template: `
    <div class="pagina">
      <section class="apresentacao">
        <app-marca [tamanho]="34" />
        <h1>Respostas que mostram de onde vieram.</h1>
        <p class="resumo">
          Envie os documentos da sua empresa e pergunte o que precisar. Cada resposta traz o documento
          e o trecho usados, para qualquer pessoa conferir.
        </p>
        <app-exemplo-resposta />
      </section>

      <section class="acesso" aria-labelledby="titulo-entrar">
        <app-marca class="marca-movel" />
        <h2 id="titulo-entrar">Entrar</h2>

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
            {{ enviando() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        @if (contasDemo().length > 0) {
          <div class="demo">
            <h3>Experimente com uma empresa de exemplo</h3>
            <p>As duas empresas fictícias têm documentos prontos. Uma não enxerga os documentos da outra.</p>
            <ul>
              @for (conta of contasDemo(); track conta.email) {
                <li>
                  <button type="button" class="botao-secundario" [disabled]="enviando()" (click)="entrarComo(conta)">
                    Entrar como {{ conta.empresa }}
                  </button>
                </li>
              }
            </ul>
          </div>
        }

        @if (cadastroAberto()) {
          <p class="cadastro">
            Ainda não tem conta? <a routerLink="/cadastro">Cadastre sua empresa</a>
          </p>
        }
      </section>
    </div>
  `,
  styles: `
    .pagina {
      min-height: 100dvh;
      display: grid;
      grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
    }
    .apresentacao {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      justify-content: center;
      padding: 3rem clamp(1.5rem, 6vw, 5rem);
    }
    h1 {
      font-size: clamp(var(--t-titulo), 4vw, var(--t-destaque));
      font-weight: 600;
      max-width: 16ch;
      letter-spacing: -0.015em;
    }
    .resumo {
      margin: 0;
      max-width: 34rem;
      color: var(--tinta-suave);
      font-size: var(--t-medio);
    }
    .acesso {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 1.5rem;
      padding: 3rem clamp(1.5rem, 5vw, 4rem);
      background: var(--superficie);
      border-left: 1px solid var(--linha);
    }
    .acesso > * {
      width: 100%;
      max-width: 24rem;
    }
    h2 {
      font-size: var(--t-grande);
    }
    form {
      display: grid;
      gap: 1rem;
    }
    .demo {
      padding-top: 1.5rem;
      border-top: 1px solid var(--linha);
    }
    .demo h3 {
      font-family: var(--fonte-interface);
      font-size: var(--t-base);
      font-weight: 700;
    }
    .demo p {
      margin: 0.35rem 0 0.9rem;
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    .demo ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    .demo .botao-secundario {
      width: 100%;
    }
    .marca-movel {
      display: none;
    }
    .cadastro {
      margin: 0;
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    @media (max-width: 900px) {
      .pagina {
        grid-template-columns: 1fr;
      }
      .acesso {
        border-left: 0;
        border-top: 1px solid var(--linha);
        order: -1;
      }
      .apresentacao {
        padding-top: 2rem;
      }
      .apresentacao > app-marca {
        display: none;
      }
      .marca-movel {
        display: inline-flex;
      }
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

  entrar(): void {
    if (this.formulario.invalid) {
      this.erro.set('Preencha o e-mail e a senha.');
      return;
    }
    const { email, senha } = this.formulario.getRawValue();
    this.enviarLogin(email, senha);
  }

  entrarComo(conta: ContaDemo): void {
    this.formulario.setValue({ email: conta.email, senha: conta.senha });
    this.enviarLogin(conta.email, conta.senha);
  }

  private enviarLogin(email: string, senha: string): void {
    this.enviando.set(true);
    this.erro.set(null);
    this.api.entrar(email, senha).subscribe({
      next: (resposta) => {
        this.sessao.iniciar(resposta);
        this.router.navigate(['/chat']);
      },
      error: (falha) => {
        this.erro.set(mensagemDeErro(falha));
        this.enviando.set(false);
      },
    });
  }
}
