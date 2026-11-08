# Revisão: interface do ecrã de jogo — v1

**Pedido:** rever a interface do jogo: marcador, barra do treinador, separadores, trocas, desconto, intervalo, sobreposições no campo, resultado, vertical e horizontal (commit `fd8abd6`)
**Veredicto:** NÃO PASSA — 1 bloqueante, 6 a corrigir, 8 sugestões
**Material:** capturas de `dist-check/` do `browser-check` deste commit (`ref-360-jogo`, `jogo`, `cesto-2`, `momento-movimento`, `substituir`, `desconto`, `intervalo`, `fim`, `stats`, `taticas-jogo`, `landscape-1280x720`, `landscape-1920x1080`, `landscape-telemovel-deitado`). Não gravei cenas com `npm run review`: as etiquetas de nome só aparecem com um toque, e o cenário não toca.
**Medidas:** contraste WCAG com um script (fórmula da luminância relativa); tamanhos dos alvos e dos píxeis dos ícones medidos por sequências de píxeis escuros nas capturas; a escala vem do código de `layout.ts`.

## Problemas

### B1 — Bloqueante — Telemóvel deitado (844×390): o painel encolhe para 0,7×
- **Imagem:** `landscape-telemovel-deitado.png`, barra do treinador (x 594–844, y 340–390) e painel inteiro.
- **Onde:** `src/ui/layout.ts:109`: quando `viewHeight < 600`, `ui = max(0.7, viewHeight/600)`, e esse valor vai para `panel.style.zoom` (l. 133) e `--hud-zoom` (l. 136).
- **Regras que falha:** toque ≥ 44×44 px (SKILL, Interface); texto ≥ 12 px (`ui.md` §9 e §10); escala inteira e ícones da barra a exatamente 2× (SKILL, Regras e Design gráfico).
- **Medida:**
  - os botões da barra têm cerca de 40×32 px CSS: a borda vai de y 352 a 384 e de x 600 a 640;
  - os píxeis do ícone «X1» medem 1, 2, 3 e 5 px de largura, ou seja escala 1,4× e irregular;
  - a letra pequena fica com 15 × 0,7 = 10,5 px, e as linhas `.srow`/`.row` com 34 × 0,7 ≈ 24 px.
  - O `browser-check` só testa os alvos em 360×640 (`browser-check.ts:1091`), e o contexto deitado nem tem `hasTouch` (l. 900). Por isso isto passa sem aviso.
- **Proposta:**
  - no deitado, não baixar o zoom do painel abaixo de 1: estreitar o campo, ou deixar o painel deslizar;
  - manter a barra do treinador fora do zoom, com 44 px de altura e ícones a 32 px;
  - pôr `hasTouch: true` no contexto deitado e correr lá a mesma verificação de alvos.

### C1 — A corrigir — 1280×720: ícones e retratos do painel a 2,5×
- **Imagem:** `landscape-1280x720.png`, barra do treinador (y 650–715).
- **Onde:** `layout.ts:109`. `ui` anda em quartos e dá 1,25 em 1280×720, por isso os ícones de 16 px aparecem a 32 × 1,25 = 40 px.
- **Regra:** ícones da barra a exatamente 2×; escala inteira (SKILL).
- **Medida:** os píxeis do «X1» e da pausa medem 3, 2, 8, 7, 4, 5 e 5 px, desiguais. Em 1920×1080 (`ui = 2`) medem só múltiplos de 4 (correto), e no telemóvel ao alto múltiplos de 6 a DPR 3 (correto).
- **Proposta:** arredondar `ui` a inteiros quando ≥ 1, ou deixar o zoom do painel fracionário só para a letra e dar às `img` da barra um tamanho em px de ecrã igual a `16 × round(2·ui)`.

