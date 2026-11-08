# Design gráfico para o Pocket Basketball

Pesquisa sobre o lado do *design* (composição, tipografia, iconografia, emblemas, equipamentos, cartas, troféus, charme, consistência, geração procedimental e originalidade) aplicado a um jogo de gestão de basquetebol em pixel art, todo desenhado por código, a tamanhos pequenos e escalado por múltiplos inteiros. As regras de interface e a teoria da cor ficam para outros relatórios; aqui só aparecem quando o design depende delas.

**Como ler:** cada secção tem princípios, regras concretas (numeradas como R-x) e, quando faz sentido, uma nota sobre o código atual (`src/ui/art/`). As fontes estão no fim de cada secção. Onde a página não pôde ser aberta (a rede da sessão bloqueou vários sites: `tylerxhobbs.com`, `cxong.github.io`, `robey.lag.net`), a informação vem só dos resumos dos motores de pesquisa e está marcada como **[não verificado]**.

---

## 0. O ponto de partida no código

Antes de propor, vale a pena saber o que já existe (lido em 2026-11-08):

- `font.ts`: fonte bitmap **3×5 só de maiúsculas**, avanço de 4 px (3 + 1 de espaço), acentos em 2 linhas mais 1 linha vazia **por cima** da altura de maiúsculas e cedilha 1 linha **por baixo**. Tem Á À Â Ã É Ê Í Ó Ô Õ Ú Ç. Não tem minúsculas, «», º/ª, €, nem `,` `;` `'` `/` `(` `)`. O `%` é largo (5 px).
- `kit.ts`: 8 padrões de camisola (liso, riscas, finas, aros, faixa, diagonal, metades, laterais), 8 formas de emblema (escudo, escudo redondo, círculo, oval, losango, hexágono, placa, galhardete), 11 padrões de emblema e 21 símbolos.
- `identity.ts`: 16 trios de cores (principal escura + segunda + realce); o par símbolo×forma só se repete ao fim de 168 clubes.
- `cards.ts`: cartas de 40×44 px com 4 categorias de cor (Tática, Técnica, Físico, Apoio).

Isto é uma boa base. O relatório aponta onde a afinar, sem pedir reescritas.

---

## 1. Composição e layout

### 1.1 Princípios

