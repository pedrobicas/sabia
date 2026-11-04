const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function data(iso: string): string {
  return DATA.format(new Date(iso));
}

export function dataHora(iso: string): string {
  return DATA_HORA.format(new Date(iso));
}

export function tamanho(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Sigla do tipo de arquivo pela extensão do nome ("manual.pdf" vira "PDF"). */
export function siglaDoArquivo(nome: string): string {
  const extensao = nome.split('.').pop()?.toLowerCase() ?? '';
  const siglas: Record<string, string> = { pdf: 'PDF', docx: 'DOCX', md: 'MD', markdown: 'MD', txt: 'TXT' };
  return siglas[extensao] ?? 'ARQ';
}