### C2 — A corrigir — Letra de 5 px no campo, ao alto
- **Imagem:** `ref-360-jogo.png`: «PROGNÓSTICO» (y ≈ 165) e «354 ESPECTADORES» (y ≈ 203).
- **Onde:**
  - `match-view.ts:795` e `:809`: `text(..., 1)`;
  - as etiquetas de nome, `match-view.ts:1692`: `text(g, label, …, 1)`.
- **Regra:** texto de leitura ≥ 12 px CSS, e no mínimo absoluto ~10 px (`ui.md` §9 e §10).
- **Medida:** ao alto o campo desenha-se a 1 píxel de arte por px CSS (`layout.ts:149`, `setCanvasSize(gameWidth, stageHeight, gameWidth, stageHeight)`). A fonte 3×5 a escala 1 fica com 5 px CSS de altura, o que se confirma na ampliação. O nome de um jogador tocado lê-se com a mesma altura de 5 px.
- **Proposta:** usar escala 2 (10 px) nas etiquetas de nome e no «PROGNÓSTICO». A caixa do prognóstico (52 px) tem altura para isso; a linha dos espectadores pode juntar-se à do título.

### C3 — A corrigir — As cores das equipas no campo não seguem os equipamentos
- **Imagens:**
  - `taticas-jogo.png`: a equipa da casa, MIN, veste amarelo (ver `intervalo.png`), mas a barra do prognóstico pinta MIN de azul;
  - `cesto-2.png`: a REC veste branco e verde, e a sua etiqueta de nome e a barra seriam vermelhas.
- **Onde:**
  - `match-view.ts:803-805`: `#2b5fd9` e `#cf3a2c` fixos;
  - `match-view.ts:1688`: `b.team === 0 ? '#2b5fd9' : '#cf3a2c'`.
  - Ao contrário, o painel segue o equipamento: `main.ts:297` muda `--home`.
- **Regras:**
  - cores com nome e tokens, sem literais hex (SKILL, Regras);
  - «Nunca só cor», e a camisola tem de ler contra a do adversário. Se a barra contradiz a camisola, a cor passa a enganar.
- **Proposta:** passar ao `MatchView` as duas cores de equipamento do jogo, as mesmas que pintam os bonecos, e usá-las no prognóstico e nas etiquetas. A letra fica em tinta ou papel conforme `isLight`, como em `main.ts:298`.

### C4 — A corrigir — Letra laranja, verde e branca abaixo de 4,5:1
- **Imagens e medidas:**

  | Elemento | Captura | Regra CSS | Contraste |
  |---|---|---|---|
  | «Ganha Recreio do Cais» | `fim.png` | `.winner` (`style.css:496`) | 2,97:1 |
  | Total «T» | `jogo.png`, `fim.png` | `.qt .tot` (`:328`) | 2,97:1 |
  | «Adjunto» | `desconto.png`, `intervalo.png` | `.say b` sobre `--paper-2` (`:934`) | 2,65:1 |
  | «Desconto de tempo» | `desconto.png` | `.subs-title` (`:243`) | 2,97:1 |
  | «Confiança +5%» | `fim.png` | `--good` sobre papel | 2,99:1 |
  | «Continuar jogo (28 s)», «Fechar», «Continuar» | | `button.primary`, branco sobre `--ball` (`:220`) | 3,38:1 |
  | «A equipa volta ao campo» | `intervalo.png` | `.mbar.go small` (`:874`) | 2,70:1 |

- **Regra:** 4,5:1 em todo o texto; a regra do texto grande não vale para fontes bitmap finas (SKILL, Interface).
- **Proposta:**
  - criar um token `--ball-text` ≈ `#a8401a` para texto laranja (medido: 5,0:1 em `--paper` e 4,8:1 em `--paper-2`) e um `--good-text` ≈ `#2b7a45` (4,6:1);
  - nos botões laranja, usar letra tinta (4,71:1) ou um fundo mais escuro, por exemplo `#b84a1e` com letra branca (5,2:1).
  - A cor de fundo dos botões laranja é para as ações principais; muda só a letra, se se quiser manter a identidade.

