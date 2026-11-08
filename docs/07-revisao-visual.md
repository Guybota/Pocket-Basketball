# Revisão visual: menus, interface do jogo, bonecos, animações e identidade

Cinco agentes revisores aplicaram o skill [visual-design](../.claude/skills/visual-design/SKILL.md) ao commit `fd8abd6`, em 8 de novembro de 2026. Primeiro mediram em código e só depois olharam para as imagens. Cada problema tem o sítio exato, a regra que falha e a medida que o confirma.

Os relatórios completos estão em [07-revisao-visual/](07-revisao-visual/). Os caminhos `/tmp/…` que lá aparecem eram da pasta de rascunho da sessão e já não existem.

| Área | Veredicto | Bloqueantes | A corrigir | Sugestões |
|---|---|---|---|---|
| [Menus](07-revisao-visual/menus.md) | não passa | 3 | 10 | 10 |
| [Interface do jogo](07-revisao-visual/jogo-ui.md) | não passa | 1 | 6 | 8 |
| [Bonecos e poses](07-revisao-visual/sprites.md) | passa com correções | 0 | 7 | 5 |
| [Animações](07-revisao-visual/animacoes.md) | não passa | 3 | 9 | 5 |
| [Identidade](07-revisao-visual/identidade.md) | não passa | 1 | 9 | 8 |

Os problemas repetem-se entre áreas, por isso estão aqui agrupados por causa. O número entre parênteses é o do relatório de origem.

## 1. Bloqueantes

1. **O telemóvel deitado encolhe o painel para 0,7×** (menus B2, jogo B1). Em `layout.ts:109`:
   - as linhas descem para cerca de 24 px, quando a decisão é 34;
   - os botões da barra do treinador ficam com cerca de 40×32 px, abaixo dos 44;
   - a letra fica com 10,5 px;
   - os ícones ficam a 1,4×, uma escala não inteira.

   O `browser-check` não testa toques neste tamanho.
2. **Em 360×640, o botão «Bola ao alto» do balneário fica escondido debaixo da barra de baixo** (menus B1). Só se veem 22 dos 46 px. O `browser-check` desliza até ao botão antes de medir, por isso não o apanha.
3. **O texto laranja sobre papel tem pouco contraste** (menus B3, jogo C4): 2,97:1, e 2,32:1 em `.kv b`, contra o mínimo de 4,5:1. Aparece em quase todos os ecrãs. A proposta é um token de letra `--ball-ink: #a8401a` (5,4:1).
4. **Os equipamentos confundem-se para daltónicos** (identidade B1). `kitAgainst` (`identity.ts:58`) e `kitClash` (`airport.ts:99`) comparam em RGB:
   - falham 122 de 492 pares da mesma divisão;
   - com o nosso equipamento verde, falham 27 de 54 clubes.

   A regra `teamsClash` de `cor.md` §11.6 foi testada e não falha nenhum par.
5. **O nome do movimento especial tapa o jogador** (animações B1). Nos 5 movimentos tapa até 34 % do boneco, durante até 47 frames (`drawFloaters`, `match-view.ts:1606`).
6. **O afundanço não tem antecipação nem paragem no aro** (animações B2). Os pés sobem 9 px num frame, o jogador festeja logo no ápice e a queda é linear: uma só pose, quando a tabela pede 6.
7. **Quem afunda desaparece do aro se for substituído no mesmo tick** (animações B3). `addExits` parte do `prev` sem o `lift`.

## 2. A corrigir, por tipo

### Contraste e cor

- **Contraste do texto e dos contornos** (menus C1–C3, jogo C4):
  - texto verde a 2,99:1;
  - texto vermelho a 4,07:1;
  - letra branca nos botões laranja a 3,38:1;
  - contorno de foco dourado sobre papel a 1,47:1;
  - linha do aeroporto ao passar o rato a 1,13:1.
- **Palavras douradas a flutuar sobre a madeira:** 1,7–2,0:1, porque a sombra está só de um lado (jogo C6).
- **Barra do prognóstico e etiquetas de nome:** usam azul e vermelho fixos e contradizem os equipamentos (jogo C3).
- **Botão do desconto:** fica selecionado e desligado ao mesmo tempo, e o ícone desce para 1,36:1 (jogo C5).
- **Emblemas** (identidade C2, C3):
  - os bordos claros e dourados ficam a 1,00 e 1,47:1 sobre o papel;
  - há símbolos da cor da tinta e combinações de verde com vermelho sem contraste.
