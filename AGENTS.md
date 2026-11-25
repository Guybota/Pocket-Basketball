# Pocket Basketball

Jogo de gestão de basquetebol com a estrutura do Nintendo Pocket Football Club. Toda a implementação é feita por agentes (Claude e Codex). Estas regras valem para os dois.

**Na dúvida, pergunta.** Sempre que um pedido não for claro, ou houver mais de uma forma razoável de o cumprir (onde aparece, para quê, em que ecrãs), pergunta ao utilizador antes de fazer, em vez de escolher sozinho.

Lê antes de começar:

- [PLANO.md](PLANO.md): o que vem a seguir, em ondas, com o chat dono de cada tarefa.
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
npm run gpu-check      # compara as bancadas desenhadas pela placa gráfica com o traçador de raios, píxel a píxel
npm run campos         # fotografa cada campo de longe (o pavilhão inteiro) e com a câmara do jogo, em dist-check/campos/
node src/tools/gravar.ts 3 ressalto  # grava o jogo em movimento a 30 fps, como o jogo o mostra, em dist-check/gravar/ (ver o skill visual-design)
npm run build-page     # junta o jogo numa só página, em dist/pocket-basketball.html
npm run skills         # copia .claude/skills para .agents/skills (a cópia do Codex); um teste falha se forem diferentes
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
- O jogo é só na horizontal e num só ecrã, como o Calciobit: a cena ou o campo ocupam o ecrã todo, os botões são redondos nas bordas, e as listas e as fichas abrem em janelas por cima. Já não há o esquema de dois ecrãs da 3DS. Com o ecrã ao alto aparece um aviso para o rodar e o jogo para. O tamanho mais pequeno a suportar é 640×360. A arte é sempre escalada por múltiplos inteiros de píxeis do ecrã, com três exceções no jogo: o campo enche o ecrã com qualquer escala, desenhado ampliado por um inteiro e ajustado pelo browser com suavização (layout.ts), para não crescer aos saltos; os bonecos ficam maiores à frente e mais pequenos atrás, como no Calciobit (`depthScale` em art/court.ts); e o cenário do campo passa a ser desenhado pela placa gráfica (three.js, `src/ui/gpu/`) à resolução do ecrã, com os texels nítidos e as linhas finas e estáveis, por baixo dos bonecos em pixel art (estilo «HD-2D»; ver [o plano](docs/08-plano-gpu.md): todos os campos já estão, com o traçador de raios como reserva). O cenário são as mesmas contas em `Camera.drawScene` (a reserva) e em `src/ui/gpu/venue-shader.ts`: se mudares uma, muda a outra e corre `npm run gpu-check`. Por isso o jogo tem bordas um pouco suaves. Por decisão do dono, as pessoas fora do campo são desenho vetorial (SVG gerado por código, `src/ui/art/figure-svg.ts`, ao estilo do Calciobit): os retratos de todo o jogo (`portraitSvgImage`, com `small` a 32 px ou menos) e os jogadores de corpo inteiro da fila do treino (`figureImage`). Os bonecos do campo, a cidade e os cenários continuam em pixel art.
- Toda a arte é gerada por código. Os sons são sintetizados, por isso não há ficheiros de áudio.
- Para criar ou afinar sons segue o skill [sound-design](.claude/skills/sound-design/SKILL.md), que tem as diretrizes e a pesquisa de acústica, síntese e mistura.
- Para arte, animação, pixel art, cor, ícones, emblemas e interface segue o skill [visual-design](.claude/skills/visual-design/SKILL.md). Qualquer animação ou asset visual novo passa pela revisão de um agente revisor, como lá se descreve.

## Trabalho em equipa

Há um chat **Manager** e chats especialistas, um por área. O Manager lê o [PLANO.md](PLANO.md), propõe a onda seguinte ao utilizador, lança os chats dessa onda (cada um no seu worktree e no seu ramo, a partir do `fase-1`), revê e junta os ramos no `fase-1`, e avança o `main` para o GitHub Pages. Os especialistas não juntam ramos nem fazem push.

### Território

Cada chat só mexe na sua área. Os agentes em `.claude/agents/` têm o território e o que correr antes de entregar.

| Chat | Agente | Pode mexer em |
|---|---|---|
| Sim | `sim` | `src/sim/` |
| UI | `ui` | `src/ui/` fora da arte e do som: menus, ecrãs, painéis, HUD, toque, saves, Aeroporto, `style.css` |
| Arte | `arte` | `src/ui/art/`, `src/ui/gpu/`, `match-view.ts`, `title-stage.ts`, `anim-page.ts`, `review.ts`, `src/tools/cenas/` |
| Som | `som` | `synth.ts`, `audio.ts`, `music.ts`, `sound-recipes.ts`, `sound-worker.ts` |
| QA | `reviewer` para rever | testes (`*.test.ts`), `src/tools/`, `docs/referencias/`; não muda o jogo |

- Quem precisa de algo de outra área descreve-o no relatório; o Manager passa ao chat certo.
- Os testes e o formato dos dados são o contrato. Mudar um deles exige dizê-lo explicitamente na entrega.
- `AGENTS.md`, `PLANO.md` e os skills são do Manager; um especialista que aprende uma lição escreve-a no relatório, e o Manager atualiza o skill no commit em que junta o ramo.

### Antes de juntar um ramo

O Manager só junta quando:

1. `npm run check` passa; se a mudança toca `src/sim/` ou `src/ui/club.ts`, também `npm run balance`.
2. A mudança foi verificada como diz «Testes», abaixo.
3. Houve review por **dois** agentes `reviewer`, os dois a criticar ao máximo: um com o contexto da conversa (fork) e um sem. Corrigem-se os erros e revê-se de novo até não haver nada que bloqueie. Um erro é um bug ou uma regra deste ficheiro ou dos skills que não se cumpre; as sugestões de gosto ficam anotadas e não prendem o merge.
4. Uma mudança visual teve o mockup aprovado pelo utilizador antes de ser feita.
5. Os skills e este ficheiro dizem a verdade depois da mudança (ferramentas novas, lições, regras), e `npm run skills` foi corrido se um skill mudou.

### Testes

Testa-se em três camadas:

1. **Testes automáticos:** `npm run check` (vitest). Lógica nova não trivial leva um teste; a simulação leva também o equilíbrio (`npm run balance`).
2. **Ver em movimento:** o que se vê no ecrã verifica-se com `npm run browser-check`, `npm run anim-check`, `npm run review` ou `node src/tools/gravar.ts`, e quem o corre olha para as imagens. Um defeito que arrasta com a câmara só aparece em movimento.
3. **O utilizador joga:** o que só uma pessoa sente (o ritmo, se um momento é emocionante, se um som cansa, o toque no telemóvel) vai numa lista curta, de cerca de 5 minutos, que o Manager entrega ao utilizador com o ramo.

### Um só browser de verificação

Dois chats a correr `browser-check`, `gravar` ou `npm run balance` ao mesmo tempo atrasam-se um ao outro. O Manager não lança mais de três chats de código ao mesmo tempo, e o `npm run balance` corre-se no fim, não a cada passo.

## Original, não cópia

Copiamos a estrutura e o ciclo de jogo. Toda a arte, os textos, os nomes de cartas e de combos e os logótipos têm de ser originais. Nunca uses recursos do jogo da Nintendo.

## Língua

O código usa identificadores em inglês. Os textos para o jogador e a documentação são em português de Portugal.
