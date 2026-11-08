# Revisão: arte de identidade e gráficos pequenos — v1

**Pedido:** revisão de emblemas (`kit.ts`, `identity.ts`), equipamentos (`kit.ts`, `wardrobe.ts`, `kitAgainst`, `kitClash`), retratos (`portrait.ts`), cartas (`cards.ts`), troféus (`trophies.ts`), ícones de liga (`leagues.ts`), ícones de 16 px (`icons.ts`), letra (`font.ts`) e cores das notas (`style.css`). Ramo atual, commit `fd8abd6`.
**Veredicto:** NÃO PASSA — 1 bloqueante, 9 a corrigir, 8 sugestões
**Folhas** (em `/tmp/claude-0/-home-user-Pocket-Basketball/32f7ae8f-cf51-5b25-8081-569df0733c98/scratchpad/review/identidade/`):
- `emblemas-1x.png` e `emblemas-3x.png`: os 54 clubes por divisão;
- `emblemas-tamanhos-3x.png`: os emblemas a 14, 16, 18, 20, 24 e 32 px, com vizinho mais próximo, a cores e em cinzentos;
- `simbolos-reservados-3x.png`;
- `equipamentos-2x.png` e `equipamentos-base-2x.png`;
- `retratos-1x.png` e `retratos-3x.png`: 24 caras × 4 humores;
- `cartas-3x.png` e `cartas-gcard-como-no-jogo-3x.png`;
- `icones-3x.png`: a cores e em silhueta;
- `letra-4x.png`;
- `trofeus-3x.png`.

**Scripts:** `run.cjs` e `page.js` geram as folhas, `measure.cjs` mede (→ `medidas.txt`) e `propose.cjs` valida as correções propostas. Estão todos na pasta `review/`.
**Determinismo:** a arte de identidade sai do índice ou do hash do nome. Não usa `Math.random`.
**Medidas, em resumo:**
- contraste das notas OK (≥ 4,68);
- equipamentos: 122 de 492 pares da mesma divisão falham o teste de daltonismo;
- emblemas: 5 pares com a mesma cor dominante e a mesma forma;
- bordo claro e dourado: 1,00:1 e 1,47:1 sobre o papel;
- olhos na pele mais escura: 1,58:1;
- troféus por ganhar: 1,12:1.

## Problemas

### B1 — Bloqueante — `kitAgainst` e `kitClash` não veem daltonismo
- **Onde:** `src/ui/art/identity.ts:58-67` (`kitAgainst`, Manhattan RGB < 140) e `src/ui/airport.ts:99-103` (`kitClash`, Manhattan RGB < 90).
- **Regra:** SKILL «Cor → Equipas»: ΔL ≥ 0,25, ou ΔE_OK ≥ 0,15 e ≥ 0,12 depois de simular protan, deutan e tritan (`cor.md` §6.2 e §11.6).
- **Medida:** com o clube A em casa e o equipamento que `kitAgainst` escolhe para B, **122 de 492 pares** da mesma divisão falham. Com o nosso equipamento «Terceiro» (verde `#2f8f5b`), falham **27 dos 54 clubes**. Os piores casos:
  - verde contra vermelho `#cf3a2c`: ΔL 0,010 e deutan ΔE 0,064;
  - verde contra laranja: protan 0,057;
  - roxo contra azul-petróleo: ΔL 0,004 e tritan 0,095.

  Com o azul principal falham 7 dos 54 clubes, todos verdes, com tritan 0,063.
- **Proposta:** trocar `colorDistance(...) < 140` pelo `teamsClash(x, y)` de `cor.md` §11.6, posto num módulo de cor partilhado. Usá-lo também em `kitClash`. Validado em `propose.cjs`: **0 de 492** pares falham, e **0 de 54** para cada um dos 4 equipamentos base.

