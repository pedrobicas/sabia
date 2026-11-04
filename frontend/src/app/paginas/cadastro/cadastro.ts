import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Sessao } from '../../core/sessao';
import { Marca } from '../shell/marca';

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink, Marca],
  template: `
    <div class="tela">
      <header>
        <a routerLink="/entrar" class="marca" aria-label="Voltar para a entrada"><app-marca /></a>
      </header>

      <main aria-labelledby="titulo">
        <h1 id="titulo">Cadastrar empresa</h1>
        <p class="resumo">Você fica como administrador: envia os documentos e adiciona as pessoas da equipe.</p>

        <form [formGroup]="formulario" (ngSubmit)="cadastrar()" novalidate>
          <div class="campo">
            <label for="nomeEmpresa">Nome da empresa</label>
            <input id="nomeEmpresa" formControlName="nomeEmpresa" autocomplete="organization" />
          </div>
          <div class="campo">
            <label for="nome">Seu nome</label>
            <input id="nome" formControlName="nome" autocomplete="name" />
          </div>
          <div class="campo">
            <label for="email">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="email" />
          </div>
          <div class="campo">
            <label for="senha">Senha</label>
            <input id="senha" type="password" formControlName="senha" autocomplete="new-password" aria-describedby="dica-senha" />
            <span class="dica" id="dica-senha">Pelo menos 8 caracteres.</span>
          </div>

          @if (erro()) {
            <p class="alerta-erro" role="alert">{{ erro() }}</p>
          }

          <button type="submit" class="botao" [disabled]="enviando()">
            {{ enviando() ? 'Criando conta...' : 'Criar conta' }}
          </button>
        </form>

        <p class="voltar">Já tem conta? <a routerLink="/entrar">Entrar</a></p>
      </main>
    </div>
  `,
  styles: `
    .tela {
      min-height: 100dvh;
      display: grid;
      grid-template-rows: auto 1fr;
      padding: 1.25rem 1.5rem;
    }
    .marca:hover {
      text-decoration: none;
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
      margin: 0.4rem 0 1.5rem;
      color: var(--tinta-fraca);
    }
    form {
      display: grid;
      gap: 0.875rem;
    }
    form .botao {
      margin-top: 0.25rem;
    }
    .voltar {
      margin-top: 1.25rem;
      font-size: var(--t-pequeno);
      color: var(--tinta-fraca);
    }
  `,
})
export class Cadastro {
  private readonly api = inject(Api);
  private readonly sessao = inject(Sessao);
  private readonly router = inject(Router);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nomeEmpresa: ['', [Validators.required, Validators.maxLength(120)]],
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
  });
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  cadastrar(): void {
    if (this.formulario.invalid) {
      this.erro.set('Preencha todos os campos. A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    this.enviando.set(true);
    this.erro.set(null);
    this.api.cadastrar(this.formulario.getRawValue()).subscribe({
      next: (resposta) => {
        this.sessao.iniciar(resposta);
        this.router.navigate(['/documentos']);
      },
      error: (falha) => {
        this.erro.set(mensagemDeErro(falha));
        this.enviando.set(false);
      },
    });
  }
}
