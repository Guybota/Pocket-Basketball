# Revisão: menus e ecrãs fora do jogo — v1

**Pedido:** revisão da interface fora do jogo (título, cidade, escritório, plantel e ficha, treino e cartas, mercado, renovações, adversário, federação e quadros, definições, aeroporto, resultados, fim de época), commit `fd8abd6`
**Veredicto:** NÃO PASSA — 3 bloqueantes, 10 a corrigir, 10 sugestões
**Material:** capturas de `dist-check/` (390×844 a dpr 3, `ref-360-*`, 1280×720, 1920×1080, 844×390), `src/ui/style.css`, `src/ui/menus.ts`, `src/ui/layout.ts`. Não corri o `browser-check`.
**Medidas:** contraste WCAG de todos os pares de tokens usados como texto ou controlo (script `contrast.py`) · comprimentos de corrida de píxeis iguais nas capturas, para escalas não inteiras (`runs.py`) · alturas e larguras dos alvos a partir das capturas e do CSS · espaços fora da escala (regex sobre o CSS) · literais hex.

Os ficheiros auxiliares (recortes `c_*.png`, montagens `m*.png`, scripts) estão na mesma pasta deste relatório.

## Problemas

### B1 — Bloqueante — «Bola ao alto» cortado no balneário em 360×640
- **Imagem:** `ref-360-balneario.png` (recorte `c_b360.png`)
- **Onde:** `.menu` do balneário (`menus.ts:447-455`); o botão `.mbar.go` só mostra y 557–579 (22 de 46 px), o resto fica por baixo da barra `.actions` (começa em y 579).
- **Regra:** SKILL «Interface»: testa em 360×640, *tem de caber*; ações principais ao alcance do polegar e à vista. A ação mais frequente da semana fica escondida.
- **Medida:** área do `.menu` = 240 px (y 339–579); precisa de 8 + 5×46 + 4×6 + 8 = 270 px. O `browser-check` não o apanha porque faz `scrollIntoView` antes de medir.
- **Proposta:** pôr «Bola ao alto» na barra de baixo, ao lado do «Voltar» (como «Treinar», «Contratar», «Jogar» noutros ecrãs), e deixar no `.menu` só as 4 entradas; ou, no mínimo, `.menu.tight` com o «go» `position: sticky; bottom: 0`. Acrescentar ao `browser-check` em 360×640 uma verificação de que `#kickoffBtn` está todo dentro da janela sem scroll.

### B2 — Bloqueante — Telemóvel deitado: o painel encolhe para 0,7×
- **Imagem:** `landscape-telemovel-deitado-treino-lista.png` (recorte `c_land.png`), `landscape-telemovel-deitado-balneario.png`, `-treino.png`
- **Onde:** `layout.ts:109`, `ui = viewHeight < 600 ? Math.max(0.7, viewHeight / 600) : …` → `panel.style.zoom = 0.7` em 844×390.
- **Regra:** SKILL «Interface» (toque ≥ 44, listas a 34 por decisão); `ui.md` §9 (texto ≥ 12 px, mínimo absoluto 24×24); SKILL «Escala inteira, sempre».
- **Medida:** passo entre linhas da lista = 24 px (separadores em y 37, 61, 85…), ou seja `.prow` de 34 → 23,8 px, abaixo dos 34 decididos e do mínimo AA de 24; botões da barra 44 → 30,8 px; letra de 15 px → 10,5 px; ícones de 16 mostrados a 32 → 22,4 px (escala 1,4×, não inteira).
- **Proposta:** em altura < 600, não encolher o painel: manter `ui = 1` (ou 2 com dpr) e deixar o painel rolar, ou reduzir a largura do campo; o encolhimento só para baixo de 1 quando `pointer: fine`. Acrescentar a medição de alvos do `browser-check` ao contexto 844×390 (com `hasTouch`).

