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
    <div class="pagina">
      <a routerLink="/entrar" class="marca" aria-label="Voltar para a entrada"><app-marca /></a>

      <section aria-labelledby="titulo">
        <h1 id="titulo">Cadastre sua empresa</h1>
        <p class="resumo">Você será o administrador: envia os documentos e convida as pessoas da equipe.</p>

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
            <input id="senha" type="password" formControlName="senha" autocomplete="new-password" />
            <span class="dica">Pelo menos 8 caracteres.</span>
          </div>

          @if (erro()) {
            <p class="alerta-erro" role="alert">{{ erro() }}</p>
          }

          <button type="submit" class="botao" [disabled]="enviando()">
            {{ enviando() ? 'Criando conta...' : 'Criar conta' }}
          </button>
        </form>

        <p class="voltar">Já tem conta? <a routerLink="/entrar">Entrar</a></p>
      </section>
    </div>
  `,
  styles: `
    .pagina {
      min-height: 100dvh;
      display: grid;
      align-content: start;
      justify-items: center;
      gap: 3rem;
      padding: 2rem 1.25rem 4rem;
    }
    .marca {
      justify-self: start;
      color: inherit;
      text-decoration: none;
    }
    section {
      width: 100%;
      max-width: 26rem;
    }
    h1 {
      font-size: var(--t-titulo);
    }
    .resumo {
      color: var(--tinta-suave);
      margin: 0.5rem 0 2rem;
    }
    form {
      display: grid;
      gap: 1rem;
    }
    .voltar {
      margin-top: 1.5rem;
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
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
