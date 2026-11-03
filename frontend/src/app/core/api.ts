import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Avaliacao,
  ConfiguracaoPublica,
  Conversa,
  Documento,
  Membro,
  Mensagem,
  PainelDeAnalises,
  Papel,
  RespostaDeLogin,
  TrechoIndexado,
  Usuario,
} from './modelos';

/** Todas as chamadas REST do front-end. O streaming do chat fica em ChatAoVivo. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  configuracao(): Observable<ConfiguracaoPublica> {
    return this.http.get<ConfiguracaoPublica>('/api/config');
  }

  entrar(email: string, senha: string): Observable<RespostaDeLogin> {
    return this.http.post<RespostaDeLogin>('/api/auth/login', { email, senha });
  }

  entrarNaDemonstracao(empresa: string): Observable<RespostaDeLogin> {
    return this.http.post<RespostaDeLogin>('/api/auth/demo', { empresa });
  }

  cadastrar(dados: { nomeEmpresa: string; nome: string; email: string; senha: string }): Observable<RespostaDeLogin> {
    return this.http.post<RespostaDeLogin>('/api/auth/cadastro', dados);
  }

  eu(): Observable<Usuario> {
    return this.http.get<Usuario>('/api/auth/eu');
  }

  trocarSenha(senhaAtual: string, novaSenha: string): Observable<void> {
    return this.http.put<void>('/api/auth/senha', { senhaAtual, novaSenha });
  }

  documentos(): Observable<Documento[]> {
    return this.http.get<Documento[]>('/api/documentos');
  }

  enviarDocumento(arquivo: File): Observable<Documento> {
    const formulario = new FormData();
    formulario.append('arquivo', arquivo, arquivo.name);
    return this.http.post<Documento>('/api/documentos', formulario);
  }

  excluirDocumento(id: string): Observable<void> {
    return this.http.delete<void>(`/api/documentos/${id}`);
  }

  reprocessarDocumento(id: string): Observable<Documento> {
    return this.http.post<Documento>(`/api/documentos/${id}/reprocessar`, null);
  }

  trechosDoDocumento(id: string): Observable<TrechoIndexado[]> {
    return this.http.get<TrechoIndexado[]>(`/api/documentos/${id}/trechos`);
  }

  baixarDocumento(id: string): Observable<Blob> {
    return this.http.get(`/api/documentos/${id}/arquivo`, { responseType: 'blob' });
  }

  membros(): Observable<Membro[]> {
    return this.http.get<Membro[]>('/api/usuarios');
  }

  criarMembro(dados: { nome: string; email: string; senha: string; papel: Papel }): Observable<Membro> {
    return this.http.post<Membro>('/api/usuarios', dados);
  }

  removerMembro(id: string): Observable<void> {
    return this.http.delete<void>(`/api/usuarios/${id}`);
  }

  conversas(): Observable<Conversa[]> {
    return this.http.get<Conversa[]>('/api/conversas');
  }

  criarConversa(): Observable<Conversa> {
    return this.http.post<Conversa>('/api/conversas', {});
  }

  renomearConversa(id: string, titulo: string): Observable<Conversa> {
    return this.http.patch<Conversa>(`/api/conversas/${id}`, { titulo });
  }

  excluirConversa(id: string): Observable<void> {
    return this.http.delete<void>(`/api/conversas/${id}`);
  }

  mensagens(conversaId: string): Observable<Mensagem[]> {
    return this.http.get<Mensagem[]>(`/api/conversas/${conversaId}/mensagens`);
  }

  avaliar(conversaId: string, mensagemId: string, avaliacao: Avaliacao): Observable<Avaliacao> {
    return this.http.put<Avaliacao>(`/api/conversas/${conversaId}/mensagens/${mensagemId}/avaliacao`, avaliacao);
  }

  removerAvaliacao(conversaId: string, mensagemId: string): Observable<void> {
    return this.http.delete<void>(`/api/conversas/${conversaId}/mensagens/${mensagemId}/avaliacao`);
  }

  sugestoes(): Observable<string[]> {
    return this.http.get<string[]>('/api/sugestoes');
  }

  analises(dias: number): Observable<PainelDeAnalises> {
    return this.http.get<PainelDeAnalises>('/api/analises', { params: { dias } });
  }
}

/** Faz o navegador salvar um Blob como arquivo. */
export function salvarArquivo(conteudo: Blob, nome: string): void {
  const url = URL.createObjectURL(conteudo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