### C5 — A corrigir — O desconto desligado parece o selecionado e o ícone quase desaparece
- **Imagem:** `desconto.png`, 4.º botão da barra (≈ x 600–760, y 2370–2510 em px de ecrã).
- **Onde:** `style.css:239` (`button:disabled { opacity: .45 }`) e `:237` (`img { opacity: .4 }`), por cima de `aria-pressed` a ouro.
- **Regra:** estados distintos, e o desligado «com contraste reduzido mas legível, mais explicação» (`ui.md` §4.4).
- **Medida:**
  - o fundo medido é `#f0d47f`, com 1,15:1 contra o ouro do selecionado (o botão das trocas, ao lado, está a `#f2c230`);
  - o ícone fica com 1,36:1, porque as duas opacidades multiplicam-se para 0,18.
- **Proposta:**
  - durante o desconto, tirar o `aria-pressed` ao botão do desconto, ou mostrá-lo selecionado sem o desligar;
  - no estado desligado, usar fundo `--paper-3` e ícone a `--muted`, com ≥ 3:1 e sem opacidades encadeadas;
  - explicar no `title` («Sem descontos de tempo»).

### C6 — A corrigir — Palavras a flutuar, douradas, sobre a madeira
- **Imagem:** `momento-movimento.png`, «CROSSOVER» (x 310–530, y 232–272).
- **Onde:** `match-view.ts:1623-1624`: só uma sombra de tinta a +1,+1.
- **Regra:** contraste do texto (4,5:1) e leitura sobre fundos que mudam (SKILL, Pixel art e Interface).
- **Medida:**
  - o ouro `#f2c230` contra a madeira (`#b77f44`, `#ca8e4f`) dá 1,67 a 2,04:1;
  - as arestas de cima e da esquerda das letras tocam diretamente na madeira (ampliação).
- **Proposta:** um contorno de tinta de 1 píxel nas 8 direções (desenhar o texto a tinta nos 8 deslocamentos antes do ouro). O mesmo serve para o «+2».

### C7 — A corrigir — Emblemas do marcador a 14 px vindos de 32
- **Imagem:** `ref-360-jogo.png`, marcador (x 80–290, y 0–40): o emblema da CLA sai deformado.
- **Onde:** `hud.ts:34` e `:36`: `style="width:14px;height:14px"` sobre `emblemImage` de 32 px.
- **Regra:** escala inteira, sempre. Está na lista de lacunas de `codigo.md` e continua por corrigir.
- **Proposta:** gerar uma versão nativa de 16 px do emblema, ou mostrar o de 32 px a 16 px CSS só a DPR ≥ 2. A versão nativa é melhor.

### S1 — Sugestão — O nome do movimento aparece duas vezes, e o aviso tapa a jogada
- **Imagem:** `momento-movimento.png`: o «CROSSOVER» flutua (`match-view.ts:588`) e ao mesmo tempo surge o aviso «Crossover!» (`#banner`). O aviso, com `bottom: 24%` (`style.css:136`), cobre os jogadores em x 400–440, y 380–490.
- **Proposta:** escolher um dos dois para os movimentos; se ficar o aviso, mais pequeno ou encostado ao fundo quando a bola está na metade de baixo. Só visual.

### S2 — Sugestão — O intervalo repete o mesmo ícone
- **Imagem:** `intervalo.png`: «Adversário» e «Estatísticas» usam ambos `ICON_BALL` (`menus.ts:448` e `:450`).
- **Regra:** ícones reconhecíveis e distintos.
- **Proposta:** um ícone de barras ou de prancheta para as estatísticas.

