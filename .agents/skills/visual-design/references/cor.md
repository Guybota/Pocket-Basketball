# Cor e paletas para pixel art e interface: pesquisa para o Pocket Basketball

> Documento de pesquisa (Fase 5, arte). Escrito em novembro de 2026.
> **Nota de método:** o WebFetch falhou em todos os anfitriões tentados (slynyrd.com, bottosson.github.io, lospec.com, pico-8.fandom.com): a rede desta sessão não os deixa passar. Tudo o que vem da web chegou por resultados de pesquisa (excertos), e está marcado quando não foi confirmado na fonte primária. As fórmulas (Oklab, WCAG, Machado) foram **verificadas em código** nesta sessão (ida e volta sRGB → Oklab → sRGB sem erro; branco/preto dá 21:1). Os valores hexadecimais de PICO-8, DB16 e Sweetie 16 são de memória e devem ser confirmados no Lospec antes de serem citados como exatos.

---

## 0. Resumo para quem tem pressa

1. **O valor (claridade) manda.** Se a imagem lê bem em tons de cinzento, lê bem a cores. Mede-se o valor em **OKLCH L** (ou L* do CIELAB), nunca em V do HSV nem em L do HSL.
2. **Rampas de 4 a 6 passos**, com saltos de L iguais (cerca de 0,10 a 0,15 em OKLCH L), **matiz a rodar para quente nas luzes e para frio nas sombras** (15 a 30° no total), **croma máximo nos tons médios**.
3. **Uma paleta fechada do jogo** (32 a 48 cores) com rampas partilhadas dá coerência. Para a luz do dia e o tempo, **não se mexe nas rampas**: aplica-se uma transformação de cor (gradação) por cima, ou troca-se a paleta inteira (palette swap).
4. **Peles:** 6 a 8 tons, cada um com 3 passos, sombras **mais vermelhas e mais saturadas** (não azuladas), e o tom escuro tem de continuar a ter contorno e leitura de cara.
5. **Equipamentos:** a distinção entre equipas faz-se primeiro por **diferença de claridade** (uma equipa clara, outra escura), depois por matiz. O teste: ΔL ≥ 0,25 em OKLCH, ou ΔE_OK ≥ 0,15 depois de simular deuteranopia, protanopia e tritanopia.
6. **Interface:** nunca usar só cor; a nota S..E já é uma letra, o que resolve metade do problema. Texto ≥ 4,5:1 (WCAG 2) ou Lc ≥ 60 (APCA); elementos gráficos ≥ 3:1; modo de alto contraste ≥ 7:1.
7. **Teste automático possível:** converter para Oklab, simular CVD com as matrizes de Machado (2009) em RGB linear, calcular ΔE e contraste WCAG. O código está na secção 11.

---

## 1. Modelos de cor

### 1.1 HSV e HSL: bons controlos, maus medidores

HSV (matiz, saturação, valor) e HSL (matiz, saturação, luminosidade) são só reparametrizações geométricas do cubo sRGB. São práticos para escolher cores à mão, mas **o "V" e o "L" não correspondem à claridade percebida**: um amarelo puro (`#ffff00`) e um azul puro (`#0000ff`) têm o mesmo V = 100 % e o mesmo L = 50 % em HSL, mas o amarelo parece muitíssimo mais claro (luminância relativa 0,93 contra 0,07). Uma rampa feita com "baixar o V 15 % por passo" dá passos desiguais conforme a matiz: os azuis caem para o preto e os amarelos quase não mudam.

