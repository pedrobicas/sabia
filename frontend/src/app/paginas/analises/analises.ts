import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Api } from '../../core/api';
import { mensagemDeErro } from '../../core/autenticacao';
import { dataHora } from '../../core/formatos';
import { PainelDeAnalises, PerguntasDoDia } from '../../core/modelos';

interface Coluna extends PerguntasDoDia {
  respondidas: number;
  alturaRespondidas: number;
  alturaSemResposta: number;
  rotuloEixo: string | null;
  rotuloLongo: string;
}

const NUMERO = new Intl.NumberFormat('pt-BR');
const DIA_CURTO = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
const DIA_LONGO = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' });

/** Painel do administrador: uso, lacunas na documentação e avaliação das respostas. */
@Component({
  selector: 'app-analises',
  imports: [RouterLink],
  template: `
    <div class="pagina">
      <header class="topo">
        <div>
          <h1>Análises</h1>
          <p class="resumo">Como a equipe usa o Sabiá e o que ainda falta nos documentos.</p>
        </div>
        <div class="periodo" role="group" aria-label="Período">
          @for (opcao of periodos; track opcao) {
            <button
              type="button"
              [class.ativo]="dias() === opcao"
              [attr.aria-pressed]="dias() === opcao"
              (click)="dias.set(opcao)"
            >{{ opcao }} dias</button>
          }
        </div>
      </header>

      @if (erro()) {
        <p class="alerta-erro" role="alert">{{ erro() }}</p>
      }

      @if (painel(); as p) {
        <div class="corpo" [class.atualizando]="carregando()" [attr.aria-busy]="carregando()">
          <section class="indicadores" aria-label="Resumo do período">
            <div class="indicador">
              <span class="rotulo">Perguntas feitas</span>
              <span class="valor">{{ numero(p.totalPerguntas) }}</span>
              <span class="contexto">nos últimos {{ p.periodoDias }} dias</span>
            </div>
            <div class="indicador">
              <span class="rotulo">Respondidas pelos documentos</span>
              <span class="valor">{{ taxaRespondidas() }}</span>
              <span class="contexto">{{ numero(p.totalPerguntas - p.semResposta) }} de {{ numero(p.totalPerguntas) }}</span>
            </div>
            <div class="indicador">
              <span class="rotulo">Sem resposta</span>
              <span class="valor">{{ numero(p.semResposta) }}</span>
              <span class="contexto">{{ p.semResposta === 1 ? 'pergunta que os documentos não cobrem' : 'perguntas que os documentos não cobrem' }}</span>
            </div>
            <div class="indicador">
              <span class="rotulo">Avaliadas como úteis</span>
              <span class="valor">{{ taxaUteis() }}</span>
              <span class="contexto">
                @if (totalAvaliacoes() === 0) {
                  nenhuma avaliação ainda
                } @else {
                  {{ numero(p.avaliacoesPositivas) }} de {{ numero(totalAvaliacoes()) }} {{ totalAvaliacoes() === 1 ? 'avaliação' : 'avaliações' }}
                }
              </span>
            </div>
          </section>

          <section class="cartao" aria-labelledby="titulo-por-dia">
            <div class="cabecalho-cartao">
              <h2 id="titulo-por-dia">Perguntas por dia</h2>
              <div class="legenda">
                <span><i class="amostra s1"></i>Respondidas</span>
                <span><i class="amostra s2"></i>Sem resposta</span>
              </div>
              <button type="button" class="botao-texto" [attr.aria-pressed]="verTabela()" (click)="verTabela.set(!verTabela())">
                {{ verTabela() ? 'Ver gráfico' : 'Ver como tabela' }}
              </button>
            </div>

            @if (verTabela()) {
              <div class="rolagem-tabela">
                <table class="tabela numeros">
                  <thead>
                    <tr>
                      <th scope="col">Dia</th>
                      <th scope="col">Perguntas</th>
                      <th scope="col">Respondidas</th>
                      <th scope="col">Sem resposta</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (coluna of colunas(); track coluna.dia) {
                      <tr>
                        <td>{{ coluna.rotuloLongo }}</td>
                        <td>{{ numero(coluna.total) }}</td>
                        <td>{{ numero(coluna.respondidas) }}</td>
                        <td>{{ numero(coluna.semResposta) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            } @else {
              <div
                class="grafico"
                tabindex="0"
                role="group"
                [attr.aria-label]="'Gráfico de perguntas por dia. ' + resumoDoGrafico() + ' Use as setas para percorrer os dias.'"
                (keydown)="navegar($event)"
                (focus)="focarUltimoDia()"
                (blur)="diaEmFoco.set(null)"
                (mouseleave)="diaEmFoco.set(null)"
              >
                <div class="eixo-y" aria-hidden="true">
                  <span>{{ numero(escala()) }}</span>
                  <span>{{ numero(escala() / 2) }}</span>
                  <span>0</span>
                </div>
                <div class="plot">
                  <div class="grade" aria-hidden="true"><i></i><i></i><i></i></div>
                  <div class="colunas">
                    @for (coluna of colunas(); track coluna.dia; let i = $index) {
                      <div class="coluna" [class.em-foco]="diaEmFoco() === i" (mouseenter)="diaEmFoco.set(i)">
                        <div class="pilha">
                          @if (coluna.respondidas > 0) {
                            <div class="segmento s1" [style.height.%]="coluna.alturaRespondidas"></div>
                          }
                          @if (coluna.semResposta > 0) {
                            <div class="segmento s2" [style.height.%]="coluna.alturaSemResposta"></div>
                          }
                        </div>
                        @if (coluna.rotuloEixo) {
                          <span class="rotulo-x" aria-hidden="true">{{ coluna.rotuloEixo }}</span>
                        }
                      </div>
                    }
                  </div>
                  @if (p.totalPerguntas === 0) {
                    <p class="sem-dados">Nenhuma pergunta neste período.</p>
                  }
                  @if (colunaEmFoco(); as c) {
                    <div
                      class="dica-grafico"
                      [class.meio]="ancoraDaDica() === 'meio'"
                      [class.fim]="ancoraDaDica() === 'fim'"
                      [style.left.%]="posicaoDaDica()"
                    >
                      <strong>{{ c.rotuloLongo }}</strong>
                      <span><i class="amostra s1"></i>Respondidas <b>{{ numero(c.respondidas) }}</b></span>
                      <span><i class="amostra s2"></i>Sem resposta <b>{{ numero(c.semResposta) }}</b></span>
                    </div>
                  }
                </div>
                <span class="so-leitor-de-tela" aria-live="polite">
                  @if (colunaEmFoco(); as c) {
                    {{ c.rotuloLongo }}: {{ c.respondidas }} respondidas, {{ c.semResposta }} sem resposta.
                  }
                </span>
              </div>
            }
          </section>

          <div class="duas-colunas">
            <section class="cartao" aria-labelledby="titulo-lacunas">
              <div class="cabecalho-cartao">
                <h2 id="titulo-lacunas">Lacunas na documentação</h2>
              </div>
              <p class="explicacao">Perguntas que o Sabiá não conseguiu responder com os documentos atuais. As mais repetidas vêm primeiro.</p>
              @if (p.perguntasSemResposta.length === 0) {
                <p class="vazio">Nenhuma pergunta ficou sem resposta neste período.</p>
              } @else {
                <ol class="lista-lacunas">
                  @for (lacuna of p.perguntasSemResposta; track lacuna.pergunta) {
                    <li>
                      <span class="texto-pergunta">{{ lacuna.pergunta }}</span>
                      <span class="meta">
                        {{ lacuna.vezes === 1 ? '1 vez' : numero(lacuna.vezes) + ' vezes' }} · última em {{ dataHora(lacuna.ultimaVez) }}
                      </span>
                    </li>
                  }
                </ol>
                <a routerLink="/documentos" class="botao-secundario chamada">Enviar um documento que responda</a>
              }
            </section>

            <section class="cartao" aria-labelledby="titulo-mal-avaliadas">
              <div class="cabecalho-cartao">
                <h2 id="titulo-mal-avaliadas">Respostas que não ajudaram</h2>
              </div>
              <p class="explicacao">Respostas marcadas como "não ajudou", com o comentário de quem perguntou.</p>
              @if (p.respostasMalAvaliadas.length === 0) {
                <p class="vazio">Nenhuma resposta foi mal avaliada neste período.</p>
              } @else {
                <ul class="lista-avaliacoes">
                  @for (item of p.respostasMalAvaliadas; track $index) {
                    <li>
                      <span class="texto-pergunta">{{ item.pergunta ?? 'Pergunta não registrada' }}</span>
                      @if (item.comentario) {
                        <q class="comentario">{{ item.comentario }}</q>
                      }
                      <p class="trecho-resposta">{{ resumir(item.resposta) }}</p>
                      <span class="meta">{{ dataHora(item.quando) }}</span>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>

          <section class="cartao" aria-labelledby="titulo-documentos">
            <div class="cabecalho-cartao">
              <h2 id="titulo-documentos">Documentos mais citados</h2>
            </div>
            <p class="explicacao">Em quantas respostas cada documento foi usado como fonte.</p>
            @if (p.documentosMaisCitados.length === 0) {
              <p class="vazio">Nenhuma resposta citou documentos neste período.</p>
            } @else {
              <ul class="barras-documentos">
                @for (documento of p.documentosMaisCitados; track documento.documento) {
                  <li>
                    <span class="nome-documento">{{ documento.documento }}</span>
                    <span class="trilho" aria-hidden="true">
                      <span class="barra" [style.width.%]="(documento.respostas / maximoCitacoes()) * 100"></span>
                    </span>
                    <span class="quantidade">{{ numero(documento.respostas) }} {{ documento.respostas === 1 ? 'resposta' : 'respostas' }}</span>
                  </li>
                }
              </ul>
            }
          </section>
        </div>
      } @else if (carregando()) {
        <p class="carregando">Carregando as análises...</p>
      }
    </div>
  `,
  styles: `
    .pagina {
      max-width: 72rem;
      margin: 0 auto;
      padding: 2rem clamp(1rem, 4vw, 2.5rem) 4rem;
    }
    .topo {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: var(--t-titulo);
    }
    .resumo {
      margin: 0.35rem 0 0;
      color: var(--tinta-suave);
    }
    .periodo {
      display: inline-flex;
      padding: 0.2rem;
      border: 1px solid var(--linha);
      border-radius: calc(var(--raio) + 2px);
      background: var(--superficie);
    }
    .periodo button {
      border: 0;
      background: none;
      padding: 0.35rem 0.8rem;
      border-radius: var(--raio);
      font: inherit;
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
      cursor: pointer;
    }
    .periodo button:hover {
      color: var(--tinta);
    }
    .periodo button.ativo {
      background: var(--musgo-claro);
      color: var(--musgo);
    }
    .corpo {
      display: grid;
      gap: 1.25rem;
      transition: opacity 150ms ease;
    }
    .corpo.atualizando {
      opacity: 0.55;
    }
    .carregando {
      color: var(--tinta-suave);
    }

    /* Indicadores */
    .indicadores {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: var(--linha);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      overflow: hidden;
    }
    .indicador {
      display: grid;
      gap: 0.15rem;
      align-content: start;
      padding: 1rem 1.15rem;
      background: var(--superficie);
    }
    .indicador .rotulo {
      font-size: var(--t-pequeno);
      font-weight: 700;
      color: var(--tinta-suave);
    }
    .indicador .valor {
      font-family: var(--fonte-interface);
      font-size: var(--t-destaque);
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .indicador .contexto {
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }

    /* Cartões */
    .cartao {
      padding: 1.15rem 1.25rem 1.25rem;
      background: var(--superficie);
      border: 1px solid var(--linha);
      border-radius: var(--raio);
      min-width: 0;
    }
    .cabecalho-cartao {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem 1.25rem;
      margin-bottom: 0.75rem;
    }
    .cabecalho-cartao h2 {
      font-size: var(--t-medio);
      margin-right: auto;
    }
    .cabecalho-cartao .botao-texto {
      margin-left: -0.4rem;
    }
    .explicacao {
      margin: -0.35rem 0 1rem;
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    .vazio {
      margin: 0;
      padding: 1rem;
      border: 1px dashed var(--linha-forte);
      border-radius: var(--raio);
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
      text-align: center;
    }
    .legenda {
      display: flex;
      gap: 1rem;
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    .legenda span,
    .dica-grafico span {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .amostra {
      display: inline-block;
      width: 0.7rem;
      height: 0.7rem;
      border-radius: 2px;
    }
    .s1 {
      background: var(--serie-1);
    }
    .s2 {
      background: var(--serie-2);
    }

    /* Gráfico por dia */
    .grafico {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.6rem;
      padding: 0.25rem 0.25rem 1.75rem;
      border-radius: var(--raio);
    }
    .eixo-y {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 12rem;
      margin-top: -0.5em;
      margin-bottom: -0.5em;
      font-size: 0.75rem;
      color: var(--tinta-suave);
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    .plot {
      position: relative;
      height: 12rem;
    }
    .grade {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    }
    .grade i {
      display: block;
      height: 1px;
      background: var(--linha);
    }
    .grade i:last-child {
      background: var(--linha-forte);
    }
    .colunas {
      position: absolute;
      inset: 0;
      display: flex;
    }
    .coluna {
      position: relative;
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      justify-content: center;
      padding: 0 1px;
    }
    .coluna.em-foco::before {
      content: '';
      position: absolute;
      inset: 0 0 0 0;
      background: var(--musgo-claro);
      opacity: 0.6;
    }
    .pilha {
      position: relative;
      width: min(72%, 2.25rem);
      min-width: 2px;
      height: 100%;
      display: flex;
      flex-direction: column-reverse;
      gap: 2px;
    }
    .segmento {
      flex: none;
      min-height: 2px;
    }
    .segmento:last-child {
      border-radius: 3px 3px 0 0;
    }
    .rotulo-x {
      position: absolute;
      top: calc(100% + 0.4rem);
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.75rem;
      color: var(--tinta-suave);
      white-space: nowrap;
    }
    .sem-dados {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      margin: 0;
      color: var(--tinta-suave);
      font-size: var(--t-pequeno);
    }
    .dica-grafico {
      position: absolute;
      top: 0;
      z-index: 2;
      display: grid;
      gap: 0.2rem;
      min-width: 11rem;
      padding: 0.55rem 0.7rem;
      background: var(--tinta);
      color: var(--superficie);
      border-radius: var(--raio);
      font-size: var(--t-pequeno);
      pointer-events: none;
      box-shadow: 0 6px 18px var(--sombra);
    }
    .dica-grafico.meio {
      transform: translateX(-50%);
    }
    .dica-grafico.fim {
      transform: translateX(-100%);
    }
    .dica-grafico b {
      margin-left: auto;
      padding-left: 0.75rem;
      font-variant-numeric: tabular-nums;
    }
    .dica-grafico span {
      display: flex;
    }
    .rolagem-tabela {
      overflow-x: auto;
      max-height: 22rem;
    }
    .tabela.numeros td:not(:first-child),
    .tabela.numeros th:not(:first-child) {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    /* Listas */
    .duas-colunas {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem;
      align-items: start;
    }
    .lista-lacunas,
    .lista-avaliacoes {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .lista-lacunas li,
    .lista-avaliacoes li {
      display: grid;
      gap: 0.2rem;
      padding: 0.7rem 0;
      border-top: 1px solid var(--linha);
    }
    .lista-lacunas li:first-child,
    .lista-avaliacoes li:first-child {
      border-top: 0;
      padding-top: 0;
    }
    .texto-pergunta {
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    .meta {
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
    }
    .comentario {
      font-family: var(--fonte-leitura);
      font-style: italic;
    }
    .trecho-resposta {
      margin: 0;
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
      overflow-wrap: anywhere;
    }
    .chamada {
      margin-top: 1rem;
    }

    /* Documentos mais citados */
    .barras-documentos {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.55rem;
    }
    .barras-documentos li {
      display: grid;
      grid-template-columns: minmax(8rem, 16rem) minmax(0, 1fr) 7rem;
      align-items: center;
      gap: 0.75rem;
    }
    .nome-documento {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--t-pequeno);
      font-weight: 700;
    }
    .trilho {
      display: block;
      height: 0.6rem;
    }
    .barra {
      display: block;
      height: 100%;
      min-width: 2px;
      background: var(--serie-1);
      border-radius: 0 3px 3px 0;
    }
    .quantidade {
      font-size: var(--t-pequeno);
      color: var(--tinta-suave);
      font-variant-numeric: tabular-nums;
    }

    @media (max-width: 900px) {
      .indicadores {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .duas-colunas {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 560px) {
      .indicador .valor {
        font-size: var(--t-titulo);
      }
      .barras-documentos li {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .trilho {
        grid-column: 1 / -1;
        grid-row: 2;
      }
    }
  `,
})
export class Analises {
  private readonly api = inject(Api);

