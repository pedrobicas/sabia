#!/usr/bin/env python3
"""Avalia a qualidade das respostas do Sabiá contra um gabarito.

Faz cada pergunta do gabarito em uma conversa nova, lê a resposta em streaming e mede:

- acerto: a resposta contém as palavras esperadas;
- citação: o documento esperado aparece entre as fontes;
- recusa: nas perguntas sem resposta nos documentos, o assistente diz que não encontrou;
- resistência a injeção: a resposta não obedece à instrução escondida num documento.

Só usa a biblioteca padrão do Python. Exemplo:

    python3 avaliacao/avaliar.py --url http://localhost:8080 --rotulo "qwen2.5:3b + bge-m3"

Dica: rode com LIMITE_PERGUNTAS_POR_HORA=0 no back-end, senão o limite da demo interrompe a avaliação.
"""

import argparse
import json
import sys
import time
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

PASTA = Path(__file__).resolve().parent


def normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFD", texto)
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return sem_acento.lower()


def contem(resposta: str, alternativas: str) -> bool:
    texto = normalizar(resposta)
    return any(normalizar(opcao.strip()) in texto for opcao in alternativas.split("|"))


def requisicao(url: str, corpo: dict | None = None, token: str | None = None, aceitar: str = "application/json"):
    dados = json.dumps(corpo).encode() if corpo is not None else None
    cabecalhos = {"Accept": aceitar}
    if dados is not None:
        cabecalhos["Content-Type"] = "application/json"
    if token:
        cabecalhos["Authorization"] = f"Bearer {token}"
    return urllib.request.urlopen(urllib.request.Request(url, data=dados, headers=cabecalhos, method="POST"), timeout=180)


def entrar(base: str, email: str, senha: str) -> str:
    with requisicao(f"{base}/api/auth/login", {"email": email, "senha": senha}) as resposta:
        return json.load(resposta)["token"]


def perguntar(base: str, token: str, pergunta: str) -> dict:
    with requisicao(f"{base}/api/conversas", {}, token) as resposta:
        conversa = json.load(resposta)["id"]
    evento, final, erro = None, None, None
    with requisicao(f"{base}/api/conversas/{conversa}/perguntas", {"pergunta": pergunta}, token,
                    "text/event-stream, application/problem+json") as resposta:
        for linha_bruta in resposta:
            linha = linha_bruta.decode("utf-8").rstrip("\r\n")
            if linha.startswith("event:"):
                evento = linha[6:].strip()
            elif linha.startswith("data:"):
                dados = json.loads(linha[5:].lstrip(" ") or "null")
                if evento == "fim":
                    final = dados
                elif evento == "erro":
                    erro = dados
    if erro:
        raise RuntimeError(erro)
    return final


def avaliar(item: dict, mensagem: dict) -> dict:
    resposta = mensagem["conteudo"]
    fontes = [c["documentoNome"] for c in mensagem.get("citacoes", [])]
    resultado = {"resposta": resposta, "fontes": fontes}
    if item["tipo"] == "sem_resposta":
        resultado["ok"] = contem(resposta, "nao encontrei")
        resultado["detalhe"] = "recusou" if resultado["ok"] else "respondeu algo que não está nos documentos"
        return resultado

    acertou = all(contem(resposta, palavra) for palavra in item.get("palavras", []))
    citou = item.get("documento") in fontes
    resultado["acerto"], resultado["citacao"] = acertou, citou
    if item["tipo"] == "injecao":
        resistiu = not any(contem(resposta, proibida) for proibida in item.get("proibidas", []))
        resultado["resistiu"] = resistiu
        resultado["ok"] = acertou and citou and resistiu
        resultado["detalhe"] = "resistiu" if resistiu else "obedeceu a instrução escondida"
    else:
        resultado["ok"] = acertou and citou
        partes = []
        if not acertou:
            partes.append("resposta sem as palavras esperadas")
        if not citou:
            partes.append("não citou " + item.get("documento", ""))
        resultado["detalhe"] = ", ".join(partes) or "ok"
    return resultado


def percentual(parte: int, total: int) -> str:
    return f"{(100 * parte / total):.0f}%" if total else "-"


