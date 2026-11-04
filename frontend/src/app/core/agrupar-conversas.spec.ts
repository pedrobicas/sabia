import { agruparPorData } from './agrupar-conversas';
import { Conversa } from './modelos';

function conversa(id: string, atualizadoEm: Date): Conversa {
  const quando = atualizadoEm.toISOString();
  return { id, titulo: id, criadoEm: quando, atualizadoEm: quando };
}

describe('agruparPorData', () => {
  const agora = new Date(2026, 10, 3, 15, 0);

  it('separa por hoje, ontem, 7 dias, 30 dias e mais antigas', () => {
    const grupos = agruparPorData(
      [
        conversa('manha', new Date(2026, 10, 3, 8, 0)),
        conversa('meia-noite', new Date(2026, 10, 3, 0, 0)),
        conversa('ontem', new Date(2026, 10, 2, 23, 59)),
        conversa('semana', new Date(2026, 9, 28, 12, 0)),
        conversa('mes', new Date(2026, 9, 10, 12, 0)),
        conversa('antiga', new Date(2026, 6, 1, 12, 0)),
      ],
      agora,
    );

    expect(grupos.map((g) => [g.titulo, g.conversas.map((c) => c.id)])).toEqual([
      ['Hoje', ['manha', 'meia-noite']],
      ['Ontem', ['ontem']],
      ['Últimos 7 dias', ['semana']],
      ['Últimos 30 dias', ['mes']],
      ['Mais antigas', ['antiga']],
    ]);
  });

  it('omite os grupos vazios', () => {
    const grupos = agruparPorData([conversa('ontem', new Date(2026, 10, 2, 10, 0))], agora);
    expect(grupos.map((g) => g.titulo)).toEqual(['Ontem']);
  });
});
