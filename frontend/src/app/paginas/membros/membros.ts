import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { data } from '../../core/formatos';
import { Membro, Papel } from '../../core/modelos';
import { Sessao } from '../../core/sessao';
import { Icone } from '../shell/icone';

@Component({
  selector: 'app-membros',
  imports: [ReactiveFormsModule, Icone],
  template: `
    <div class="pagina">
      <header class="cabecalho-pagina">
        <div>
          <h1 id="titulo-membros">Membros</h1>
          <p class="subtitulo">
            {{ membros().length }} {{ membros().length === 1 ? 'pessoa' : 'pessoas' }} em
            {{ sessao.usuario()?.empresaNome }}
          </p>
        </div>
      </header>

      <div class="grade">
        <section class="lista" aria-labelledby="titulo-membros">
          @if (erro()) {
            <p class="alerta-erro" role="alert">{{ erro() }}</p>
          }

          <div class="quadro-tabela">
            <table class="tabela tabela-membros">
              <thead>
                <tr>
                  <th scope="col">Pessoa</th>
                  <th scope="col">Papel</th>
                  <th scope="col">Desde</th>
                  <th scope="col"><span class="so-leitor-de-tela">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                @for (membro of membros(); track membro.id) {
                  <tr>
                    <td class="pessoa">
                      <div class="celula-pessoa">
                        <span class="avatar" aria-hidden="true">{{ iniciais(membro.nome) }}</span>
                        <div>
                          <span class="nome">
                            {{ membro.nome }}
                            @if (membro.id === sessao.usuario()?.id) {
                              <span class="voce">(você)</span>
                            }
                          </span>
                          <span class="email">{{ membro.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td data-rotulo="Papel">
                      <span class="etiqueta" [class.admin]="membro.papel === 'ADMIN'">{{
                        membro.papel === 'ADMIN' ? 'Administrador' : 'Membro'
                      }}</span>
                    </td>
                    <td class="suave numero-tabular" data-rotulo="Desde">{{ desde(membro) }}</td>
                    <td class="acoes">
                      @if (membro.id !== sessao.usuario()?.id) {
                        <button
                          type="button"
                          class="botao-icone perigo"
                          [attr.aria-label]="'Remover ' + membro.nome"
                          title="Remover"
                          (click)="remover(membro)"
                        >
                          <app-icone nome="lixeira" />
                        </button>
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
              <input
                id="senha"
                type="password"
                formControlName="senha"
                autocomplete="new-password"
                aria-describedby="dica-senha"
              />
              <span class="dica" id="dica-senha"
                >Pelo menos 8 caracteres. Passe para a pessoa por um canal seguro.</span
              >
            </div>
            <div class="campo">
              <label for="papel">Papel</label>
              <select id="papel" formControlName="papel" aria-describedby="dica-papel">
                <option value="MEMBRO">Membro</option>
                <option value="ADMIN">Administrador</option>
              </select>
              <span class="dica" id="dica-papel"
                >Administradores também enviam documentos e gerenciam a equipe.</span
              >
            </div>
            @if (erroFormulario()) {
              <p class="alerta-erro" role="alert">{{ erroFormulario() }}</p>
            }
            @if (adicionado()) {
              <p class="sucesso" role="status">{{ adicionado() }} foi adicionado.</p>
            }
            <button type="submit" class="botao" [disabled]="enviando()">Adicionar</button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: `
    .grade {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 19rem;
      gap: 1.5rem;
      align-items: start;
    }
    .alerta-erro {
      margin-bottom: 1rem;
    }
    .pessoa {
      min-width: 14rem;
    }
    .celula-pessoa {
      display: flex;
      align-items: center;
      gap: 0.7rem;
    }
    .celula-pessoa div {
      display: grid;
      min-width: 0;
      line-height: 1.35;
    }
    .nome {
      font-weight: 500;
    }
    .voce {
      color: var(--tinta-fraca);
      font-weight: 400;
    }
    .email {
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
      overflow-wrap: anywhere;
    }
    .etiqueta.admin {
      border-color: color-mix(in srgb, var(--acento) 25%, transparent);
      background: var(--acento-suave);
      color: var(--acento);
    }
    .suave {
      color: var(--tinta-suave);
      white-space: nowrap;
    }
    .acoes {
      width: 1%;
      text-align: right;
      padding-top: 0.4rem;
      padding-bottom: 0.4rem;
    }
    .novo {
      padding: 1.1rem 1.15rem 1.2rem;
      background: var(--superficie);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
    }
    h2 {
      font-size: var(--t-base);
      margin-bottom: 1rem;
    }
    form {
      display: grid;
      gap: 0.875rem;
    }
    form .botao {
      justify-self: start;
    }
    .sucesso {
      color: var(--sucesso);
      font-size: var(--t-pequeno);
    }
    @media (max-width: 900px) {
      .grade {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 600px) {
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
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.5rem 1rem;
        padding: 0.8rem 0.875rem;
        border-bottom: 1px solid var(--linha);
      }
      .tabela-membros tbody tr:last-child {
        border-bottom: 0;
      }
      .tabela-membros td {
        padding: 0;
        border: 0;
      }
      .tabela-membros tbody tr:hover td {
        background: none;
      }
      .tabela-membros .pessoa {
        grid-column: 1;
        min-width: 0;
      }
      .tabela-membros .acoes {
        grid-column: 2;
        grid-row: 1;
        width: auto;
        padding: 0;
      }
      .tabela-membros td[data-rotulo] {
        grid-column: 1 / -1;
        display: flex;
        justify-content: space-between;
        font-size: var(--t-pequeno);
      }
      .tabela-membros td[data-rotulo]::before {
        content: attr(data-rotulo);
        color: var(--tinta-fraca);
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

  protected iniciais(nome: string): string {
    const palavras = nome.trim().split(/\s+/);
    return (
      (palavras[0]?.[0] ?? '') + (palavras.length > 1 ? palavras[palavras.length - 1][0] : '')
    ).toUpperCase();
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
    if (
      !confirm(`Remover ${membro.nome}? A pessoa perde o acesso e as conversas dela são apagadas.`)
    ) {
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
      error: (falha) =>
        this.erro.set(mensagemDeErro(falha, 'Não foi possível carregar os membros.')),
    });
  }
}