### B3 — Bloqueante — Texto laranja (`--ball`) sobre papel abaixo de 3:1
- **Imagens:** quase todos os ecrãs: `escritorio.png` («Direção do clube · 60%», «Presidente»), `cidade.png` («Secretária»), `plantel.png` (`.kv b` «Equilibrado», «Penetrador»), `fim-cartas.png` («Ganha Portela Basket»), `fim-epoca.png` («Ficam onde estão»), `trofeus.png` («Liga Iniciados (por ganhar)»), `treino-jogador.png` (`.info b`), `adversario.png` («Homem a homem»).
- **Onde:** `style.css` — `.say b`, `.kv b`, `.move b`, `.info b`, `.cityp p b`, `.fedstyle b`, `.tnote b`, `.subs-title`, `.winner`, `.club-week b`, `.qt .tot`, `.lastcombo b`, `.mvp.farewell b`, `.gainrow` etc.
- **Regra:** SKILL «Contraste: 4,5:1 em todo o texto (a regra do texto grande não vale para fontes bitmap finas)».
- **Medida:** `#e8622a` sobre `--paper` 2,97:1; sobre `--paper-2` 2,65:1; sobre `--paper-3` (`.kv b`) 2,32:1. O alto contraste não mexe no `--ball`.
- **Proposta:** novo token `--ball-ink: #a8401a` para texto laranja (5,40 em paper, 4,82 em paper-2, 4,22 em paper-3 — em paper-3 usar paper-2 como fundo de `.kv` ou `#9a3412`, 6,4:1, que já existe em `.tower-copy.stale`); `--ball` fica para a bola, os fundos dos botões e a arte.

### C1 — A corrigir — Letra branca nos botões laranja
- **Imagens:** `titulo.png` («Criar clube»), `balneario.png` («Bola ao alto · Começa o jogo»), `mercado.png`, `renovacoes.png`, `fim-epoca.png`
- **Onde:** `button.primary` (`style.css:220`), `.mbar.go` e `.mbar.go small` (`#ffe0c8`), hover `#f07238`.
- **Regra:** 4,5:1 em todo o texto.
- **Medida:** `#fff`/`#e8622a` 3,38:1; `#ffe0c8`/`#e8622a` 2,70:1; `#fff`/`#f07238` (hover) 2,93:1.
- **Proposta:** fundo dos primários em `#b8481c` (branco 5,27:1) com hover num passo mais claro que ainda dê ≥ 4,5, ou letra `--ink` sobre o laranja atual; o `small` do `.mbar.go` em `#fff`.

### C2 — A corrigir — Verde, vermelho e posições abaixo de 4,5:1
- **Imagens:** `renovacoes.png` («Sobra 75 mil» verde, «599 mil» vermelho em `paper-3`), `fim-epoca.png` («Falhado · −8%»), `federacao-calendario.png` (derrotas «28-42»), `treino-lista.png` (`.ppos` EXT e BAS), `substituir.png` (`.fit-*`)
- **Regra:** 4,5:1 em todo o texto; nunca só cor.
- **Medida:** `--good` em paper 2,99, paper-2 2,66, paper-3 2,34 (`.gain`, `.won`, `.prow.trained .name`, `.gainrow b`); `--bad` em paper 4,07, paper-2 3,63, paper-3 3,18 (`.lost`, `.hint.warn`); `.chalk .lost #ff9c8c`/`--board` 4,19; `.ppos-EXT` branco/`--good` 3,40; `.ppos-BAS/ESC` branco/`#2b7fb8` 4,35; `.fit-good #2f9b6a` 3,07; `.fit-mid #c98a12` 2,59; `.fit-low` 4,30.
- **Proposta:** tokens de texto `--good-ink: #2a7040` (5,29 em paper, 4,13 em paper-3) e `--bad-ink: #b03a2e` (5,28 / 4,13); nas linhas de `paper-3` subir o fundo para `paper-2` ou usar uma tinta mais escura; `.chalk .lost` → `#ffb3a6`; `.ppos-EXT` com letra `--ink` (4,68); `.ppos-BAS` `#256f9f`.

### C3 — A corrigir — Contorno de foco dourado invisível sobre papel
- **Onde:** `button:focus-visible { outline: 3px solid var(--gold) }` (`style.css:218`), em todos os menus de papel.
- **Regra:** SKILL «3:1 em controlos, ícones e foco»; `ui.md` §10 (`:focus-visible` ≥ 2 px e 3:1).
- **Medida:** `--gold`/`--paper` 1,47:1 (só passa sobre `--paint-dk`, 5,04:1). Sobre os botões `.primary` 2,02:1.
- **Proposta:** manter o ouro (é a regra do projeto) e juntar um anel de tinta por fora, como já se faz no `.gcard[aria-pressed]`: `button:focus-visible { outline: 3px solid var(--gold); outline-offset: 1px; box-shadow: 0 0 0 6px var(--ink); }`.

