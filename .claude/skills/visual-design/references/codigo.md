# A arte, a animação e a UI do Pocket Basketball no código

Retrato do código em novembro de 2026. As linhas mudam; confirma-as antes de mexer.

## Ao contrário do que se podia pensar

- **`palette.ts` só tem `INK = '#1b2230'`.** As outras cores estão escritas nos ficheiros que as usam: cerca de 440 literais hex.
- **O campo do jogo não é isométrico.** É uma câmara em perspetiva calculada píxel a píxel («Modo 7»), em `court.ts`. Isométricos (2:1) são só a cidade (`town.ts`) e as cenas dos menus (`scenes.ts`).
- **O preenchimento ao centro do píxel existe só em `fillPolygon`** (`court.ts`) e no traçado das linhas do campo.

## Cores

- **Tokens CSS** (`style.css`, no topo):
  - **Tinta:** `--ink #1b2230` e `--ink-2 #2a3347`. Nunca uses preto puro.
  - **Papel:** `--paper #f8f0d8`, `--paper-2 #efe3c2`, `--paper-3 #e4d5ad` e `--line #cbb98e`.
  - **Bola:** `--ball #e8622a`, só para a bola e as ações principais.
  - **Ouro:** `--gold #f2c230`, para a nota S, os combos, a seleção e os momentos raros.
  - **Bom e mau:** `--good #3f9d58` e `--bad #cf4436`.
  - **Equipas:** `--home #2b5fd9` e `--away #cf3a2c`.
  - **Pintura do campo:** `--paint #17737a` e `--paint-dk #0f5560`.
  - **Quadro de giz e madeira:** `--board #17564f`, `--wood #a06a2c` e `--chalk #f4f1e4`.
- **Fontes da interface:** «Jersey 10», «Jersey 20» e «Jersey 15», das Google Fonts.
- **A paleta pensada no estudo visual** (`docs/03-estudo-visual.html`):
  - madeira `#dca35c` e `#b87c3e`;
  - pintura `#17737a` e `#0f5560`;
  - bola `#e8622a`;
  - papel `#f8f0d8`;
  - tinta `#1b2230`;
  - ouro `#f2c230`.
- **Notas**, em `style.css` com os limites em `sim/types.ts`. A escala é quente, com contraste, e foi decisão do utilizador:

  | Nota | Valor mínimo | Fundo | Texto |
  |---|---|---|---|
  | S | ≥ 84 | `#f2c230` | tinta |
  | A | ≥ 67 | `#b8322a` | branco |
  | B | ≥ 50 | `#f08a3c` | tinta |
  | C | ≥ 34 | `#3f9d58` | tinta |
  | D | ≥ 17 | `#2a6fa8` | branco |
  | E | < 17 | `#b5b0a5` | tinta |

- **Pele e cabelo** (`sprites.ts`): `SKINS` são 4 pares de tom e sombra, e `HAIRS` são 6 cores. **Atenção:** o público usa outra tabela, `SKIN_TONES` em `court.ts`, com valores diferentes.
- **Equipamentos:**
  - `KITS` em `sprites.ts` (o azul, o creme, os treinadores, os adeptos e o árbitro);
  - `ClubKit` em `kit.ts` (camisola, segunda cor, padrão, debrum e calções);
  - `PALETTE` em `kit.ts`, as 12 amostras do editor;
  - `shadeOf`, que dá a sombra (×0.72), e `isLight`, que diz se a cor é clara (luma acima de 150);
  - `SETS` em `identity.ts`, os 16 trios de cores dos clubes.
- **Outras cores:**
  - categorias de cartas: `CATEGORY_INFO` em `cards.ts`;
  - ligas: bronze, prata e ouro, em `leagues.ts`;
  - pavilhões: `THEMES` em `court.ts`, um por divisão, mais o `CLOSED_GYM`.

## Píxeis

- **Escala sempre inteira** (`layout.ts`):
  - No vertical, a escala é `floor(min(largura/360, altura/640) · dpr) / dpr`, aplicada como `zoom` CSS.
  - Passa a horizontal quando a largura dividida pela altura chega a 1,2.
  - O campo base tem 360×216 píxeis.
  - `setCanvasSize` volta a pôr `imageSmoothingEnabled = false` sempre que muda o tamanho.