  protected readonly periodos = [7, 30, 90];
  protected readonly dias = signal(30);
  protected readonly painel = signal<PainelDeAnalises | null>(null);
  protected readonly carregando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly verTabela = signal(false);
  protected readonly diaEmFoco = signal<number | null>(null);

  protected readonly numero = (valor: number) => NUMERO.format(valor);
  protected readonly dataHora = dataHora;

  protected readonly totalAvaliacoes = computed(() => {
    const p = this.painel();
    return p ? p.avaliacoesPositivas + p.avaliacoesNegativas : 0;
  });

  protected readonly taxaRespondidas = computed(() => {
    const p = this.painel();
    return p && p.totalPerguntas > 0 ? porcentagem(p.totalPerguntas - p.semResposta, p.totalPerguntas) : '–';
  });

  protected readonly taxaUteis = computed(() => {
    const p = this.painel();
    return p && this.totalAvaliacoes() > 0 ? porcentagem(p.avaliacoesPositivas, this.totalAvaliacoes()) : '–';
  });

  /** Topo do eixo Y: um número "redondo" acima do maior dia. */
  protected readonly escala = computed(() => {
    const maior = Math.max(0, ...(this.painel()?.perguntasPorDia ?? []).map((dia) => dia.total));
    return escalaRedonda(maior);
  });