### C4 — A corrigir — Linhas do aeroporto ficam brancas sobre papel ao passar o rato
- **Imagem:** `aeroporto-historico.png`, linha «SUP 10 Ribeiro», y 1840–1900 (recorte `c_ribeiro.png`)
- **Onde:** `menus.ts:402` gera `<div class="prow">` dentro de `.chalk`; `.prow:hover { background: var(--paper-2) }` (`style.css:1110`) pinta o papel e o nome continua cor de giz; o `.chalk button:hover` não apanha `div`s.
- **Regra:** contraste 4,5:1; estados consistentes (uma linha que não é botão não devia ter hover).
- **Medida:** fundo `#efe3c2`, letra `#f4f1e4` → 1,13:1.
- **Proposta:** `.prow:hover` só em `button.prow:hover`, ou `.chalk .prow:hover { background: rgba(244, 241, 228, .14); }`.

### C5 — A corrigir — 1280×720: painel a 1,25×, ícones a 2,5×
- **Imagem:** `landscape-1280x720-treino-lista.png`, barra de baixo (recorte `c_l1280.png`)
- **Onde:** `layout.ts:109` arredonda a quartos: `floor(1280·4/960)/4 = 1,25`.
- **Regra:** SKILL «Escala inteira, sempre»; «na barra, ícones a exatamente 2×».
- **Medida:** corridas de píxeis iguais nos ícones de 2 e 3 px de ecrã misturadas (2: 111, 3: 107) → 16 px a 40 px, 2,5×. Em 1920×1080 dá 4 e 8 (inteiro).
- **Proposta:** arredondar `ui` a inteiros (`Math.floor`) quando o painel tem arte; ou mostrar as imagens do painel com tamanho calculado para múltiplos inteiros de `1/ui` (por exemplo `img { width: calc(32px / var(--ui) * round(var(--ui)*2)/2) }`), mais simples arredondar a 1 ou 2.

### C6 — A corrigir — Imagens mostradas a escalas não inteiras (fora das já conhecidas)
- **Onde e medida** (tamanho próprio → mostrado):
  - `.lastcombo img` 40×44 → 64×64 (1,6 × 1,45, deforma a carta); `treino-combos.png`, corridas de 4, 5 e 6 px de ecrã.
  - `.createplayers img` (`spriteImage`, 24 de largura) → 68×92 (2,83×), e 51×69 abaixo de 700 px de altura; `criar-clube.png`, corridas de 8, 9 e 17 px.
  - `.say img` retrato 28 → 40 (1,43×); `.cityp .say img` e `.town-note .say img` → 32 (1,14×); `instalacoes.png`, corridas de 4 e 6 px.
  - `.fedleft .pportrait` 28 → 64 (2,29×), `federacao-tabela.png`.
  - `.slot img` cartas 40×44 → 32×35 (0,8×), `treino-jogador.png`.
  - `.grades img` com `width: 100%` → ≈ 30,9 px por coluna em 390 px (ícone de 16 a ≈ 1,93×).
- **Regra:** SKILL «Escala inteira, sempre»; `ui.md` §10 «Esquema e escala». (As já conhecidas — `.face`, emblemas a 24/20/18/16/14, `.gcard img` — estão em `codigo.md`, «Lacunas», e não as conto aqui.)
- **Proposta:** `.lastcombo img` 80×88 (2×); `.createplayers` com o canvas de 34×46 a 2× (68×92) e 34×46 a 1× abaixo de 700 px, ou `spriteImage` a 72 de largura (3×); retratos de 28 a 28, 56 ou 84 (`.say img` 56 ou 28; `.fedleft` 56); `.slot img` 40×44; `.grades img` com `width: 16px` ou `32px` centrado na coluna.