- **`fillPolygon`** (`court.ts`) pinta cada píxel cujo centro (y + 0,5) cai dentro do polígono. Assim, duas faces que partilham uma aresta não deixam buracos nem se sobrepõem, e uma aresta isométrica sobe sempre 2 píxeis por linha. Está testado em `court.test.ts`.
  - **Usa-o** em vez de `fill()` do canvas, que faz anti-aliasing.
  - **`pixelLine`** traça linhas retas.
- **`remember()`** (`cache.ts`): um `Map` com limite que esquece o mais antigo. Há caches que ainda são `Map` sem limite, como as de `cards.ts`, `icons.ts`, `leagues.ts` e `identity.ts`.
- **`image-rendering: pixelated`** em todo o `img` e `canvas` de arte.

## Fonte de píxeis (`font.ts`)

- **Formato:** 3×5, um algarismo por linha a dizer quais dos 3 píxeis se acendem.
  - Tem `0–9`, `A–Z` e `: - + . ' ! ?`.
  - Os acentos ocupam 8 linhas: o acento, um espaço e a letra (Á À Â Ã É Ê Í Ó Ô Õ Ú). O Ç ocupa 6.
  - O `%` é largo (5×5).
  - **Só tem maiúsculas.**
- **Desenho e tamanhos:** `text(g, valor, x, y, cor, escala = 2)` desenha e `textWidth` mede.
  - Escala 1× nas etiquetas de nome e nos números dos ícones; 2× na maior parte; 3× nos pontos que flutuam.
  - O estilo da casa é texto dourado com uma sombra de tinta de 1 píxel.
  - **Deixa sempre espaço por cima do texto para os acentos.**

## Bonecos e animação

- **A grelha do boneco** (`sprites.ts`):
  - mede 34×46, com os pés no ponto (17, 43);
  - `buildSprite` pinta pernas, braço de trás, tronco, cabeça, cabelo, olhos, braço da frente, objetos e bola;
  - no fim junta um contorno de tinta automático de 1 píxel.
- **Proporções:**
  - `pixelsForHeight` (`body.ts`) dá 1 píxel por 7,5 cm, entre 20 e 30 píxeis;
  - `BUILDS` tem os quatro corpos;
  - os jogadores usam sempre o corpo `athletic`.
- **`Look` e `lookOf`:** tudo semeado pelo hash do nome. Há 5 estilos de cabelo.
- **Poses:** `PoseShape` (não exportado) diz onde ficam as mãos (`a`, `b`) em relação aos ombros, os pés (`f`, `g`) em relação à anca, e os opcionais `jump`, `ball` e `prop`. `POSES` tem cerca de 70 poses: corrida, drible, poste, quedas, lançamentos, defesa, passes, reações e treinador.
- **Ciclos** (`match-view.ts`):
  - `RUN_FRAMES` é run0, run1, run2, run1;
  - `DRIBBLE_RUN_FRAMES` e `HOLD_RUN_FRAMES` funcionam da mesma maneira;
  - na cidade, `WALK_FRAMES` dura 170 ms por frame.
- **Tempo:**
  - **A simulação** corre a 20 ticks por segundo (1 tick = 50 ms = 3 frames a 60 fps).
  - **`animTick`** avança com o tempo da simulação, por isso a 2× e 4× tudo acelera e na pausa tudo para. Nos descontos e intervalos avança com o tempo real.
  - **A corrida** troca de frame a cada `tick/2.5`, ou `/1.6` em sprint.
  - **As poses de exceção** duram ticks contados. As constantes estão no topo de `match-view.ts`: `SWISH_TICKS`, `PASS_POSE_TICKS`, `SHOT_JUMP_TICKS`, `TURN_LOCK_TICKS` (12, para o boneco não trocar entre frente e costas depressa demais) e outras.
- **Arcos:**
  - salto do lançamento: `-6 + 4·14·t(1-t)`;
  - afundanço: `√` na subida e queda linear;
  - ressalto: `4H·t(1-t)`;
  - a altura da bola vem da simulação, interpolada;
  - o passe picado mergulha com `sin(πt)`;
  - o lançamento deixa um rasto de 6 quadrados dourados.
- **Câmara:** segue com `1-exp(-s·2.2)`.
- **Efeitos:**
  - pó, pontos e nomes de jogadas a flutuar, flashes de fotografia, tremor no afundanço, balões de fala, etiquetas de nome, cão, pombo e mascote;
  - na cidade: neve, luzes de Natal e janelas à noite;
  - nas cenas: vapor e uma lâmpada a piscar;
  - no CSS: `banner-in steps(4)` e os efeitos dos combos.