### C1 — A corrigir — Cinco pares de emblemas com a mesma cor dominante e a mesma forma na mesma liga
- **Onde:** `identity.ts:7-11` (`SETS`, ciclo de 16) e `identity.ts:39` (forma `(i*3)%8`, ciclo de 8). Os clubes `i` e `i+8` têm sempre a mesma forma, e os conjuntos 1/9, 4/12 e 7/15 têm a mesma cor principal.
- **Medida (R-4.7):**

  | Clubes | Cor | Forma |
  |---|---|---|
  | 1 Ribeirinha / 9 Académica | vermelho | oval |
  | 20 Moinhos / 28 Estação | roxo | losango |
  | 31 Eirinha / 39 Zambujal | castanho | hexágono |
  | 41 Reyes del Sol / 49 Vallecito Toros | vermelho | oval |
  | 44 Castelrosso / 52 Ferrovia | roxo | losango |

  A 16 px, em cinzentos, a distância de 44/52 é de 0,130, e a de 20/28 de 0,132; a mediana entre pares é de 0,213 (`emblemas-tamanhos-3x.png`).
- **Proposta:** em `SETS`, trocar as linhas 9↔10, 12↔13 e 14↔15. Validado: 0 violações. Nota: as cores dos clubes da liga mudam em carreiras já guardadas, porque a identidade é derivada e não guardada.

### C2 — A corrigir — O bordo claro e o dourado desaparecem no papel
- **Onde:** `kit.ts:100` e `kit.ts:227-232`; `identity.ts:12` e `:47` dão o bordo `light` a 18 clubes e o `gold` a outros 18.
- **Regra:** `cor.md` §6.5, «contorno sempre `INK`»; 3:1 em elementos gráficos.
- **Medida:** o claro `#f8f0d8` contra o `--paper` dá **1,00:1**, e o dourado **1,47:1**. Nos emblemas 14, 17, 29, 38 e 49 o campo branco ou creme encosta ao bordo, e a silhueta perde-se (`emblemas-3x.png`).
- **Proposta:** em `kit.ts:231-232`, a orla exterior é sempre `INK`. A cor de `border` passa para o anel logo dentro, os píxeis com um vizinho de orla.

### C3 — A corrigir — O símbolo não contrasta com o campo
- **Onde:** os acentos em `identity.ts:8-11`; o desenho em `kit.ts:247-249`.
- **Regra:** R-4.1 e regra da tintura, ΔL ≥ 0,30 entre o símbolo e o campo (`cor.md` §6.5).
- **Medida:**
  - Com acento = `INK` (conjuntos 1 e 9: clubes 1, 9, 17, 25, 33, 41 e 49), o símbolo funde-se com a sombra de tinta de 2 px e fica uma mancha negra. Vê-se nos clubes 1, 33 e 41.
  - Verde com o símbolo vermelho (clubes 11, 27 e 43): ΔL **0,010**, deutan ΔE 0,064.
  - Azul-petróleo com vermelho (13, 29 e 45): ΔL 0,062.
  - Em 30 clubes o acento difere da segunda cor do padrão em ΔL < 0,30, por exemplo o ouro sobre o creme (0,118).
- **Proposta:** em `SETS`, mudar os acentos:
  - [1] para `#f2c230`;
  - [9] para `#ffffff`;
  - [11] e [13] para `#f2c230`.

  Para os padrões, R-4.2: quando o campo tem padrão, não pôr o símbolo por cima das zonas da segunda cor. Por exemplo, um escudete liso de 16×16 da cor principal atrás do símbolo, em `kit.ts:236`.

### C4 — A corrigir — Escalas não inteiras nos emblemas, nos ícones de liga, nos retratos e nas cartas
- **Onde:**
  - emblemas de 32 px mostrados a 14 px (`hud.ts:34`, `:38`), a 18 px (`season-screens.ts:120`, `menus.ts:488`, `:831`, `.kithead` em `style.css:914`), a 20 px (`menus.ts:463`, `:569`, `:751`) e a 24 px (`panel.ts:39`, `menus.ts:568`, `:817`, `style.css:630`);
  - `leagueIcon` de 16 px a 14 px (`season-screens.ts:93`, `menus.ts:569`) e a 20 px (`menus.ts:884`);
  - `.face` de 28 para 20 px (`style.css:366`);
  - `.fedleft .pportrait` a 64 px (`style.css:1139`);
  - `.gcard img` de 40×44 para 46×38, com `cover`, ×1,15 (`style.css:798`);
  - `.grades img` com `width:100%` numa grelha de 7 colunas (`style.css:721`).
