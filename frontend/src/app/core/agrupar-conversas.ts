import { Conversa } from './modelos';

export interface GrupoDeConversas {
  titulo: string;
  conversas: Conversa[];
}

const UM_DIA = 24 * 60 * 60 * 1000;

/**
 * Separa as conversas pela data da última mensagem: hoje, ontem, últimos 7 dias, últimos 30 dias
 * e o resto. Mantém a ordem recebida dentro de cada grupo e omite grupos vazios.
 */
export function agruparPorData(conversas: Conversa[], agora: Date = new Date()): GrupoDeConversas[] {
  const inicioDeHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const grupos: GrupoDeConversas[] = [
    { titulo: 'Hoje', conversas: [] },
    { titulo: 'Ontem', conversas: [] },
    { titulo: 'Últimos 7 dias', conversas: [] },
    { titulo: 'Últimos 30 dias', conversas: [] },
    { titulo: 'Mais antigas', conversas: [] },
  ];
  for (const conversa of conversas) {
    const quando = new Date(conversa.atualizadoEm).getTime();
    const indice =
      quando >= inicioDeHoje
        ? 0
        : quando >= inicioDeHoje - UM_DIA
          ? 1
          : quando >= inicioDeHoje - 6 * UM_DIA
            ? 2
            : quando >= inicioDeHoje - 29 * UM_DIA
              ? 3
              : 4;
    grupos[indice].conversas.push(conversa);
  }
  return grupos.filter((grupo) => grupo.conversas.length > 0);
}
