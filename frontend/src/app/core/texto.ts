/** Minúsculas e sem acentos, caractere por caractere (o tamanho do texto não muda). */
export function normalizar(texto: string): string {
  return Array.from(texto, (letra) => letra.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || letra).join('');
}