- **Regra:** escala inteira, sempre (SKILL «Regras do projeto»).
- **Medida:** a 14 px sobram 14 das 32 colunas, e **56 % dos pormenores de 1 px perdem-se**. Os símbolos ficam ilegíveis a 14–20 px (`emblemas-tamanhos-3x.png`, linhas 14 a 20). No retrato de 28 para 20 px perdem-se 8 linhas, entre elas a 12, a de cima dos olhos.
- **Proposta:**
  - emblemas só a 32 px, em `panel.ts:39` (o valor por omissão passa de 24 para 32) e `menus.ts:568`/`:817`;
  - nos sítios pequenos, uma versão nativa de 16 px: `emblemCanvas(emblem, 16)` com a forma a 16, padrões de 4 px e símbolos de 8×8 desenhados à mão, por R-4.6;
  - `leagueIcon` a 16 ou 32 px;
  - `.face` a 28 px;
  - `.pportrait` a 56 ou 84 px;
  - `.gcard img` a 40×44.

### C5 — A corrigir — Na pele mais escura, os olhos não se leem
- **Onde:** `portrait.ts:213-223` (olhos `INK`) com `SKINS[3]` `#5c3a24` (`sprites.ts:10`).
- **Regra:** `cor.md` §0.4, «o tom escuro tem de continuar a ter contorno e leitura de cara».
- **Medida:** `INK` contra a pele 3 dá **1,58:1** (ΔL 0,131); contra a pele 2, 2,77:1. Nas colunas 4 e 24 de `retratos-3x.png` os olhos quase desaparecem.
- **Proposta:** com `look.skin >= 2`, usar sempre a variante de olho com branco (`eyes === 2`, com o píxel `#fbf6e2`, a 9,29:1 contra a pele 3), ou acrescentar esse píxel por fora das outras duas variantes.

### C6 — A corrigir — «Preocupado» e «triste» quase iguais, e às vezes «neutro» é igual a «preocupado»
- **Onde:** `portrait.ts:188` (`browMood` dá 2 para os dois) e `portrait.ts:241` (o preocupado usa a boca 0, que também é uma boca neutra).
- **Regra:** a expressão faz-se com a sobrancelha e a boca (SKILL «Pixel art → Proporções»), e cada humor tem de se distinguir.
- **Medida:**
  - preocupado contra triste: **2 píxeis** de diferença em todas as 24 caras;
  - neutro igual a preocupado em **60 de 600 caras** (10 %) e em 4 das 24 da folha.
- **Proposta:**
  - preocupado com as pontas de dentro das sobrancelhas para cima (tilt −1 em i = 2) e a boca 1 (linha larga);
  - quando o neutro sorteado coincide com o preocupado, forçar `browMood` 0 no neutro.

### C7 — A corrigir — As cartas Técnica e Físico só se distinguem pela cor, e a Técnica usa o laranja da bola
- **Onde:** `cards.ts:5-10` e `cards.ts:188`.
- **Regra:**
  - R-6.2: categoria = cor + ícone;
  - SKILL «Cores com nome»: o laranja é para a bola;
  - 4,5:1 no texto.
- **Medida:**
  - Técnica `#e8622a` contra Físico `#cf3a2c`: ΔE 0,095 com visão normal e 0,106 / 0,089 / 0,084 com protan, deutan e tritan; ΔL 0,087;
  - a bola contra o fundo da Técnica dá 1,00:1;
  - o título `.gcard > b` (branco, `style.css:797`) dá 3,38:1 na Técnica e 4,14:1 na Tática.