  protected readonly colunas = computed<Coluna[]>(() => {
    const serie = this.painel()?.perguntasPorDia ?? [];
    const escala = this.escala();
    const passo = serie.length <= 10 ? 1 : serie.length <= 31 ? 7 : 15;
    return serie.map((dia, indice) => {
      const data = diaLocal(dia.dia);
      const respondidas = dia.total - dia.semResposta;
      // Os rótulos do eixo contam a partir do fim, para o dia de hoje sempre aparecer.
      const mostrarRotulo = (serie.length - 1 - indice) % passo === 0;
      return {
        ...dia,
        respondidas,
        alturaRespondidas: (respondidas / escala) * 100,
        alturaSemResposta: (dia.semResposta / escala) * 100,
        rotuloEixo: mostrarRotulo ? diaCurto(data) : null,
        rotuloLongo: DIA_LONGO.format(data),
      };
    });
  });

  protected readonly colunaEmFoco = computed(() => {
    const indice = this.diaEmFoco();
    return indice === null ? null : (this.colunas()[indice] ?? null);
  });

  protected readonly posicaoDaDica = computed(() => {
    const indice = this.diaEmFoco() ?? 0;
    const total = this.colunas().length || 1;
    return ((indice + 0.5) / total) * 100;
  });

  protected readonly ancoraDaDica = computed(() => {
    const posicao = this.posicaoDaDica();
    return posicao < 20 ? 'inicio' : posicao > 80 ? 'fim' : 'meio';
  });

