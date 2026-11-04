import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Sessao } from '../../core/sessao';

/** Dados de quem está logado e troca de senha. */
@Component({
  selector: 'app-conta',
  imports: [ReactiveFormsModule],
  template: `
    <div class="pagina">
      <div class="estreita">
        <header class="cabecalho-pagina">
          <h1>Minha conta</h1>
        </header>

        @if (sessao.usuario(); as usuario) {
          <section class="cartao" aria-labelledby="titulo-dados">
            <h2 id="titulo-dados">Dados</h2>
            <dl>
              <div>
                <dt>Nome</dt>
                <dd>{{ usuario.nome }}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{{ usuario.email }}</dd>
              </div>
              <div>
                <dt>Empresa</dt>
                <dd>{{ usuario.empresaNome }}</dd>
              </div>
              <div>
                <dt>Papel</dt>
                <dd>{{ usuario.papel === 'ADMIN' ? 'Administrador' : 'Membro' }}</dd>
              </div>
            </dl>
            @if (usuario.visitante) {
              <p class="dica">
                Conta temporária da demonstração. Ela não tem senha e é apagada, com as conversas,
                em até um dia.
              </p>
            } @else if (usuario.papel !== 'ADMIN') {
              <p class="dica">
                Para mudar nome, e-mail ou papel, fale com um administrador da empresa.
              </p>
            }
          </section>
        }

        @if (!sessao.usuario()?.visitante) {
          <section class="cartao" aria-labelledby="titulo-senha">
            <h2 id="titulo-senha">Trocar senha</h2>
            <form [formGroup]="formulario" (ngSubmit)="trocar()" novalidate>
              <div class="campo">
                <label for="senha-atual">Senha atual</label>
                <input
                  id="senha-atual"
                  type="password"
                  formControlName="senhaAtual"
                  autocomplete="current-password"
                />
              </div>
              <div class="campo">
                <label for="nova-senha">Nova senha</label>
                <input
                  id="nova-senha"
                  type="password"
                  formControlName="novaSenha"
                  autocomplete="new-password"
                  aria-describedby="dica-nova-senha"
                />
                <span class="dica" id="dica-nova-senha">Pelo menos 8 caracteres.</span>
              </div>
              <div class="campo">
                <label for="confirmacao">Repita a nova senha</label>
                <input
                  id="confirmacao"
                  type="password"
                  formControlName="confirmacao"
                  autocomplete="new-password"
                />
              </div>

              @if (erro()) {
                <p class="alerta-erro" role="alert">{{ erro() }}</p>
              }
              @if (sucesso()) {
                <p class="sucesso" role="status">
                  Senha alterada. Use a nova senha na próxima vez que entrar.
                </p>
              }
              <button type="submit" class="botao" [disabled]="enviando()">
                {{ enviando() ? 'Salvando...' : 'Trocar senha' }}
              </button>
            </form>
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .estreita {
      max-width: 40rem;
      display: grid;
      gap: 1rem;
    }
    .cabecalho-pagina {
      margin-bottom: 0.5rem;
    }
    h2 {
      font-size: var(--t-base);
      margin-bottom: 1rem;
    }
    .cartao {
      padding: 1.1rem 1.15rem 1.2rem;
      background: var(--superficie);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem 1.5rem;
      margin: 0;
    }
    dt {
      font-size: var(--t-mini);
      color: var(--tinta-fraca);
    }
    dd {
      margin: 0.1rem 0 0;
      overflow-wrap: anywhere;
    }
    .dica {
      margin-top: 1rem;
      padding-top: 0.875rem;
      border-top: 1px solid var(--linha);
      color: var(--tinta-fraca);
      font-size: var(--t-pequeno);
    }
    .campo .dica {
      margin: 0;
      padding: 0;
      border: 0;
    }
    form {
      display: grid;
      gap: 0.875rem;
      max-width: 24rem;
    }
    form .botao {
      justify-self: start;
    }
    .sucesso {
      color: var(--sucesso);
      font-size: var(--t-pequeno);
    }
    @media (max-width: 520px) {
      dl {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class Conta {
  private readonly api = inject(Api);
  protected readonly sessao = inject(Sessao);

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal(false);

  protected readonly formulario = inject(FormBuilder).nonNullable.group(
    {
      senhaAtual: ['', Validators.required],
      novaSenha: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmacao: ['', Validators.required],
    },
    { validators: senhasIguais },
  );

  protected trocar(): void {
    this.sucesso.set(false);
    const { senhaAtual, novaSenha, confirmacao } = this.formulario.getRawValue();
    if (!senhaAtual || !novaSenha) {
      this.erro.set('Preencha a senha atual e a nova senha.');
      return;
    }
    if (novaSenha.length < 8) {
      this.erro.set('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmacao) {
      this.erro.set('A confirmação não bate com a nova senha.');
      return;
    }
    this.erro.set(null);
    this.enviando.set(true);
    this.api.trocarSenha(senhaAtual, novaSenha).subscribe({
      next: () => {
        this.enviando.set(false);
        this.sucesso.set(true);
        this.formulario.reset();
      },
      error: (falha) => {
        this.enviando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível trocar a senha.'));
      },
    });
  }
}

function senhasIguais(grupo: AbstractControl): ValidationErrors | null {
  const nova = grupo.get('novaSenha')?.value;
  const confirmacao = grupo.get('confirmacao')?.value;
  return nova && confirmacao && nova !== confirmacao ? { senhasDiferentes: true } : null;
}
