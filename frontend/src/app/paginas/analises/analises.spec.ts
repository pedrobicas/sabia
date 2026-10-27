import { escalaRedonda } from './analises';

describe('escalaRedonda', () => {
  it('arredonda para cima até um número par e "redondo"', () => {
    expect(escalaRedonda(0)).toBe(2);
    expect(escalaRedonda(3)).toBe(4);
    expect(escalaRedonda(5)).toBe(6);
    expect(escalaRedonda(9)).toBe(10);
    expect(escalaRedonda(13)).toBe(20);
    expect(escalaRedonda(22)).toBe(30);
    expect(escalaRedonda(87)).toBe(100);
    expect(escalaRedonda(140)).toBe(200);
  });

  it('nunca fica abaixo do maior valor e a metade é sempre inteira', () => {
    for (let maior = 0; maior <= 1000; maior++) {
      const escala = escalaRedonda(maior);
      expect(escala).toBeGreaterThanOrEqual(maior);
      expect(Number.isInteger(escala / 2)).toBe(true);
    }
  });
});