### C7 — A corrigir — Alvos estreitos no editor de emblema e de equipamento
- **Imagens:** `emblema.png` (setas ‹ › do «Desenho»), `emblema.png` e `equipamento-editor.png` (fila de 12 cores)
- **Onde:** `.pager > button` (`style.css`, `grid-template-columns: 24px 1fr 24px`); `.swatches` 12 colunas com `gap: 2px`.
- **Regra:** SKILL «Toque: pelo menos 44×44 px CSS … e 8 px entre alvos».
- **Medida:** setas com 24 px de largura (72 de altura); cada cor com 28 px de largura (84 px de ecrã, da borda à borda, em `c_eq_chip.png`) e 2 px entre elas. O `browser-check` mede só a altura dos alvos, por isso passa.
- **Proposta:** setas com 36–44 px (o grid de desenhos passa a 5 colunas ou as setas vão para baixo); cores em 2 filas de 6 (≈ 50 px) com `gap: 6px`. Acrescentar a largura ao `shortTargets` do `browser-check`.

### C8 — A corrigir — Etiquetas dos quadros de taça e playoffs com 5 px
- **Imagens:** `federacao-taca.png`, `federacao-continental.png`, `playoffs-quadro.png` (recorte `c_taca.png`)
- **Onde:** `src/ui/art/bracket.ts` (letra do `font.ts` a 1×: «QUARTOS», «MEIAS», «FINAL», abreviaturas das equipas).
- **Regra:** `ui.md` §9 «Texto de corpo no telemóvel: mínimo legível 12 px»; «fonte bitmap confortável ≈ 7 px de maiúscula».
- **Medida:** «QUARTOS» ocupa 15 px de ecrã a dpr 3 = 5 px CSS de altura.
- **Proposta:** desenhar as etiquetas a 2× (10 px), ou pôr o canvas do quadro a 2×; as abreviaturas das equipas nas caixas também.

### C9 — A corrigir — «Pormenores» cortado no editor de equipamento
- **Imagem:** `equipamento-editor.png` (recorte `c_eq_chip.png`)
- **Onde:** `.chip` dentro de `.chips4` (`style.css`, `.chip { … overflow: hidden; text-overflow: ellipsis }`); o texto está num nó filho da grelha, por isso corta sem reticências.
- **Regra:** `ui.md` §10 «Texto: as palavras mais compridas cabem sem cortes em 360 px». Em 390 já corta o «s»; em 360 corta mais.
- **Proposta:** `.chips4` em 2×2 no editor de equipamento, ou o rótulo «Detalhes»; e pôr `min-width: 0; overflow: hidden; text-overflow: ellipsis` no `span` do rótulo.

### C10 — A corrigir — Selo «0/33» do treino com 11 px, negrito e cantos redondos
- **Imagem:** `treino-lista.png`, `landscape-1280x720-treino-lista.png` (botão dos combos)
- **Onde:** `.actions button.icon .badge { font: 700 11px/1.3 var(--ui); border-radius: 3px }` (`style.css`, barra de ações).
- **Regra:** texto ≥ 12 px (`ui.md` §9); fonte de píxeis sem negrito sintético; cantos retos nas peças de interface (`.note` e `.pcard` são a exceção estabelecida).
- **Medida:** 11 px; `font-weight: 700` sobre uma fonte só com 400 (negrito falso).
- **Proposta:** `font: 400 12px/1 var(--ui-sm); border-radius: 0;`.

## Sugestões

### S1 — Separadores da ardósia sem folga
- **Imagens:** `federacao-tabela.png` (recorte `c_fedtab.png`), `playoffs-quadro.png`. «Classificação» ocupa 71 dos 73 px do separador; com 6 separadores (Pro Liga) os separadores ficam com larguras desiguais, porque o texto empurra o `flex: 1`. Em 360 px os seis ficam com ≈ 331 de 342 px. **Proposta:** «Tabela» em vez de «Classificação», ou `min-width: 0` com reticências; garantir uma captura da federação em 360×640.

### S2 — Espaços fora da escala 1/2/4/6/8/12/16
- **Medida:** 110 declarações de `gap`/`padding`/`margin` fora da escala: 3 px ×62 (`.content`, `.subs`, `.moves`, `.card-stats`…), 5 px ×32 (`.row`, `.pending-list`…), 10 px ×10 (`.start`, `.town-bar`), 7, 9, 14, 18 e 22. **Proposta:** tokens `--s1 … --s16` e trocar 3→2 ou 4, 5→4 ou 6, 10→8 ou 12, em passagens pequenas.

### S3 — Literais que repetem tokens
- `style.css:50` `#1b2230` (= `--ink`), `.grade-S #f2c230` (= `--gold`), `.grade-C #3f9d58` (= `--good`), `.fit-low #cf3a2c` (= `--away`, e o «mau» não deve ser a cor do visitante). 49 literais hex fora do `:root`. **Proposta:** usar os tokens.