- **Retratos, cartas e troféus** (identidade):
  - os olhos na pele mais escura ficam a 1,58:1;
  - as cartas Técnica e Física têm cores quase iguais e nenhum ícone de categoria;
  - os troféus por ganhar ficam a 1,12:1.
- **Cores que se perdem nos bonecos** (bonecos C4–C6):
  - o cabelo 1 é igual à pele 3;
  - o cabelo 4 e algumas peças (fato, calções do árbitro) são da cor da tinta e fundem-se com o contorno.

### Escalas não inteiras de pixel art

- **Em 1280×720 o painel fica a 1,25×,** por isso os ícones da barra ficam a 2,5× (jogo C1, menus C5).
- **Imagens mostradas a tamanhos fracionários** (jogo C7, menus C6, identidade C4):
  - emblemas de 32 px mostrados a 14, 18, 20 e 24 px; a 14 px perdem 56 % dos pormenores;
  - cartas de `.lastcombo` passam de 40×44 para 64×64;
  - bonecos de «Criar clube» a 2,83×;
  - retratos de `.say` a 1,43×;
  - `.face`, `.gcard` e ícones de liga.

### Texto pequeno demais

- **Letra de 5 px CSS** (fonte 3×5 a 1×) no prognóstico, nos espectadores e nas etiquetas de nome (jogo C2), e nos quadros da taça e dos playoffs (menus).
- **Selo do treino:** 11 px e negrito falso.
- **Editor de equipamento:** «Pormenores» aparece cortado.

### Alvos de toque

- **Editores de emblema e de equipamento:** setas com 24 px de largura e cores com 28 px, separadas por 2 px (menus).

### Bonecos e poses

- **`ftDip`:** os pés saem 1 px da grelha e perdem o contorno. A correção é `f: [-3, L - 2], g: [3, L - 2]` (bonecos C1).
- **`gather`:** flutua 1 px acima do chão (C2).
- **`clap0` e `clap1`:** têm a mesma silhueta, por isso os adeptos não mexem as mãos (C3).
- **`getup2` e `slump`:** cortam pés ou mãos nos jogadores abaixo de cerca de 158 cm (C7).

### Animação

- **A bola dá um salto ao sair da mão** em todos os lançamentos: fica 1 tick à altura do drible e depois sobe 1,1 m num só tick (animações C1).
- **Os pés deslizam** nas poses `cheer1`, `crossover`, `snatch` e `handsHead` e no drible parado, a 2–4,6 px por frame (C2).
- **A corrida escolhe a pose pelo tempo e não pela distância,** por isso os passos são desiguais. A 4× cada pose dura 31 ms (C3).
- **O tremor do afundanço conta em ticks:** a 4× vira um zumbido de 30–40 Hz (C9, problema já conhecido).

### Identidade

- **Emblemas iguais na mesma liga:** cinco pares têm a mesma cor e a mesma forma. Trocar linhas de `SETS` resolve (identidade C1).
- **Retratos:** «preocupado» e «triste» diferem em 2 píxeis.
- **O til do Ã e do Õ continua a ser um mácron.**

## 3. Lacunas das ferramentas

- **`browser-check`:**
  - não mede alvos de toque nem a letra no telemóvel deitado;
  - desliza antes de medir o botão escondido;
  - não tem capturas `ref-360-*` da federação, do mercado, dos editores nem do fim de época.
- **`review`:**
  - não encontra `{"type": "made", "dunk": true}`, porque a marca de afundanço está no evento `shot`;
  - o recorte treme por não usar o `alpha`;
  - o tremor do ecrã, que é CSS, não fica nos PNG.

## 4. O que está bem

- **Bonecos:** o virado é o espelho exato em todas as 2239 células medidas. Não há píxeis meio transparentes fora das quedas, a cabeça tem sempre 8×8 e nada toca a borda.
- **Notas S a E:** passam todas os 4,5:1; a mais justa é o C, com 4,68.
- **Emblemas:** nenhum lembra o Sporting, o Benfica ou o FC Porto.
- **Cenas:** as 20 cenas gravadas são deterministas, e o movimento reduzido desliga o tremor.
