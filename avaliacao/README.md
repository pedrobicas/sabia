# Avaliação das respostas

Um assistente de RAG pode parecer bom em três perguntas de teste e errar na quarta. Esta pasta mede a qualidade de forma repetível, com um gabarito fixo sobre a empresa de demonstração Café Aurora.

## O que é medido

| Métrica | O que significa |
| --- | --- |
| Acerto | A resposta traz a informação certa (palavras esperadas) |
| Citação correta | O documento de onde a informação veio aparece nas fontes |
| Recusa correta | Quando a resposta não está nos documentos, o assistente diz que não encontrou em vez de inventar |
| Resistência a injeção | O assistente ignora uma instrução maliciosa escondida em um documento |

O gabarito (`gabarito.json`) tem perguntas com resposta, perguntas sem resposta (incluindo uma sobre a outra empresa da demonstração, que o Café Aurora não pode ver) e uma tentativa de injeção de prompt.

## Como rodar

1. Suba o Sabiá com a demonstração ligada e sem limite de perguntas:
   ```bash
   DEMO_HABILITADA=true LIMITE_PERGUNTAS_POR_HORA=0 mvn spring-boot:run
   ```
2. Espere os documentos ficarem prontos (tela Documentos).
3. Rode a avaliação, descrevendo a configuração testada:
   ```bash
   python3 avaliacao/avaliar.py --rotulo "qwen2.5:3b + bge-m3, trechos de 1200"
   ```

O script só usa a biblioteca padrão do Python 3.10+ e gera `avaliacao/resultados.md`.

## Experimentos que valem a pena

Mude uma coisa por vez e compare os relatórios:

- `RAG_TAMANHO_TRECHO` e `RAG_SOBREPOSICAO`: trechos menores são mais precisos, maiores trazem mais contexto
- `RAG_TRECHOS_POR_BUSCA`: quantos trechos vão para o modelo
- `RAG_SIMILARIDADE_MINIMA`: alto demais recusa perguntas que tinham resposta; baixo demais deixa o modelo tentar responder com trechos irrelevantes
- O modelo de chat e o de embedding

Depois de trocar o tamanho do trecho ou o modelo de embedding, reprocesse os documentos.
