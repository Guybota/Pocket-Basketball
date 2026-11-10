# Pocket Basketball

Jogo de gestão de basquetebol com a estrutura do Nintendo Pocket Football Club. Toda a implementação é feita por agentes (Claude e Codex). Estas regras valem para os dois.

**Na dúvida, pergunta.** Sempre que um pedido não for claro, ou houver mais de uma forma razoável de o cumprir (onde aparece, para quê, em que ecrãs), pergunta ao utilizador antes de fazer, em vez de escolher sozinho.

Lê antes de começar:

- [Pesquisa sobre o original](docs/01-pesquisa-npfc.md)
- [Plano e fases](docs/02-plano-desenvolvimento.md)
- [Estudo visual](docs/03-estudo-visual.html)
- [Análise visual e charme, antes da Fase 5](docs/05-analise-visual-charme.md)
- [Referências do Calciobit A](docs/referencias/calciobit/README.md): imagens etiquetadas por ecrã, fluxos de UI e câmara do jogo de gestão de futebol para telemóvel. Consulta antes de desenhar menus, fluxos ou a câmara. Servem só de referência.
- [Pocket Basketball contra o Calciobit](docs/referencias/pocket-basketball/comparacao-calciobit.md): o nosso jogo gravado em sequências e comparado com o Calciobit, com os defeitos e as lacunas por prioridade. Para gravar de novo: `npm run sequences`.

## Comandos

```bash
npm run check          # verifica os tipos e corre os testes rápidos (menos de 1 minuto)
npm run balance        # corre os testes lentos, que simulam muitos jogos (vários minutos)
npm run check-all      # os dois juntos
npm run sim            # simula jogos em massa e mostra o relatório de equilíbrio
npm run watch-match    # mostra um jogo em texto: npm run watch-match -- 42
npm run dev            # abre o jogo no browser, em http://localhost:5173
npm run browser-check  # testa o jogo num browser verdadeiro e guarda imagens em dist-check/
npm run anim-check     # desenha as poses e os movimentos especiais em dist-check/, sem correr o jogo
npm run sound-wavs     # grava sons em WAV, secos e em cada sala, em dist-sounds/: npm run sound-wavs -- apito
npm run review         # folhas de sprites e cenários de teste para o revisor, em dist-check/revisao/: npm run review -- src/tools/cenas/poses-todas.json
npm run build-page     # junta o jogo numa só página, em dist/pocket-basketball.html
```

Se mudares algo em `src/ui/`, corre `npm run browser-check` e olha para as imagens. No Windows usa o Edge; noutra máquina usa o Chromium do Playwright, ou o browser que indicares em `BROWSER_PATH` (caminho) ou `BROWSER_CHANNEL` (por exemplo `chrome`).

Corre `npm run check` antes de dares uma tarefa por terminada. Se mudares `src/sim/` ou `src/ui/club.ts`, corre também `npm run balance`, que confirma o equilíbrio com milhares de jogos; os testes da simulação estão divididos em ficheiros `src/sim/sim-*.test.ts` para correrem em paralelo, e num computador com vários processadores demoram uns minutos. Um teste novo que demore mais de um segundo leva `{ tags: ['slow'] }`, para o `check` continuar rápido. Se mudares números em `src/sim/balance.ts`, corre também `npm run sim`.

## Regras da simulação (`src/sim/`)

- **Determinista:** a mesma semente e as mesmas equipas dão sempre o mesmo jogo. As repetições e o Match ID dependem disto.
- **Aleatoriedade:** só pelo gerador em `rng.ts`.
- **Proibido:** `Math.random`, `Math.sin`, `Math.cos`, `Math.tan`, `Math.pow`, `Math.exp`, `Math.log`, `Math.hypot`, `Math.atan`, `**` e `Date`. Alguns podem dar resultados diferentes entre browsers. Usa `Math.sqrt` e tabelas.
- **Sem dependências:** `src/sim/` só importa de `src/sim/`, e nunca interface, DOM ou Node.
- **Dados em JSON:** uma equipa tem de sobreviver a `JSON.stringify` e `JSON.parse` sem mudar o jogo.
- **Números de equilíbrio:** ficam todos em `balance.ts`.

Um teste automático faz cumprir as regras de proibição e de importação.

## Interface (`src/ui/`)

- A interface lê o estado da simulação e só a muda pelos comandos do treinador (`requestTimeout`, `resumeMatch`, `holdMatch`, `queueSubstitution`, `cancelSubstitution`, `setAutoRotation`, `setTactics`). Ficam registados em `commands`, para o jogo se poder repetir.
- Só `step()` faz o jogo avançar.
- O jogo é só na horizontal e num só ecrã, como o Calciobit: a cena ou o campo ocupam o ecrã todo, os botões são redondos nas bordas, e as listas e as fichas abrem em janelas por cima. Já não há o esquema de dois ecrãs da 3DS. Com o ecrã ao alto aparece um aviso para o rodar e o jogo para. O tamanho mais pequeno a suportar é 640×360. A arte é sempre escalada por múltiplos inteiros de píxeis do ecrã, com uma exceção: no jogo, os bonecos ficam maiores à frente e mais pequenos atrás, como no Calciobit (`depthScale` em art/court.ts), e por isso têm bordas um pouco suaves.
- Toda a arte é gerada por código. Os sons são sintetizados, por isso não há ficheiros de áudio.
- Para criar ou afinar sons segue o skill [sound-design](.claude/skills/sound-design/SKILL.md), que tem as diretrizes e a pesquisa de acústica, síntese e mistura.
- Para arte, animação, pixel art, cor, ícones, emblemas e interface segue o skill [visual-design](.claude/skills/visual-design/SKILL.md). Qualquer animação ou asset visual novo passa pela revisão de um agente revisor, como lá se descreve.

## Trabalho a dois

- Um agente escreve a tarefa e o outro revê.
- Os dois nunca alteram os mesmos ficheiros ao mesmo tempo, e cada um trabalha no seu ramo.
- Os testes e o formato dos dados são o contrato. Mudar um deles exige dizê-lo explicitamente na entrega.

## Original, não cópia

Copiamos a estrutura e o ciclo de jogo. Toda a arte, os textos, os nomes de cartas e de combos e os logótipos têm de ser originais. Nunca uses recursos do jogo da Nintendo.

## Língua

O código usa identificadores em inglês. Os textos para o jogador e a documentação são em português de Portugal.
