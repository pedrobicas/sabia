import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { Sessao } from '../../core/sessao';

/** Dados de quem está logado e troca de senha. */
@Component({
  selector: 'app-conta',
  imports: [ReactiveFormsModule],
  template: `
    <div class="pagina">
      <h1>Minha conta</h1>

      @if (sessao.usuario(); as usuario) {
        <section class="cartao" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados">Seus dados</h2>
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
              Esta é uma conta temporária da demonstração. Ela não tem senha e é apagada, com as suas conversas,
              em até um dia.
            </p>
          } @else if (usuario.papel !== 'ADMIN') {
            <p class="dica">Para mudar nome, e-mail ou papel, fale com um administrador da sua empresa.</p>
          }
        </section>
      }

      @if (!sessao.usuario()?.visitante) {
        <section class="cartao" aria-labelledby="titulo-senha">
          <h2 id="titulo-senha">Trocar senha</h2>
          <form [formGroup]="formulario" (ngSubmit)="trocar()" novalidate>
            <div class="campo">
              <label for="senha-atual">Senha atual</label>
              <input id="senha-atual" type="password" formControlName="senhaAtual" autocomplete="current-password" />
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
              <input id="confirmacao" type="password" formControlName="confirmacao" autocomplete="new-password" />
            </div>

            @if (erro()) {
              <p class="alerta-erro" role="alert">{{ erro() }}</p>
            }
            @if (sucesso()) {
              <p class="sucesso" role="status">Senha alterada. Use a nova senha na próxima vez que entrar.</p>
            }
            <button type="submit" class="botao" [disabled]="enviando()">{{ enviando() ? 'Salvando...' : 'Trocar senha' }}</button>
          </form>
        </section>
      }
    </div>
  `,
  styles: `
    .pagina {
      max-width: 40rem;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 4vw, 2.5rem) 4rem;
      display: grid;
      gap: 1.25rem;
    }
    h1 {
      font-size: var(--t-titulo);
    }
    h2 {
      font-size: var(--t-medio);
      margin-bottom: 1rem;
    }
    .cartao {
      padding: 1.25rem;
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
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
    }
    dd {
      margin: 0.1rem 0 0;
      overflow-wrap: anywhere;
    }
    .dica {
      margin: 1rem 0 0;
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    .campo .dica {
      margin: 0;
    }
    form {
      display: grid;
      gap: 1rem;
    }
    form .botao {
      justify-self: start;
    }
    .alerta-erro,
    .sucesso {
      margin: 0;
    }
    .sucesso {
      color: var(--musgo);
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