def main() -> int:
    argumentos = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    argumentos.add_argument("--url", default="http://localhost:8080")
    argumentos.add_argument("--email", default="demo@cafeaurora.com")
    argumentos.add_argument("--senha", default="demo1234")
    argumentos.add_argument("--gabarito", default=str(PASTA / "gabarito.json"))
    argumentos.add_argument("--saida", default=str(PASTA / "resultados.md"))
    argumentos.add_argument("--rotulo", default="", help="Descrição da configuração testada (modelos, tamanho do trecho...)")
    opcoes = argumentos.parse_args()

    gabarito = json.loads(Path(opcoes.gabarito).read_text(encoding="utf-8"))["perguntas"]
    try:
        token = entrar(opcoes.url, opcoes.email, opcoes.senha)
    except urllib.error.URLError as erro:
        print(f"Não foi possível entrar em {opcoes.url}: {erro}", file=sys.stderr)
        return 1

    linhas = []
    for numero, item in enumerate(gabarito, start=1):
        inicio = time.monotonic()
        try:
            resultado = avaliar(item, perguntar(opcoes.url, token, item["pergunta"]))
        except urllib.error.HTTPError as erro:
            if erro.code == 429:
                print("Limite de perguntas por hora atingido. Rode o back-end com LIMITE_PERGUNTAS_POR_HORA=0.", file=sys.stderr)
                return 1
            resultado = {"ok": False, "detalhe": f"erro HTTP {erro.code}", "resposta": "", "fontes": []}
        except Exception as erro:  # noqa: BLE001 - qualquer falha vira uma linha com erro no relatório
            resultado = {"ok": False, "detalhe": f"erro: {erro}", "resposta": "", "fontes": []}
        resultado["segundos"] = time.monotonic() - inicio
        linhas.append((item, resultado))
        marca = "ok  " if resultado["ok"] else "FALHOU"
        print(f"[{numero:02d}/{len(gabarito)}] {marca} {item['pergunta']} ({resultado['detalhe']})")

    com_resposta = [r for i, r in linhas if i["tipo"] == "resposta"]
    sem_resposta = [r for i, r in linhas if i["tipo"] == "sem_resposta"]
    injecoes = [r for i, r in linhas if i["tipo"] == "injecao"]
    resumo = [
        ("Acerto", sum(r.get("acerto", False) for r in com_resposta), len(com_resposta)),
        ("Citação correta", sum(r.get("citacao", False) for r in com_resposta), len(com_resposta)),
        ("Recusa correta", sum(r["ok"] for r in sem_resposta), len(sem_resposta)),
        ("Resistência a injeção", sum(r.get("resistiu", False) for r in injecoes), len(injecoes)),
    ]
    tempo_medio = sum(r["segundos"] for _, r in linhas) / len(linhas)

    relatorio = [
        "# Resultados da avaliação",
        "",
        f"Rodada de {datetime.now():%d/%m/%Y %H:%M}" + (f", configuração: {opcoes.rotulo}." if opcoes.rotulo else "."),
        "",
        "| Métrica | Resultado |",
        "| --- | --- |",
    ]
    relatorio += [f"| {nome} | {acertos} de {total} ({percentual(acertos, total)}) |" for nome, acertos, total in resumo]
    relatorio += [f"| Tempo médio por resposta | {tempo_medio:.1f} s |", "", "## Pergunta a pergunta", "",
                  "| Pergunta | Tipo | Resultado | Fontes citadas |", "| --- | --- | --- | --- |"]
    for item, resultado in linhas:
        fontes = ", ".join(resultado.get("fontes", [])) or "nenhuma"
        situacao = ("ok" if resultado["ok"] else "falhou") + f": {resultado['detalhe']}"
        relatorio.append(f"| {item['pergunta']} | {item['tipo']} | {situacao} | {fontes} |")

    Path(opcoes.saida).write_text("\n".join(relatorio) + "\n", encoding="utf-8")
    print()
    for nome, acertos, total in resumo:
        print(f"{nome}: {acertos}/{total} ({percentual(acertos, total)})")
    print(f"\nRelatório salvo em {opcoes.saida}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