- **Proposta:**
  - acrescentar em `cardImage` (`cards.ts:196`) um ícone de categoria de 6×6 no canto superior esquerdo, com contorno de tinta;
  - tirar a Técnica do laranja da bola, por exemplo `#c98a1e`, âmbar: ΔE com o Físico 0,17 / 0,18 / 0,11 / 0,15;
  - no `.gcard > b`, pôr o texto a `--ink` sempre que o branco dê menos de 4,5:1.

### C8 — A corrigir — Troféus por ganhar invisíveis
- **Onde:** `trophies.ts:88-90` (`#1b140d` sobre `#2a1e14`).
- **Regra:** `cor.md` §7.1, o estado desligado fica entre 2:1 e 3:1.
- **Medida:** **1,12:1**. A taça, a taça grande e o prato confundem-se (`trofeus-3x.png`).
- **Proposta:** a sombra passa a `#5a4430` (1,78:1) ou um passo acima, como `#6a5440`, a confirmar com ≥ 2:1.

### C9 — A corrigir — O til do Ã e do Õ é um mácron
- **Onde:** `font.ts:8-9`, com `Ã: '07025755'` e `Õ: '07025552'`.
- **Regra:** `design-grafico.md` §2.2.
- **Medida:** a linha de acento `7` = `###` é igual a um mácron (`letra-4x.png`, «NÃO», «AÇÃO»).
- **Proposta:** `Ã: '36025755'`, `Õ: '36025552'`, uma onda (`·##` sobre `##·`).

### S1 — Sugestão — Faltam glifos
- **Onde:** em `font.ts` faltam `º ª « » € , / ( )`, que saem como espaço («1º» fica «1 », e a vírgula de «AÇÃO, ÓBVIO» desaparece). As minúsculas também desaparecem em silêncio (`font.ts:29`).
- **Medida:** procurei nas entradas atuais de `text()` (claque em `crowd.ts`, `MOVE_LABELS`, nomes) e nenhuma usa esses caracteres.
- **Proposta:** acrescentar os glifos, e um `toUpperCase()` em `text()`.

### S2 — Sugestão — Glifos que diferem num só píxel
- **Onde:** `font.ts:3-6`.
- **Medida:** 0/8, 0/U, 5/6, 5/9, 6/8, 8/9, H/M, H/W e K/X diferem em 1 píxel. O 0 e o 8 aparecem nos resultados do quadro a 1× (`bracket.ts:75`).
- **Proposta:** `0: '75557'` → `'25552'`, um zero estreito (mas fica igual ao O), ou `'75357'`, com um traço.

### S3 — Sugestão — Equipamentos repetidos de 16 em 16 clubes
- **Onde:** `identity.ts:49`. O comentário de `identity.ts:1` diz «únicos», mas o clube 0 = 16 = 32 = 48, o 1 = 17 = 33 = 49, e assim por diante: 16 equipamentos principais para 54 clubes. Com subidas, descidas e taças, encontram-se.
- **Proposta:** `KIT_PATTERNS[(i * 7 + (i >> 4)) % 8]` dá 54 equipamentos diferentes.

### S4 — Sugestão — O «contorno» do símbolo é uma sombra
- **Onde:** `kit.ts:247`. A tinta de 2×2 só passa para a direita e para baixo, por isso as arestas de cima e da esquerda dos símbolos claros encostam a campos claros sem separação (14, 30, 32).
- **Proposta:** chamar-lhe sombra no comentário, ou pintar a tinta em (x−1, y−1) com 3×3.

### S5 — Sugestão — Pesos diferentes na família de ícones de 16 px
- **Onde:** `icons.ts:104-117`.
- **Medida:** peso relativo de 0,41 no `back`, 0,56 no `muted` e 0,63 no `sound`, contra 1,35 no `board`; o limite é ±25 % da média (`design-grafico.md` §13).
- **Proposta:** a seta `back` com o traço de 2 px em toda a haste; os altifalantes com 1 px a mais.

