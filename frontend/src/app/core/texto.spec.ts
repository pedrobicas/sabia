import { normalizar } from './texto';

describe('normalizar', () => {
  it('tira acentos e deixa em minúsculas', () => {
    expect(normalizar('Férias e Ação')).toBe('ferias e acao');
  });

  it('mantém o tamanho do texto, para as posições valerem no original', () => {
    for (const texto of ['Çã', 'İstanbul', 'café ☕', 'São Paulo']) {
      expect(normalizar(texto).length).toBe(texto.length);
    }
  });
});