Consequência prática: **uma rampa feita em HSV que roda a matiz também muda a claridade sem querer.** Um fórum do PixelJoint sobre rampas avisa precisamente isso: rodar a matiz pode alterar o brilho, o que normalmente não se deseja ([PixelJoint, TID=16540](https://pixeljoint.com/forum/forum_posts.asp?TID=16540)).

### 1.2 CIELAB e o problema dos azuis

CIELAB (1976) foi a primeira tentativa séria de um espaço perceptualmente uniforme: L* (claridade), a* (verde ↔ vermelho), b* (azul ↔ amarelo). Tem um defeito conhecido: os azuis "derivam" para o roxo quando se baixa o croma ou se interpola, e a claridade dos azuis saturados é mal estimada.

### 1.3 Oklab e OKLCH

**Oklab** foi publicado por Björn Ottosson em dezembro de 2020 como um espaço perceptual para processamento de imagem: converter para cinzento mantendo a claridade, fazer gradientes, misturar cores. O nome é um trocadilho ("um espaço Lab OK"). Corrige as mudanças inesperadas de matiz e claridade nos azuis do CIELAB e é fácil de calcular: duas matrizes 3×3 e uma raiz cúbica ([Wikipédia, Oklab](https://wiki.riteme.site/wiki/OKLab); post original em bottosson.github.io/posts/oklab, não acessível desta sessão).

- **L**: claridade percebida, 0 (preto) a 1 (branco).
- **a, b**: eixos de oponência (verde-vermelho, azul-amarelo).
- **OKLCH** é a forma polar: **L**, **C** (croma, ≈ 0 a 0,37 dentro do sRGB) e **h** (matiz em graus).

Oklab e OKLCH entraram no CSS Color 4/5 e estão nos browsers modernos desde 2023 ([atmos.style](https://atmos.style/glossary/oklch-color-space)).

**Cuidados conhecidos:**
- Para **interpolar** (gradientes, misturas), usa **Oklab** (cartesiano). Interpolar em OKLCH roda a matiz pelo caminho e passa por cores intermédias inesperadas; OKLCH serve melhor como **controlo** (eu escolho L, C, h) e Oklab para **gerar** ([discussão no HN](https://hn.svelte.dev/item/45010876)).
- O L do OKLCH não é perfeitamente uniforme nos extremos e há quem critique usá-lo sozinho para escalas de design ([uxdesign.cc](https://uxdesign.cc/stop-using-oklch-lightness-for-your-color-scale-02025deca49d)). Para pixel art, com 4 a 6 passos, é mais do que suficiente.
- **Fora do gamut:** nem toda a combinação L, C, h existe em sRGB. Amarelos muito escuros e azuis muito claros com croma alto não existem. Tem de se **reduzir C até caber** (não cortar os canais RGB, que muda a matiz). Ver secção 11.

Exemplos medidos nesta sessão (paleta atual do jogo, `src/ui/art/kit.ts`):

| Cor | OKLCH L | a | b |
|---|---|---|---|
| azul `#2b5fd9` | 0,525 | −0,022 | −0,194 |
| vermelho `#cf3a2c` | 0,570 | 0,164 | 0,093 |
| creme `#f4efe0` | 0,952 | −0,001 | 0,021 |

O azul e o vermelho têm quase a mesma claridade (0,53 contra 0,57): **em cinzento, ou para um daltónico, este par apoia-se só na matiz**. Ver secção 7.

### 1.4 Porque é que o valor é a propriedade mais importante

- A visão de formas, profundidade e leitura é dominada pelo canal de luminância; a cor tem resolução espacial mais baixa (é por isso que o JPEG comprime a crominância).
- Num sprite de 16×24 píxeis, cada píxel de contorno ou de luz é uma decisão de **valor**. Uma análise da paleta DB16 conclui que a luminosidade é mais importante do que a matiz, ao ponto de se poder sacrificar a matiz exata para acertar a claridade ([OpenGameArt, "Some insights about pixel art color ramps"](https://lpc.opengameart.org/node/20643)).
- **Teste:** converter o ecrã para cinzento (L do Oklab) e ver se o jogador, a bola, o cesto e o texto se separam do fundo. Se não se separam, a cor não vai salvar.

---

## 2. Rampas e deslocamento de matiz (hue shifting)

### 2.1 O que é uma rampa

Uma rampa é uma sequência ordenada de cores do escuro para o claro usada para sombrear um material (pele, madeira, tecido). Os principiantes fazem **rampas retas**: mesma matiz, só a mudar brilho e saturação. Raymond Schlitter (Slynyrd) aponta isto como o erro mais comum ([Slynyrd, Pixelblog 1, Color Palettes](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes); só lido o excerto). Um artigo do GameDev.net baseado no método dele mostra a **saturação a atingir o máximo no passo do meio** e o deslocamento de matiz ao longo da rampa ([GameDev.net, Color Palettes](https://www.gamedev.net/articles/visual-arts/color-palettes-r4964/)).

### 2.2 Regras com números

| Parâmetro | Regra | Notas |
|---|---|---|
| Passos por rampa | **4 a 6** para sprites pequenos; 3 para pele em sprites de jogo; 7 a 9 só para retratos ou céus | Um guia sugere 3 a 5 por matiz principal ([sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)) |
| Espaçamento de valor | **Passos iguais em OKLCH L**, ≈ 0,10 a 0,16 | Erro comum: tons médios amontoados e saltos bruscos nas pontas ([pixelpaletteswap](https://pixelpaletteswap.pages.dev/guides/color-theory-for-pixel-art.html)) |
| Extremos | L mínimo 0,22 a 0,30; L máximo 0,90 a 0,95 | Guardar o preto e o branco puros para contorno e brilho |
| Matiz | Luz → para o amarelo (h ≈ 85–95° em OKLCH); sombra → para o azul/roxo (h ≈ 265–300°) | Total de **15 a 30°** entre pontas; até 40–60° em estilos "pastel" |
| Croma | **Máximo nos tons médios**, 50–70 % disso nas pontas | Sombras muito saturadas ficam "sujas"; luzes saturadas parecem néon |
| Contraste entre rampas | Rampas de materiais vizinhos (pele / camisola) não devem ter o mesmo L no passo do meio | Para separar sem contorno |

**Direção da rotação:** "para quente" não é "aumentar h". Roda-se **pelo caminho mais curto em direção a uma matiz-alvo**: para um laranja (h 55°), a luz vai para o amarelo (h maior); para um roxo (h 300°), a luz vai para o rosa/vermelho e depois amarelo. A regra "sombras para o azul, luzes para o amarelo" é a mais citada ([OpenGameArt, nó 5493](https://opengameart.org/node/5493); [sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)).

**Exceções:**
- **Pele:** as sombras vão para o **vermelho e ganham croma** (luz que passa por dentro da pele), não para o azul. Só a sombra mais funda, em luz de exterior fria, puxa um pouco para o roxo.
- **Metais e cromados:** saltos de valor grandes, quase sem croma, com um reflexo do céu (azul) e do chão (castanho).
- **Neutros (asfalto, betão):** croma baixíssimo (0,01 a 0,03), mas **com o mesmo desvio de matiz** (sombra azulada, luz ligeiramente quente), o que evita o cinzento morto.

### 2.3 Exemplos gerados (OKLCH, 5 passos, L de 0,28 a 0,94, desvio de 18 %)

Gerados pelo código da secção 11 nesta sessão:

| Material | Escuro → claro |
|---|---|
| Laranja (bola) | `#451915` `#863a19` `#c56501` `#f59f5a` `#fee6d3` |
| Azul | `#142946` `#2b548b` `#4284d6` `#69c0f9` `#d1f1ff` |
| Verde | `#023123` `#1b633d` `#49974e` `#91c783` `#d8f6c6` |
| Vermelho | `#451723` `#8a313b` `#d65145` `#ff957e` `#fee5dd` |
| Madeira (pavilhão) | `#38231b` `#6e4b32` `#a47a48` `#d3af84` `#ffe7ca` |
| Asfalto | `#26292d` `#4f555b` `#7b848e` `#adb8be` `#e4edf0` |

Repara que a sombra do vermelho já puxa para o roxo (`#451723`) e a luz para o pêssego (`#fee5dd`). Para uso real, o passo mais claro costuma ficar demasiado perto do branco: limitar Lmax a 0,88 nos materiais e guardar o 0,94 para o brilho especular.

### 2.4 Sombreamento com desvio de matiz

- Uma fonte de luz principal (de cima, ligeiramente à esquerda, como convenção), uma luz de recorte opcional da cor do ambiente.
- **Sombra própria** = 1 passo abaixo; **sombra projetada** (no chão) = 2 passos abaixo e a puxar para a cor do ambiente (azul em exterior de dia, roxo à noite).
- **Luz refletida:** o chão do pavilhão (madeira) devolve laranja para baixo das personagens; o asfalto devolve cinzento-azulado.
- **Antialiasing manual** com o passo intermédio da rampa, nunca com uma cor nova.
- **Dithering** com moderação: em sprites de jogo, sobretudo em céus e degradês grandes ([sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)).

---

## 3. Paletas limitadas

### 3.1 Porque ajudam

- **Coerência:** todos os objetos partilham as mesmas rampas, por isso "pertencem" ao mesmo mundo.
- **Decisões mais rápidas** e menos ruído; um guia recomenda começar com 16 e só acrescentar quando um material precisa mesmo de rampa própria ([sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)).
- **Troca de paleta** fica trivial (dia/noite, equipas, estados).
- **Cerca de 64 cores é o limite** a partir do qual uma paleta "limitada" deixa de se sentir limitada ([sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)).

### 3.2 As paletas conhecidas

| Paleta | Cores | Autor | Ideia de desenho | Termos |
|---|---|---|---|---|
| **PICO-8** | 16 (+16 escondidas, índices 128–143) | Lexaloffle (Joseph White) | Paleta de consola de fantasia: primárias vivas, poucos tons, um preto, um azul-escuro e um roxo-escuro como "tintas de sombra", um pêssego para pele | Sem licença publicada para a paleta; faz parte do produto PICO-8. Os valores numéricos são factos, mas o nome é marca ([fandom](https://pico-8.fandom.com/wiki/Palette?oldid=2989), [NerdyTeachers](https://nerdyteachers.com/PICO-8/Guide/PALETTES)) |
| **DB16** | 16 | DawnBringer | Otimizada para cobrir o máximo de usos com poucas cores; cada cor serve várias rampas | Partilhada livremente nos fóruns do PixelJoint ([PixelJoint](https://pixeljoint.com/forum/forum_posts.asp?TID=16540)); sem licença formal encontrada |
| **DB32** | 32 | DawnBringer | "Irmã maior" da DB16, de uso geral com inclinação para jogos ([Lospec](https://lospec.com/palette-list/dawnbringer-32)); rampas longas a atravessar matizes | Idem; distribuída em vários formatos ([geoffb/dawnbringer-palettes](https://awesome.ecosyste.ms/projects/github.com%2Fgeoffb%2Fdawnbringer-palettes)) |
| **Endesga 32** | 32 | ENDESGA | Feita para o jogo NYKRA; alto contraste e saturação, muito usada em jogos de fantasia ([Lospec, tag endesga](https://lospec.com/palette-list/tag/endesga)) | Termos na página do Lospec (não confirmados) |
| **Endesga 64** | 64 | ENDESGA | Sucessora da EDG32, com mais contraste, alcance e saturação ([Lospec, tag endesga](https://lospec.com/palette-list/tag/endesga)) | Idem |
| **AAP-64** | 64 | Adigun A. Polack | Cobrir um espetro largo de uma vez; publicada a 9/10/2017 ([PixelJoint](https://pixeljoint.com/pixelart/119466.htm)) | Livre de uso segundo a comunidade; confirmar no Lospec |
| **Resurrect 64** | 64 | Kerrie Lake | Rampas longas e suaves, muito usada em jogos indie ([Lospec](https://lospec.com/palette-list/resurrect-64)) | Confirmar no Lospec |
| **Sweetie 16** | 16 | GrafxKid | Mais quente e macia do que a PICO-8; boa para jogos casuais e plataformas ([sprite-ai.art](https://www.sprite-ai.art/guides/pixel-art-color-palettes)) | Confirmar no Lospec |

Valores (de memória, **por confirmar**):
- **PICO-8:** `#000000 #1D2B53 #7E2553 #008751 #AB5236 #5F574F #C2C3C7 #FFF1E8 #FF004D #FFA300 #FFEC27 #00E436 #29ADFF #83769C #FF77A8 #FFCCAA` (os cinco primeiros e o pêssego confirmados pelos excertos).
- **DB16:** `#140C1C #442434 #30346D #4E4A4E #854C30 #346524 #D04648 #757161 #597DCE #D27D2C #8595A1 #6DAA2C #D2AA99 #6DC2CA #DAD45E #DEEED6`.
- **Sweetie 16:** `#1A1C2C #5D275D #B13E53 #EF7D57 #FFCD75 #A7F070 #38B764 #257179 #29366F #3B5DC9 #41A6F6 #73EFF7 #F4F4F4 #94B0C2 #566C86 #333C57`.

O que se aprende com elas:
- **Pretos coloridos:** quase nenhuma usa `#000000` como sombra; DB16 usa `#140C1C` (roxo quase preto), Sweetie 16 `#1A1C2C` (azul-tinta). O nosso `INK = #1b2230` segue a mesma ideia.
- **Brancos quentes:** `#FFF1E8` (PICO-8), `#DEEED6` (DB16), `#F4EFE0` (o nosso creme).
- **Rampas que atravessam matizes:** na Sweetie 16, `#5D275D → #B13E53 → #EF7D57 → #FFCD75` é uma rampa só (roxo → vermelho → laranja → amarelo). É o hue shifting levado ao limite.

### 3.3 Restrições de hardware (inspiração, não regra)

- **NES:** 64 saídas fixas (cerca de 54–56 úteis), 4 subpaletas de fundo e 4 de sprite; **cada sprite tem 3 cores + transparente**; até 25 cores no ecrã; mais de 8 sprites por linha começam a piscar ([NESdev wiki](https://www.nesdev.org/wiki/Palette); [Noel Berry, NES Limitations](https://noelberry.ca/posts/nes/index.html)). Lição: **3 cores bastam para um boneco legível** se forem escuro, médio e claro bem separados.
- **Game Boy (DMG):** 4 tons; as aproximações comuns são `#0F380F #306230 #8BAC0F #9BBC0F` ([designpieces](https://designpieces.com/palette/game-boy-original-color-palette-hex-and-rgb/)), que são aproximações da comunidade, não especificação da Nintendo. Lição: **4 valores bem espaçados chegam para tudo**; é o teste de leitura em cinzento.
- **Game Boy Color:** 8 paletas de fundo de 4 cores e 8 de sprite de 3+transparente, até 56 cores ([Wikipédia, lista de paletas](https://wikiwand.com/en/articles/List_of_video_game_console_palettes)).
- **Game Boy Advance:** o ecrã original não tinha luz; os jogos subiam valor e saturação para compensar ([GB Studio Central](https://gbstudiocentral.com/?p=2287)). É uma das origens do aspeto "saturado e claro" dos jogos de bolso.

### 3.4 O Lospec

O Lospec mantém a maior lista pública de paletas (de hardware e de artistas), com etiquetas por número de cores e tema (por exemplo `skintones`, `evening`, `glowing`) ([Lospec, palettes](https://lospec.com/palettes)). **Não há licença única**: cada paleta tem os seus termos; a cultura da comunidade é usar livremente e creditar por cortesia ([itch.io](https://itch.io/post/8583183)), mas algumas paletas exigem atribuição (CC BY 4.0) ([axulart](https://axulart.itch.io/axulart-32-color-palette)).

**Para este projeto:** a regra "Original, não cópia" do `AGENTS.md` e o facto de a arte ser gerada por código apontam para **desenhar a nossa própria paleta** com os princípios acima, e usar as paletas conhecidas só como referência de análise (medir L e C delas, não copiar).

### 3.5 Como desenhar a paleta do jogo

1. **Inventário de materiais:** pele (6–8 tons), cabelo (5–6), madeira do pavilhão, asfalto, linhas do campo, céu, vegetação, tijolo/betão da cidade, bola, cores de equipamento (10–14), interface (papel, tinta, acentos, semântica).
2. **Fixar a tinta e o papel:** um quase-preto colorido (L ≈ 0,22–0,26, C ≈ 0,02–0,03, h ≈ 260°) e um quase-branco quente (L ≈ 0,95, C ≈ 0,02, h ≈ 85°). Todos os contornos e textos usam estes.
3. **Escolher a "luz-chave" da paleta:** uma matiz quente para onde rodam todas as luzes (h ≈ 80–90°) e uma fria para onde rodam todas as sombras (h ≈ 270°). É isto que dá a sensação de um mundo só.
4. **Gerar rampas** de 4–6 passos em OKLCH (secção 11), com os mesmos degraus de L em todas: assim o passo 3 de qualquer material tem a mesma claridade, e trocar de cor não muda a leitura.
5. **Partilhar cores entre rampas:** o passo mais escuro do laranja pode ser o mesmo do castanho; o mais claro do azul pode ser o do céu. Reduz o total.
6. **Reduzir ao essencial:** juntar cores com ΔE_OK < 0,03 (são indistinguíveis em píxeis pequenos).
7. **Testar:** cinzento, as três simulações de CVD, fundo claro e escuro, e um ecrã de jogo real.
8. **Congelar** num ficheiro (`src/ui/art/palette.ts` já existe e só tem `INK`): tudo o resto referencia índices ou nomes, nunca hex soltos.

---

## 4. Luz, hora do dia e tempo

### 4.1 Princípios

- A luz tem **cor e intensidade**; a sombra recebe a **cor do céu/ambiente**. Dia de sol: luz amarela-branca, sombras azuis. Pôr do sol: luz laranja-rosa rasante, sombras roxas e compridas. Noite: luz ambiente azul-escura, fontes pontuais quentes (candeeiros, janelas). Nublado: luz difusa, contraste baixo, sombras curtas e pouco definidas, croma geral reduzido.
- **Contraste de temperatura**: quanto mais quente a luz, mais fria a sombra parece, e vice-versa.
- À noite **a visão perde cor antes de perder forma**: reduzir croma 40–60 %, baixar L, mas manter a separação de valor das personagens.

### 4.2 Parâmetros sugeridos (transformação em Oklab sobre a paleta base)

Aplica-se cor a cor, na paleta (não por píxel), o que é barato e mantém a arte em paleta fechada.

| Momento | Multiplicador de L | Multiplicador de C | Tinta somada (a, b) | Sombras |
|---|---|---|---|---|
| Manhã clara | 1,00 | 0,95 | (−0,005, +0,005) ligeiro amarelo frio | azul-claro |
| Meio-dia | 1,00 | 1,00 | (0, 0) | azul |
| Hora dourada | 0,95 | 1,10 | (+0,02, +0,04) laranja | roxo, compridas |
| Crepúsculo | 0,75 | 0,85 | (+0,02, −0,03) rosa-roxo | roxo-azulado |
| Noite | 0,50–0,60 | 0,50 | (−0,01, −0,04) azul | quase tinta; luzes pontuais sem transformação |
| Nublado | 0,92, comprimindo para L médio (L' = 0,5 + (L−0,5)·0,8) | 0,70 | (0, −0,005) | suaves |
| Chuva | como nublado, L × 0,85 | 0,65 | (−0,005, −0,015) | reflexos claros no chão |
| Neve | L dos chãos sobe; céu L ≈ 0,85 | 0,60 | (0, −0,01) | azul-claro |

Os números são ponto de partida de desenho, não medidas. A regra a respeitar: **as fontes de luz (janelas, candeeiros, o painel do pavilhão) não passam pela transformação**, é isso que faz a noite "acender".

### 4.3 Técnicas de jogos

- **LUTs por hora:** o *Graveyard Keeper* usa tabelas de correção de cor (LUT), 10 no total, para noite, crepúsculo e tarde, e varia a intensidade das luzes com a hora ([Game Developer](https://www.gamedeveloper.com/programming/graveyard-keeper-how-the-graphics-effects-are-made)).
- **Troca de paleta por hora:** um script de PICO-8 muda a paleta conforme hora e minuto ([Lexaloffle BBS](https://lexaloffle.com/bbs/?pid=129023)). Os Pokémon de Game Boy Color recarregavam as paletas à hora certa, sem transição, com fundos noturnos a cerca de metade do brilho do dia (citado num excerto de pesquisa; não confirmado na fonte).
- **Noite redesenhada:** uma versão noturna de uma cena pixel tirou as sombras, acrescentou estrelas e mudou a luz dos interiores, com uma paleta mais escura mas viva ([Basic Apple Guy](https://basicappleguy.com/basicappleblog/apple-pixel-park-but-night)).
- **Luz em pixel art:** brilhos pequenos, focados e coerentes com a luz principal; o excesso de brilhos especulares parece artificial ([Blake Crosley](https://blakecrosley.com/blog/pixel-art-light-weather-time)).

### 4.4 Trocas de paleta (palette swaps)

- Desenhar os sprites em **índices** (0 = transparente, 1 = contorno, 2–4 = rampa A, 5–7 = rampa B…) e pintar com uma tabela. As equipas, as peles e as horas do dia são tabelas.
- Funciona se **todas as rampas tiverem o mesmo número de passos e degraus de L parecidos**: trocar uma camisola vermelha por azul não muda a leitura do volume.
- Com Canvas 2D: desenhar uma vez para um `ImageData` com índices e gerar o bitmap por tabela (e guardar em cache; já existe `src/ui/art/cache.ts`).

### 4.5 Por pavilhão (sugestão para o jogo)

| Recinto | Chão | Luz | Atmosfera |
|---|---|---|---|
| Asfalto exterior | cinzento-azulado C 0,02, linhas brancas gastas (L 0,80, não 0,95) | o sol / o céu do dia | segue o ciclo da hora e do tempo |
| Ginásio de escola | madeira clara, L médio 0,70, croma baixo; linhas em cores de escola | fluorescente: ligeiramente verde-frio (b −0,005, a −0,005) | contraste médio, paredes de tijolo pintado |
| Pavilhão municipal | madeira mel, L 0,62, C 0,09 | projetores mornos | bancada em penumbra (L × 0,7) |
| Arena | madeira escura e envernizada, L 0,55, com reflexo claro em faixa; garrafão com a cor do clube | holofotes brancos fortes, recinto de jogo claro e bancada escura (L × 0,45) | "palco": vinheta escura, contraste alto |

A regra transversal: **o campo é sempre o plano mais claro ou mais calmo do ecrã, as personagens são o maior contraste.**

---

## 5. Tons de pele

### 5.1 Princípios

- **Diversidade de verdade:** cobrir do muito claro ao muito escuro com o mesmo cuidado, e **também em subtons** (mais rosado, mais dourado, mais oliva). A escala **Monk Skin Tone** da Google (10 tons, CC BY 4.0) é uma boa referência de amplitude: `#f6ede4 #f3e7db #f7ead0 #eadaba #d7bd96 #a07e56 #825c43 #604134 #3a312a #292420` ([Wikipédia, Monk Skin Tone Scale](https://www.wikiwand.com/en/articles/Monk_Skin_Tone_Scale); [Google](https://blog.google/technology/ai/monk-skin-tone-scale/)). Em OKLCH L vai de 0,95 a 0,26 (medido nesta sessão): **4 dos 10 tons estão abaixo de 0,50**. São tons de amostra de referência, não cores de sprite: em sprites, as peles precisam de mais croma do que estas amostras para não parecerem cinzentas.
- **Nada de "pele por defeito" clara:** um guia de avatares que põe "marfim" como pele por defeito é o exemplo do que não fazer ([RPR](https://www.rprepository.com/help/avatar-asset-creation)). No jogo, a pele sai de um hash; a distribuição deve ser uniforme ou seguir a demografia da liga, nunca "claro primeiro".
- **Sombra quente:** a sombra da pele roda para o vermelho/castanho-avermelhado e ganha croma; a luz roda para o amarelo/pêssego e perde croma.

### 5.2 Erros comuns

1. **Peles escuras cinzentas ou lamacentas:** baixar só L sem manter croma dá castanho morto. Peles escuras têm croma alto nas sombras (vermelho-acastanhado) e brilho especular frio e visível (a pele escura reflete mais o ambiente).
2. **Perder a cara no tom escuro:** se o contorno é `INK` (L 0,25) e a pele é L 0,35, os olhos e a boca desaparecem. Soluções: contorno da pele escura com a cor de sombra mais funda da própria rampa, olhos com o branco do olho visível, e o brilho na testa/maçã do rosto.
3. **Peles claras rosa-choque** (croma demasiado alto com h 20–30°): limitar C ≤ 0,08 nas claras.
4. **Uma só matiz para todas:** todas em h 55° parecem a mesma pessoa mais ou menos bronzeada. Variar h entre 40° e 70°.
5. **A luz do recinto destrói o tom:** testar cada pele com a gradação noturna e com a luz verde do ginásio.
6. **Cabelo e pele com o mesmo L:** separar pelo menos 0,15 em L.

### 5.3 O que o jogo tem agora

`src/ui/art/sprites.ts` tem 4 tons de 2 passos: L = 0,86 / 0,69 / 0,52 / 0,38, com sombra apenas 0,08–0,10 abaixo e matiz quase igual (h 64→59, 58→61, 55→53, 53→52). Ou seja, **a sombra quase não roda nem ganha croma**, e o tom mais escuro (0,38) fica perto do contorno.

### 5.4 Proposta (6 tons × 3 passos, gerada em OKLCH nesta sessão)

Luz = L+0,06, C×0,8, h+8°; base; sombra = L−0,11, C×1,05, h−12°.

| Tom | Luz | Base | Sombra | L base |
|---|---|---|---|---|
| 1 | `#ffe7cc` | `#f5cfb0` | `#d6a991` | 0,88 |
| 2 | `#e7c39e` | `#deac83` | `#c08667` | 0,78 |
| 3 | `#cc9d73` | `#c58457` | `#a75e40` | 0,67 |
| 4 | `#ab7a55` | `#a3623b` | `#853d26` | 0,56 |
| 5 | `#855b40` | `#7c452b` | `#5e2317` | 0,45 |
| 6 | `#5d4031` | `#522c1f` | `#350e0b` | 0,34 |

Para mais subtons, duplicar 2 a 3 tons com h ±10° (um mais oliva, um mais rosado). Em retratos (mais píxeis), acrescentar um 4.º passo: o brilho especular, quase sem croma e com h a puxar para o ambiente.

---

## 6. Equipamentos e emblemas

### 6.1 Pares primário / secundário harmoniosos

- **Contraste de valor primeiro:** primário e secundário devem diferir **ΔL ≥ 0,20** em OKLCH (por exemplo, azul-escuro com amarelo, vermelho com branco). Pares com o mesmo L (vermelho e verde de L igual) vibram e desaparecem a 2 píxeis.
- **Saturação:** só uma das duas cores com croma alto; a outra neutra (branco, creme, preto, cinzento) ou de croma baixo. É o padrão da maioria dos clubes reais.
- **Acabamento (trim):** terceira cor opcional, ou a secundária, com ΔL ≥ 0,30 para a cor que contorna.
- **Números e nomes:** a FIFA exige que os números sejam de uma só cor, com contraste suficiente para serem legíveis ([Goal / regulamento FIFA 7.2.2, via footyheadlines](https://www.footyheadlines.com/2026/04/new-why-the-premier-league-defies-fifas-kit-clash-regulations.html)). No jogo: número ≥ 3:1 (WCAG) contra a camisola.

### 6.2 Casa contra fora: evitar confusões

- No futebol, a FIFA pede que **cada peça** contraste com a peça equivalente do adversário (a Premier League só pede o conjunto) e trata o contraste claro/escuro como critério, incluindo considerações de daltonismo; não há regra numérica pública ([footyheadlines](https://www.footyheadlines.com/2026/04/new-why-the-premier-league-defies-fifas-kit-clash-regulations.html); [ESPN](https://global.espn.com/football/story/_/id/49097024/fashion-police-how-fifa-works-prevent-world-cup-kit-clashes)). A casa escolhe primeiro e a visitante adapta-se ([Regulamento da FAW](https://d1zqj8o9na6wgl.cloudfront.net/faw/20240820170234/FAW-Kit-Regulations-2024-25.pdf)).
- **No basquetebol** a convenção histórica é a equipa da casa de claro e a visitante de escuro (NBA tradicional; NCAA e FIBA usam a mesma ideia de cor clara contra escura). É exatamente a regra perceptual certa: **separação por valor**.
- **O jogo hoje** decide a confusão em `src/ui/airport.ts` (`kitClash`) com distância de Manhattan em RGB < 90. Isto mede mal: em RGB, azul e roxo da paleta atual estão "longe", mas em Oklab estão a 0,105 e, simulando deuteranopia, a **0,034** (indistinguíveis). Proposta de regra:

```
clash(A, B) = para qualquer visão v em {normal, protan, deutan, tritan}:
                ΔE_OK(sim_v(A.jersey), sim_v(B.jersey)) < 0,12
              OU |L(A.jersey) − L(B.jersey)| < 0,15 e ΔE_OK normal < 0,20
```

e, se a equipa visitante não tiver nenhum equipamento que passe, usar o equipamento "neutro" (branco ou tinta) que maximiza ΔL.

**Pares mais próximos da paleta de equipamentos atual** (`kit.ts`), medidos nesta sessão em ΔE_OK:

| Visão | Pares mais parecidos |
|---|---|
| Normal | creme/branco 0,052 · laranja/vermelho 0,095 · azul/roxo 0,105 · azul-petróleo/verde 0,114 |
| Protanopia | azul/roxo 0,047 · creme/branco 0,055 · **verde/laranja 0,058** · vermelho/grená 0,077 |
| Deuteranopia | **azul/roxo 0,034** · creme/branco 0,051 · **verde/vermelho 0,064** · laranja/vermelho 0,089 |
| Tritanopia | **azul/azul-petróleo 0,047** · creme/branco 0,050 · azul/verde 0,063 · azul-petróleo/verde 0,066 |

Creme contra branco nunca deve contar como equipamentos diferentes; azul contra roxo, verde contra vermelho e laranja contra vermelho precisam de outra diferença (claridade ou padrão).

### 6.3 Distinção segura para daltónicos

- **Canal de valor:** uma equipa clara e uma escura resolve protanopia, deuteranopia e tritanopia de uma vez.
- **Canal azul-amarelo:** protanopes e deuteranopes veem bem azul contra laranja/amarelo; é o eixo mais seguro de matiz. O par **azul + laranja** é a escolha "à prova de daltonismo" mais robusta.
- **Redundância:** padrão da camisola (riscas, faixa, ombros), cor dos calções diferente, e o marcador/anel por baixo dos jogadores na vista de jogo com forma diferente (círculo para casa, losango para fora).

### 6.4 Harmonias procedimentais e as suas armadilhas

| Harmonia | Como | Armadilha |
|---|---|---|
| Complementar (h + 180°) | vermelho/ciano, azul/laranja | Em HSV, pares com o mesmo V parecem iguais em cinzento; vermelho/verde complementar é o pior par para daltónicos |
| Análoga (h ± 30°) | azul/azul-petróleo | Pouco contraste de matiz: obriga a ΔL grande |
| Tríade (h + 120°, + 240°) | vermelho/azul/amarelo | Três cores fortes em 16 píxeis = ruído; usar uma forte e duas suaves |
| Complementar dividida | h, h + 150°, h + 210° | Igual à tríade |

Regras para o gerador:
1. Calcular as harmonias em **OKLCH** (h do OKLCH), não em HSV.
2. Fixar L e C de forma independente da matiz (por exemplo, primária L 0,55, C 0,15; secundária L 0,90, C 0,03).
3. **Rejeitar** pares com ΔL < 0,20 e testar com a simulação CVD.
4. Ajustar ao gamut reduzindo C.
5. Manter um conjunto fechado de "cores de clube" (a `PALETTE` de 12 cores é a abordagem certa) e gerar só combinações dele: dá coerência com a paleta do jogo.

### 6.5 Emblemas

- 2 a 3 cores mais tinta; símbolo central com ΔL ≥ 0,30 para o fundo do escudo.
- **Silhueta legível a 16×16** e a 8×8 (miniaturas na tabela): testar a versão em cinzento e só o contorno.
- Fundo do escudo nas cores do clube; contorno sempre `INK`, para coerência entre todos os emblemas.

---

## 7. Cor na interface

### 7.1 Cores semânticas

| Papel | Sugestão (OKLCH) | Reforço que não é cor |
|---|---|---|
| Bom / sucesso | verde-azulado h ≈ 165°, L 0,60 | seta para cima, "+", ícone ✓ |
| Mau / erro | vermelho-alaranjado h ≈ 35°, L 0,58 | seta para baixo, "−", ícone ✕ |
| Aviso | âmbar h ≈ 75°, L 0,78 | triângulo, "!" |
| Selecionado | acento da marca (laranja do jogo) ou contorno grosso | contorno de 2 px + leve subida (1 px) + marcador ▶ |
| Desativado | sem croma, contraste 2:1 a 3:1 contra o fundo (não exigido pela WCAG) | ícone de cadeado, texto "indisponível" |
| Informação | azul h ≈ 250°, L 0,55 | "i" |

- **Bom e mau devem diferir em L** (≥ 0,10) além da matiz, e usar o eixo azul-laranja quando possível (verde-azulado contra vermelho-alaranjado é melhor do que verde puro contra vermelho puro).
- **"Não usar só cor"** é regra das diretrizes de acessibilidade de jogos: reforçar com símbolo ou oferecer cores alternativas ([Xbox Accessibility Guideline 103](https://learn.microsoft.com/en-gb/gaming/accessibility/xbox-accessibility-guidelines/103); [Game Accessibility Guidelines, via BBC GEL](https://webcf.waybackmachine.org/web/20211112060422/https://www.bbc.co.uk/gel/guidelines/how-to-design-accessible-games)).

### 7.2 Escalas para notas e avaliações (S, A, B, C, D, E)

- **Sequencial ou divergente?** As notas são **ordinais com um só sentido** (melhor → pior), por isso a escala é **sequencial**. Uma divergente (vermelho ↔ verde com neutro no meio) só faz sentido quando há um centro com significado (por exemplo, "+/− em relação à média da liga" ou forma do jogador acima/abaixo do normal).
- **Claridade monótona:** a escala tem de ser ordenada também em L, para funcionar em cinzento e para daltónicos (é a ideia central do Viridis e do Cividis: claridade a subir linearmente; o Cividis foi otimizado para ser interpretado de forma quase idêntica por pessoas com e sem CVD ([Nuñez et al., PLOS ONE 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6070163))).
- **Quente = melhor** é a convenção dos jogos (ouro, laranja); **frio/apagado = pior**. Evitar a escala semáforo vermelho-amarelo-verde, que falha para deuteranopes.
- **A letra é a informação**; a cor reforça. Com letras já existe redundância.

Proposta gerada nesta sessão (claridade a descer de S a E, matiz de ouro a ameixa, sem passar por vermelho/verde opostos):

| Nota | Cor | Contraste com INK `#1b2230` | Contraste com creme `#f4efe0` | Deuteranopia | Texto da letra |
|---|---|---|---|---|---|
| S | `#eab532` ouro | 8,46 | 1,64 | `#d9c339` | INK |
| A | `#74c163` verde-folha | 7,25 | 1,91 | `#bbac69` | INK |
| B | `#10a6ad` azul-petróleo | 5,37 | 2,58 | `#8590ae` | INK |
| C | `#4f7eae` azul | 3,74 | 3,71 | `#5e76ad` | creme (≥ 4,5 exige escurecer para `#47729e` ou usar contorno) |
| D | `#6c5594` roxo | 2,55 | 5,43 | `#496092` | creme |
| E | `#743355` ameixa | 1,78 | 7,78 | `#4c4e53` | creme |

Notas: (1) o C é o ponto fraco, porque fica a meio da claridade; a solução é a letra com contorno de 1 px da cor oposta (prática comum em pixel art) ou baixar o C para L 0,52. (2) Em deuteranopia, A e S ficam ambos amarelados mas continuam separados por L. (3) Para o S, um brilho animado ou uma moldura dupla diferencia-o do A sem depender de cor.

Alternativa mais "clássica de jogo" (S dourado, A vermelho, B laranja, C verde, D azul, E cinzento) **não é ordenada em claridade** e falha em deuteranopia (vermelho/verde); evitá-la.

### 7.3 Contraste WCAG 2.x

- Luminância relativa: linearizar cada canal sRGB (c ≤ 0,04045 → c/12,92; senão ((c+0,055)/1,055)^2,4; a WCAG 2 escreve 0,03928, diferença desprezável), depois `L = 0,2126 R + 0,7152 G + 0,0722 B`.
- Razão: `(L1 + 0,05) / (L2 + 0,05)`, de 1:1 a 21:1 ([W3C](https://www.w3.org/TR/WCAG2/relative-luminance.html); [okmiku](https://okmiku.com/blog/wcag-color-contrast-explained)).
- **Limites:** texto normal **4,5:1** (AA) e **7:1** (AAA); texto grande (≥ 24 px ou ≥ 18,66 px negrito) **3:1** (AA) e 4,5:1 (AAA); componentes de interface e gráficos **3:1** contra as cores vizinhas (1.4.11). Os limites são mínimos exatos: 4,47 falha.
- Exemplo: `INK` sobre creme dá **13,86:1** (medido).
- **Fonte de píxeis:** uma fonte bitmap de 5–7 px escalada ×2 ou ×3 é "texto normal" para efeitos de contraste; tratar como 4,5:1 no mínimo.

### 7.4 APCA

- Método candidato para a WCAG 3 (ainda rascunho), de Andrew Somers (Myndex). Dá um valor **Lc** com sinal (positivo texto escuro em fundo claro, negativo o contrário) e é **assimétrico**: o mesmo par dá Lc diferente consoante quem é o texto, o que modela melhor o modo escuro ([Myndex, WhyAPCA](https://www.github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md); [apca-introduction](https://github.com/Myndex/apca-introduction)).
- Limites de referência (Myndex): **Lc 90** preferido para texto corrido; **Lc 75** mínimo para texto corrido (≥ 18 px/400); **Lc 60** outro texto de conteúdo; **Lc 45** títulos grandes (36 px normal / 24 px negrito); **Lc 30** mínimo absoluto para texto; **Lc 15** mínimo para elementos não textuais. Equivalência aproximada (não compatível): 3:1 ≈ Lc 45, 4,5:1 ≈ Lc 60, 7:1 ≈ Lc 75. Há fontes secundárias que põem Lc 60 como mínimo para texto corrido; seguir a documentação da Myndex.
- **Recomendação:** cumprir a WCAG 2 (é a norma em vigor) e usar o APCA como segundo teste no modo escuro, onde a WCAG 2 sobrestima o contraste de texto claro sobre escuro.

### 7.5 Temas claro e escuro

- **Tema claro "papel"** (o principal, coerente com o estudo visual): fundo creme L 0,93–0,96, C 0,02, h 80–90°; painéis um passo mais escuros (L 0,88); tinta azul-escura `INK`; acentos laranja/azul-petróleo.
- **Tema escuro:** não inverter. Fundo tinta L 0,20–0,24 com matiz fria (h 260°), painéis **mais claros** que o fundo (L 0,28–0,32: no escuro a elevação é dada por claridade, não por sombra), texto creme L 0,92 (não branco puro, para evitar vibração), acentos com C reduzido 15–20 % e L subido 0,05–0,10.
- Os sprites e o campo **não mudam** com o tema; só a moldura e os painéis.
- Os tokens de cor da interface devem ser definidos uma vez por tema (como já se faz em CSS com variáveis em `style.css`).

### 7.6 Alto contraste

- Xbox: oferecer modo de alto contraste claro e/ou escuro, com **≥ 7:1 para todos os elementos de interface** contra o fundo, e lembrar que contraste máximo cansa alguns jogadores com deficiências cognitivas, por isso deve ser configurável ([Xbox XAG 102](https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/102)).
- Exemplo: *The Last of Us Part II* tem modo de alto contraste com azul e vermelho por defeito e cores ajustáveis.
- No jogo: o modo pode (1) trocar papel/tinta por branco/preto, (2) engrossar contornos para 2 px, (3) tirar texturas do chão do campo (campo liso), (4) pôr as duas equipas em claro/escuro forçado com anel de forma diferente, (5) respeitar `prefers-contrast: more` e `forced-colors` do browser.

---

## 8. Daltonismo

### 8.1 Tipos e prevalência

| Tipo | Cone afetado | Prevalência aproximada |
|---|---|---|
| Deuteranomalia | M (verde) alterado | ~5 % dos homens (o mais comum) |
| Protanomalia | L (vermelho) alterado | ~1 % dos homens |
| Deuteranopia | M ausente | ~1 % dos homens |
| Protanopia | L ausente | ~1 % dos homens |
| Tritanomalia / tritanopia | S (azul) | ~0,01 % ou menos, igual em homens e mulheres (não ligado ao X) |
| Acromatopsia | sem cones funcionais | ~0,003 % |

No total, **cerca de 8 % dos homens e 0,5 % das mulheres** de ascendência norte-europeia têm deficiência vermelho-verde ([Colour Blind Awareness](https://colourblindawareness.org/?p=409); [WebExhibits](https://webexhibits.org/causesofcolor/2C.html)); a prevalência varia por população (há fontes que dão 5–8 %) e os números por subtipo variam entre fontes ([PMC8827614](https://pmc.ncbi.nlm.nih.gov/articles/PMC8827614/table/t3)). Para um jogo: **um em cada doze jogadores homens**.

### 8.2 Paletas e ideias seguras

- **Okabe-Ito** (Okabe e Ito, 2008, popularizada por Bang Wong na *Nature Methods* 8(6):441, 2011): `#E69F00` laranja, `#56B4E9` azul-céu, `#009E73` verde-azulado, `#F0E442` amarelo, `#0072B2` azul, `#D55E00` vermelhão, `#CC79A7` roxo-avermelhado, `#000000` preto. Distinguíveis nas formas comuns de CVD ([factoextra](https://rdrr.io/cran/factoextra/man/factoextra_palette.html); [ConceptViz](https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference)). Útil como referência de matizes para equipamentos e para gráficos de estatísticas. (Uma paleta de 8 valores numéricos de uso científico; usar como inspiração para a nossa.)
- **Viridis / Cividis:** escalas sequenciais com claridade a subir linearmente e perceptualmente uniformes; Cividis ajustado para CVD ([Nuñez et al. 2018](https://pmc.ncbi.nlm.nih.gov/articles/PMC6070163)). A ideia a copiar: **ordem em L**, matiz como segundo canal.
- **O eixo seguro:** azul ↔ laranja/amarelo; o eixo perigoso: vermelho ↔ verde com L igual.

### 8.3 Simuladores

- Ferramentas humanas: Color Oracle (simulação no ecrã inteiro) ([colororacle.org](https://www.colororacle.org/usage.html)), o modo de emulação de visão do Chrome DevTools, Sim Daltonism (macOS), DaltonLens.
- **Modelos:**
  - **Brettel, Viénot e Mollon (1997)**, *JOSA A* 14(10):2647–2655: projeção em dois semiplanos no espaço LMS; o mais citado para dicromacias, incluindo **tritanopia**.
  - **Viénot, Brettel e Mollon (1999)**, *Color Research & Application* 24(4):243–252: um só plano, uma só matriz; mais rápido, bom para protan/deutan, **mau para tritanopia** ([notebook DaltonLens](https://nbviewer.jupyter.org/github/DaltonLens/daltonlens.org/blob/master/_notebooks/2021-10-21-Understanding-Color-Blindness-Simulations.ipynb); [Godot Shaders](https://godotshaders.com/shader/color-vision-deficiency-cvd-simulation-shader/)).
  - **Machado, Oliveira e Fernandes (2009)**, *IEEE TVCG* 15(6):1291–1298: modelo fisiológico com **severidade de 0 a 1** (anomalias e dicromacias), matrizes pré-calculadas em passos de 0,1 e interpoladas; o próprio modelo não pretende modelar bem a tritanopia ([página dos autores](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html); [colour-science](https://colour.readthedocs.io/en/latest/colour.blindness.html)).
- **Detalhe importante:** as matrizes aplicam-se em **RGB linear** (depois de tirar a gama do sRGB), não nos valores 0–255 diretos. Muitas implementações online erram aqui (DaltonLens).
- **Limites:** estas simulações foram validadas com poucos observadores (Brettel testou com um protanope e um deuteranope) ([Simon-Liedtke e Farup](https://ivarfa.folk.ntnu.no/publications/conference/Simon_15_ei_samsemvisdem.pdf)). Servem como **teste de regressão**, não substituem testes com pessoas.

### 8.4 Testes que um agente pode correr

1. **Cinzento:** converter cada par crítico (equipa A/B, nota/fundo, bom/mau) para Oklab L; exigir ΔL mínimo.
2. **Simular** protanopia, deuteranopia (Machado, severidade 1) e tritanopia (Brettel, ou Machado como aproximação) e **calcular ΔE_OK** entre os pares simulados; exigir ≥ 0,10 (cores de identificação) ou ≥ 0,15 (equipas em campo).
3. **Contraste WCAG** de cada texto contra o seu fundo real; exigir 4,5:1 (normal) ou 3:1 (grande / gráfico).
4. **Capturas:** aplicar a matriz por píxel às imagens de `npm run browser-check` (em `dist-check/`) e guardar as versões simuladas lado a lado para revisão.
5. **Teste unitário** sobre `PALETTE` de equipamentos e sobre a escala de notas, para impedir regressões quando alguém mudar uma cor.

---

## 9. Charme e estética de bolso

Aproximação (descrição de abordagens, sem copiar ativos):

- **Saturado mas suave:** croma médio-alto (0,10–0,16) nos objetos, mas **quase nunca no máximo do gamut**, e brancos/pretos sempre coloridos. A origem histórica é técnica (ecrãs sem luz do GBA, que obrigavam a subir valor e saturação ([GB Studio Central](https://gbstudiocentral.com/?p=2287))), e ficou como estilo.
- **Interfaces de "papel":** fundo creme quente, molduras com cantos arredondados em píxeis, sombras de 1–2 px em tinta translúcida, tinta azul-escura em vez de preto, acentos de uma ou duas cores fortes. A sensação é de caderno, cartão de jogo, cromo.
- **Poucos acentos:** uma cor de marca (laranja de bola de basquetebol) e uma de apoio (azul-petróleo), como já descreve o `docs/05-analise-visual-charme.md` ("creme, laranja, azul-petróleo"). Tudo o resto em neutros quentes.
- **Céus e chãos calmos, personagens vivas:** o fundo tem croma baixo e contraste baixo; o contraste e a cor viva ficam para as personagens, a bola e o que é interativo.
- **Luz amigável:** sombras coloridas (roxas/azuis), nunca cinzentas; noite azul e não preta; janelas e candeeiros amarelos quentes.
- **Contornos coloridos:** contorno exterior em tinta, contornos interiores na sombra da própria rampa (selective outlining). Dá suavidade sem perder leitura.
- **Cores de clube como fio condutor:** a cor do clube aparece no pavilhão, nas bandeiras, nos adeptos e na interface (cabeçalho), o que torna o jogo "nosso".

---

## 10. Recomendações concretas para o Pocket Basketball

1. **Criar a paleta mestra** em `src/ui/art/palette.ts` (hoje só tem `INK`): tinta, papel, 6 tons de pele × 3, 6 cabelos × 2, madeira × 5, asfalto × 5, céu × 4, vegetação × 4, tijolo × 4, bola × 4, as 12 cores de clube × 3 (base, sombra, luz) e as cores semânticas. Geradas por OKLCH com degraus de L comuns, e depois congeladas em hex (para não depender de cálculos com `Math.cbrt`/`**` em tempo de execução nem de diferenças de browser; na interface isso é permitido, mas hex congelado é mais simples de rever).
2. **Substituir `kitClash`** (Manhattan RGB < 90) por uma regra em Oklab com claridade e simulação CVD (secção 6.2). **Atenção:** muda o comportamento visível (quais equipamentos o visitante escolhe), mas não toca em `src/sim/`.
3. **Peles:** passar de 4 × 2 para 6 × 3 com sombra avermelhada (secção 5.4).
4. **Notas S..E:** escala sequencial ordenada em L (secção 7.2), letra sempre visível, contorno de 1 px.
5. **Hora do dia e tempo da cidade:** transformação em Oklab sobre a paleta (secção 4.2), fontes de luz isentas.
6. **Testes:** um `palette.test.ts` com contraste WCAG dos textos, ΔE simulado entre cores de clube e monotonia de L nas rampas e nas notas.
7. **Opções de acessibilidade:** modo de alto contraste (7:1, contornos de 2 px, campo liso) e marcador de equipa com forma diferente.

---

## 11. Código

TypeScript/JavaScript; verificado nesta sessão em Node. Na interface (`src/ui/`) pode usar-se `**` e `Math.cbrt`; **em `src/sim/` estas operações estão proibidas**, mas a cor nunca deve estar na simulação.

### 11.1 sRGB ↔ linear

```ts
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma  = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const hexToRgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
const rgbToHex = (rgb: number[]) =>
  '#' + rgb.map(v => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('');
```

### 11.2 sRGB ↔ Oklab ↔ OKLCH (matrizes de Ottosson)

```ts
type Vec3 = [number, number, number];

function srgbToOklab(rgb: Vec3): Vec3 {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToLinear([L, a, b]: Vec3): Vec3 {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

const oklabToSrgb = (lab: Vec3) => oklabToLinear(lab).map(toGamma) as Vec3;
const inGamut = (lab: Vec3) => oklabToLinear(lab).every(v => v >= -1e-4 && v <= 1 + 1e-4);

const toLch = ([L, a, b]: Vec3): Vec3 => [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
const fromLch = ([L, C, h]: Vec3): Vec3 => [L, C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];

// Ajuste ao gamut: baixa o croma mantendo L e h (cortar canais RGB mudaria a matiz).
function lchToHex(L: number, C: number, h: number): string {
  let lo = 0, hi = C;
  if (inGamut(fromLch([L, C, h]))) return rgbToHex(oklabToSrgb(fromLch([L, C, h])));
  for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; inGamut(fromLch([L, mid, h])) ? (lo = mid) : (hi = mid); }
  return rgbToHex(oklabToSrgb(fromLch([L, lo, h])));
}

const deltaE = (x: string, y: string) => {
  const p = srgbToOklab(hexToRgb(x)), q = srgbToOklab(hexToRgb(y));
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
```

### 11.3 Rampa em OKLCH com desvio de matiz

```ts
// Roda h em direção a 'target' pelo caminho mais curto, uma fração k (0..1) da distância.
const toward = (h: number, target: number, k: number) => h + ((((target - h + 540) % 360) - 180) * k);

function ramp(h0: number, chroma: number, steps = 5, Lmin = 0.28, Lmax = 0.9, shift = 0.18,
              warm = 85, cool = 265): string[] {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);                       // 0 = sombra, 1 = luz
    const L = Lmin + (Lmax - Lmin) * t;              // degraus iguais de claridade
    const C = chroma * (1 - 0.6 * Math.abs(t - 0.55) / 0.55); // croma máximo nos médios
    const h = t > 0.5 ? toward(h0, warm, shift * (t - 0.5) * 2)
                      : toward(h0, cool, shift * (0.5 - t) * 2);
    out.push(lchToHex(L, C, h));
  }
  return out;
}
// ramp(55, 0.17) → laranja da bola; ramp(70, 0.09) → madeira; ramp(250, 0.02) → asfalto
```

### 11.4 Gradação de hora do dia (por cor da paleta)

```ts
type Grade = { kL: number; kC: number; da: number; db: number; mid?: number };
function grade(hex: string, g: Grade): string {
  let [L, a, b] = srgbToOklab(hexToRgb(hex));
  if (g.mid !== undefined) L = 0.5 + (L - 0.5) * g.mid;   // comprimir contraste (nublado)
  return rgbToHex(oklabToSrgb([L * g.kL, a * g.kC + g.da, b * g.kC + g.db]));
}
const NIGHT: Grade = { kL: 0.55, kC: 0.5, da: -0.01, db: -0.04 };
```

### 11.5 Contraste WCAG 2.x

```ts
const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastRatio = (x: string, y: string) => {
  const a = luminance(x), b = luminance(y);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};
// contrastRatio('#ffffff', '#000000') === 21; contrastRatio('#1b2230', '#f4efe0') ≈ 13.86
```

### 11.6 Simulação de daltonismo (Machado 2009, severidade 1,0)

Matrizes da tabela dos autores (severidade 1,0), aplicadas em **RGB linear**. As linhas somam ≈ 1, o que preserva o branco.

```ts
const MACHADO = {
  protanopia:   [[ 0.152286, 1.052583, -0.204868], [ 0.114503, 0.786281,  0.099216], [-0.003882, -0.048116, 1.051998]],
  deuteranopia: [[ 0.367322, 0.860646, -0.227968], [ 0.280085, 0.672501,  0.047413], [-0.011820,  0.042940, 0.968881]],
  tritanopia:   [[ 1.255528,-0.076749, -0.178779], [-0.078411, 0.930809,  0.147602], [ 0.004733,  0.691367, 0.303900]],
} as const;

function simulate(hex: string, type: keyof typeof MACHADO): string {
  const c = hexToRgb(hex).map(toLinear);
  const out = MACHADO[type].map(row => toGamma(Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2]))));
  return rgbToHex(out);
}

// Teste de confusão entre equipas
function teamsClash(x: string, y: string): boolean {
  const kinds = ['protanopia', 'deuteranopia', 'tritanopia'] as const;
  const dL = Math.abs(srgbToOklab(hexToRgb(x))[0] - srgbToOklab(hexToRgb(y))[0]);
  if (dL >= 0.25) return false;                        // claro contra escuro: sempre distinguível
  if (deltaE(x, y) < 0.15) return true;
  return kinds.some(k => deltaE(simulate(x, k), simulate(y, k)) < 0.12);
}
```

Os valores das matrizes vêm da tabela suplementar de Machado et al. (reproduzida no pacote `colour-science` e no `colorspace` do R); estão aqui transcritos de memória e **devem ser comparados com a [página dos autores](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html)** antes de entrarem num teste. Para tritanopia, Brettel 1997 é mais fiel; a matriz de Machado é aproximação.

Para imagens inteiras (as capturas do `browser-check`): ler os píxeis, aplicar `simulate` a cada um (com cache por cor, porque a arte tem poucas cores) e gravar o PNG simulado ao lado do original.

### 11.7 Escala de notas com verificação

```ts
const GRADES = { S: '#eab532', A: '#74c163', B: '#10a6ad', C: '#4f7eae', D: '#6c5594', E: '#743355' };
// Teste: L estritamente decrescente de S a E, também depois de simular cada tipo de CVD,
// e a letra (INK ou creme, a que der mais contraste) com contrastRatio >= 4.5 ou com contorno.
```

---

## 12. Fontes

Paletas e pixel art:
- Slynyrd (Raymond Schlitter), *Pixelblog 1 – Color Palettes*: https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes (só excerto)
- GameDev.net, *Color Palettes*: https://www.gamedev.net/articles/visual-arts/color-palettes-r4964/
- OpenGameArt, *Some insights about pixel art color ramps*: https://lpc.opengameart.org/node/20643 ; nó 5493: https://opengameart.org/node/5493
- PixelJoint, fóruns DB16/DB32: https://pixeljoint.com/forum/forum_posts.asp?TID=16540 ; AAP-64: https://pixeljoint.com/pixelart/119466.htm
- Lospec: https://lospec.com/palettes ; DB32 https://lospec.com/palette-list/dawnbringer-32 ; Resurrect 64 https://lospec.com/palette-list/resurrect-64 ; Endesga https://lospec.com/palette-list/tag/endesga ; AAP https://lospec.com/palette-list/tag/adigunpolack
- geoffb/dawnbringer-palettes: https://awesome.ecosyste.ms/projects/github.com%2Fgeoffb%2Fdawnbringer-palettes
- PICO-8: https://pico-8.fandom.com/wiki/Palette?oldid=2989 ; https://nerdyteachers.com/PICO-8/Guide/PALETTES
- sprite-ai.art, *Pixel art color palettes*: https://www.sprite-ai.art/guides/pixel-art-color-palettes
- pixelpaletteswap, *Color theory for pixel art*: https://pixelpaletteswap.pages.dev/guides/color-theory-for-pixel-art.html
- Licenças no Lospec (comunidade): https://itch.io/post/8583183 ; exemplo CC BY: https://axulart.itch.io/axulart-32-color-palette

Hardware:
- NESdev, *PPU palettes*: https://www.nesdev.org/wiki/Palette ; Noel Berry, *NES Limitations*: https://noelberry.ca/posts/nes/index.html
- Lista de paletas de consolas: https://wikiwand.com/en/articles/List_of_video_game_console_palettes
- Game Boy: https://designpieces.com/palette/game-boy-original-color-palette-hex-and-rgb/
- GB Studio Central, cores em GBC/GBA: https://gbstudiocentral.com/?p=2287

Espaços de cor:
- Oklab (Wikipédia): https://wiki.riteme.site/wiki/OKLab ; original de Ottosson: https://bottosson.github.io/posts/oklab/ (não acessível desta sessão)
- OKLCH: https://atmos.style/glossary/oklch-color-space ; crítica: https://uxdesign.cc/stop-using-oklch-lightness-for-your-color-scale-02025deca49d ; discussão: https://hn.svelte.dev/item/45010876

Luz:
- Graveyard Keeper (LUTs): https://www.gamedeveloper.com/programming/graveyard-keeper-how-the-graphics-effects-are-made
- PICO-8 dia/noite: https://lexaloffle.com/bbs/?pid=129023
- Basic Apple Guy, noite: https://basicappleguy.com/basicappleblog/apple-pixel-park-but-night
- Blake Crosley, luz e tempo: https://blakecrosley.com/blog/pixel-art-light-weather-time

Pele:
- Monk Skin Tone Scale: https://www.wikiwand.com/en/articles/Monk_Skin_Tone_Scale ; https://blog.google/technology/ai/monk-skin-tone-scale/
- Exemplo a evitar: https://www.rprepository.com/help/avatar-asset-creation

Equipamentos:
- footyheadlines (regulamento FIFA): https://www.footyheadlines.com/2026/04/new-why-the-premier-league-defies-fifas-kit-clash-regulations.html
- ESPN: https://global.espn.com/football/story/_/id/49097024/fashion-police-how-fifa-works-prevent-world-cup-kit-clashes
- FAW: https://d1zqj8o9na6wgl.cloudfront.net/faw/20240820170234/FAW-Kit-Regulations-2024-25.pdf

Interface e acessibilidade:
- W3C, luminância relativa: https://www.w3.org/TR/WCAG2/relative-luminance.html ; okmiku: https://okmiku.com/blog/wcag-color-contrast-explained
- APCA: https://www.github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md ; https://github.com/Myndex/apca-introduction
- Xbox XAG 102 (contraste): https://devdocs.xbox.com/gaming/accessibility/xbox-accessibility-guidelines/102 ; XAG 103: https://learn.microsoft.com/en-gb/gaming/accessibility/xbox-accessibility-guidelines/103
- BBC GEL, jogos acessíveis: https://webcf.waybackmachine.org/web/20211112060422/https://www.bbc.co.uk/gel/guidelines/how-to-design-accessible-games

Daltonismo:
- Machado, Oliveira, Fernandes 2009: https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html ; colour-science: https://colour.readthedocs.io/en/latest/colour.blindness.html
- DaltonLens (Brettel/Viénot): https://nbviewer.jupyter.org/github/DaltonLens/daltonlens.org/blob/master/_notebooks/2021-10-21-Understanding-Color-Blindness-Simulations.ipynb
- Godot CVD shader (notas): https://godotshaders.com/shader/color-vision-deficiency-cvd-simulation-shader/
- Simon-Liedtke e Farup: https://ivarfa.folk.ntnu.no/publications/conference/Simon_15_ei_samsemvisdem.pdf
- Okabe-Ito / Wong 2011: https://rdrr.io/cran/factoextra/man/factoextra_palette.html ; https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference
- Nuñez et al. 2018 (Cividis): https://pmc.ncbi.nlm.nih.gov/articles/PMC6070163
- Prevalência: https://colourblindawareness.org/?p=409 ; https://webexhibits.org/causesofcolor/2C.html ; https://pmc.ncbi.nlm.nih.gov/articles/PMC8827614/table/t3 ; Color Oracle: https://www.colororacle.org/usage.html

**Não verificado na fonte primária:** valores hex de PICO-8 (exceto 6), DB16 e Sweetie 16; matrizes de Machado (de memória, coerentes: linhas somam 1); limites de APCA (fontes secundárias e repositório Myndex por excerto); a afirmação sobre a FIFA e o daltonismo (uma fonte secundária); números de prevalência por subtipo (fontes discordam); a troca de paletas dos Pokémon de GBC.

---

## 13. Lista de verificação

**Paleta e rampas**
- [ ] A paleta do jogo está num só ficheiro (`src/ui/art/palette.ts`) e nenhum desenho usa hex soltos.
- [ ] Tinta (L ≈ 0,22–0,26, matiz fria) e papel (L ≈ 0,95, matiz quente) fixos; não há `#000000` nem `#ffffff` como cores de desenho.
- [ ] Cada rampa tem 4 a 6 passos com degraus de L iguais (± 0,02) em OKLCH.
- [ ] As luzes rodam para o amarelo e as sombras para o azul/roxo (15–30° no total); a pele roda a sombra para o vermelho.
- [ ] O croma é máximo nos tons médios.
- [ ] Não há duas cores com ΔE_OK < 0,03.
- [ ] As rampas foram geradas fora do gamut só com redução de croma (sem corte de canais).
- [ ] A cena lê bem em cinzento (teste de L).
- [ ] Nenhuma cor copiada de paletas de terceiros ou de jogos da Nintendo; paletas conhecidas só como referência.

**Luz e tempo**
- [ ] A hora do dia e o tempo são uma transformação da paleta (ou troca de paleta), não arte nova.
- [ ] As fontes de luz (janelas, candeeiros, painel) não escurecem à noite.
- [ ] À noite as personagens continuam separadas do fundo por L.
- [ ] Cada recinto tem o campo como plano calmo e as personagens com o maior contraste.

**Peles**
- [ ] Pelo menos 6 tons, de L ≈ 0,88 a L ≈ 0,34, com variação de subtom (h 40–70°).
- [ ] Cada tom tem 3 passos; sombra mais vermelha e saturada.
- [ ] No tom mais escuro, olhos, boca e contorno continuam visíveis.
- [ ] A escolha de tom não favorece nenhum tom por defeito.
- [ ] Pele e cabelo diferem ≥ 0,15 em L.

**Equipamentos e emblemas**
- [ ] Primário e secundário diferem ΔL ≥ 0,20; só um tem croma alto.
- [ ] Número da camisola ≥ 3:1 contra a camisola.
- [ ] A regra de confusão usa Oklab e simulação CVD (não RGB Manhattan); creme e branco contam como a mesma cor.
- [ ] Casa e fora diferem ΔL ≥ 0,25 ou ΔE_OK ≥ 0,15 nas três simulações.
- [ ] Há um sinal não cromático da equipa em campo (forma do marcador, padrão, calções).
- [ ] Harmonias calculadas em OKLCH, com L e C fixados independentemente da matiz.
- [ ] Emblemas legíveis a 16×16 e em cinzento.

**Interface**
- [ ] Nenhuma informação só por cor (notas com letra, bom/mau com seta ou sinal).
- [ ] Texto ≥ 4,5:1; texto grande e elementos gráficos ≥ 3:1 (WCAG 2.x).
- [ ] No tema escuro, verificado também com APCA (Lc ≥ 60 para texto de conteúdo, ≥ 75 para texto corrido).
- [ ] A escala S..E é sequencial e monótona em L, também depois das simulações.
- [ ] Nada de escala semáforo vermelho/verde para notas.
- [ ] Tema escuro com painéis mais claros do que o fundo e texto creme, não branco puro.
- [ ] Modo de alto contraste ≥ 7:1, contornos de 2 px, campo liso, configurável; respeita `prefers-contrast`.

**Testes automáticos**
- [ ] Teste com contraste WCAG de cada par texto/fundo da interface.
- [ ] Teste com ΔE simulado (Machado protan/deutan, Brettel ou Machado tritan) entre as cores de clube.
- [ ] Teste de monotonia de L nas rampas e na escala de notas.
- [ ] As capturas do `browser-check` também são geradas em versão simulada para revisão.
- [ ] As matrizes de simulação foram confirmadas na tabela dos autores antes de entrarem nos testes.
