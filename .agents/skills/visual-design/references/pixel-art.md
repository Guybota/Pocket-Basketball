# Fundamentos e normas de pixel art para o Pocket Basketball

Pesquisa para escrever as diretrizes de arte de um jogo de gestão de basquetebol em pixel art, ao estilo dos jogos de gestão desportiva das consolas portáteis. No Pocket Basketball toda a arte é gerada por código TypeScript num canvas: o campo e a cidade isométricos, jogadores de 16 a 32 px, retratos, ícones, letra bitmap, emblemas e equipamentos. Só se mostra em escalas inteiras.

## Nota sobre as fontes

Nesta sessão o `WebFetch` não funcionou: slynyrd.com, derekyu.com, androidarts.com e web.archive.org foram bloqueados pela rede. Por isso usei os excertos das pesquisas web (`WebSearch`), que citam essas páginas, e o meu conhecimento do tema. Cada facto vem marcado assim:

- **[V]**: confirmado por um excerto de pesquisa que cita a fonte indicada.
- **[NV]**: conhecimento geral da comunidade ou memória minha, não confirmado nesta sessão. Vale a pena verificá-lo antes de o citar como regra de outra pessoa.

As regras práticas (as que começam por «Regra») são minhas: tiram das fontes o que serve um gerador por código.

---

## 1. Linhas

### 1.1 Linhas perfeitas e declives

- Uma linha de pixel art é uma escada de **segmentos**, troços horizontais ou verticais de pixéis seguidos. A linha lê-se como reta quando todos os segmentos têm o mesmo comprimento. **[V]** (Lospec, «Pixel art outlines»; fórum do Aseprite)
- As **linhas perfeitas** são as de razão inteira simples: 0:1 (horizontal), 1:1 (45°), 1:2 e 2:1 (cerca de 26,57° e 63,43°), 1:3, 3:1, 1:4 e assim por diante. O olho segue-as sem esforço. **[V]** (Lospec)
- Os declives 1:n e n:1 são os mais sensíveis: um único segmento de outro tamanho nota-se logo. **[V]** (fórum do Aseprite)
- Um declive que não é inteiro (por exemplo 2:3) obriga a alternar segmentos de 1 e 2. Se for preciso, a alternância tem de ser **regular** (1,2,1,2), nunca 1,2,2,1,2,1,1. **[NV]**, prática comum.
- **Regra:** no código, desenha as retas das silhuetas e da arquitetura **só com declives inteiros**: 1:1, 2:1, 1:2, 3:1 ou 1:3. O algoritmo de Bresenham com declive arbitrário gera segmentos irregulares. Para ângulos «livres», arredonda o declive para a razão inteira mais próxima.

### 1.2 Curvas

- Numa curva, o comprimento dos segmentos sobe ou desce **de forma monótona e gradual**, por exemplo 5,3,2,2,1,1. Um segmento fora da sequência faz um «calombo». No exemplo da Lospec, 5,2,1,2,1 está errado e 5,2,2,1,1 está certo. **[V]**
- Às vezes uma curva repete um passo (2,2), mas não volta atrás (2,1,2). **[V]** (excerto do OpenGameArt, «Lines and curves»)
- **Regra:** para círculos e elipses pequenos (bola, aro, cabeças, emblemas), usa tabelas de pixéis feitas à mão para os diâmetros que precisas (3 a 16 px) em vez de calcular a circunferência em tempo real. Assim também cumpres a regra do projeto de evitar trigonometria em `src/sim/`; a interface não tem essa obrigação, mas ganha previsibilidade.

### 1.3 Jaggies e «doubles»

- **Jaggies** são irregularidades no comprimento dos segmentos que partem uma linha ou curva que devia ser lisa. **[V]** (artigo do Clip Studio Tips; Pixel Grimoire)
- **Doubles** são pixéis extra nos cantos dos degraus: a linha de 1 px fica com 2 px de espessura nesse ponto e ganha um «nó». **[V]** O remédio clássico é o filtro «pixel-perfect»: quando três pixéis formam um L, tira-se o do canto. **[NV]**, é o que faz o modo *pixel-perfect* do Aseprite.
- Pode haver doubles **intencionais**, por exemplo para sublinhar um canto vivo ou dar peso a uma parte da linha. **[V]** (Clip Studio Tips)
- Ordem de trabalho recomendada: primeiro a pose e a forma, depois a limpeza dos jaggies e doubles. **[V]** (Clip Studio Tips)
- **Regra:** junta ao gerador de linhas um passo `removeLCorners()` que limpa os L em contornos de 1 px, e um teste que os conta nos sprites gerados.

### 1.4 Pixéis órfãos

