"""Resume os relatórios de teste do Maven (surefire e failsafe) como anotações do GitHub Actions.

As anotações aparecem na aba "Checks" do pull request, então dá para ver
quantos testes rodaram e quais falharam sem abrir o log inteiro.
"""

import glob
import sys
import xml.etree.ElementTree as ET


def escapar(texto: str) -> str:
    return texto.replace("%", "%25").replace("\r", "").replace("\n", "%0A")


def main() -> int:
    arquivos = glob.glob("target/surefire-reports/TEST-*.xml") + glob.glob("target/failsafe-reports/TEST-*.xml")
    total = falhas = erros = pulados = 0
    problemas = []
    for arquivo in arquivos:
        raiz = ET.parse(arquivo).getroot()
        total += int(raiz.get("tests", 0))
        falhas += int(raiz.get("failures", 0))
        erros += int(raiz.get("errors", 0))
        pulados += int(raiz.get("skipped", 0))
        for caso in raiz.iter("testcase"):
            for tipo in ("failure", "error"):
                no = caso.find(tipo)
                if no is not None:
                    mensagem = (no.get("message") or no.text or "").strip()
                    problemas.append(f"{caso.get('classname')}.{caso.get('name')}: {mensagem[:400]}")

    print(f"::notice title=Testes::{total} testes, {falhas} falhas, {erros} erros, {pulados} pulados")
    if problemas:
        print("::error title=Testes com problema::" + escapar("\n".join(problemas[:15])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