  protected readonly resumoDoGrafico = computed(() => {
    const p = this.painel();
    if (!p) {
      return '';
    }
    const pico = p.perguntasPorDia.reduce((maior, dia) => (dia.total > maior.total ? dia : maior), p.perguntasPorDia[0]);
    const total = `${p.totalPerguntas} perguntas em ${p.periodoDias} dias.`;
    return pico && pico.total > 0 ? `${total} Dia com mais perguntas: ${DIA_LONGO.format(diaLocal(pico.dia))}, com ${pico.total}.` : total;
  });

  protected readonly maximoCitacoes = computed(() =>
    Math.max(1, ...(this.painel()?.documentosMaisCitados ?? []).map((documento) => documento.respostas)),
  );

  constructor() {
    effect(() => {
      const dias = this.dias();
      untracked(() => this.carregar(dias));
    });
  }

  protected navegar(evento: KeyboardEvent): void {
    const ultimo = this.colunas().length - 1;
    const atual = this.diaEmFoco() ?? ultimo;
    const proximo: Record<string, number> = {
      ArrowLeft: Math.max(0, atual - 1),
      ArrowRight: Math.min(ultimo, atual + 1),
      Home: 0,
      End: ultimo,
    };
    if (evento.key in proximo) {
      evento.preventDefault();
      this.diaEmFoco.set(proximo[evento.key]);
    }
  }