- **Movimento reduzido:** `reducedMotion()` em `settings.ts` lê a definição do jogo ou o sistema.
  - **O que congela:** o público, os adeptos e a chuva; tiram-se os flashes e o tremor.
  - **O que fica:** as barras de ganho do treino continuam, de propósito.
- **Problema conhecido:** o tremor do afundanço conta em ticks (`shakeUntil = tick + 8`). A 4× dura 100 ms e oscila a 40 Hz, por isso vê-se como um zumbido. Efeitos de ecrã devem contar em tempo real, ou desligar-se acima de 2×.

## Campo, cidade e cenas

- **O campo** (`court.ts`):
  - câmara de lado com distância focal fixa, para os bonecos manterem o tamanho;
  - o chão tem 32 texels/m, com mip-mapping;
  - as bancadas têm 5 frames de público;
  - as linhas são desenhadas a 1 píxel depois da textura;
  - `clubVenue` varia o pavilhão de cada clube a partir do emblema;
  - `underSky` trata a noite, o fim de tarde e o sol.
- **Profundidade:** `drawables` são ordenados pelo y no ecrã. O cesto divide-se em metade de trás e metade da frente, para a bola passar por dentro.
- **A cidade** (`town.ts`):
  - projeção isométrica com `tw = 2·th` e `th` entre 4 e 6;
  - primitivas `prism`, `flat`, `hipRoof`, `disc`, `tree` e `house`;
  - o chão pinta-se uma vez;
  - os objetos ordenam-se por i+j;
  - `weatherFor(semana)` dá tom, neve e luzes. **Sem chuva, por decisão do utilizador.**
- **As cenas** (`scenes.ts`): isométrico com `th` 6, `iso()`, `depthOrder` e atores com pequenas rotinas.

## Identidade

- **Emblemas** (`kit.ts`):
  - grelha de 32×32, com 8 formas e 11 padrões;
  - bordo de tinta, claro ou dourado;
  - símbolos em grelhas ASCII: 10×10 no editor e 14×14 nos 21 reservados aos clubes da liga;
  - no máximo 3 letras.
- **Identidade dos clubes** (`identity.ts`): forma, padrão, símbolo e bordo saem do índice do clube. `kitAgainst` troca para o equipamento alternativo quando as cores estão perto demais (distância RGB abaixo de 140).
- **Padrões de equipamento:** `usesSecond` e `usesSecondOnBody`. O desenho plano está em `wardrobe.ts`; nos cacifos das cenas há uma versão isométrica.
- **Retratos** (`portrait.ts`):
  - 28×28, com 4 formas de cara;
  - os traços saem dos bits de `look.face`;
  - o humor muda só as sobrancelhas e a boca;
  - mostram-se a 5× e 3×.
- **Cartas** (`cards.ts`): 40×44, com a cor da categoria e uma faixa diagonal.
- **Troféus** (`trophies.ts`): taça, taça grande, prato e prémio.

## Interface

- **Ecrãs:** são texto HTML posto com `innerHTML`. Em `menus.ts` cada ecrã devolve `{ top, bottom, after? }`. Construtores pequenos: `inside()`, `fullCanvas()`, `bar()`, `backBtn`, `grade()`, `slotBadge`; em `panel.ts`, `escapeHtml`.
- **Componentes** (`style.css`):
  - **Botões:** papel, borda de tinta de 2 píxeis e sombra dura de 2 píxeis, com 44 píxeis de altura mínima. Ao carregar descem 1 píxel.
  - **Selecionado** (`aria-pressed` ou `aria-selected`): ouro, texto em tinta e anel de tinta por dentro.
  - **Outros:** `.primary` (cor da bola), `.tabs` e `.chalktabs`, e a `.coachbar` (ícones de 16 píxeis mostrados a 32, exatamente 2×).
  - **Linhas:** `.srow` (trocas) e `.prow` (plantel, com 34 píxeis, decisão do utilizador).
  - **Painéis e barras:** `.note` (cabeçalho de tinta e interior com scroll), `.mbar`, `.actions`, `.say`, `.empty-state` e `.chalk`.