- Um **órfão** é um cluster de um só pixel, isolado da sua cor. Os órfãos são a principal causa de imagens «ruidosas». **[V]** (Pedro Medeiros, «How to start making pixel art #2», Pixel Grimoire)
- Não os apagues às cegas: pergunta se aquele pixel tem mesmo de estar sozinho. Um brilho no olho ou na bola é um órfão útil. **[V]** (Clip Studio Tips)
- **Regra:** os órfãos só se aceitam como **acentos** escolhidos (brilho nos olhos, reflexo no aro, botão). Um teste pode contar os órfãos por sprite e falhar acima de um limite (por exemplo 3 num jogador de 24 px).

### 1.5 Banding

- O **banding** aparece quando faixas de cores diferentes correm paralelas e com a mesma largura, sobretudo se os degraus alinham. A forma fica achatada e o olho vê a grelha em vez do volume. **[V]** (Pixel Grimoire #5; Pixel Joint, tópico de recursos 11299)
- Também acontece com o anti-aliasing: segmentos de AA alinhados com os da linha formam bandas. **[V]** (Pixel Parmesan, «Anti-Aliasing Fundamentals»)
- Remédios: desencontra os degraus de bandas vizinhas, varia a largura das bandas, junta pixéis em clusters de forma irregular ou usa dithering com conta. **[V]** (glossário Pixnote; Pixel Grimoire)
- **Regra:** nos gradientes feitos por código (céu, chão do pavilhão, sombras de volume), **não** alinhes as fronteiras de cor. Mete um desvio de ±1 px por linha a partir de uma semente fixa, ou passa as fronteiras a curvas.

### 1.6 Pillow shading

- O **pillow shading** é sombrear do contorno para o centro, claro no meio e escuro nas bordas, como se a luz viesse de frente para o observador. Fica com ar de almofada e não tem luz direcional. **[V]** (blog 3dbrendang; Pixel Joint)
- Não se corrige com retoques: é preciso refazer os clusters a partir de uma fonte de luz. **[V]** (blog 3dbrendang)
- **Regra:** nunca geres sombreamento com um «inset» do contorno (erosão da máscara e uma cor mais clara lá dentro). Calcula a sombra a partir da direção da luz (ver §4).

---

## 2. Bordas e contornos

### 2.1 Anti-aliasing manual

- O AA manual põe pixéis de cor intermédia nos cantos dos degraus para suavizar a transição. **[V]** (Clip Studio Tips; Derek Yu, citado)
- Em excesso, o AA deixa a imagem desfocada e faz banding. Vale mais usar **menos tons e menos passos**. **[V]** (Pedro Medeiros, Pixel Grimoire #5)
- Não se aplica AA a linhas de **45°** nem a linhas retas: fica «almofadado». A exceção é engrossar uma linha de 45° de propósito. **[V]** (Pixel Grimoire #5; Pixel Parmesan)
- O comprimento do AA acompanha o do segmento: segmento curto, AA curto, e regra geral **um pixel de transição por canto de degrau**. **[V]** (Pixel Joint, «Handmade Anti-Aliasing»; Pixel Parmesan)
- **Bordas exteriores:** o AA do lado de fora depende do fundo. Se o fundo muda, deixa de bater certo. **[V]** (Pixel Parmesan)
- Se o AA estragar mais do que ajuda, tira-o. **[V]** (Pixel Grimoire #5)
- **Regra para o Pocket Basketball:**
  - Sprites que andam sobre fundos variáveis (jogadores no campo, ícones sobre painéis): **sem AA exterior**. Só AA interior, entre cores do próprio sprite, e só em sprites de 24 px para cima.
  - Sprites de 16 px: **sem AA nenhum**. Não há pixéis que cheguem.
  - Retratos (por exemplo 32×32 ou maiores, sobre fundo fixo do painel): AA exterior permitido, calculado para a cor do fundo desse painel.
  - O AA calculado (misturar duas cores a 50 %) gera cores fora da paleta. Usa a cor intermédia **mais próxima da paleta**, ou uma cor de rampa pensada para isso.

### 2.2 Selective outlining («selout»)

- No **selout** o contorno não tem uma cor única: em cada troço usa uma versão mais escura da cor de preenchimento vizinha, e fica mais claro (ou desaparece) do lado da luz. **[V]** (Lospec, «Pixel art outlines part 2: using color»; fórum da Solarus)
- Receita base: contorno = um tom abaixo da cor da borda. Para um contorno mais marcado, desce mais tons. **[V]** (Lospec; tutorial no itch.io)
- Um contorno preto contínuo sobre zonas claras e escuras achata a imagem, porque não tem relação nenhuma com a luz. **[V]** (Pixel Joint)
- Linhas interiores entre duas partes (braço sobre o tronco): usa a cor da parte **mais próxima do observador**. **[V]** (Lospec)
- O contorno tem de funcionar sobre o fundo. Um contorno claro perde-se em fundos escuros, o que é mais difícil quando o fundo muda. **[V]** (Lospec)
- Há uma versão em algoritmo: o `apply_selout` da biblioteca pixelsrc pinta cada pixel do contorno com a cor de preenchimento vizinha mais frequente, escurecida. **[V]** (docs.rs, pixelsrc)
- **Regra:** implementa o selout como passo de pós-processamento.
  1. Gera a máscara.
  2. Para cada pixel de borda, olha para o vizinho interior.
  3. Pinta com `ramp[i-2]` (dois tons abaixo) do lado da sombra e com `ramp[i-1]` do lado da luz.
  4. Onde o sprite toca o fundo do campo (madeira clara), o contorno fica sempre escuro.

### 2.3 Cor do contorno

- Evita o preto puro (#000) como cor de contorno por defeito. Usa um castanho, roxo ou azul muito escuro, de acordo com o tom geral. Fica mais rico e liga o sprite à paleta. **[NV]**, conselho repetido (Derek Yu, Slynyrd).
- Reserva o tom mais escuro da paleta para contornos e sombras de contacto, para manter **um** ponto de máximo contraste.

### 2.4 Contorno ou sem contorno, a tamanhos pequenos

- Sem contorno a arte parece mais natural, mas a leitura depende do contraste de valor entre a figura e o fundo. **[V]** (excerto de tutorial genérico)
- Em sprites pequenos sobre fundos movimentados, o contorno é o que segura a silhouette. Alguns guias propõem um contorno exterior grosso, mas isso é sugestão, não norma. **[V]**, mas fonte fraca.
- **Regra para o Pocket Basketball:**
  - **Jogadores no campo (16 a 24 px):** contorno exterior de 1 px, escuro, quase uniforme, com um selout leve só nas zonas de pele. O piso claro e a multidão escura pedem um contorno que funcione nos dois.
  - **Cidade isométrica:** contorno só nas arestas exteriores dos edifícios. As arestas interiores ficam como mudança de valor entre as faces.
  - **Ícones (8 a 16 px):** contorno de 1 px completo. Têm de funcionar em qualquer painel.
  - **Retratos:** selout completo.

---

## 3. Clusters, silhouette e leitura

### 3.1 Clusters e ruído

- Um **cluster** é um grupo de pixéis seguidos da mesma cor. A pixel art limpa tem **poucos clusters, grandes e de forma pensada**, e quase nenhum de um só pixel. **[V]** (Pedro Medeiros, Pixel Grimoire #2)
- O **ruído** são pixéis soltos, espalhados, que baixam a leitura. **[V]** (glossário Pixnote)
- Às vezes o ruído é um atalho legítimo para sugerir detalhe (relva sem desenhar as folhas), mas em excesso suja a cena. **[V]** (Pixel Joint)
- **Regra:** o gerador trabalha por **regiões**, não por pixéis. Cada parte do corpo, cada face de edifício e cada peça de emblema é uma região com 2 a 4 cores. Proíbe o ruído aleatório pixel a pixel (`if (rng() < 0.1) setPixel(...)`) fora das texturas de fundo.

### 3.2 Silhouette e leitura em tamanhos minúsculos

- A arte forte lê-se pela silhouette antes da cor e do detalhe. Teste: pinta o sprite de preto e vê se ainda se reconhece. **[V]** (guia Bugnet; freegamesprites)
- A leitura vem quase toda do **contraste de valor**, não da cor. Teste: tira a saturação e vê se as formas ainda se separam. **[V]** (Wayline, curso de cor)
- Vê sempre à escala real, a 1×, e semicerra os olhos. **[V]** (img2px)
- A 16×16 o detalhe some: a forma é tudo. **[V]** (excerto de guia)
- Nos sprites pequenos, mais detalhe e mais sombreamento nem sempre ajudam a ler. Às vezes estilizar é sacrificar detalhe. **[V]** (Lemmy, discussão sobre Kairosoft)
- **Regras:**
  - Cada pose do jogador (parado, a driblar, a lançar, a ressaltar, a defender) tem de ser **reconhecível pela silhouette a preto**. O braço do lançamento e a bola acima da cabeça saem da silhouette.
  - A bola é o objeto mais importante do campo: cor saturada (laranja) e um contorno que **nenhuma** camisola tem.
  - As duas equipas distinguem-se pelo **valor** antes da tonalidade: uma clara e outra escura, como os equipamentos de casa e de fora no basquetebol. Um teste de luminância (por exemplo, diferença mínima de 25 % em L\*) evita confrontos como vermelho contra verde.

### 3.3 Personagens a 16, 24 e 32 px

Proporções:

- Para personagens pequenas serve uma proporção de **2 cabeças**. Se a cabeça parece pequena, aumenta-a. **[V]** (Pixnote, «How to draw pixel art characters»)
- Em tamanho limitado, a cabeça ocupa **entre um terço e metade** do sprite, para levar a expressão. **[V]** (Slynyrd, Pixelblog 22, «Top Down Character Sprites», citado)
- Olhos de 1×1 px, só com cor, chegam para personagens de 8 a 16 px. Mover um olho 1 px muda muito a expressão. **[V]** (Pixnote)
- Nas personagens com cara, há quem contorne a cabeça deixando um lado aberto. Os olhos podem subir até à linha do cabelo. **[V]** (fórum Lexaloffle/PICO-8)
- Uma regra comercial aproximada para 16 px: cabeça de 4 a 6 px de largura, corpo de 6 a 8 px, e 1 a 2 px de margem para a animação. **[V]**, mas fonte comercial, por isso é só orientação.

Proposta para o basquetebol, onde os jogadores são altos e a altura é informação de jogo:

| Altura do sprite | Uso | Cabeças | Cabeça (L×A) | Cara | Notas |
|---|---|---|---|---|---|
| 16 px | campo, vista afastada, cidade | 2 a 2,5 | 5×5 a 6×5 | 2 olhos de 1 px, sem boca | camisola = um bloco de 2 cores; número ilegível, não o desenhes |
| 24 px | campo, vista normal | 2,5 a 3 | 6×6 a 7×7 | olhos de 1 px, sobrancelha opcional de 1 px | o número pode ser 1 ou 2 algarismos numa letra de 3×3 só nas costas, ou fica uma faixa de cor |
| 32 px | jogo próximo, vitórias | 3 a 3,5 | 8×8 a 9×9 | olhos de 1×2, boca de 1 a 2 px | calções e camisola distintos, ténis de 2 cores |
| retrato 32–48 px | ficha do jogador | busto | 20 a 28 px | olhos de 2×2 com brilho, nariz por sombra, boca de 2 a 3 px | selout completo e AA exterior para o fundo fixo |

- **Altura como dado:** num jogo de basquetebol, a diferença entre um base (1,85 m) e um poste (2,15 m) deve ver-se. Proposta: varia 0 a 3 px de altura em sprites de 24 px **só no tronco e nas pernas**. A cabeça mantém sempre o mesmo tamanho, para não estragar a leitura da cara. **[NV]**, proposta própria.
- **Caras com 1 a 2 px:**
  - A expressão vive em **onde** estão os olhos (altura, distância entre eles) e na **sobrancelha** de 1 px (inclinada para dentro dá zanga, para fora dá tristeza).
  - Uma boca de 1 px escura ou clara faz um sorriso ou um grito.
  - O cabelo vale mais do que a cara para distinguir pessoas a 16 px: penteado, cor, barba (uma faixa de 1 px mais escura no queixo) e fita na cabeça.
  - **[NV]**: técnicas comuns, não confirmadas numa fonte única.

---

## 4. Sombreamento

### 4.1 Fonte de luz coerente

- Escolhe uma direção de luz e mantém-na em todos os sprites, cenários e ícones. **[V]** (excertos de tutoriais; Derek Yu, citado)
- **Regra:**
  - Luz **de cima e da esquerda** para a cidade isométrica e para os ícones: face de cima clara, face esquerda média, face direita escura.
  - No pavilhão a luz vem **de cima**: jogadores com sombra de contacto elíptica e escura por baixo, e o lado de baixo do corpo mais escuro.
  - Põe a direção numa só constante, partilhada por todos os geradores.

### 4.2 Sombreamento de forma

- Pensa nos volumes primitivos (cilindro para braços e pernas, esfera para a cabeça e a bola, caixa para o tronco) e sombreia o terminador, a fronteira entre luz e sombra, como uma curva coerente com a forma. **[NV]**, fundamento clássico.
- Bastam 3 valores por material num sprite de 24 px: luz, base e sombra. Um quarto só para a sombra de contacto ou para um brilho especular. Mais do que isto costuma ser ruído. **[NV]**

### 4.3 Rampas com rotação de tonalidade (*hue shifting*)

- Escurecer só com o valor dá sombras cinzentas e «lamacentas» e luzes desbotadas. **[V]** (excertos Wayline, Pixnote)
- Direção habitual: sombras para o frio (azul ou roxo), luzes para o quente (amarelo ou laranja). **[V]**
- Slynyrd (Pixelblog 1, «Color Palettes») defende uma rotação positiva de até **20°** ao longo da rampa: as cores aquecem à medida que clareiam. A saturação atinge o máximo no **tom do meio** e desce para os dois extremos. **[V]**
- Um artigo do GameDev.net que segue o mesmo método mostra 9 tons por rampa com 20° de rotação entre tons e a saturação no máximo no centro. **[V]**
- Rampas de 5 a 6 tons para roupa, pele e cabelo. **[V]** (guia Stardew Modding)
- A rotação de tonalidade ajuda o contraste de valor, mas não o substitui. **[V]**
- **Regra para gerar rampas em código** (é o que deixa as cores das equipas recolorirem bem):

```ts
// rampa de n tons a partir de uma cor base em HSL/OKLCH
// i = 0 (sombra) .. n-1 (luz)
const t = i / (n - 1);                 // 0..1
const hue = base.h + (t - 0.5) * 2 * shift; // shift ≈ 10–20° (positivo: aquece ao clarear)
const sat = base.s * (1 - 0.35 * Math.abs(t - 0.5) * 2); // pico no meio
const lit = lerp(0.18, 0.92, t);       // valores bem espaçados
```

  Rodar para o lado «quente» quer dizer andar para o amarelo, cerca de 60°. Para um azul (cerca de 220°) a luz roda para o ciano e a sombra para o roxo; para um vermelho, a luz roda para o laranja e a sombra para o magenta. Mais seguro: interpola o matiz na direção do amarelo para a luz e na do azul-roxo (cerca de 260°) para a sombra.

- **Espaçamento de valor:** os tons vizinhos devem afastar-se, no mínimo, cerca de 8 a 12 % em luminância. Tons demasiado próximos da base desaparecem. **[V]** (excerto «shadow tones too close to the base color can disappear»)

### 4.4 Dithering

- O dithering simula cores intermédias ou textura alternando duas cores num padrão. **[V]** (Derek Yu, citado)
- **Prejudica em sprites pequenos:** fazer dithering num olho de 4 px ou numa letra de 3 px não dá mistura nenhuma. Protege caras, mãos, texto e ícones. **[V]** (Divoom, guia de dithering)
- Os sprites nativos, pixel a pixel, ficam sem dithering. **[V]** (RetroBeads)
- O xadrez manual serve para transições rápidas de sombra e zonas grandes de gradiente. **[V]**
- O dithering ordenado (Bayer 4×4 ou 8×8) tem um padrão regular, que **não cintila em animação**, e lembra os preenchimentos em xadrez dos jogos antigos. **[V]**
- Também se usa dithering para criar textura, não só gradiente. **[V]**
- Mark Ferrari pintou à mão fundos EGA com dithering para a LucasArts (Loom, Zak McKracken). O dithering dele é **deliberado e com padrões variados**, não um filtro. **[V]**, historial; os detalhes técnicos do seu talk na GDC 2016 não foram confirmados, porque o vídeo está atrás de login.
- **Regras:**
  - **Proibido** em jogadores, caras, números, letras, ícones e emblemas.
  - **Permitido** em zonas grandes e estáticas: céu da cidade, sombras grandes de edifícios, bancada vista de longe, reflexo no piso.
  - Para fazer em código, usa o Bayer 4×4 com **apenas** duas cores vizinhas na mesma rampa, e só numa faixa estreita de transição (2 a 4 px), não em toda a área. Fixa a matriz ao mundo e não ao objeto, para não «nadar» quando a câmara se move.
  - **Nunca** uses difusão de erro (Floyd–Steinberg) em arte gerada: produz ruído e órfãos.

---

## 5. Textura e isometria

### 5.1 Textura a escalas pequenas

- A textura sugere-se com **poucos clusters de forma repetida**: tábuas do piso, tijolos, telhas. Não se desenha pixel a pixel. **[NV]**
- **Regras:**
  - Piso do pavilhão: tábuas com junta de 1 px num tom pouco abaixo da madeira, desencontradas, mais 1 ou 2 faixas de reflexo claro largas. Nada de grão de madeira por pixel.
  - Paredes da cidade: tijolo sugerido por 2 a 3 juntas por face, não por um padrão completo.
  - Fica com a textura com o **contraste mais baixo** do ecrã, para os jogadores ganharem sempre.

### 5.2 A linha 2:1

- A pixel art isométrica usa o declive 2:1 (dois pixéis para o lado por cada um para cima), cerca de **26,57°**, em vez dos 30° da isometria verdadeira: a 30° os degraus ficam irregulares. **[V]** (Slynyrd, Pixelblog 4 e 41)
- Na prática é **dimétrica**, mas toda a gente lhe chama isométrica. **[NV]**
- «Regra de ouro» do Wikibooks: por cada 2 pixéis no eixo de profundidade, 1 pixel no outro eixo. **[V]**
- Usar 45° por engano é um erro comum: dá diagonais feias e quebra o encaixe das peças. **[V]**
- Para manter as proporções das personagens, o Slynyrd sugere desenhar primeiro um cuboide isométrico em arame como guia. **[V]** (Pixelblog 41)
- Guia em camada própria para verificar o alinhamento. **[V]** (Pixelblog 4 e 54)

### 5.3 Ladrilhos e o cubo

- Mosaico típico: **32×16** (ou 64×32), com razão 2:1. **[V]**
- **O losango e o «bico»:** um losango 32×16 desenhado só com segmentos de 2 px tem um problema nos vértices esquerdo e direito. Duas peças vizinhas sobrepõem-se 1 px, ou deixam uma linha de falha, consoante a construção. Soluções habituais **[NV]**:
  - Topos e laterais com «bico» de 2 px horizontais (o losango tem de facto 32 px de largura, com as pontas planas de 2 px), e peças colocadas com passo de (16, 8).
  - Ou peças de 32×17 / 31×16 com a sobreposição prevista.
  - **Escolhe uma convenção e escreve-a num teste**: o encaixe de uma grelha 3×3 não pode ter buracos nem pixéis sobrepostos de cores diferentes.
- **O cubo:**
  - Topo em losango 2:1, arestas verticais de altura `h` e três faces com três valores (topo claro, esquerda média, direita escura).
  - A aresta vertical da frente, onde se juntam as duas faces laterais, faz-se pela mudança de valor, sem linha.
  - Para um cubo «parecer cúbico» numa grelha 32×16, a altura costuma andar pelos 16 a 19 px. **[NV]**, convenção.
- **Alturas legíveis:**
  - As alturas dos edifícios andam em **múltiplos de uma unidade fixa** (por exemplo 8 px por andar).
  - As alturas têm de ler-se pela **sombra projetada no chão** e pelas linhas de janelas. Sem sombra, um edifício alto e um baixo mais acima no ecrã confundem-se.
  - **[NV]**

### 5.4 Ordenação de profundidade

- Regra base: ordena pela soma das coordenadas da grelha (x + y), com a altura como desempate, e põe peças e sprites numa **só lista de ordenação**. **[V]** (Bugnet; GameDev.net; fórum do Tiled)
- Ordenar só pelo y do ecrã falha: a base de um edifício pode ficar por cima de peças mais abaixo no ecrã. **[V]** (GameDev.net)
- Objetos altos ou com várias células devem **dividir-se** em fatias de uma célula, para as personagens poderem ficar à frente e atrás deles. **[V]** (Bugnet)
- **Regra:** a chave de ordenação é `(gx + gy) * K + z`, calculada a partir dos **pés** do objeto, e vai no mesmo array que os edifícios fatiados. Os jogadores no campo isométrico seguem a mesma regra, com o aro e a tabela como objetos com «pés» no ponto de projeção no chão.

### 5.5 Erros comuns na isometria

1. Linhas a 45° ou com declive irregular. **[V]**
2. Peças com altura errada no editor, que dão grelha 1:1. **[V]**
3. Falta de coerência na luz: a face direita tem de ser **sempre** a mais escura. **[NV]**
4. Arestas com doubles nos vértices. **[NV]**
5. Mistura de projeções: sprites de frente (vista lateral) em cima de um chão isométrico. Para o Pocket Basketball funciona se for **intencional e coerente**, como as personagens frontais dos jogos Kairosoft sobre chão isométrico, mas fica perto da mistura de resoluções se as escalas não baterem certo. **[NV]**
6. Sombras projetadas que não seguem o eixo da luz. **[NV]**

---

## 6. Tilesets e juntas

- Testa as peças numa **grelha 3×3** de cópias: a 16×16 as juntas notam-se logo. Faz também o teste de desvio, porque o alinhamento com o ecrã esconde problemas. **[V]** (excerto «The seam problem», sprite-ai)
- Testa as peças em todas as combinações. **[V]**
- O conjunto **«blob» de 47 peças** cobre todas as ligações dos 4 lados e 4 cantos, aceitando um canto só quando os dois lados vizinhos também ligam. Existe para mapas que olham para os 8 vizinhos. Há alternativas de 15 ou 16 peças (*edge set*). **[V]** (cr31/Stagecast, espelho de boristhebrave; fórum do Tiled)
- **Regras:**
  - Para a cidade isométrica, um conjunto pequeno basta: estrada (reta, curva, cruzamento, T, fim), passeio, relva. Gera as variantes **por código a partir de máscaras de borda**, em vez de desenhar 47 peças.
  - A textura de uma peça que se repete não pode ter um elemento único e reconhecível (uma flor, uma pedra), porque a repetição salta logo à vista. Põe esses elementos como *decals* aparte, com posição aleatória a partir de semente.
  - Junta um teste automático que gera a grelha 3×3 de cada peça e confirma que o pixel de borda de uma bate com o da vizinha. Pode ser *snapshot* em `dist-check/`.

---

## 7. Escala, *mixels* e o canvas

### 7.1 Escala inteira

- A pixel art fica nítida a 1×, 2×, 3× e desfocada ou irregular a 2,7×: numa escala fracionária uns pixéis ficam com 2 px de ecrã e outros com 3. **[V]** (guia cinevva; Pixnote)
- O projeto já obriga a escalas inteiras. Pormenor importante: a escala inteira é em **píxeis do dispositivo**, não em píxeis CSS. Com `devicePixelRatio = 1.25`, um fator «inteiro» em CSS (2×) dá 2,5 pixéis físicos e volta a criar pixéis desiguais. **[V]** (fórum Kirupa, sobre arredondar no *backbuffer*)

```ts
const dpr = window.devicePixelRatio || 1;
const devW = Math.floor(window.innerWidth * dpr);
const devH = Math.floor(window.innerHeight * dpr);
const scale = Math.max(1, Math.floor(Math.min(devW / 360, devH / 640)));
canvas.width = 360 * scale;  canvas.height = 640 * scale;   // backing store em px de dispositivo
canvas.style.width  = (360 * scale / dpr) + 'px';          // CSS = dispositivo / dpr
canvas.style.height = (640 * scale / dpr) + 'px';
canvas.style.imageRendering = 'pixelated';
```

  O mais simples e robusto: desenha **tudo a 1× num canvas fora do ecrã** e copia-o uma vez por frame para o canvas visível com `drawImage(off, 0, 0, w*scale, h*scale)` e `imageSmoothingEnabled = false`.

### 7.2 Porque é que a escala não inteira e a rotação partem a pixel art

- Com escala não inteira, os pixéis da arte ficam de tamanhos diferentes e as linhas perfeitas ganham degraus irregulares (jaggies criados pelo motor). **[V]** (devlog Unicopia; fórum do Phaser)
- A rotação simples dá resultados ruidosos e confusos. Há truques (três cisalhamentos, o RotSprite), mas não há algoritmo perfeito para rodar ou escalar pixel art. **[V]** (setsideb; fórum da Cosmigo)
- Rodar sprites com menos de 24×24 destrói a grelha. **[V]**, fonte fraca.
- **Regra:** nada de `ctx.rotate`, nada de `ctx.scale` fracionário e nada de `drawImage` com destino de tamanho diferente do original vezes um inteiro. A bola a rodar faz-se com **4 a 8 frames desenhados**, e um jogador virado é um espelho horizontal (`scale(-1,1)` com coordenadas inteiras, que é exato) ou uma pose própria.

### 7.3 *Mixels* (resoluções misturadas)

- *Mixels* são pixéis de tamanhos diferentes na mesma imagem. A comunidade de pixel art detesta-os, porque dão um ar incoerente. **[V]** (devlog Unicopia; r/godot)
- Aparecem quando se aumenta um sprite no motor (por exemplo um retrato 2× ao lado de um campo a 1×) ou quando se mistura arte desenhada a resoluções diferentes. **[V]**
- Exceção aceite: tudo a 1× na mesma grelha, e um elemento grande (um troféu, um logótipo de vitória) desenhado **nativamente** maior, não ampliado. **[NV]**
- **Regras:**
  - Todos os elementos, incluindo o texto, o painel e os retratos, partilham **a mesma grelha de pixel lógico**.
  - Se um retrato tem de parecer maior, desenha-se com mais pixéis. Não se amplia.
  - A interface (painel) não pode estar a 2× quando o campo está a 1×.
  - Animações de «zoom» fazem-se com frames desenhados ou com cortes, não com escala contínua.

### 7.4 Problemas de subpixel no canvas

- `imageSmoothingEnabled` vem ligado por defeito e desfoca as imagens ampliadas. Desligar é obrigatório, **mas não chega**. **[V]** (MDN; docs do Phaser)
- Com destino fracionário em `drawImage(img, 10.5, 3.2)`, o browser mistura entre pixéis mesmo com o *smoothing* desligado. Arredonda **todas** as posições, câmara incluída. **[V]** (fórum Kirupa)
- `fillRect` com coordenadas fracionárias pinta pixéis parciais com AA, e as cores ficam fora da paleta. Um traço de 1 px centrado numa coordenada inteira espalha-se por 2 pixéis. Daí o truque do `translate(0.5, 0.5)`, que **deixa de funcionar** quando o contexto também está escalado pelo DPR. **[V]** (bit-101, «Drawing crisp lines»; kirupa; Stack Overflow)
- Recomendação: evita `stroke()` e `arc()` e desenha as linhas com `fillRect` de 1×1 ou 1×n em coordenadas inteiras. **[V]** (Stack Overflow, citado)
- **Regras no código:**
  1. Todas as primitivas de arte trabalham num `Uint8Array`/`ImageData` de índices de paleta, ou com `fillRect(x|0, y|0, w|0, h|0)`.
  2. Nunca `stroke`, `arc`, `ellipse`, `bezierCurveTo`, `fillText` com fonte do sistema, `filter`, `shadowBlur` ou `globalAlpha` (este último gera cores fora da paleta). A exceção são as camadas de ecrã inteiro decididas de propósito, como escurecer o fundo de um menu. Mesmo essas ficam melhor com uma rampa de paleta mais escura ou com Bayer.
  3. Posições de sprites e câmara são **inteiras** no momento do desenho. O estado pode ter subpixel: interpola em `float` e arredonda só no `draw`, sempre com a mesma regra (`Math.floor` ou `Math.round`, não os dois), senão os sprites tremem 1 px.
  4. Movimento lento (menos de 1 px por frame) aparece como «passos». É aceitável, mas ficam mais lisos se a câmara e os sprites arredondarem a partir da **mesma** origem.
  5. Um pixel lógico ocupa o quadrado `[x, x+1) × [y, y+1)`, e o centro está em `(x+0.5, y+0.5)`. Quando se calcula se um pixel pertence a um círculo ou a uma forma, testa-se o **centro** do pixel. Testar o canto dá formas descentradas meio pixel.

---

## 8. Pixel art procedimental

### 8.1 Dave Bollinger, *Pixel Spaceships* (e derivados)

- O método de Bollinger é o mais citado em geração procedimental de sprites. Ports (o *pixel-sprite-generator* de zfedoran em JS e outros em Haxe, C#, Python e Rust) descrevem-no assim: uma **máscara 2D** cujos valores são sorteados e depois **espelhados**, com o resultado desenhado num canvas. **[V]**
- Significado dos valores da máscara, segundo a documentação do port em Rust `sprite-gen`. **[V]**, port e não original:
  - `-1`: sempre contorno
  - `0`: sempre vazio
  - `1`: vazio ou corpo (sorteado)
  - `2`: contorno ou corpo (sorteado)
- Depois do sorteio, junta-se um contorno à volta das células de corpo. A cor varia por linha ou coluna em matiz, saturação e brilho, com sombreamento simples. **[NV]**, recordo-o do original e do zfedoran, mas não o pude verificar.
- O original publicou-se em davebollinger.com (página arquivada, inacessível nesta sessão). Em 2024 houve uma obra «Pixel Spaceships» no fxhash. **[V]**
- O projeto infiniship avisa que algumas imagens geradas com as regras de Bollinger podem estar protegidas por direitos de autor dele. **[V]** **Lição para nós:** usa a **técnica** (máscara de probabilidades, espelho, contorno automático), mas com máscaras e paletas nossas.
- Outros projetos:
  - **ZzSprite** (Frank Force): sprites simétricos minúsculos que se podem «mutar» na forma ou na cor. Baseado num *dweet* de Firey Fly. **[V]**
  - **Sprator** e **Sprites-as-a-Service** (ljvmiranda921): ruído inicial (por exemplo 4×8), **autómato celular** para alisar, depois espelho. O espelho é o que torna os sprites convincentes. **[V]**
  - **Pixel Planet Generator** (Deep-Fold): planetas feitos só num *fragment shader*, com ruído fBm, quantizados à paleta. **[V]**, segundo os comentários do autor no itch.io.
  - **0x72 Pixel Dudes Maker:** gerador de personagens por partes. **[V]**, só como listagem.
  - **Universal LPC Spritesheet Character Generator:** personagens por **camadas de peças** (corpo, cabelo, roupa) com paletas permutáveis. **[V]**, só como listagem.
  - O livro *Joys of Small Game Development* (abagames) tem um capítulo sobre geração automática de pixel art. **[V]**, só o título.

### 8.2 Técnicas úteis para o Pocket Basketball

**a) Sprites por partes (jogadores):**

- Um **esqueleto de poses desenhado à mão como dados** (máscaras por região: cabeça, cabelo, pele, camisola, calções, ténis, bola), não gerado ao acaso. O acaso entra só nos **parâmetros**: altura (±px no tronco e nas pernas), largura dos ombros, penteado (de uma lista), tom de pele (de rampas fixas), cor do cabelo, acessórios (fita, mangas, joelheira).
- Cada região é **um índice de rampa**, não uma cor. É a grande vantagem do desenho por código: o selout, a luz e a recoloração ficam automáticos.

**b) Troca de paleta e recoloração de equipamentos:**

- O método clássico: sprites com **índices de paleta** em vez de cores, e a cor real só se procura ao desenhar. Era assim que as cores das equipas se faziam nos jogos antigos, e um *shader* faz o mesmo. **[V]** (blog de pvigier; gist de townofdon)
- Uma variante pode guardar-se (por exemplo «equipa vermelha») e aplicar-se a vários sprites, com máscara para pintar só uma parte (a camisola e não os calções). **[V]** (PixelPaletteSwap)
- Limitar o sistema de cores a **papéis** fixos (por exemplo 5) faz com que cada resultado aleatório fique coerente. **[V]** (blog mechgen)
- **Regras:**
  - O equipamento tem 3 papéis: `primária`, `secundária` (faixas e calções) e `acabamento` (número e debrum). Cada papel gera uma rampa de 3 tons (§4.3).
  - Padrões de camisola em lista fechada: liso, faixa vertical, faixa horizontal, ombros, diagonal, degradê com Bayer só em retratos. Desenha-os como máscaras no espaço do torso, para acompanharem a pose.
  - **Validação de contraste:** o número (`acabamento`) e a camisola (`primária`) precisam de uma diferença de luminância mínima. As duas equipas em campo precisam de uma diferença de valor mínima. Se falhar, troca-se automaticamente para o equipamento alternativo, como na vida real.
  - A cor do tom de pele nunca entra na rampa do equipamento, e vice-versa. A pele tem rampas próprias e fixas.

**c) Caras e retratos:**

- Geração por **componentes**: forma da cabeça (3 a 5 contornos), olhos (posição de uma grelha pequena, por exemplo ±1 px), sobrancelhas, nariz (sombra de 1 a 2 px), boca, orelhas, cabelo (de cima e de lado), barba, acessórios. Cada componente é um pequeno desenho de dados com regiões indexadas.
- Restrições: simetria vertical **quase** perfeita, com uma assimetria de 1 px (sobrancelha, madeixa) para dar vida; olhos sempre na mesma linha.
- A semente do retrato sai do ID do jogador, para ser determinista entre sessões.

**d) Emblemas e brasões:**

- Composição em camadas:
  1. Escudo, de uma lista: redondo, escudo clássico, losango, hexágono.
  2. Divisão (*partição* heráldica): partido, cortado, em banda, esquartelado.
  3. Peça central (*móvel*): animal estilizado, bola, estrela, torre, onda, desenhada em silhouette a 2 cores.
  4. Bordadura.
  5. Iniciais na letra bitmap.
- **Regra heráldica da tintura** **[NV]**, regra clássica da heráldica: não ponhas *metal* sobre *metal* (ouro ou amarelo, prata ou branco) nem *cor* sobre *cor* (vermelho, azul, verde, preto, púrpura). Traduzida para pixel art, é uma regra de **contraste de valor** e serve para validar emblemas gerados.
- Espelho horizontal em quase tudo, como Bollinger. A simetria lê-se como «emblema» mesmo a 12×12.
- Gera o emblema a três tamanhos **desenhados**, não escalados: 8×8 ou 12×12 para listas, 16×16 ou 24×24 para o painel, 48×48 para o ecrã do clube. A versão pequena perde a peça central e fica só com o escudo, a partição e as cores (*mip* manual).

**e) A cidade:**

- Edifícios como **gramática**: base, andares × N, telhado de uma lista, com janelas como padrão de máscara e acessórios (toldo, chaminé, placa) como *decals*.
- A cor vem de uma paleta de bairro e as 3 faces seguem a regra da luz.
- Fatia por célula de grelha para a ordenação (§5.4).

### 8.3 Lint automático da arte gerada

O desenho por código deixa **testar** normas que um artista só verifica a olho. Testes possíveis, nas mesmas pastas dos testes de `src/ui/`:

- Nenhuma cor fora da paleta global.
- Número de cores por sprite (por exemplo no máximo 16, número que também aparece num guia de estilo do MIT GDG **[V]**).
- Pixéis órfãos por sprite abaixo de um limite.
- Contornos sem cantos em L (doubles).
- Silhouettes das poses diferentes entre si (distância de Hamming das máscaras binárias acima de um limite).
- Contraste de luminância entre equipas, entre número e camisola, e entre os tons vizinhos de uma rampa.
- Encaixe das peças isométricas sem falhas numa grelha 3×3.

---

## 9. Material de referência (o que cada fonte ensina)

| Fonte | O que ensina | Estado |
|---|---|---|
| **Pedro Medeiros (saint11)**: série «How to start making pixel art» (Pixel Grimoire, Medium) e tutoriais animados em blog.studiominiboss.com/pixelart; artista de *Celeste* e *TowerFall* | Clusters e órfãos (#2), AA e banding (#5: menos tons, sem AA a 45°, tira-o se estragar), cor (#6), contornos (#7). Tutoriais em GIF curtos sobre animação, efeitos e cor | [V] para #2 e #5; [NV] para o resto e para a lista completa |
| **Slynyrd (Raymond Schlitter)**: Pixelblog | Paletas com rotação de matiz até 20°, saturação máxima no centro (#1); projeção e linha 2:1 (#4); sprites de personagem de cima, com a cabeça a 1/3–1/2 do corpo (#22); isometria e cuboide-guia (#41, #54) | [V] (excertos) |
| **Lospec** | Base de dados de paletas (do hardware antigo e de artistas, filtráveis por número de cores); artigos sobre contornos (linhas perfeitas, curvas, selout por cor); escalador de imagens | [V] |
| **Michafrar (Michael Azzi)**: livro *Pixel Logic* | Livro visual de cerca de 242 páginas, com pouco texto. Começa nas linhas, curvas, AA, clusters e dithering e chega ao subpixel (capítulo 8) e à animação (capítulo 9); a versão 1.0 juntou subpixel avançado para animação | [V] para formato e capítulos 8 e 9; [NV] para os outros |
| **Derek Yu**: tutorial em derekyu.com (versão de 10 passos de cerca de 2005, refeito mais tarde com um orc como exemplo) | Fluxo de trabalho completo: linhas, cor base, sombreamento sem almofada, AA, selout, dithering, limpeza | [V] para a existência e os temas; [NV] para a ordem exata dos passos |
| **Mark Ferrari**: Loom, Zak McKracken, The Secret of Monkey Island, Thimbleweed Park; talk na GDC 2016 «8-Bit & '8-Bitish' Graphics – Outside the Box» | Dithering à mão em EGA; **color cycling**, em que o pixel fica parado, a cor roda e as bandas parecem mover-se (água, cascatas, neve); as limitações como motor criativo. Demonstração em browser: *Canvas Cycle* (Joe Huckaby, EffectGames) | [V] |
| **Paul Robertson**: diretor de arte e animador principal de *Scott Pilgrim vs. the World: The Game* (Ubisoft, 2010); curtas como *Pirate Baby's Cabana Battle Street Fight 2006* | Animação expressiva de influência *anime* e *cartoon*, que estudou fotograma a fotograma; prefere trabalhar com limitações; poses exageradas e *smears* | [V] para o papel no Scott Pilgrim e a citação sobre limitações; [NV] para os pormenores técnicos |
| **Pixel Joint**: fórum e galeria | Normas de crítica: o fórum WIP serve para «C+C» (*comments and critique*); pede crítica específica (diz onde estás preso) e uma peça de cada vez; marca com [NPA] o que não é pixel art; crítica direta e franca; **editar a obra de outro sem autorização é intolerável**; galeria seletiva. Vocabulário: jaggies, banding, pillow shading, noise, clusters | [V] |
| **AdamCYounis**: série *Pixel Art Class* (YouTube) | Episódios sobre *tilesets*, peças isométricas, paletas e cor, escala das personagens e tamanho da tela, luz e sombra, animação, Aseprite | [V] para a lista de temas; [NV] para o conteúdo dos episódios |
| **Brandon James Greer**: canal *BJGpixel* | Tutoriais e *speedpaints* de paletas, cor e leitura | **[NV]**: nenhuma pesquisa devolveu material dele; confirma antes de o citar |
| **Pixel Parmesan** («Anti-Aliasing Fundamentals for Pixel Artists») | AA por comprimento de segmento, cuidado com bordas exteriores, banding por AA | [V] |
| **androidarts (Arne Niklas Jansson)**: «Pixel art tutorial» | Tutorial clássico e muito citado sobre cor, contraste, ruído e paletas | [NV]: o site não abriu |

### Normas de crítica a importar para o trabalho a dois (Claude e Codex)

À maneira do Pixel Joint **[V]**:

1. Pede crítica **específica**: que sprite, que tamanho, que problema.
2. Critica com vocabulário partilhado: este documento, §1 a §3.
3. Mostra sempre a peça à **escala 1× e à escala de jogo**, lado a lado.
4. Não mudes a arte do outro sem o dizer. É a regra «não editar sem autorização», que bate com a regra do projeto de não mexer nos mesmos ficheiros.

---

## 10. Como a arte dos jogos pequenos de desporto e gestão se lê

Só abordagens, sem copiar recursos.

- **Nintendo Pocket Football Club (3DS):**
  - Os críticos descrevem jogadores «adoravelmente pequenos» e um estilo «8-bit-esque». **[V]** (Nintendo World Report; Nintendo Life e outras críticas, citadas)
  - Gráficos mais simples do que nos outros jogos de gestão, porque o ecrã do 3DS o exige. **[V]** (Irish Times)
  - O criador defende que o detalhe a mais tira espaço à imaginação do jogador, que preenche os pormenores. **[V]** (Siliconera)
  - Houve quem achasse o jogo «demasiado pequeno para ser interessante». **[V]** (Metacritic)
  - **Lição:** a pequenez é charme quando cada jogador tem **identidade** (cor, cabelo, número, comportamento) e quando a ação tem leitura clara (bola, golo). Não basta reduzir.
- **Sensible Soccer (Amiga, 1992):**
  - Jogadores minúsculos, de propósito, para mostrar mais campo e manter a ação legível. **[V]** (crítica Medium/Iain Mew e outros)
  - As dimensões exatas dos sprites não foram confirmadas: há uma fonte promocional que fala em 24 px, mas não é fiável. **[NV]**
  - **Lição:** com sprites pequenos, a **cor do equipamento é a identidade** e a bola tem de ter contraste máximo e sombra no chão para mostrar a altura.
- **Kairosoft (Game Dev Story e outros):**
  - Personagens minúsculas, cabeçudas, de frente, sobre cenários em perspetiva isométrica ou de cima. Estilo descrito como «simples, mas eficaz» e «charmoso». **[V]**
  - Sprites «tão pequenos e mesmo assim legíveis». **[V]** (comentário no itch.io)
  - **Lição:** proporções chibi de cerca de 2 cabeças, cores lisas com 2 a 3 tons, contorno escuro e animação de 2 frames bastam para muita personalidade.
- **Abordagens comuns** **[NV]**, síntese própria:
  - **Hierarquia de contraste:** bola > jogador com a bola > outros jogadores > campo > bancada > cidade.
  - **Cores de equipa como único grande bloco saturado** em cada jogador. A pele e o cabelo ficam em tons mais neutros.
  - **Sombra de contacto** por baixo de cada jogador e da bola: dá o chão, a altura do salto e a separação do piso.
  - **Animação curta e exagerada:** 2 a 4 frames por ação, com poses-chave muito claras (lançamento = braços acima da cabeça).
  - **Marcadores de interface por cima do sprite** (seta, número, anel no chão) para o jogador selecionado, em vez de detalhe no próprio sprite.
  - **Retrato grande e expressivo** no painel, para compensar o sprite pequeno no campo. É aí que a personagem ganha cara.

---

## 11. Letra bitmap (resumo)

- Uma letra de 3×5 tem 15 pixéis e chega para **maiúsculas e algarismos**. H, M e W confundem-se: distingue-os pelo pixel central (mais alto no M, mais baixo no W). **[V]** (allegro.cc; FontStruct)
- Para maiúsculas, minúsculas e descendentes, 5×7 (ou 5×5 no limite) é mais seguro. A 4×4 já não se desenham bem o E, o M e o W. **[V]** (blog de Maurycy; fóruns)
- Mantém pelo menos 1 px entre caracteres e vê bem a diferença entre I, l e 1, e entre O e 0. **[V]** (cxong, «Tips for legible pixel fonts»)
- Variante 3×7 ou 3×8 com descendente de 1 px para g, j, p, q e y. **[V]**
- **Regras para o português:**
  - Desenha os diacríticos (á à â ã é ê í ó ô õ ú ç) **dentro** da altura da linha. Em 5×7, a maiúscula acentuada pode encolher 1 px, ou a linha ganha 2 px de entrelinha reservada.
  - O ç precisa de descendente.
  - Os algarismos são **monoespaçados** (tabelas de resultados e estatísticas). As letras podem ser proporcionais.
  - Duas letras bastam: uma pequena (3×5 maiúsculas e números, para o campo e os marcadores) e uma de texto (5×7 ou 4×6 proporcional, para os painéis e a narração).
  - Sem AA na letra e sem contorno, salvo sobre o campo, onde leva um contorno de 1 px ou uma sombra de 1 px para baixo.

---

## 12. Lista de verificação

### Linhas e bordas
- [ ] As retas usam só declives inteiros (1:1, 1:2, 2:1, 1:3, 3:1…) com segmentos iguais.
- [ ] As curvas têm segmentos monótonos (sobem ou descem, sem 2,1,2).
- [ ] Os contornos de 1 px não têm cantos em L (doubles), salvo de propósito.
- [ ] Órfãos só como acentos escolhidos (brilho do olho, reflexo), dentro do limite por sprite.
- [ ] Sem banding: fronteiras de cor vizinhas desencontradas.
- [ ] Sem pillow shading: a sombra vem da direção da luz, não de uma erosão do contorno.
- [ ] Sem AA exterior em sprites sobre fundos variáveis; sem AA nenhum a 16 px; AA nunca em linhas de 45°.
- [ ] Contorno escuro da paleta, não #000; selout nos retratos e na pele.

### Leitura
- [ ] Cada pose reconhece-se pela silhouette a preto.
- [ ] O sprite lê-se em escala de cinzentos (contraste de valor).
- [ ] Revisto a 1× e à escala de jogo.
- [ ] A bola tem o contraste máximo do campo e sombra de contacto.
- [ ] As duas equipas distinguem-se pelo valor (teste de luminância), com equipamento alternativo automático.
- [ ] A cabeça mantém o tamanho entre jogadores; a altura muda no tronco e nas pernas.
- [ ] Cara: olhos de 1 px na mesma linha; expressão pela posição e pela sobrancelha.

### Cor e sombreamento
- [ ] Uma só direção de luz, numa constante partilhada.
- [ ] Rampas com rotação de matiz (cerca de 10 a 20°), saturação máxima no meio e tons bem espaçados em luminância.
- [ ] 3 a 4 tons por material nos sprites de jogo.
- [ ] Nenhuma cor fora da paleta (nada de `globalAlpha`, `shadowBlur`, `filter` nem misturas calculadas fora da paleta).
- [ ] Sem dithering em jogadores, caras, texto, ícones e emblemas; Bayer só em zonas grandes e estáticas, fixo ao mundo.
- [ ] Nunca difusão de erro.

### Isometria e peças
- [ ] Linhas 2:1 (cerca de 26,57°), nunca 45° no chão.
- [ ] Convenção de losango e encaixe (32×16 com passo de 16 por 8) escrita e testada numa grelha 3×3.
- [ ] Faces do cubo com 3 valores fixos (topo claro, esquerda média, direita escura).
- [ ] Alturas em múltiplos de uma unidade e com sombra projetada.
- [ ] Ordenação por `(gx+gy)` e altura, nos pés, numa só lista com os objetos altos fatiados.
- [ ] Peças repetidas sem elementos únicos; os pormenores vão em *decals*.

### Escala e canvas
- [ ] Escala inteira calculada em píxeis do **dispositivo** (com `devicePixelRatio`).
- [ ] Desenho a 1× num canvas fora do ecrã, copiado com `imageSmoothingEnabled = false` e `image-rendering: pixelated`.
- [ ] Coordenadas inteiras em cada `fillRect` e `drawImage`, câmara incluída, sempre com a mesma regra de arredondamento.
- [ ] Nada de `stroke`, `arc`, `rotate`, escala fracionária nem `fillText` com fontes do sistema.
- [ ] Testes de pertença de pixel feitos no centro `(x+0.5, y+0.5)`.
- [ ] Sem *mixels*: tudo na mesma grelha lógica; o que é grande é desenhado grande.

### Geração procedimental
- [ ] Sprites como regiões indexadas (índices de rampa), não como cores.
- [ ] O acaso só nos parâmetros (altura, cabelo, pele, acessórios), com semente determinista (por exemplo o ID do jogador).
- [ ] Equipamentos com 3 papéis de cor e padrões de lista fechada, validados por contraste.
- [ ] Emblemas com simetria, regra da tintura (contraste) e versões desenhadas a 3 tamanhos.
- [ ] Técnica de Bollinger (máscara de probabilidades, espelho, contorno automático) usada com máscaras e paletas **nossas**.
- [ ] Testes automáticos: paleta, número de cores, órfãos, doubles, silhouettes distintas, contraste, encaixe das peças.

### Originalidade
- [ ] Nenhum recurso, paleta nomeada, emblema ou pose copiado de outro jogo (NPFC, Kairosoft, Sensible Soccer); só abordagens.

---

## Fontes

As fontes marcadas «excerto» só se leram pelo resumo da pesquisa; nenhuma página foi aberta diretamente nesta sessão.

**Linhas, clusters, AA, banding e pillow shading**
- Lospec, «Pixel art outlines»: https://lospec.com/articles/pixel-art-outlines
- Lospec, «Pixel art outlines part 2: using color»: https://lospec.com/articles/pixel-art-outlines-part-2-using-color
- Pedro Medeiros, «How to start making pixel art #2»: https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-2-bcd705cb04d7
- Pedro Medeiros, «How to start making pixel art #5»: https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-4-ff4bfcd2d085
- Pedro Medeiros, «How to start making pixel art #1»: https://medium.com/@saintjust/how-to-start-making-pixel-art-2d1e31a5ceab
- Pedro Medeiros, «How to start making pixel art #6»: https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-6-a74f562a4056
- Pedro Medeiros, «How to start making pixel art #7»: https://medium.com/pixel-grimoire/how-to-start-making-pixel-art-7-e504bfa4ddf2
- Clip Studio Tips, «Pixel Art Practices Explained Simply»: https://tips.clip-studio.com/de-de/articles/5360?org=1
- Blog 3dbrendang, «Pillow Shading»: https://3dbrendang.blogspot.com/2013/11/pixel-art-terms-linguo-techniques-part-2.html
- Pixel Joint, tópico de recursos e tutorial: https://pixeljoint.com/forum/forum_posts.asp?TID=11299
- Pixel Joint, «Handmade Anti-Aliasing»: https://pixeljoint.com/forum/forum_posts.asp?TID=6737
- Pixel Parmesan, «Anti-Aliasing Fundamentals for Pixel Artists»: https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists
- Fórum do Aseprite, linhas retas e curvas: https://community.aseprite.org/t/how-do-i-make-straight-curved-lines-properly/10246
- OpenGameArt, «Chapter 2: Lines and curves»: https://opengameart.org/content/chapter-2-lines-and-curves
- Glossário Pixnote: https://pixnote.net/en/learn/glossary
- Fórum da Solarus, selout: https://forum.solarus-games.org/en/index.php?msg=5486
- pixelsrc, `apply_selout`: https://docs.rs/pixelsrc/latest/pixelsrc/transforms/fn.apply_selout.html

**Personagens e leitura**
- Pixnote, personagens: https://pixnote.net/en/learn/character
- Slynyrd, Pixelblog 22: https://www.slynyrd.com/blog/2019/10/21/pixelblog-22-top-down-character-sprites
- Fórum Lexaloffle: https://www.lexaloffle.com/bbs/?pid=106113
- Bugnet, «How to make pixel art that reads clearly»: https://bugnet.io/blog/how-to-make-pixel-art-that-reads-clearly
- Wayline, curso de cor e paletas: https://www.wayline.io/learn/color-palettes/1
- Guia de estilo do MIT GDG: https://gdg.mit.edu/style-guide

**Cor e dithering**
- Slynyrd, Pixelblog 1, «Color Palettes»: https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes
- GameDev.net, «Color Palettes»: https://www.gamedev.net/articles/visual-arts/color-palettes-r4964/
- Stardew Modding Wiki, «How to make pixel art»: https://stardewmodding.wiki.gg/wiki/How_to_make_pixel_art
- Divoom, «Pixel Art Dithering: When to Use It and When to Stop»: https://divoom.com/blogs/setup-ideas/pixel-art-dithering-when-to-use-and-stop
- RetroBeads, modos de dithering: https://retrobeads-www.pages.dev/tutorials/choose-a-dithering-mode-for-your-bead-pattern/
- Wikipedia, «Ordered dithering»: https://en.wikipedia-on-ipfs.org/wiki/Ordered_dithering

**Isometria e peças**
- Slynyrd, Pixelblog 4: https://slynyrd.com/blog/2018/4/12/pixelblog-4-graphical-projection-part-2
- Slynyrd, Pixelblog 41: https://www.slynyrd.com/blog/2022/11/28/pixelblog-41-isometric-pixel-art
- Slynyrd, Pixelblog 54: https://www.slynyrd.com/blog/2025/1/23/pixelblog-54-isometric-pixel-art
- Wikibooks, «Isometric Pixel Art/Making a Box»: https://en.wikibooks.org/wiki/Isometric_Pixel_Art/Making_a_Box
- sprite-ai, guia de isometria: https://www.sprite-ai.art/guides/isometric-pixel-art
- Fórum do Tiled, alinhamento de grelha: https://discourse.mapeditor.org/t/isometric-grid-created-in-gimp-not-aligning-properly/4503
- Fórum do Tiled, ordenação isométrica: https://discourse.mapeditor.org/t/isometric-depth-sorting/736
- GameDev.net, ordenação isométrica: https://gamedev.net/forums/topic/470599-isometric-depth-sorting/
- Bugnet, sobreposições em mapas isométricos: https://bugnet.io/blog/how-to-fix-isometric-tilemap-sprite-depth-sort-overlap
- Conjunto «blob» de 47 peças (Stagecast/cr31): https://boristhebrave.com/permanent/24/06/cr31/stagecast/wang/blob.html
- sprite-ai, juntas de peças: https://www.sprite-ai.art/blog/seamless-pixel-art-tiles

**Escala e canvas**
- MDN, `imageSmoothingEnabled`: https://developer.mozilla.org/en/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
- Fórum Kirupa, nitidez com DPR e 120 Hz: https://forum.kirupa.com/t/how-do-you-keep-pixel-art-sprites-crisp-while-moving-smoothly-on-a-120hz-display/680566
- Fórum Kirupa, sprites desfocados com a câmara a mexer: https://forum.kirupa.com/t/why-do-my-pixel-art-sprites-look-blurry-when-the-camera-moves/680167
- bit-101, «Drawing crisp lines»: https://bit-101.com/blog/posts/2026-07-07/drawing-crisp-lines/
- usefulangle, linhas de 1 px no canvas: https://usefulangle.com/post/17/html5-canvas-drawing-1px-crisp-straight-lines
- Stack Overflow, linhas de 1 px com transformações: https://kaweah.freedombox.rocks/kiwix/content/stackoverflow.com_en_all_2023-11/questions/53288682/drawing-crisp-1px-lines-on-html5-canvas-when-using-transformations
- cinevva, canvas de jogo responsivo: https://cinevva-site.pages.dev/tutorials/responsive-game-canvas
- Devlog Unicopia, *mixels*: https://squeakypig.itch.io/unicopia/devlog/787703/a-tale-about-chasing-a-pixel-perfect-tail
- setsideb, escalar e rodar pixéis: https://setsideb.com/lets-learn-about-pixel-scaling-and-rotation/
- Fórum da Cosmigo, rotação de sprites: https://community.cosmigo.com/t/improved-sprite-rotation/686
- Pixnote, resolução: https://pixnote.net/en/learn/resolution

**Geração procedimental**
- raster.art, Dave Bollinger, *Pixel Spaceships*: https://www.raster.art/artwork/pixel-spaceships-by-dave-bollinger/about
- zfedoran, *pixel-sprite-generator*: https://awesome.ecosyste.ms/projects/github.com%2Fzfedoran%2Fpixel-sprite-generator
- sprite-gen (Rust): https://docs.rs/sprite-gen/latest/src/sprite_gen/lib.rs.html
- infiniship-js: https://github.com/thinkong/infiniship-js
- ZzSprite (Frank Force): https://redirect.github.com/KilledByAPixel/ZzSprite
- Sprator: https://www.github.com/yurkth/sprator
- ljvmiranda921, «Cellular sprites»: https://ljvmiranda921.github.io/projects/2020/03/31/cellular-sprites
- Deep-Fold, Pixel Planet Generator: https://deep-fold.itch.io/pixel-planet-generator/comments?after=0
- 0x72, Pixel Dudes Maker: https://0x72.itch.io/pixeldudesmaker
- abagames, «Automatic Pixel Art Generation»: https://abagames.github.io/joys-of-small-game-development-en/procedural/pixel_art.html
- pvigier, troca de paleta com *shaders*: https://pvigier.github.io/2019/10/06/palette-swapping-with-shaders.html
- PixelPaletteSwap, variantes de personagens: https://pixelpaletteswap.pages.dev/guides/creating-character-variants.html
- mechgen, paletas para robôs em pixel art: https://mechgen.pages.dev/blog/color-palettes-for-pixel-art-robots

**Referências clássicas**
- Michafrar, *Pixel Logic*: https://michafrar.gumroad.com/l/pixel-logic
- 80.lv, sobre o *Pixel Logic*: https://80.lv/articles/pixel-logic-a-pixel-art-tutorial-book/
- Fórum da Cosmigo, versão 1.0 do *Pixel Logic*: https://community.cosmigo.com/t/ebook-pixel-logic/319
- gbgames, novo tutorial de Derek Yu: https://gbgames.com/2019/12/19/derek-yus-updated-pixel-art-tutorial
- Tutorial de Derek Yu (não abriu): https://www.derekyu.com/makegames/pixelart.html
- GDC Vault, talk de Mark Ferrari: https://gdcvault.com/play/1023586/8-Bit-8-Bitish-Graphics
- Wikiwand, *color cycling*: https://www.wikiwand.com/en/articles/Color-cycling
- Canvas Cycle: https://experiments.withgoogle.com/canvas-cycle
- Blog da FontLab, dithering e Bill Atkinson: https://blog.fontlab.com/2026/03/24/dithering-ditherpunk-and-bill-atkinson/
- Wikipedia, *Scott Pilgrim vs. the World: The Game*: https://en.wikipedia.org/wiki/Scott_Pilgrim_vs._the_World:_The_Game
- Wikipedia, Paul Robertson: https://en.wikipedia.com/wiki/Paul_Robertson_(animator)
- Entrevista da Giant Robot a Paul Robertson: https://www.giantrobot.com/blogs/giant-robot-store-and-gr2-news/15804627-gr-interview-artist-paul-robertson
- Pixel Joint, FAQ do fórum WIP: https://pixeljoint.com/forum/forum_posts.asp?TID=26014
- Pixel Joint, «Surviving A Pixel Art Forum»: https://pixeljoint.com/2007/09/06/2316/submit_news.asp
- Pixel Joint, tópico de recursos: https://pixeljoint.com/forum/forum_posts.asp?TID=9551
- Fórum do Aseprite, recomendação da série de AdamCYounis: https://community.aseprite.org/t/getting-into-pixelart/15394
- Lista de vídeos de AdamCYounis: https://clip.africa.com/pixel-art-class-tile-set-art-adamcyounis
- Lospec, lista de paletas: https://lospec.com/palette-list/tag/12
- 80.lv, coleção de guias de pixel art: https://80.lv/articles/an-ultimate-collection-of-pixel-art-guides

**Jogos de desporto e gestão**
- Nintendo World Report, crítica do NPFC: https://nintendoworldreport.com/review/37181/nintendo-pocket-football-club-review
- Irish Times, NPFC: https://www.irishtimes.com/business/technology/nintendo-pocket-football-club-1.1780240
- Siliconera, NPFC: https://www.siliconera.com/?p=378813
- Cubed3, crítica do NPFC: https://cubed3.com/review/1433/1/nintendo-pocket-football-club-nintendo-3ds.html
- Metacritic, NPFC: https://legacy.prod.metacritic.com/game/3ds/nintendo-pocket-football-club/critic-reviews
- Iain Mew, Sensible Soccer: https://medium.com/@iain.mew/sensible-soccer-sensible-software-renegade-amiga-1992-fc3b72899b9c
- PC Gamer, Kairosoft no Steam: https://www.pcgamer.com/uk/game-dev-story-leads-kairosofts-irresistible-sim-lite-games-onto-steam
- TV Tropes, Kairosoft: https://www.tvtropes.org/pmwiki/pmwiki.php/Creator/KairoSoft
- Lemmy, leitura de sprites pequenos: https://lemmy.dbzer0.com/post/25370739/12470299
- Comentário no itch.io sobre sprites pequenos: https://itch.io/post/1532271

**Letra bitmap**
- cxong, «Tips for legible pixel fonts»: https://cxong.github.io/2019/09/tips-for-legible-pixel-fonts
- allegro.cc, desafio dos 16 algarismos hexadecimais: https://www.allegro.cc/forums/thread/606221
- FontStruct, letras de 3×5: https://www.fontstruct.com/gallery/tag/21166/3x5%20Pixels
- Hackaday, legibilidade de letras: https://hackaday.com/2025/12/22/just-what-goes-into-a-legible-font-and-why-does-it-matter
- Maurycy, letra de 5×5: https://hn.jakechampion.name/reader/https://maurycyz.com/projects/mcufont/
