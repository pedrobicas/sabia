import { Component } from '@angular/core';

/**
 * Mostra, antes do login, o que o produto faz: uma pergunta, a resposta com o marcador de citação
 * e o trecho de origem marcado em amarelo.
 */
@Component({
  selector: 'app-exemplo-resposta',
  template: `
    <figure>
      <p class="pergunta">Posso trocar um produto sem a nota fiscal?</p>
      <p class="resposta">
        Pode. A troca vale por 7 dias corridos e, sem a nota, basta informar o CPF usado na compra.<sup class="marcador">1</sup>
      </p>
      <figcaption class="fonte">
        <span class="numero">1</span>
        <span>
          <strong>politica-de-trocas.md</strong>
          <span class="trecho">"…aceitamos trocas em até <mark>7 dias corridos</mark>. Sem a nota fiscal,
            <mark>localizamos a compra pelo CPF</mark> informado no caixa."</span>
        </span>
      </figcaption>
    </figure>
  `,
  styles: `
    figure {
      margin: 0;
      padding: 1.5rem 1.5rem 1.25rem;
      background: var(--superficie);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      max-width: 34rem;
    }
    .pergunta {
      margin: 0 0 0.75rem;
      font-weight: 700;
    }
    .resposta {
      margin: 0 0 1.25rem;
      font-family: var(--fonte-leitura);
      font-size: var(--t-medio);
      line-height: 1.6;
    }
    .marcador {
      display: inline-block;
      margin-left: 0.15rem;
      padding: 0 0.35rem;
      border-radius: 3px;
      background: var(--marca-texto);
      font-family: var(--fonte-interface);
      font-size: 0.7rem;
      font-weight: 700;
      line-height: 1.4;
      vertical-align: super;
    }
    .fonte {
      display: flex;
      gap: 0.75rem;
      padding-top: 1rem;
      border-top: 1px solid var(--linha);
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    .fonte strong {
      display: block;
      color: var(--tinta);
    }
    .numero {
      flex: none;
      width: 1.4rem;
      height: 1.4rem;
      display: grid;
      place-items: center;
      border-radius: 3px;
      background: var(--marca-texto);
      color: var(--tinta);
      font-weight: 700;
    }
    .trecho {
      font-family: var(--fonte-leitura);
    }
    mark {
      background: var(--marca-texto-suave);
      color: inherit;
      padding: 0 0.1rem;
    }
  `,
})
export class ExemploResposta {}