- **Ícones** (`icons.ts`): grelhas ASCII em que `#` é a cor, `o` o laranja da bola e qualquer outro carácter que não seja `.` é tinta. O utilizador decidiu que **a barra do treinador tem só ícones, sem texto**, com uma exceção: a velocidade mostra «X1/X2/X4».
- **Acessibilidade:**
  - foco com contorno dourado de 3 píxeis (4 píxeis de tinta em alto contraste);
  - separadores com `role=tablist` e setas;
  - `#live` com `aria-live=polite`, no máximo uma mensagem a cada 3 s;
  - o campo é `role=img` com o marcador no `aria-label`;
  - botões de ícone com `aria-label` e `title`;
  - atalhos em `keys.ts` (o `?` mostra a ajuda);
  - alvos de toque de 44 píxeis.

## O que se verifica

- **`npm run browser-check`** fotografa tudo para `dist-check/` e verifica:
  - botões sem nome e imagens sem `alt`;
  - que nada sai da janela na horizontal;
  - que tudo cabe em 360×640, com toques de pelo menos 44 píxeis, ou 34 nas linhas;
  - que 1280×720, 1920×1080 e 844×390 se preenchem;
  - um frame abaixo de 16 ms com o processador abrandado 4×;
  - que o boneco não troca entre frente e costas em menos de 0,5 s;
  - os 4 frames do drible a correr;
  - 12 retratos diferentes;
  - as definições de alto contraste, letra grande e movimento reduzido;
  - os acentos.
- **`npm run anim-check`** grava as poses (24 das cerca de 70, por 3 aspetos), as jogadas especiais em tiras de 8 frames, os pavilhões, a cidade e o tempo. Só falha se a página der erro.
- **Testes de unidade de arte:** `cache`, `body`, `identity`, `court` (com `fillPolygon`) e `town`. **Não há testes** para os bonecos, os retratos, a fonte, os padrões de equipamento, as cartas nem os ícones.

## Convenções

- **Língua:** comentários e textos em português de Portugal, identificadores em inglês, e um comentário de uma linha a dizer o porquê.
- **Originalidade:** toda a arte é original e gerada por código. Os patrocinadores e as cartas são inventados.
- **Determinismo:** a arte é semeada por hashes do nome, do emblema, da semana e do jogo.
  - O único `Math.random` na arte são os flashes de fotografia.
  - Fora de `src/sim/` pode-se usar `Math.sin` e funções semelhantes.
  - As funções de cena recebem `now`, por isso com `now = 0` dão uma imagem parada.
- **Números:** em CONSTANTES no topo de cada ficheiro.
- **Nomes:**
  - `draw*` pinta num contexto;
  - `*Image` devolve um data URL guardado em cache;
  - `*Canvas` devolve um canvas;
  - os frames de pose acabam em algarismo.
- **Ofício:**
  - contorno de tinta de 1 píxel, nunca preto;
  - sombra debaixo das figuras;
  - sombras duras na interface, sem desfoque;
  - nada de rotações, exceto os frames de queda.

## Lacunas e incoerências conhecidas

- **Cores fora de tokens:** cerca de 440 literais. A tinta está escrita à mão mesmo onde `INK` foi importado, e o CSS tem cores soltas ao lado dos seus próprios tokens.
- **Diferenças face ao estudo visual:** `--bad` é diferente de `--away`, e o cabelo 6 não bate certo com o estudo.
- **Auxiliares duplicados:**
  - `mix`, `lighten`, `shade` e o parse de hex;
  - o hash do nome;
  - a bola, desenhada 5 vezes;
  - a projeção isométrica e `disc`, em `town.ts` e `scenes.ts`;
  - o contorno automático;
  - funções locais `rect` e `px`;
  - o desenho de letras, em `font.ts` e `court.ts`.
- **Escalas não inteiras:**
  - `.face` passa de 14 para 20 píxeis;
  - emblemas de 32 mostrados a 24, 20, 18, 16 e 14 píxeis;
  - `.gcard img` passa de 40×44 para 46×38.
- **Desenho com anti-aliasing:** `drawTacticsBoard` e a seleção do guarda-roupa usam traço vetorial suave.
- **Código morto:** a chuva em `town.ts` e `match-view.ts`, e o resto de `crowdColor`.
- **Poses fora do `anim-check`:** fica de fora a maioria das cerca de 70.