  protected focarUltimoDia(): void {
    if (this.diaEmFoco() === null && this.colunas().length > 0) {
      this.diaEmFoco.set(this.colunas().length - 1);
    }
  }

  protected resumir(texto: string): string {
    const limpo = texto.replace(/\s+/g, ' ').trim();
    return limpo.length > 220 ? `${limpo.slice(0, 217).trimEnd()}...` : limpo;
  }

  private carregar(dias: number): void {
    this.carregando.set(true);
    this.erro.set(null);
    this.api.analises(dias).subscribe({
      next: (painel) => {
        this.painel.set(painel);
        this.diaEmFoco.set(null);
        this.carregando.set(false);
      },
      error: (falha) => {
        this.carregando.set(false);
        this.erro.set(mensagemDeErro(falha, 'Não foi possível carregar as análises.'));
      },
    });
  }
}

function porcentagem(parte: number, total: number): string {
  return `${Math.round((parte / total) * 100)}%`;
}

/** 2, 4, 6, 8, 10, 20, 30... sempre par, para a linha do meio cair num número inteiro. */
export function escalaRedonda(maior: number): number {
  if (maior <= 2) {
    return 2;
  }
  const potencia = 10 ** Math.floor(Math.log10(maior));
  for (const passo of [1, 2, 3, 4, 5, 6, 8, 10]) {
    if (passo * potencia >= maior && (passo * potencia) % 2 === 0) {
      return passo * potencia;
    }
  }
  return 10 * potencia;
}

/** "2026-10-26" vira uma data local (new Date("2026-10-26") seria meia-noite UTC, o dia anterior no Brasil). */
function diaLocal(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

/** "26 out", sem o "de" e o ponto que o Intl coloca em português. */
function diaCurto(data: Date): string {
  const partes = DIA_CURTO.formatToParts(data);
  const dia = partes.find((parte) => parte.type === 'day')?.value ?? '';
  const mes = (partes.find((parte) => parte.type === 'month')?.value ?? '').replace('.', '');
  return `${dia} ${mes}`;
}