### S6 — Sugestão — Troféus: rampa curta e brilho comprido
- **Onde:** `trophies.ts:86-101`.
- **Medida:** cada metal tem 2 tons e um branco. O realce é uma faixa de 2×(h−6) px, e não um só ponto especular (R-7.2). A prata `#c9ccd4` e o ouro `#f2c230` têm ΔL 0,011: distinguem-se pelo tamanho (×1,3), mas não pela claridade (R-7.1).
- **Proposta:** usar as rampas de 5 tons de `design-grafico.md` §7.2 e um especular de 1 px.

### S7 — Sugestão — `grade-pop` com uma escala fracionária
- **Onde:** `style.css:511`, `scale(1.35)` num `.gr`. É uma transformação CSS que desfoca.
- **Medida:** com protan, as notas B e C ficam a ΔE 0,040. A letra dá a informação, e as cores são decisão do utilizador, por isso não se mexe nelas.
- **Proposta:** saltar por `translateY(-2px)` em vez de escalar.

### S8 — Sugestão — Originalidade e nomes
- **Os três casos explícitos estão limpos:**
  - o leão sai nos clubes 0, 21 e 42 (azul/branco, laranja/tinta, azul/ouro), e nunca a verde e branco;
  - a águia sai nos 2, 23 e 44 (verde, castanho, roxo), e nunca a vermelho;
  - o dragão sai nos 12 e 33 (roxo/ouro, vermelho), e nunca a azul e branco.
- **Lembram símbolos reais:**
  - o 17 (Salinas BC, xadrez vermelho e branco) lembra a šahovnica croata;
  - o 9 (riscas verticais vermelhas e douradas com castelo) lembra a senyera e Aragão.
- **Nomes que não batem com o símbolo:** «Kronberg Löwen» (leões) tem um cavalo, e «Vallecito Toros» tem um navio. «Ferrovia Bianconera» é a alcunha da Juventus.
- **Proposta:** mudar o padrão do 17 para `rays`/`plain`, e dar aos clubes de fora um mapa de símbolos por nome em `identity.ts:44`.

## Visto e sem problemas
- **Notas S a E:** o contraste do texto passa em todas: S 9,51, A 5,95, B 6,38, C 4,68 (a mais justa), D 5,33, E 7,37. Têm contorno de tinta de 2 px.
- **Ícones de atributo:** figura contra fundo ≥ 3:1 em todos (o mais baixo é o de resistência, 3,17).
- **Ícones da barra do treinador:** a exatamente 2× (`style.css:236`, `:690`).
- **Seta das trocas:** verde e vermelho a deutan 0,077, mas distinguem-se pela forma (para cima e para baixo).
- **Estrelas das opções e ícones de liga:** têm contorno de tinta, por isso leem-se sobre o papel apesar da prata a 1,35:1 e a 1,50:1.
- **Acentos Á À Â É Ê Í Ó Ô Ú e cedilha:** coerentes com §2.2. O `%` largo mede bem (`textWidth`).
- **Determinismo e caches:** a identidade é estável. Os emblemas usam `remember`, com limite de 300.
- **Cartas:** a pose e o objeto leem-se, e há um só jogador fixo (`CARD_LOOK`).
- **Retratos:** há contorno automático em todos, e a forma da cara varia bem.

## Não verificado
- APCA e o modo de alto contraste das notas e dos emblemas.
- A largura real das células de `.grades` (não abri o ecrã) e as dimensões de origem do `.kitbtn canvas` e do `.kit canvas`.
- A pesquisa no TMview e no WIPO e a pesquisa invertida de imagem (sem rede para isso).
- Os jogos entre clubes da IA mostrados no campo; o B1 cobre os pares por divisão e os nossos 4 equipamentos.
- As matrizes de Machado foram transcritas de `cor.md`, como lá se avisa; a tritanopia é uma aproximação.