- **Hierarquia visual**: o olho vai primeiro ao elemento com mais contraste, mais tamanho ou mais isolamento. Num ecrã de 360×640 há espaço para **um** ponto focal por ecrã, no máximo dois. Um ponto focal faz-se com contraste, isolamento ou convergência de linhas ([Ancourage](https://ancourage.academy/articles/composition-in-art-guide-singapore.md)); numa imagem quase monocromática, uma única cor diferente chega para puxar o olhar ([LibreTexts](https://human.libretexts.org/Courses/Coalinga_College/Drawing_Basics/03%3A_Part_III/3.01%3A_Chapter_9-_Composition_Design_Principles/3.1.04%3A_Composition_Techniques_and_Applications)).
- **Regra dos terços**: pôr o assunto numa das quatro interseções de uma grelha 3×3 dá dinamismo; é um ponto de partida que se quebra quando há razão para isso.
- **Espaço negativo**: em pixel art o vazio custa zero píxeis e é o que deixa a forma ler-se. Um ícone de 16 px com 2 px de margem lê-se melhor do que um que encosta à borda.
- **Equilíbrio**: simétrico (emblemas, troféus, cartas: transmitem estabilidade e oficialidade) ou assimétrico (ecrã título, cartazes: transmitem movimento).
- **Grelha e alinhamento ao píxel**: tudo cai em píxeis inteiros da arte e escala por inteiros. Um desalinhamento de 1 px da arte, a 3×, é um degrau de 3 px no ecrã e vê-se.

### 1.2 Regras

- **R-1.1** Um ecrã, um herói. Decide o elemento principal (o resultado, a carta escolhida, o troféu) e dá-lhe a cor mais saturada ou o maior contraste do ecrã. Tudo o resto fica um degrau abaixo.
- **R-1.2** Usa uma grelha base de **4 px da arte** para margens e espaços (4, 8, 12, 16). Combina com o avanço de 4 px da fonte atual e com ícones de 8/12/16.
- **R-1.3** Simetria nos objetos «oficiais» (emblema, troféu, medalha, moldura de carta); assimetria e terços nas cenas (título, cidade, cartazes, celebrações).
- **R-1.4** Quando quebrar os terços: ao centrar um objeto único e solene (o troféu na vitrine, o emblema no ecrã de assinatura do contrato). O centro diz «isto é importante e estável»; os terços dizem «isto está a acontecer».
- **R-1.5** Margem mínima de 1 px entre um contorno e a borda de qualquer caixa; 2 px se a caixa também tiver contorno. Dois contornos colados leem-se como um traço grosso.
- **R-1.6** Alinha texto pela **linha de base**, não pelo topo da caixa: com acentos por cima e cedilha por baixo, alinhar pelo topo faz as linhas com «Á» parecerem descidas.
- **R-1.7** Agrupa por proximidade antes de separar com linhas. Em pixel art cada linha divisória é ruído; 4 px de espaço separam tão bem como 1 px de traço.
- **R-1.8** Teste do olhar semicerrado: reduz o ecrã a 1× (ou desfoca a captura) e vê se o herói continua a ser a primeira coisa a saltar.

---

## 2. Tipografia

### 2.1 Anatomia de uma fonte bitmap pequena

Termos: **altura de maiúsculas** (cap height), **altura x** (x-height, a altura de «x», «a», «o»), **ascendentes** (b, d, h, l), **descendentes** (g, p, q, y), **avanço** (largura da letra mais o espaço), **tracking** (espaço uniforme) e **kerning** (correção por pares).

Exemplos reais de métricas pequenas:

| Fonte | Maiúsculas | Altura x | Notas |
|---|---|---|---|
| Tom Thumb (Brian Swetland / Robey Pointer) | 5 px (célula 4×6, 3×5 útil) | ~3–4 px [não verificado] | Considerada das mais legíveis a este tamanho; CC0/CC-BY ([OpenGameArt](https://opengameart.org/content/pixel-font-basic-latin-latin-1-box-drawing), [itch.io](https://itch.io/t/267252/tiny-fonts)) |
| smol | 4×6 maiúsculas | 4×5 minúsculas | ([itch.io](https://dqg.itch.io/smol-font)) |
| m3x6 (Daniel Linssen) | +6 ascendente | +5 | descendente −2 ([itch.io](https://managore.itch.io/m3x6)) |
| m5x7 (Daniel Linssen) | — | — | Desenhada para múltiplos de 16 px; CC0 ([itch.io](https://managore.itch.io/m5x7)) |
| Capacity | 6 px | 5 px | ([MyFonts](https://www.myfonts.com/fonts/minifonts/capacity)) |
| Bitcount | 5×7 cabe Latin-1 inteiro | — | Versão alta com 10 px verticais para acentos ([Bitcount](https://bitcount.typenetwork.com/)) |

Uma lição clara das fontes pequenas: **a altura x alta ajuda a ler** (quanto mais perto da altura de maiúsculas, mais legível; [Seahawk](https://seahawkmedia.com/design-glossary/x-height-affect-font-design/)), e letras um pouco mais largas leem-se melhor do que estreitas ([PSU Accessibility](https://accessibility.psu.edu/legibility/fontfacehtml)).

### 2.2 Diacríticos portugueses a 5–8 px

O português de Portugal precisa de: **á à â ã é ê í ó ô õ ú ç** (e maiúsculas), mais **º ª** («1.º lugar», «2.ª jornada»), **« »** (aspas portuguesas) e **€**. O «ü» não é usado no português europeu atual.

Há três estratégias para caber acentos nas maiúsculas ([FontStruct, Elementalist](https://www.fontstruct.com/fontstructors/101477/elementalist); [Bitcount](https://bitcount.typenetwork.com/); [Typedrawers](https://typedrawers.com/discussion/comment/50082)):

1. **Acentos acima da linha de maiúsculas** (a escolha atual): a letra fica intacta e a altura de linha cresce. Custa espaço vertical, mas é a mais legível.
2. **Acentos cortados a um teto plano**: a altura fica fixa e as maiúsculas acentuadas ficam achatadas. Poupa linhas e estraga a leitura.
3. **Grelha separada**: 5×7 para letras base, 5×13 (ou 10) para tudo. Explícito e previsível.

Regras práticas para acentos minúsculos:

- **Agudo** (´) e **grave** (`): 2 píxeis em diagonal. Num 3×5, o agudo é `·#` sobre `#·` (sobe para a direita) e o grave o espelho. Nunca 1 píxel só: confunde-se com o ponto do «i».
- **Circunflexo** (^): 3 px em «V» invertido (`·#·` / `#·#`).
- **Til** (~): 3–4 px numa onda. Em 3 px de largura, a forma `·##` / `##·` (duas linhas) lê-se melhor do que uma linha só de 3 px, que parece um mácron (¯). O código atual usa `07` (linha vazia + 3 px cheios): **lê-se como mácron**. Vale a pena testar as linhas `3` e `6` (`·##` sobre `##·`, uma onda), ou seja `Ã: '36025755'`.
- **Cedilha** (¸): 1–2 px por baixo, deslocada para a direita do centro da letra, a tocar ou quase na base. Numa fonte 3×5, `Ç` com o rabo em `·#·` ou `··#` na linha de baixo.
- **Espaço entre acento e letra**: 1 px vazio nas maiúsculas (já existe). Nas minúsculas, o acento pode ocupar a zona das ascendentes sem linha vazia, porque a letra minúscula é mais baixa.
- **Diferenciar Ã/Â/Á à pressa**: o til e o circunflexo têm de ter silhuetas diferentes (onda vs. bico). É a confusão mais provável num ecrã pequeno.

```
Proposta 3×5 (maiúsculas): 2 linhas de acento + 1 vazia por cima da letra.
  Á      À      Â      Ã (onda)   Ã (atual, lê-se ¯)
 ··#    #··    ·#·    ·##        ···
 ·#·    ·#·    #·#    ##·        ###
 ···    ···    ···    ···        ···
 ·#·    ·#·    ·#·    ·#·        ·#·
 #·#    #·#    #·#    #·#        #·#
 ###    ###    ###    ###        ###
 #·#    #·#    #·#    #·#        #·#
 #·#    #·#    #·#    #·#        #·#

  Ç (atual: '344436', cedilha 1 linha abaixo)
 ·##
 #··
 #··
 #··
 ·##
 ##·   <- cedilha
```

### 2.3 Espaçamento e kerning

- Fontes monoespaçadas não usam kerning ([Wikipedia: Kerning](https://en.wikipedia.org/wiki/Kerning)). Numa fonte de 3 px, monoespaço com 1 px de tracking é aceitável; o custo vê-se em «I» (muito espaço à volta) e «M»/«W» (apertados).
- Se passares a proporcional, usa **unidades inteiras** de píxel no kerning, nunca frações, para não criar anti-aliasing ([FontStruct](https://fontstruct.com/help/72/advanced_topics/kerning)).
- Tabela mínima de kerning para uma fonte pixel proporcional (só −1 px): `LT`, `LY`, `TA`, `AT`, `AV`, `VA`, `PA`, `Te`, `To`, `Ta`, `Yo`, `F.`, `P.`, `T.`, `r.`, `1` (o 1 é estreito). Mais do que isso não se nota a 3–5 px.
- **Espaço entre palavras**: 2–3 px numa fonte de 3 px de largura (o atual é 4 = um espaço de letra; está no limite de largo, mas lê-se bem em maiúsculas).
- **Entrelinha**: altura de maiúsculas + acentos + 1 px. Na fonte atual: 3 + 5 + 1 (+1 de cedilha) ≈ 9–10 px da arte por linha.

### 2.4 Legibilidade

- O que distingue letras a 3×5 é o **canto**: «O» vs «D», «B» vs «8», «S» vs «5», «Z» vs «2». Desenha cada par lado a lado e muda 1 píxel até se distinguirem.
- Píxeis cinzentos (meio-tom) a sugerir curvas tornam fontes de 3×5 muito mais legíveis ([cxong, «Tips for legible pixel fonts»](https://cxong.github.io/2019/09/tips-for-legible-pixel-fonts), **[não verificado]**: só o resumo). Usa-os só no texto grande (2×), em fundo fixo, e nunca no texto que muda de cor.
- Teste: escreve «QUÊ? NÃO! AÇÃO, ÓBVIO, PÊNALTI» (palavras reais do jogo com todos os acentos) e lê a 1× num telemóvel.

### 2.5 Texto de exibição vs. texto corrido

- **Exibição** (títulos, marcador, nome do clube na camisola, números grandes): pixel font a 2× ou 3×, pode ter contorno de 1 px ou sombra de 1 px por baixo/à direita.
- **Corrido** (notícias, descrições das cartas, diálogos do diretor): uma pixel font maior com minúsculas (5×7 ou 6×8 de célula), ou uma fonte do sistema.
- A combinação comum é **uma fonte de exibição para títulos e menus + uma fonte funcional para corpo, diálogo e rótulos** ([resumo de pesquisa, fonte fraca](https://fontforge-gaming-o2.pages.dev/font-pairing-strategies-for-indie-game-developers-gaming-font-pairing-tips)). Celeste é o exemplo citado: marca em pixel, menus com tipo limpo e moderno ([Made Good Designs](https://madegooddesigns.com/?p=10751)).

### 2.6 Combinar uma pixel font com a fonte do sistema

- **R-2.1** A pixel font fica no **canvas** (arte, escalada por inteiros); a fonte do sistema fica no **HTML** (painéis longos, definições, ajuda). Nunca as mistures na mesma linha.
- **R-2.2** A fonte do sistema deve ter altura x parecida com a altura de maiúsculas da pixel font ao lado, para não parecer um salto.
- **R-2.3** Escolhe uma sem serifa geométrica ou humanista (`system-ui`); evita serifas finas, que parecem de outro jogo ao lado de píxeis.
- **R-2.4** Oferece a opção «texto legível» que troca o texto corrido para a fonte do sistema. A Apple recomenda testar a legibilidade em cada plataforma e, se o texto for difícil, usar tamanho maior, mais contraste ou uma fonte de sistema ([Apple HIG, Typography](https://glama.ai/mcp/servers/@tmaasen/apple-dev-mcp/blob/b82f0efe2115dc4539c83a2374a714a84aeb350a/content/universal/typography.md)); jogadores pedem esta opção ([itch.io](https://itch.io/post/8308207/view-in-topic)).
- **R-2.5** Pixel fonts só a tamanhos inteiros (1×, 2×, 3×): a 13 ou 17 px ficam desfocadas.

---

## 3. Iconografia (8, 12 e 16 px)

### 3.1 Princípios

- **Metáfora**: um ícone é um objeto que já se conhece. Para um jogo de gestão: apito (treino), prancheta (tática), cruz (lesão), seta para cima/baixo (forma), moeda (dinheiro), relógio (desconto de tempo), estrela (destaque), cadeado (bloqueado). Evita metáforas abstratas (engrenagens para tudo).
- **Traço consistente**: um só peso para a família toda. A 16 px, 1 px de traço; para formas cheias, 2 px de traço e 1 px de espaço branco ([PTC Brand Guide](https://www.ptc.com/brand-guide/iconography)); um peso e um tipo de pontas e junções para todo o conjunto ([Lucide](https://lucide.dev/contribute/icons/design-principles), [Made Good Designs](https://madegooddesigns.com/icon-design-principles/)).
- **Tamanho ótico**: o mesmo ícone redesenha-se para cada tamanho. As Octicons do GitHub desenham cada ícone duas vezes, a 16 e a 24 ([Primer](https://primer.style/octicons/design-guidelines)). Um ícone de 16 reduzido para 8 não é um ícone de 8.
- **Linhas retas em píxeis inteiros; diagonais a 45°** (degraus 1:1) ou 2:1 / 1:2. Ângulos de 45°, 30° e 60° leem-se mais nítidos do que ângulos irregulares ([Made Good Designs](https://madegooddesigns.com/?p=3771)). Degraus irregulares (2:1, 3:1, 2:1) criam «bossas» que se veem mais do que o próprio serrilhado ([Divoom](https://divoom.com/blogs/setup-ideas/fix-jaggies-pixel-art-without-blur)).
- **Luz consistente**: escolhe uma direção e não mudes. A convenção é **luz do canto superior esquerdo**: realce em cima/esquerda, sombra em baixo/direita ([Microsoft, guia de ícones antigo](https://learn.microsoft.com/en-us/previous-versions/ms997621(v=msdn.10))); o Material usa uma fonte virtual a 45° do canto superior esquerdo ([Material](https://m2.material.io/design/iconography)). Misturar direções faz o conjunto parecer remendado ([Aha-Soft](https://www.aha-soft.com/design/digest172.htm)).
- **Contorno ou não**: a 16 px, o contorno «come» píxeis ([Sprite-AI](https://www.sprite-ai.art/guides/how-to-create-16x16-pixel-art)). O Haiku usa contorno escuro de 1 px a 32 px ([Haiku](https://www.haiku-os.org/development/icon-guidelines)); o Visual Studio usa contorno só onde ajuda ([Microsoft VS](https://learn.microsoft.com/en-us/visualstudio/extensibility/ux-guidelines/images-and-icons-for-visual-studio?view=vs-2019)). Decisão para o jogo: contorno de tinta (`INK`) **só por fora da silhueta**, nunca contornos internos a 8 px.

### 3.2 Grelha da família

```
16×16                         12×12                8×8
┌────────────────┐           ┌────────────┐       ┌────────┐
│ margem 1 px    │           │ margem 1 px│       │ sem    │
│ ┌────────────┐ │           │ ┌────────┐ │       │ margem │
│ │ área viva  │ │           │ │ 10×10  │ │       │ 8×8    │
│ │   14×14    │ │           │ └────────┘ │       │ (ou 7×7│
│ └────────────┘ │           └────────────┘       │ com    │
└────────────────┘                                │ sombra)│
                                                   └────────┘
Formas-chave (área viva de 14):
 círculo  ≈ 12–14 px de diâmetro
 quadrado ≈ 11–12 px (parece maior do que o círculo, por isso é mais pequeno)
 retângulo vertical  ≈ 9×13 / horizontal ≈ 13×9
 triângulo ≈ 14 de base (parece mais pequeno, por isso é maior)
```

Esta compensação (o círculo e o triângulo maiores do que o quadrado, para parecerem do mesmo tamanho) é o mesmo princípio das «keylines» do Material ([Material System icons](https://material.io/design/iconography/system-icons.html)).

### 3.3 Regras

- **R-3.1** Cada ícone tem uma versão desenhada à mão em 16 e, se for usado mais pequeno, outra em 8. Nada de reduzir por código.
- **R-3.2** Uma silhueta reconhecível a preto puro. Teste: pinta o ícone todo de `INK` sobre fundo claro; se ainda se percebe o que é, passa ([FreeGameSprites](https://freegamesprites.com/pt/news/sprite-silhouette-test-character-readability)).
- **R-3.3** Máximo 3 cores por ícone a 16 px (contorno + cor + realce); 2 a 8 px.
- **R-3.4** Realce de 1 px no canto superior esquerdo de volumes; sombra de 1 px em baixo/direita. Igual em ícones, emblemas, troféus e cartas.
- **R-3.5** Estado com cor e forma, nunca só cor: lesão = cruz **e** vermelho; bloqueado = cadeado **e** cinzento.
- **R-3.6** Teste da família: põe todos os ícones numa grelha de 8×N. Nenhum deve parecer mais pesado (mais píxeis cheios) ou mais leve do que os vizinhos. Conta os píxeis cheios: devem estar dentro de ±25 % da média.
- **R-3.7** Teste do contexto: cada ícone em cima de cada fundo onde aparece (papel, madeira do campo, painel escuro).
- **R-3.8** Teste de reconhecimento: mostra só o ícone a alguém (ou a outro agente sem o nome) e pede o significado. Se falhar duas vezes, a metáfora está errada, não o desenho.

### 3.4 Bons conjuntos para estudar (só os princípios)

- **Octicons (GitHub)**: duas grelhas óticas (16 e 24) em vez de escalar ([Primer](https://primer.style/octicons/design-guidelines)).
- **Lucide**: canvas 24×24, 2 px de margem, um traço para todos, pontas e cantos iguais ([Lucide](https://lucide.dev/docs/icon-design-guide)).
- **Material**: keylines e compensação ótica; luz de cima à esquerda ([Material](https://m2.material.io/design/iconography)).
- **Ícones de itens em pixel art (Slynyrd, «Pixelblog 24: Items»)**: silhueta primeiro, luz consistente, rampas curtas ([Slynyrd](https://www.slynyrd.com/blog/2019/12/21/pixelblog-24-items), **[não verificado]**: página não aberta).

---

## 4. Logótipos, emblemas e escudos

### 4.1 Heráldica básica

- **Tinturas**: **metais** ouro (*or*, amarelo) e prata (*argent*, branco); **cores** vermelho (*gules*), azul (*azure*), preto (*sable*), verde (*vert*) e púrpura (*purpure*); e **peles** (arminho, veiros) ([Wikipedia: Rule of tincture](https://en.wikipedia.org/wiki/Rule_of_tincture); [Heraldica.org](https://heraldica.org/topics/tincturs.htm)).
- **Regra da tintura**: não pôr metal sobre metal nem cor sobre cor. O objetivo declarado é contraste: a figura tem de se destacar do campo. Violações chamam-se *armes à enquérir*. Peles e figuras «ao natural» são exceção. Se a peça honrosa é de metal, as figuras sobre ela são de cor, e vice-versa ([Inkwell Ideas](https://inkwellideas.com/coat_of_arms/bad-design-violating-the-rule-of-tincture)).
- **Peças honrosas (ordinárias)**: pala (faixa vertical), faixa (horizontal), banda (diagonal do canto superior esquerdo do portador), barra (a banda ao contrário), asna/chaveirão (V invertido), cruz, aspa (cruz em X, de Santo André) e chefe (faixa no topo). Há desacordo sobre pira, campanha, escudete e bordadura ([Britannica](https://www.britannica.com/topic/heraldry/The-elements-and-grammar-of-heraldic-design); [Notre Dame Rare Books](https://rarebooks.library.nd.edu/digital/heraldry/charges/ordinaries_2.html); [Drawshield/Parker](https://drawshield.net/reference/parker/o/ordinaries.html)).
- **Subordinárias**: formas geométricas menores que não chegam às bordas: cantão, quartel, girão, bordadura, orla. Muitas peças têm diminutivos (bandeta, palinha, asnas finas).
- **Figuras (*charges*)**: tudo o que se põe no campo: animais, objetos, astros ([Wikipedia: Charge](https://en.wikipedia.org/wiki/Charge_(heraldry))).

**Tradução para pixel art**: a regra da tintura é, na prática, uma **regra de contraste de luminosidade**. Metais = claros; cores = escuras. A paleta de `identity.ts` já segue isto (principal escura + segunda clara). Mantém-na assim.

### 4.2 Convenções de emblemas desportivos

- **Formas**: escudo (tradição, heráldica), **roundel** (círculo; moderno, lê-se pequeno, fácil de inverter e contornar), placa/badge, losango, galhardete. Vários clubes ingleses mudaram para roundel (Manchester City, Brentford, Forest Green Rovers) porque um círculo funciona a tamanhos pequenos e sobre a cor da camisola ([Footy Headlines](https://www.footyheadlines.com/2020/08/roundel-logos-takeover.html); [UX Collective, «Crestfallen»](https://uxdesign.cc/logo-no-go-the-simplification-of-football-emblems-5cf24a151d44)).
- **Faixa de texto**: o nome num anel à volta do roundel ou numa banda/fita. Uma data num anel forte ajuda a ler pequeno (exemplo do Colo-Colo, «1908») ([FourFourTwo](https://www.fourfourtwo.com/features/ranked-all-92-premier-league-and-football-league-club-badges)).
- **Ano de fundação**: assinala tradição; em clubes refundados até aparecem duas datas (Newport County).
- **Mascotes**: personagem simplificada + tipografia; tem de funcionar plana, monocromática, bordada e impressa, e deve pensar-se no corpo inteiro mesmo que o logótipo só use a cabeça ([SOS Factory](https://sosfactory.com/how-to-design-a-mascot-logo); [Adobe](https://adobe.com/creativecloud/design/discover/mascot-logo-design.html)).
- **Tendência**: simplificação (menos ornamento, menos texto). Os adeptos resistem: o Everton recuou em 2013 depois de 16 000 assinaturas; Ajax e Roma voltaram a desenhos de herança ([Creative Bloq](https://www.creativebloq.com/design/are-football-club-logos-facing-a-design-crisis); [Abertay](https://rke.abertay.ac.uk/en/publications/beyond-the-badge-visual-reembedding-and-the-politics-of-football-/)). Para o jogo: o emblema **simples** é o que se vê na tabela; uma versão **ornamentada** (com fita, data e lema) pode aparecer só nos ecrãs grandes (contrato, troféu).

### 4.3 Desenho procedimental: uma gramática

Um emblema é uma frase de uma gramática pequena. A referência é o **Armoria** (Azgaar): um brasão é definido por uma *string* e a mesma *string* dá sempre o mesmo brasão, em qualquer tamanho; o nome funciona como semente ([GitHub Armoria](https://github.com/azgaar/armoria); [Armoria Tutorial](https://github.com/Azgaar/Armoria/wiki/Armoria-Tutorial)). Isto encaixa na regra de determinismo do projeto.

```
Emblema   → Forma  Campo  [Peça]  Figura  [Faixa]  Borda
Forma     → escudo | redondo | círculo | oval | losango | hexágono | placa | galhardete
Campo     → liso(c1) | partido(c1,c2) | cortado(c1,c2) | esquartelado(c1,c2)
            | riscas(c1,c2,n) | aros(c1,c2,n) | xadrez(c1,c2) | raios(c1,c2)
Peça      → faixa | pala | banda | asna | chefe | cruz | aspa       (sempre de metal se o campo é cor)
Figura    → símbolo(cor_contraste) [no centro ótico, um pouco acima do centro geométrico]
Faixa     → anel(texto=iniciais|nome) | fita(texto=ano)            (só ≥ 32 px)
Borda     → tinta | ouro | claro
```

Regras da gramática:

- **R-4.1** **Contraste em cada camada**: campo → peça → figura alternam claro/escuro (regra da tintura). Calcula a luminosidade e rejeita combinações com diferença pequena.
- **R-4.2** **Uma única ideia forte por emblema**: ou o campo é padronizado **ou** há uma peça; figura sempre. Campo padronizado + peça + figura + faixa a 16 px é ruído.
- **R-4.3** **Simetria vertical por omissão** (espelho no eixo); a banda e a figura de perfil são as únicas assimetrias permitidas, e dão carácter.
- **R-4.4** **Centro ótico**: a figura fica 1 px acima do centro geométrico num escudo (o escudo estreita em baixo).
- **R-4.5** **Paleta**: 2 cores do clube + 1 realce + tinta. Mais do que 4 cores num emblema de 16–24 px não se distingue.
- **R-4.6** Figuras desenhadas à mão, em pixel art, por tamanho (16, 24, 32), como os ícones. A gramática combina; não desenha.

### 4.4 Distintos e legíveis a 16–24 px

A 16 px sobra uma silhueta (a forma), uma mancha de cor (o campo) e uma figura (≈ 8×8). Os eixos que o olho separa a esse tamanho, por ordem de força:

1. **Cor dominante** (o trio de cores).
2. **Forma exterior** (escudo vs. círculo vs. losango).
3. **Figura** (silhueta de 8×8).
4. **Padrão do campo** (só se for de faixas largas: riscas de 2 px, metades, quartos).

Regras:

- **R-4.7** Dois clubes da mesma liga **não podem** partilhar cor dominante **e** forma. Basta diferirem em dois dos quatro eixos acima, sendo um deles a cor ou a forma.
- **R-4.8** Testa a liga inteira numa grelha a 16 px, em cores e em cinzentos. Se dois emblemas parecem iguais em cinzento, falham para quem tem daltonismo.
- **R-4.9** Iniciais no emblema só a partir de 24 px, e no máximo 3 letras.
- **R-4.10** Padrões finos (pintas, xadrez de 1 px, raios) só a ≥ 24 px; a 16 px, troca-os pelo padrão largo equivalente ou por liso.

**Nota sobre o código atual**: os ciclos 8 formas × 21 símbolos garantem unicidade matemática, mas não unicidade **percebida** (ver secção 10, «aveia»). Vale um teste que compare, para cada par de clubes da mesma liga, cor dominante + forma.

---

## 5. Equipamentos

### 5.1 Padrões e nomes

Em 1890 as camisolas de futebol já se tinham fixado em poucos padrões: liso, riscas (verticais), aros (horizontais) e metades ([Historical Football Kits](https://www.historicalkits.co.uk/Articles/History/part-2.html)). Mais tarde vieram os quartos (chamados antes «harlequin»; [Pendle](https://www.pendlesportswear.co.uk/blog/?p=3988)), a faixa diagonal (o Southampton tem-na desde 1885; [Soccer Bible](https://soccerbible.com/performance/football-apparel/2020/07/under-armour-launch-southampton-2021-home-third-shirts)), as asnas (chevrons), as riscas finas (pinstripes) e os painéis laterais.

Em basquetebol a camisola é sem mangas e o padrão divide espaço com o **número**, por isso os padrões que funcionam são os que deixam o peito limpo: liso, painéis laterais, faixa no peito, riscas finas, gola e cavas de contraste. As riscas largas e os aros competem com o número.

### 5.2 Regras de legibilidade no campo

A FIBA exige números lisos à frente e atrás, de cor sólida que contraste com a camisola; os de trás com pelo menos 20 cm; e publicidade a pelo menos 4 cm dos números (regras de 2014 e alteração de 2022, [Scribd 2014](https://www.scribd.com/doc/314564561/FIBA-Rules-and-Regulations-2014); [Waverley 2025](https://www.waverleybasketball.com/_section/_edit/_423/_attachments/2025%20uniform%20policy.pdf); **o PDF atual da FIBA não foi aberto**). Na NBA, desde 2017–18 não há «casa/fora» fixo: a equipa da casa escolhe e a outra tem de contrastar; um Thunder–Grizzlies atrasou porque as cores eram parecidas ([NBC Sports](https://www.nbcsports.com/nba/news/thunder-grizzlies-game-delayed-when-both-teams-wear-white-uniforms); [ESPN](https://www.espn.com/nba/story/_/id/33496793/game-delayed-memphis-grizzlies-oklahoma-city-thunder-wore-similar-uniforms-tipoff)).

- **R-5.1** **Uma equipa clara, outra escura**, em todos os jogos. A FIFA exige um equipamento claramente escuro e outro claramente claro ([FIFA](https://inside.fifa.com/news/how-world-cup-26-teams-choose-kits-jerseys-colours-nick-thurston)).
- **R-5.2** **Teste em cinzentos**: se os dois equipamentos se parecem em escala de cinzentos, chocam para daltónicos ([Colour Blind Awareness, Kit Selection Advice](https://www.colourblindawareness.org/wp-content/uploads/2020/07/Kit-Selection-Advice-FINAL.pdf)).
- **R-5.3** Evita **vermelho vs. verde**, **vermelho vs. azul escuro** (ambos «escuros» para daltónicos; a FIFA evita-o), **azul vs. púrpura** e **laranja vs. castanho**. As confusões mais comuns são entre vermelhos, verdes, castanhos, amarelos e laranjas, e entre azuis, púrpuras e rosa escuro ([The FA](https://www.thefa.com/news/2017/jun/19/colour-blindness-guidance-190617)). Funcionam bem: branco/preto, vermelho/amarelo, preto/amarelo, azul/amarelo ([Footy Headlines sobre UEFA](https://footyheadlines.com/2021/01/uefa-kit-color-blindness-simulation-why.html)).
- **R-5.4** Cerca de 1 em 12 homens tem daltonismo vermelho-verde ([City, University of London](https://www.city.ac.uk/news-and-events/news/2017/09/colour-blindness-statistically-affects-every-male-football-team)): numa liga de 12 equipas, estatisticamente há um treinador daltónico.
- **R-5.5** **Contraste com o campo**: camisola lisa da cor do piso (laranja-madeira, castanho) precisa de uma marca forte (gola, cavas, calções de contraste). A Colour Blind Awareness recomenda faixas de contraste nos ombros para camisolas da cor do relvado.
- **R-5.6** **Número sempre de cor sólida com o maior contraste** com a camisola (claro sobre escuro ou o inverso), sem padrão por trás. Numa camisola de riscas, o número leva um retângulo ou contorno de 1 px da cor de fundo.
- **R-5.7** A camisola principal mostra a cor dominante do clube (a mesma do emblema); a alternativa inverte claro/escuro; a terceira só quando ambas chocam.
- **R-5.8** Padrões pequenos: num jogador de ~12–16 px de altura, riscas de 1 px «tremem» quando ele corre. Riscas ≥ 2 px da arte, ou só gola/cavas.
- **R-5.9** Distinção entre equipas: num jogo, além da luminosidade, os **calções** podem salvar um choque de camisola (calções escuros vs. claros).

---

## 6. Cartas de treino

### 6.1 Anatomia de uma carta

Uma carta de coleção tem: **moldura** (a cor diz a categoria), **janela de arte**, **nome**, **bloco de valores** (efeitos/estatísticas), **marca de raridade** (no canto inferior, junto ao número da coleção, como no Pokémon TCG) e **número de coleção** ([CGC](https://cgccards.com/news/article/12438/pokemon-rarity-symbols); [Bulbapedia: Rarity](https://bulbapedia.bulbagarden.net/wiki/Rarity)).

Para 40×44 px:

```
┌──────────────────────────────────────┐  moldura 2 px (cor da categoria)
│▓▓ ícone cat. (6×6)       raridade ★ │  faixa de topo 8 px
│┌────────────────────────────────────┐│
││                                    ││  janela de arte ≈ 36×22
││        jogador / objeto            ││  (ponto focal; regra dos terços
││                                    ││   se houver movimento)
│└────────────────────────────────────┘│
│ +2 TIR   +1 DEF                       │  bloco de valores 8–10 px
└──────────────────────────────────────┘  (texto fora da carta se não couber)
```

### 6.2 Como comunicar a raridade

O Pokémon TCG vai de um círculo (comum) a três estrelas douradas; a raridade sobe em **várias camadas ao mesmo tempo**: símbolo, acabamento holográfico, arte que sai da moldura, moldura especial, ouro em relevo ([Bulbapedia](https://bulbapedia.bulbagarden.net/wiki/Rarity); [Gaming on Phone sobre TCG Pocket](https://gamingonphone.com/guides/pokemon-tcg-pocket-card-rarity-guide-tips)). Escala proposta (cada nível acrescenta, não substitui):

| Nível | Símbolo | Moldura | Arte | Efeito |
|---|---|---|---|---|
| Comum | ● | cor plana | dentro da janela | nenhum |
| Pouco comum | ◆ | cor + filete claro de 1 px | dentro | nenhum |
| Rara | ★ | filete de prata | dentro | brilho a passar (1×/4 s) |
| Muito rara | ★★ | moldura de ouro | **sai da janela** (cabeça por cima da moldura) | brilho + 2–3 «estrelinhas» |
| Lendária | ★★★ ouro | ouro com cantos ornamentados | fundo com padrão | holográfico (faixas de cor) |

- **R-6.1** A raridade lê-se com 3 sinais redundantes: símbolo, moldura e efeito. Nunca só a cor.
- **R-6.2** A categoria (Tática/Técnica/Físico/Apoio) é a **cor da moldura** + **ícone**; a raridade é o **material** da moldura (plano → prata → ouro). Os dois eixos não se misturam.
- **R-6.3** A arte que «parte» a moldura é o sinal mais forte e mais barato de prestígio.

### 6.3 Folha e holográfico em pixel art

- **Brilho a passar (sheen)**: uma diagonal de 2–3 px de largura, a 45°, desenhada com a cor mais clara da rampa, que atravessa a carta em ~12 passos e para. Em pixel art, o efeito deve ser **em degraus** (passos inteiros, alinhados à grelha); há shaders para Godot com direção e número de passos ajustáveis e mapeados ao tamanho de píxel da textura ([Godot Forum](https://forum.godotengine.org/t/3d-holographic-parallax-card-effect/135529); [Godot Shaders](https://godotshaders.com/?p=2951)).
- **Holográfico**: ciclo de paleta numa máscara (só algumas zonas: o fundo ou a moldura), com 4–6 cores em arco-íris dessaturado que rodam um índice por frame. Inspiração: cartas de Balatro e do Pokémon TCG Pocket ([ArtStation, eggsthetic](https://eggsthetic.artstation.com/projects/qJZgxL)).
- **Onde a folha aparece**: na impressão real, a folha brilha mais nas zonas brancas e esconde-se nas cores escuras e saturadas ([The Game Crafter](https://help.thegamecrafter.com/article/501-designing-for-foil)). Em pixel art: aplica o brilho nas zonas claras e na moldura, nunca por cima da cara do jogador.
- **R-6.4** O efeito anima-se só quando a carta está em destaque (escolhida, revelada). Numa grelha de 12 cartas, só a rara mais alta brilha, e dessincronizada.
- **R-6.5** Sem `Math.sin` na simulação; aqui é interface, mas mesmo assim prefere tabelas de passos para o brilho ser idêntico entre browsers e nas capturas do `browser-check`.

---

## 7. Troféus, medalhas e insígnias

### 7.1 A linguagem do prestígio

- **Material**: ouro > prata > bronze. Em pixel art, metal = **grande intervalo de valor** (de quase preto a branco) e **mudança de matiz** nas sombras e nos realces ([PixelJoint](https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=16540); [Pixnote](https://pixnote.net/en/learn/shading)). Sem mudança de matiz, as sombras ficam cinzentas e lamacentas ([Slynyrd, Pixelblog 1](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)).
- **Brilho**: um píxel branco (especular) no ponto mais perto da luz (superior esquerdo), e por vezes uma «estrela» de 4 pontas de 5×5 px a piscar.
- **Forma**: taça com asas, troféu com figura, escudo/placa (liga), medalha com fita. A altura e o número de níveis (base com degraus) comunicam importância: um troféu de taça nacional é mais alto e tem mais degraus do que um de torneio de pré-época.

### 7.2 Rampas de metal (5 cores cada, com mudança de matiz)

Valores de partida, a afinar com o relatório de cor:

| Metal | Sombra profunda | Sombra | Base | Luz | Realce |
|---|---|---|---|---|---|
| Ouro | `#5a2e14` (castanho-avermelhado) | `#a35a1c` | `#e0a12a` | `#f6d55c` | `#fffbe0` |
| Prata | `#2a2f45` (azul-ardósia) | `#5e6a86` | `#a3adc2` | `#d8dee9` | `#ffffff` |
| Bronze | `#3a1a12` | `#7a3a1e` | `#b8692e` | `#e09a5a` | `#ffe3c2` |

Regra das rampas: sombras para frio/púrpura (prata) ou vermelho (ouro, bronze); realces para amarelo-branco quente ([Medium, Pixel Grimoire](https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-6-a74f562a4056); [Gamedev Academy, metal](https://gamedevacademy.org/metallic-pixel-art-tutorial/)).

### 7.3 Regras

- **R-7.1** Ouro, prata e bronze distinguem-se **pela luminosidade e pela forma**, não só pela matiz (ouro e bronze confundem-se em daltonismo). Ex.: medalha de ouro com estrela, prata lisa, bronze com o número «3».
- **R-7.2** Um só ponto especular por objeto, na mesma posição relativa (superior esquerdo) em todos os troféus.
- **R-7.3** O ouro só aparece em coisas ganhas (troféus, raridade alta, campeão). Se o ouro estiver em botões e molduras comuns, perde o valor. (Nota: `GOLD = '#f2c230'` é também o realce de vários clubes em `identity.ts`; o ouro de **troféu** deve ser uma rampa própria, mais rica.)
- **R-7.4** Insígnias de conquistas: roundel de 16 px, anel de metal + ícone central de 8 px. O metal diz o nível, o ícone diz o feito.

---

## 8. Charme e personalidade

### 8.1 De onde vem o charme dos jogos portáteis da Nintendo

As entrevistas «Iwata Asks» de Animal Crossing falam mais de comunicação entre jogadores do que de estilo visual ([Iwata Asks: City Folk](https://iwataasks.nintendo.com/interviews/wii/accf/0/0); [New Leaf](https://iwataasks.nintendo.com/interviews/3ds/animalcrossing-newleaf/0/2)). Nas que falam de textura, a Nintendo procura deliberadamente o material: lã em Kirby's Epic Yarn, aguarela em Skyward Sword ([Iwata Asks: Kirby's Epic Yarn](https://iwataasks.nintendo.com/interviews/wii/kirbysepicyarn/0/5); [Iwata Asks: Skyward Sword, Watercolour](https://www.nintendo.com/en-za/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-Skyward-Sword/Vol-7-Female-Staff/5-Watercolour-Art/5-Watercolour-Art-213389.html)). Em Animal Crossing: New Horizons, a abstração é meticulosa: os objetos são simplificados de forma coerente ([Adam Norwood](https://adamnorwood.com/?p=994)). No NPFC, os críticos elogiam os gráficos «fofos» e «falso 8 bits» com jogadores 2D num campo 3D ([Pocket Gamer](https://www.pocketgamer.com/nintendo-pocket-football-club/review/); [Nintendo Life](https://www.nintendolife.com/features/soapbox-nintendo-pocket-football-club-really-needs-a-sequel-on-switch)); a versão japonesa (Calciobit) tinha caras de anime e a ocidental caras pixelizadas ([Nintendo World Report](https://nintendoworldreport.com/feature/38034/the-cultural-differences-between-npfc-and-calciobit)).

Ingredientes destilados:

1. **Calor**: cores quentes, cantos arredondados (mesmo em pixel art: corta 1 píxel nos cantos das caixas), sombras que não são preto puro.
2. **Feito à mão**: pequenas imperfeições intencionais (um contorno que não é perfeitamente reto num cartaz, um carimbo ligeiramente torto). Mas só em objetos «do mundo» (papel, cartazes); nunca em botões e números.
3. **Pequenos detalhes**: o cão que atravessa a cidade, o adepto com o cachecol ao contrário, o pó de giz quando o treinador escreve na prancheta. Detalhes que não precisas de ver para jogar, mas que recompensam quem olha.
4. **Humor**: nomes trocadilhos (cuidado com a originalidade), expressões exageradas nas reações, troféus ridículos para torneios menores («Taça da Feira do Queijo»).
5. **Personagem consistente**: o diretor, o adjunto e o mascote têm sempre o mesmo traço, a mesma paleta e as mesmas poses-chave; são uma «voz» visual.
6. **Ritmo**: as coisas animam com antecipação e exagero (escala 110 % antes de assentar), mesmo em 2 ou 3 frames.

### 8.2 Kawaii e chibi

- **Proporções**: cabeça:corpo de 1:1 a 1:3 (2 a 4 cabeças de altura) contra 7–8 numa figura real ([Clip Studio Tips](https://tips.clip-studio.com/ja-jp/articles/4829?org=1); [Clip Studio, Chibi: Simplify and Adorable](https://tips.clip-studio.com/en-us/articles/4973)). Para jogadores de basquetebol em pixel art, 1:2 a 1:2,5 deixa ler a altura (o poste é mais alto, mas a cabeça mantém o tamanho).
- **Olhos**: grandes, baixos na cabeça (testa grande, proporções de bebé); nariz mínimo ou ausente; cara redonda e curta. Em pixel art: olhos de 1×2 px com 1 px de brilho, bochechas com 1 px de rosa.
- **Formas**: compactas e arredondadas, membros curtos, mãos e pés simplificados.
- **Kawaii nos objetos**: troféus e bolas podem ter cara em momentos especiais (o troféu «sorri» ao ganhar). Usar pouco: se tudo tem cara, nada é especial.

### 8.3 Papel e cadernos

O ecrã de gestão pode ser um **objeto do mundo** (interface diegética): a prancheta do treinador, o caderno de treino, o quadro de cortiça com cartazes ([Wayline, diegetic interfaces](https://www.wayline.io/blog/diegetic-interfaces-game-design)). Regras:

- **R-8.1** O papel é **creme** (não branco), com 1–2 tons de fibra em ruído ordenado (dither de Bayer 4×4 a ≤ 5 % de diferença de luminosidade). Ruído aleatório parece sujidade.
- **R-8.2** Linhas de caderno a cada 8 px (a entrelinha da fonte), azul-cinza claro; margem vermelha à esquerda.
- **R-8.3** Elementos colados: fita-cola semitransparente (1 cor clara com padrão de 1 px), clipes, carimbos com 1 px de rotação aparente (deslocamento de linhas).
- **R-8.4** Notas «à mão» (sublinhados, círculos à volta do melhor jogador) em traço irregular de 1 px, cor de lápis (grafite) ou marcador vermelho.
- **R-8.5** O papel nunca atrás de números que mudam (marcador, minutos, dinheiro): aí, fundo liso.

---

## 9. Consistência da marca

### 9.1 O que um guia de estilo deve ter

Paleta (com valores hexadecimais), tipografia, exemplos de personagens e ambientes, luz, amostras de interface, e uma secção de «sim / não» lado a lado ([Oleander Studios](https://www.oleanderstudios.com/what-is-an-art-bible-examples-practical-tips/); [Juego Studio](https://www.juegostudio.com/blog/art-direction-in-games)). A Juego Studio diz que a consistência não se aguenta sozinha para além de 30–40 recursos e 2–3 artistas: aguenta-se porque alguém revê contra o guia em intervalos fixos. Guias públicos para estudar: 0 A.D., Liberated Pixel Cup, Battle for Wesnoth, efeitos de League of Legends ([Makko](https://blog.makko.ai/what-public-game-art-bibles-say/)). O Kenney mostra o efeito de uma paleta e um estilo únicos: recursos de pacotes diferentes misturam-se sem costuras ([Waltorious](https://waltoriouswritesaboutgames.com/2021/01/16/scratching-that-itch-kenney-game-assets-1/)).

### 9.2 Proposta de guia (`docs/` futuro)

**Faz:**
- Luz do canto superior esquerdo em tudo.
- Contorno de `INK` só por fora da silhueta, 1 px.
- Grelha de 4 px para espaçamento.
- Paletas de `palette.ts`; nenhuma cor hexadecimal solta num ficheiro de arte.
- Rampas de 3–5 cores com mudança de matiz.
- Cantos de caixas cortados 1 px.
- Texto do jogador em português de Portugal, com acentos.

**Não faças:**
- Gradientes suaves, anti-aliasing automático, escalas não inteiras, rotações livres.
- Preto puro (`#000`) em sombras: usa `INK`.
- Mais do que 4 cores num emblema de 16 px, ou mais do que 3 num ícone.
- Ouro fora de coisas ganhas.
- Texto dentro de ícones de 16 px.
- Formas, cores ou símbolos que lembrem marcas reais (secção 11).

**Inventário de componentes** (cada um com dono, ficheiro e captura de referência):
fonte (`font.ts`) · ícones 8/16 (`icons.ts`) · emblema (`kit.ts`/`identity.ts`) · equipamento (`kit.ts`/`wardrobe.ts`) · carta (`cards.ts`) · troféu/medalha (`trophies.ts`) · bandeira (`flag.ts`) · retrato (`portrait.ts`) · cartaz e cidade (`town.ts`) · logótipos de liga e taça (`leagues.ts`) · quadro de eliminatórias (`bracket.ts`) · caixa de diálogo, botão, separador, etiqueta (`style.css`/`panel.ts`).

### 9.3 Consistência quando muitos agentes geram arte por código

- **R-9.1** **Tokens partilhados**: todas as cores, larguras de contorno, raios de canto e direção da luz vêm de `palette.ts` (ou de um `style-tokens.ts`). Um teste pode proibir literais `#rrggbb` fora desse ficheiro, como já se proíbe `Math.random` na simulação.
- **R-9.2** **Primitivas comuns**: um `outline()`, um `shadeRamp()`, um `highlight()` e um `pixelText()` usados por todos. Dois agentes que escrevem o seu próprio contorno dão dois estilos.
- **R-9.3** **Folha de referência**: `npm run anim-check` (e um equivalente para emblemas, cartas e ícones) gera uma grelha com **todos** os componentes lado a lado. A revisão compara a folha nova com a anterior.
- **R-9.4** **Testes de design automáticos**: contraste mínimo de luminosidade entre camadas de emblema; pares de equipamentos que falham em cinzentos; ícones com píxeis cheios fora de ±25 % da média; texto com glifos inexistentes na fonte.
- **R-9.5** **Revisão por outro agente** (já é regra do projeto): o revisor vê as imagens de `dist-check/`, não só o código.
- **R-9.6** **Um dono por componente**: dois agentes nunca mexem no mesmo ficheiro de arte ao mesmo tempo (também já é regra).

---

## 10. Design procedimental e generativo

### 10.1 O problema da aveia

Kate Compton chamou-lhe o problema das «10 000 taças de papas de aveia»: um gerador pode fazer 10 000 resultados matematicamente únicos que o jogador vê como «muita aveia». O que importa é a **unicidade percebida**; o teste dela é «alguém escreveria uma fanfic sobre isto?» ([Em Short](https://emshort.blog/2016/09/21/bowls-of-oatmeal-and-text-generation/); [Game Developer, Compton](https://gamedeveloper.com/design/practical-procedural-generation-for-everyone-); [Rabii & Cook, FDG 2023](https://ar5iv.labs.arxiv.org/html/2305.02131)). No Man's Sky é o caso famoso: planetas incontáveis, «todos claramente da mesma raça», com variedade a poucas dezenas de tipos de local ([Vice](https://www.vice.com/en/article/no-mans-sky-review/); [Inverse](https://www.inverse.com/article/19939-no-man-s-sky-hello-games-pc-ps4-diversity-repetition)).

### 10.2 Exemplos que funcionam

- **Spelunky** (Derek Yu): salas desenhadas à mão por função (descida, aterragem, corredor), com «tiles probabilísticos» lá dentro e tabelas pesadas para que o raro seja raro; o papel do designer é «controlar o caos». Yu admite que os padrões repetidos acabam por se reconhecer ([GamesRadar](https://www.gamesradar.com/spelunky-retrospective); [Kill Screen](https://www.killscreen.com/future-unfoldings-team-wants-randomly-generate-hand-designed-puzzles/)).
- **Fidenza** (Tyler Hobbs): 999 saídas sem curadoria, com o objetivo de se poderem ver todas sem aborrecer; no QQL, pelo contrário, a curadoria é central ([Art Blocks](https://www.artblocks.io/article/in-conversation-with-tyler-hobbs-on-fidenza)). O ensaio «Probability Distributions for Algorithmic Artists» trata das distribuições que dão raridade com sentido ([Tyler Hobbs, essays](https://tylerxhobbs.com/words/categories/essays), **[não verificado]**: página não aberta).
- **Caves of Qud** (Jason Grinblat): história gerada a partir de cinco sultões com eventos notáveis, contada com parcialidade e contradições, o que faz parecer escrita à mão ([GDC Vault](https://gdcvault.com/play/1024990/Procedurally-Generating-History-in-Caves); [Caves of Qud wiki](https://wiki.cavesofqud.com/wiki/World_generation)).
- **Armoria**: gramática heráldica com semente textual (secção 4.3).
- **Bandeiras (NAVA, «Good Flag, Bad Flag»)**: simples o bastante para uma criança desenhar de memória; simbolismo com sentido; 2–3 cores básicas; sem texto nem selos; distinta ou relacionada ([NAVA](https://nava.org/good-flag-bad-flag)). O crítico Perry Dane diz que seguir estas regras à letra levou a uma «mesmice de truque» ([Wikipedia: NAVA](https://en.wikipedia.org/wiki/North_American_Vexillological_Association)). A lição serve para geradores: regras boas aplicadas sem variação produzem aveia.

### 10.3 Regras

- **R-10.1** **Peças à mão, combinação por código**: figuras, ornamentos, caras e troféus desenhados à mão (como as salas de Spelunky); o código só escolhe e combina.
- **R-10.2** **Eixos percetíveis primeiro**: varia o que se vê a 16 px (cor, forma, silhueta) antes do que só se vê a 64 px.
- **R-10.3** **Distribuições com cauda**: a maior parte dos clubes tem emblemas «normais»; 1 em 10 tem algo raro (forma rara, mascote, padrão incomum). O raro só é memorável se for raro.
- **R-10.4** **Restrições que dão significado**: liga a forma do emblema à história do clube (escudo para os antigos, roundel para os recentes, galhardete para os de bairro). Uma regra com significado parece desenho.
- **R-10.5** **Teste de distância**: para cada par de clubes de uma liga, calcula uma distância (cor dominante, forma, figura, padrão) e falha o teste se algum par for abaixo do limite.
- **R-10.6** **Folha de contacto**: gera as 54 identidades numa só imagem e olha. Se três parecem iguais, o gerador está errado, mesmo que o teste passe.
- **R-10.7** **Curadoria permitida**: para os clubes fixos da liga, um agente pode fixar à mão a identidade que o gerador fez mal (uma tabela de exceções), como o QQL.
- **R-10.8** **História por trás do visual**: um ano de fundação, um lema, um apelido («os Faroleiros») tornam um emblema gerado memorável. Isto é o teste da fanfic aplicado.

---

## 11. Originalidade e marcas

### 11.1 O que proteger

O projeto copia a estrutura do NPFC, não a arte. Os riscos reais:

- **NBA**: o «Logoman» (a silhueta de jogador a driblar entre vermelho e azul, de Jerry West) é marca registada e viva da NBA Properties ([Markinton/USPTO](https://markinton.com/trademark/logoman-75535152); [Mental Floss](https://www.mentalfloss.com/article/63937/does-jerry-west-get-royalties-being-nba-logo)). A NBA vigia ativamente: chegou a pedir a uma escola do Wisconsin que repintasse o pavilhão por o logótipo parecer o dos Bucks ([WPR](https://wpr.org/bucks-press-western-wisconsin-high-school-repaint-gym-floor)). A Nike defendeu o Jumpman contra a silhueta «Gronk Nation» ([CBS](https://www.cbsnews.com/amp/boston/news/gronk-logo-nike-air-jordan/)).
- **Clubes reais**: o Manchester United processou a Sega e a Sports Interactive pelo nome e por um emblema simplificado; o Football Manager usa emblemas genéricos e nomes alterados sem licença ([PC Gamer](https://www.pcgamer.com/manchester-united-sues-football-manager-over-trademark-infringement-and-mod-support); [Mishcon de Reya](https://www.mishcon.com/news/brands-in-sports-video-games-whyfootball-managermight-be-the-exception)).
- **FIBA e ligas portuguesas**: logótipos e nomes de competições (Liga Betclic, Taça de Portugal, Supertaça) são marcas. Usa nomes inventados.
- **Nintendo**: nada de sprites, fontes, ícones, sons ou nomes de cartas e combos do NPFC (regra do projeto).

### 11.2 Riscos concretos neste projeto

- **Leão, águia e dragão** estão em `RESERVED_SYMBOLS` (`kit.ts`). São os símbolos de Sporting (leão, verde e branco), Benfica (águia, vermelho e branco) e FC Porto (dragão, azul e branco). Um leão em campo verde-branco, uma águia em vermelho ou um dragão em azul-branco num jogo português lê-se como paródia do clube real. **Regra: proibir essas três combinações de símbolo + cores** (teste automático simples). O galo também tem leitura forte (galo de Barcelos; Tottenham). Nenhum é ilegal por si: são figuras heráldicas comuns. O risco está na **combinação** com cor e forma.
- **Silhueta de jogador a driblar dentro de um retângulo vertical vermelho/azul** = Logoman. Nunca usar como logótipo de liga.
- **Bola de basquetebol laranja com linhas pretas dentro de um escudo** é genérico e livre, mas não uses as curvas exatas de um logótipo de liga existente.
- **Troféus**: não copies a forma de troféus conhecidos (Larry O'Brien: bola sobre cesto sobre cilindro; taça da Liga dos Campeões com as asas grandes). Inventa: taça baixa com asas de cesto, placa com rede, sino.

### 11.3 Como verificar

- **R-11.1** Pesquisa por imagem do logótipo gerado no **TMview** (EUIPO; mais de 140 milhões de marcas, pesquisa por imagem em todas as instituições ligadas) e no **WIPO Global Brand Database** (pesquisa por imagem com IA) ([Intepat](https://www.intepat.com/blog/trademark-logo-image-search-euipo-wipo); [WIPO](https://www.wipo.int/pressroom/en/articles/2019/article_0005.html)). Para Portugal, o INPI também está no TMview.
- **R-11.2** Pesquisa por códigos de Viena (a classificação dos elementos figurativos das marcas; categoria de jogos e desporto) para ver marcas com bolas, cestos e silhuetas ([WIPO Vienna](https://www.wipo.int/en/web/classification-vienna/preface)). **[não verificado]**: o código exato para bolas de basquetebol não foi confirmado.
- **R-11.3** Pesquisa invertida de imagem (motores de pesquisa) do logótipo do jogo e dos logótipos de liga/taça.
- **R-11.4** **Teste dos três segundos**: mostra o emblema a alguém de Portugal e pergunta «de que clube é isto?». Se responder um nome real, redesenha.
- **R-11.5** Nomes: pesquisa cada nome de clube, liga, taça e carta com «basquetebol» e «marca»; evita nomes que só mudam uma letra de um real.
- **R-11.6** Nada disto substitui uma pesquisa profissional antes de registar ou vender o jogo ([Intepat](https://www.intepat.com/blog/tmview/)).

---

## 12. Peças específicas

### 12.1 Ecrã título e logótipo

- Testa o logótipo pequeno, em cinzentos e como silhueta cheia; uma forma compacta (empilhada) reduz-se melhor do que uma linha comprida ([Made Good Designs, Game Logo Design](https://madegooddesigns.com/?p=5488)). O detalhe fino desaparece a tamanhos pequenos; fica a forma ([Gamine AI](https://gamineai.com/blog/creating-game-icons-and-logos-design-principles-game-branding)).
- **Proposta**: «POCKET» pequeno por cima de «BASKET» grande (ou «BASQUETE»), empilhado, com a bola a substituir uma letra (o «O» de POCKET). Contorno de tinta de 2 px a 1×, sombra de 1 px em baixo/direita, rampa quente.
- O logótipo tem de existir em três versões: grande (título), média (cabeçalho), ícone (16/32/192 px para o PWA), e funcionar a uma cor.
- O ecrã título usa os terços: logótipo no terço de cima, jogador/cena no terço de baixo, «Toca para começar» no fundo. Um pequeno detalhe animado (a rede a balançar, o adepto a acenar) dá charme.

### 12.2 Logótipos de liga e taça

- Cada competição tem **uma forma** (liga = escudo largo; taça = taça; supertaça = estrela; europeia = anel de estrelas inventado, nunca o da UEFA/FIBA Europe) e **uma cor** (divisão 1 = ouro, 2 = prata, 3 = bronze, taça = vermelho).
- A 16 px, o logótipo é só forma + cor + 1 número/ícone. Texto só em versões grandes.

### 12.3 Cartazes e bandeiras na cidade

- Cartazes: hierarquia de três níveis (título enorme, imagem, data/pequeno texto); 2–3 cores por cartaz; inclinação aparente de 1 px; cantos dobrados; fita-cola. Os cartazes do clube do jogador usam as cores do emblema; os de adversários, as cores deles.
- Bandeiras: regras NAVA (simples, 2–3 cores, sem texto, distinta) como base, com uma «exceção com propósito» para os clubes humorísticos. A bandeira de um clube deriva do emblema: o campo do emblema é a bandeira.
- Movimento da bandeira em 2–3 frames por ciclo de paleta (deslocar uma coluna de sombra).

### 12.4 Retratos

- Proporção chibi da cabeça; 2–3 traços de personalidade por personagem (penteado, acessório, expressão base), escolhidos de tabelas desenhadas à mão.
- Fundo do retrato = cor do clube em tom baixo, para o rosto ser o ponto focal.
- Luz do canto superior esquerdo, sombra de 1 px no lado direito da cara.
- Expressões em biblioteca fixa (feliz, triste, zangado, surpreso, convencido); a mesma para todos, para a personagem «falar» de forma consistente.

---

## 13. Lista de verificação

Usa antes de entregar qualquer arte nova.

**Composição**
- [ ] Há um só ponto focal claro neste ecrã ou objeto.
- [ ] Margens e espaços são múltiplos de 4 px da arte.
- [ ] Objetos «oficiais» são simétricos; cenas usam os terços ou quebram-nos com razão.
- [ ] Nada encosta à borda; há 1–2 px de respiro.
- [ ] Texto alinhado pela linha de base.

**Tipografia**
- [ ] Todos os glifos usados existem na fonte (incluindo á à â ã é ê í ó ô õ ú ç, º ª, « » e €, se aparecerem).
- [ ] O til (~) não se confunde com o mácron (¯) nem o circunflexo com o agudo.
- [ ] A cedilha lê-se e não colide com a linha de baixo.
- [ ] Texto de exibição em pixel font a escala inteira; texto longo legível ou com opção de fonte do sistema.
- [ ] A frase de teste «QUÊ? NÃO! AÇÃO, ÓBVIO» lê-se a 1× num telemóvel.

**Ícones**
- [ ] Desenhado à mão no tamanho em que aparece (8, 12 ou 16).
- [ ] Silhueta reconhecível a preto puro.
- [ ] Traço, contorno e luz iguais aos do resto da família.
- [ ] No máximo 3 cores (2 a 8 px); estado com forma e cor.
- [ ] Peso visual dentro de ±25 % da média da família.

**Emblemas**
- [ ] Regra da tintura: cada camada contrasta em luminosidade com a de baixo.
- [ ] Uma só ideia forte (padrão **ou** peça) + figura.
- [ ] Legível e distinto a 16 px, em cores e em cinzentos, ao lado dos outros clubes da liga.
- [ ] Dois clubes da mesma liga diferem em pelo menos dois eixos (cor, forma, figura, padrão).
- [ ] Nenhuma combinação lembra um clube real (leão verde-branco, águia vermelha, dragão azul-branco).

**Equipamentos**
- [ ] Num jogo, uma equipa clara e outra escura.
- [ ] Os dois equipamentos distinguem-se em cinzentos.
- [ ] Sem vermelho vs. verde, vermelho vs. azul escuro, azul vs. púrpura.
- [ ] Número de cor sólida com contraste máximo e sem padrão por trás.
- [ ] Riscas ≥ 2 px da arte; a camisola contrasta com o piso.

**Cartas**
- [ ] Categoria = cor da moldura + ícone; raridade = material + símbolo + efeito.
- [ ] O efeito de brilho é em degraus inteiros e só anima na carta em destaque.
- [ ] A arte rara pode sair da moldura; a comum não.

**Troféus e medalhas**
- [ ] Rampa de metal de 3–5 cores com mudança de matiz.
- [ ] Um só ponto especular, no canto superior esquerdo.
- [ ] Ouro, prata e bronze distinguem-se também por forma ou número.
- [ ] O ouro só aparece em coisas ganhas.
- [ ] A forma não copia um troféu real.

**Charme**
- [ ] Há pelo menos um pequeno detalhe que recompensa quem olha.
- [ ] Personagens mantêm proporções, paleta e poses-chave.
- [ ] Papel creme com textura ordenada, nunca atrás de números que mudam.

**Consistência**
- [ ] Cores vêm de `palette.ts`; nenhum hexadecimal solto.
- [ ] Usaste as primitivas comuns (contorno, rampa, realce, texto).
- [ ] A folha de referência (`anim-check` ou equivalente) foi gerada e comparada.
- [ ] `npm run browser-check` correu e as imagens foram vistas por outro agente.

**Geração procedimental**
- [ ] Os eixos que variam são os que se veem a 16 px.
- [ ] O raro é raro (distribuição com cauda).
- [ ] A folha de contacto de todas as saídas não tem «gémeos».
- [ ] Cada resultado tem uma pequena história (ano, lema, apelido).

**Originalidade**
- [ ] Nenhum recurso da Nintendo, NBA, FIBA, ligas ou clubes reais.
- [ ] Logótipo do jogo, das ligas e das taças pesquisado no TMview e no WIPO Global Brand Database.
- [ ] Pesquisa invertida de imagem feita.
- [ ] Teste dos três segundos: ninguém reconheceu um clube real.
- [ ] Nomes pesquisados com «basquetebol» e «marca».

---

## Notas sobre as fontes

- Várias páginas não abriram por limites de rede da sessão (`tylerxhobbs.com`, `cxong.github.io`, `robey.lag.net`); o que delas vem está marcado **[não verificado]**.
- Muitas fontes sobre equipamentos, mascotes e combinação de fontes são blogs de agências ou páginas de conteúdo fraco; usei-as só para convenções que várias fontes repetem. As fontes mais fortes são a FA / Colour Blind Awareness, a FIFA, o Historical Football Kits, os guias de ícones (Material, Primer, Microsoft, Haiku, Lucide), as entrevistas Iwata Asks, o artigo FDG 2023 sobre a «aveia» e o Armoria.
- As regras da FIBA citadas vêm das edições de 2010/2014 e da alteração de 2022; o PDF atual não foi aberto.
- As rampas de metal e o desenho dos acentos são propostas minhas, a validar com o relatório de cor e com `npm run browser-check`.
