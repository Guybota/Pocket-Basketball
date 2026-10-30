# Pocket Basketball

Jogo de gestão de basquetebol com a estrutura do Nintendo Pocket Football Club. Toda a implementação é feita por agentes (Claude e Codex). Estas regras valem para os dois.

Lê antes de começar:

- [Pesquisa sobre o original](docs/01-pesquisa-npfc.md)
- [Plano e fases](docs/02-plano-desenvolvimento.md)
- [Estudo visual](docs/03-estudo-visual.html)

## Comandos

```bash
npm run check          # verifica os tipos e corre os testes
npm run sim            # simula jogos em massa e mostra o relatório de equilíbrio
npm run watch-match    # mostra um jogo em texto: npm run watch-match -- 42
```

Corre `npm run check` antes de dares uma tarefa por terminada. Demora cerca de 2 minutos, porque confirma o equilíbrio com milhares de jogos. Se mudares números em `src/sim/balance.ts`, corre também `npm run sim`.

## Regras da simulação (`src/sim/`)

- **Determinista:** a mesma semente e as mesmas equipas dão sempre o mesmo jogo. As repetições e o Match ID dependem disto.
- **Aleatoriedade:** só pelo gerador em `rng.ts`.
- **Proibido:** `Math.random`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.pow`, `Math.exp`, `Math.log`, `Math.hypot`, `Math.atan`, `**` e `Date`. Alguns podem dar resultados diferentes entre browsers. Usa `Math.sqrt` e tabelas.
- **Sem dependências:** `src/sim/` só importa de `src/sim/`, e nunca interface, DOM ou Node.
- **Dados em JSON:** uma equipa tem de sobreviver a `JSON.stringify` e `JSON.parse` sem mudar o jogo.
- **Números de equilíbrio:** ficam todos em `balance.ts`.

Um teste automático faz cumprir as regras de proibição e de importação.

## Trabalho a dois

- Um agente escreve a tarefa e o outro revê.
- Os dois nunca alteram os mesmos ficheiros ao mesmo tempo, e cada um trabalha no seu ramo.
- Os testes e o formato dos dados são o contrato. Mudar um deles exige dizê-lo explicitamente na entrega.

## Original, não cópia

Copiamos a estrutura e o ciclo de jogo. Toda a arte, os textos, os nomes de cartas e de combos e os logótipos têm de ser originais. Nunca uses recursos do jogo da Nintendo.

## Língua

O código usa identificadores em inglês. Os textos para o jogador e a documentação são em português de Portugal.
