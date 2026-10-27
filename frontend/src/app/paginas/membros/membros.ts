import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { data } from '../../core/formatos';
import { Membro, Papel } from '../../core/modelos';
import { Sessao } from '../../core/sessao';

@Component({
  selector: 'app-membros',
  imports: [ReactiveFormsModule],
  template: `
    <div class="pagina">
      <section class="lista" aria-labelledby="titulo-membros">
        <h1 id="titulo-membros">Membros</h1>
        <p class="resumo">Membros conversam com o Sabiá. Administradores também enviam documentos e gerenciam a equipe.</p>

        @if (erro()) {
          <p class="alerta-erro" role="alert">{{ erro() }}</p>
        }

        <div class="rolagem-tabela">
          <table class="tabela tabela-membros">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Papel</th>
                <th scope="col">Desde</th>
                <th scope="col"><span class="so-leitor-de-tela">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              @for (membro of membros(); track membro.id) {
                <tr>
                  <td class="nome">{{ membro.nome }}</td>
                  <td class="email" data-rotulo="E-mail">{{ membro.email }}</td>
                  <td data-rotulo="Papel">{{ membro.papel === 'ADMIN' ? 'Administrador' : 'Membro' }}</td>
                  <td data-rotulo="Desde">{{ desde(membro) }}</td>
                  <td class="acoes">
                    @if (membro.id !== sessao.usuario()?.id) {
                      <button type="button" class="botao-texto perigo" (click)="remover(membro)">Remover</button>
                    } @else {
                      <span class="voce">Você</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="novo" aria-labelledby="titulo-novo">
        <h2 id="titulo-novo">Adicionar pessoa</h2>
        <form [formGroup]="formulario" (ngSubmit)="adicionar()" novalidate>
          <div class="campo">
            <label for="nome">Nome</label>
            <input id="nome" formControlName="nome" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="email">E-mail</label>
            <input id="email" type="email" formControlName="email" autocomplete="off" />
          </div>
          <div class="campo">
            <label for="senha">Senha inicial</label>
            <input id="senha" type="password" formControlName="senha" autocomplete="new-password" />
            <span class="dica">Pelo menos 8 caracteres. Passe para a pessoa por um canal seguro.</span>
          </div>
          <div class="campo">
            <label for="papel">Papel</label>
            <select id="papel" formControlName="papel">
              <option value="MEMBRO">Membro</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          @if (erroFormulario()) {
            <p class="alerta-erro" role="alert">{{ erroFormulario() }}</p>
          }
          @if (adicionado()) {
            <p class="sucesso" role="status">{{ adicionado() }} foi adicionado.</p>
          }
          <button type="submit" class="botao" [disabled]="enviando()">Adicionar pessoa</button>
        </form>
      </section>
    </div>
  `,
  styles: `
    .pagina {
      max-width: 72rem;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 4vw, 2.5rem) 4rem;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 20rem;
      gap: 2.5rem;
      align-items: start;
    }
    h1 {
      font-size: var(--t-titulo);
    }
    h2 {
      font-size: var(--t-medio);
      margin-bottom: 1rem;
    }
    .resumo {
      margin: 0.35rem 0 1.5rem;
      color: var(--tinta-suave);
    }
    .rolagem-tabela {
      overflow-x: auto;
    }
    .nome {
      font-weight: 700;
    }
    .acoes {
      text-align: right;
      white-space: nowrap;
    }
    .voce {
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    @media (max-width: 640px) {
      .tabela-membros thead {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      .tabela-membros,
      .tabela-membros tbody,
      .tabela-membros td {
        display: block;
      }
      .tabela-membros tr {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.35rem 1rem;
        padding: 0.9rem 0;
        border-bottom: 1px solid var(--linha);
      }
      .tabela-membros td {
        padding: 0;
        border: 0;
      }
      .tabela-membros td[data-rotulo]::before {
        content: attr(data-rotulo);
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--tinta-suave);
      }
      .tabela-membros .nome,
      .tabela-membros .email {
        grid-column: 1 / -1;
        overflow-wrap: anywhere;
      }
      .tabela-membros .acoes {
        text-align: left;
        margin-left: -0.4rem;
      }
    }
    .novo {
      padding: 1.25rem;
      background: var(--superficie);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
    }
    form {
      display: grid;
      gap: 1rem;
    }
    .sucesso {
      margin: 0;
      color: var(--musgo);
      font-size: var(--t-pequeno);
    }
    @media (max-width: 860px) {
      .pagina {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Membros implements OnInit {
  private readonly api = inject(Api);
  protected readonly sessao = inject(Sessao);

  protected readonly membros = signal<Membro[]>([]);
  protected readonly erro = signal<string | null>(null);
  protected readonly erroFormulario = signal<string | null>(null);
  protected readonly adicionado = signal<string | null>(null);
  protected readonly enviando = signal(false);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    papel: ['MEMBRO' as Papel, Validators.required],
  });

  ngOnInit(): void {
    this.carregar();
  }

  protected desde(membro: Membro): string {
    return data(membro.criadoEm);
  }

  protected adicionar(): void {
    this.adicionado.set(null);
    if (this.formulario.invalid) {
      this.erroFormulario.set('Preencha nome, e-mail e uma senha com pelo menos 8 caracteres.');
      return;
    }
    this.enviando.set(true);
    this.erroFormulario.set(null);
    this.api.criarMembro(this.formulario.getRawValue()).subscribe({
      next: (membro) => {
        this.adicionado.set(membro.nome);
        this.formulario.reset({ nome: '', email: '', senha: '', papel: 'MEMBRO' });
        this.enviando.set(false);
        this.carregar();
      },
      error: (falha) => {
        this.erroFormulario.set(mensagemDeErro(falha));
        this.enviando.set(false);
      },
    });
  }

  protected remover(membro: Membro): void {
    if (!confirm(`Remover ${membro.nome}? A pessoa perde o acesso e as conversas dela são apagadas.`)) {
      return;
    }
    this.api.removerMembro(membro.id).subscribe({
      next: () => this.membros.update((lista) => lista.filter((m) => m.id !== membro.id)),
      error: (falha) => this.erro.set(mensagemDeErro(falha)),
    });
  }

  private carregar(): void {
    this.api.membros().subscribe({
      next: (lista) => this.membros.set(lista),
      error: (falha) => this.erro.set(mensagemDeErro(falha, 'Não foi possível carregar os membros.')),
    });
  }
}