### S3 — Sugestão — `translateX(-50%)` no marcador
- **Onde:** `style.css:102` (`.scorebug`), e também `:904`, `:1217`.
- **Regra:** lista de `ui.md` §10: nenhum `translate(-50%)`. Com uma largura ímpar, a caixa cai em meio píxel. Não medi desfoque nas capturas, onde as arestas estavam limpas.
- **Proposta:** `left: 0; right: 0; margin-inline: auto; width: fit-content`, como já faz o `#banner`.

### S4 — Sugestão — Os balões da bancada podem passar por baixo do marcador
- **Onde:** `match-view.ts:1600`, `Math.max(28, …)`. A caixa começa em y − 7 = 21, e o marcador ocupa y 6–36 (`style.css:96-108`) e cerca de x 90–270 a 360 px.
- **Proposta:** limitar a 40, como as palavras a flutuar (`:1621`), ou afastar o balão do centro em x. Não foi visto a acontecer.

### S5 — Sugestão — Separador «Stats» em inglês, e nenhum selecionado no desconto
- **Onde:** `main.ts:493` («Stats») e `main.ts:491`: `aria-selected` fica falso em todos durante o desconto, e os separadores parecem ativos (`desconto.png`).
- **Regra:** português de Portugal; o estado selecionado sempre visível.
- **Proposta:** «Números» ou «Estat.»; e, durante o desconto, mostrar os separadores atenuados ou marcar o «Banco».

### S6 — Sugestão — O fundo do prognóstico deixa ver o campo
- **Imagem:** `ref-360-jogo.png`: a linha central atravessa a caixa.
- **Onde:** `match-view.ts:791`, `rgba(27,34,48,0.88)` e um literal fora dos tokens.
- **Proposta:** tinta opaca (`INK`).

### S7 — Sugestão — Hífen partido no adjunto
- **Imagem:** `intervalo.png`: «Fecha-» numa linha e «te em zona» na seguinte.
- **Proposta:** envolver as formas com hífen num `<span style="white-space:nowrap">`.

### S8 — Sugestão — No resultado, «14/25 · 2 pontos · 15/28» não diz o que é
- **Imagem:** `fim.png`, y ≈ 1830.
- **Proposta:** a linha do fim não tem título nem legenda. Dar-lhe um rótulo, como no separador de estatísticas, ou tirá-la do resultado. Só visual.

## Visto e sem problemas
- Os ícones da barra do treinador estão a exatamente 2× ao alto (DPR 3: píxeis múltiplos de 6 px de ecrã) e a 4× em 1920×1080.
- A barra só tem ícones, e a velocidade mostra «X1» (decisão do utilizador).
- O campo tem escala inteira em todos os esquemas: ao alto `finalScale = 1` e 1:1, e deitado `ceil(·dpr)/dpr`.
- Os alvos de toque têm ≥ 44 px ao alto, e as linhas 34.
- Contrastes que passam:
  - o ouro do marcador sobre tinta, 9,5:1;
  - o «P1» sobre `--ink-2`, 7,5:1;
  - os separadores, 11:1;
  - a etiqueta de nome da casa, 5,2:1, e a de fora, 4,51:1, no limite;
  - a letra apagada, 6,1:1;
  - o relógio dos 24 s urgente, 4,6:1.
- Os acentos dos balões («JÁ VIMOS PIOR») e do aviso («Afundanço!») estão desenhados e não se cortam.
- O «+2» junto ao aro lê-se bem contra a parede escura.
- O nome de quem tem a bola, em baixo à esquerda, não choca com o aviso.
- No resultado em 1280×720, o campo e o painel ocupam a janela toda.

## Não verificado
- As etiquetas de nome no ecrã, que precisam de um toque e não estão em nenhuma captura. Só li o código.
- A seta de quem tem a bola, frame a frame, e o tremor do afundanço a 4×.
- O alto contraste e a letra grande no ecrã de jogo.
- A simulação de daltonismo na barra do prognóstico (azul contra vermelho).
- O foco do teclado na barra do treinador.
- O ecrã de resultado ao alto em 360×640.