### S4 — «Novo clube» ao lado das ações frequentes
- **Imagem:** `escritorio.png`, última entrada do `.menu`. É destrutiva e rara, e fica a 6 px de «Historial». A confirmação é o `confirm()` nativo (`main.ts:397`), fora do estilo. **Proposta:** levar para as Definições ou separar com um espaço de 16 px e cor de aviso; confirmação no estilo do jogo, com o verbo no botão («Apagar e começar»).

### S5 — Quebras de linha a meio de um dado
- `cidade.png`: a nota da secretária parte em «… Liga Iniciados · / 0 V · 0 D», com o ponto no início da linha; `fim-epoca.png`: «Falhado · −8% · / −40 mil». **Proposta:** cada item num `<span style="white-space:nowrap">` e o separador fora dele.

### S6 — Caixa do texto de «Criar clube» encostada à barra
- `criar-clube.png` (recorte `c_criar.png`): a caixa `.quote` não tem margem por baixo e a última linha fica a 0 px da barra de tinta. **Proposta:** `padding-bottom: 6px` no `.editor` ou deixar o texto rolar dentro do painel.

### S7 — Ouro usado para uma ação
- `clube.png`: «Passar a semana ›» é ouro (`#skipWeekBtn`). O SKILL guarda o ouro para S, combos, seleção e raros; a ação principal é laranja. **Proposta:** papel com borda de tinta, ou laranja se for a ação principal da cidade. (Pode ser decisão antiga: confirmar com o utilizador.)

### S8 — Renovações com a lista toda em ouro
- `renovacoes.png`: com todos marcados, o ouro deixa de distinguir alguma coisa. **Proposta:** ouro só nos que estão a ser decididos, ou um visto na coluna da esquerda e fundo papel.

### S9 — Cartas de treino a zero ilegíveis
- `treino-jogador.png`: `.gcard:disabled { opacity: .35 }` torna «Pick&Roll», «Quadro», «Vídeo» quase invisíveis. O WCAG isenta os desligados, mas o nome continua a ser informação (que cartas existem). **Proposta:** opacidade .6 e a arte em cinzento, com o nome em tinta.

### S10 — Historial de treino com marcas invisíveis
- `plantel.png`, `treino-lista.png`: os quadrados de `.history i` (`#cfe6c4`) vazios e as setas `u` em papel têm 1,17:1 entre si; uma semana sem treino e uma semana sem dados parecem iguais. **Proposta:** setas em `--ink-2` e um traço «–» nas semanas sem treino.

## Visto e sem problemas
- Notas S a E (decisão do utilizador): letra/fundo entre 4,68 e 9,51:1.
- `--muted` em paper 6,07, paper-2 5,41, paper-3 4,74; giz sobre ardósia 7,48; `--chalk-2` 5,17; ouro na ardósia 5,05; ouro na tinta 9,51; separadores `.tabs` 11,09.
- Alturas dos alvos em 360×640 nos 7 ecrãs do `browser-check`; linhas de 34 px (decisão); o ecrã de título cabe sem scroll (decisão).
- 1920×1080: painel a 2×, ícones inteiros (corridas de 4 e 8 px).
- Ficha de jogador, barra só de ícones do treino, emblema e equipamentos com seleção em ouro e anel de tinta, coerentes.
- Estados vazios (recordes, troféus, aeroporto) dizem o que é, porque está vazio e o que fazer.
- Acentos sobre maiúsculas nos títulos («TAÇA DA FEDERAÇÃO», «ADVERSÁRIO») com folga; o til que lê como mácron é conhecido.

## Não verificado
- Navegação e ordem de foco com teclado (precisava de correr o browser).
- Alto contraste e letra grande além das capturas `*-contraste-letra` (não as comparei ecrã a ecrã).
- Federação, mercado, renovações, editor e fim de época em 360×640 (não há capturas `ref-360-*` destes); S1 e C9 em 360 são estimados.
- Larguras abaixo de 360 (em `layout.ts` o `finalScale` passa a fracionário, por exemplo 0,89 em 320 px).
- Simulação de daltonismo das capturas.
- O «Despedido · 91%» de `despedido.png` (a confiança alta parece vir do cenário do teste, não da interface).
