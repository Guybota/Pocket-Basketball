# Referências: pavilhões e bancadas

Pesquisa de 13 de novembro de 2026 para melhorar os quatro campos do jogo (rua, Pavilhão Escolar, Pavilhão Municipal e Grande Arena). Junta as medidas reais, com as fontes, o que outros jogos fazem e uma lista de melhorias por ordem de prioridade.

**Só referência.** A regra [«Original, não cópia»](../../../AGENTS.md) continua a valer: dos outros jogos aproveitam-se ideias de leitura e de composição, nunca a arte, as cores próprias nem as marcas. As descrições de jogos abaixo são texto nosso. Não copiámos imagens.

## O que temos hoje (para comparar)

Estes valores vêm de `src/ui/art/court.ts` e `src/sim/court.ts`. O campo vai de x = 0 a 28 e de y = −7,5 a 7,5, e a câmara olha para a bancada lateral do fundo (y negativo).

| Elemento | Hoje | Onde |
|---|---|---|
| Frente da bancada lateral | y = −11, a 3,5 m da linha lateral | `WALL_Y` |
| Frente das bancadas dos topos | x = −4 e x = 32, a 4 m da linha final | `WALL_NEAR_X`, `WALL_FAR_X` |
| Banco | y = −9,6, a 2,1 m da linha e a 1,4 m do muro | `BENCH_Y` |
| Placas de publicidade | pintadas no muro, de 0 a 1 m de altura | `BOARD_HEIGHT` |
| Muro | 1 m de placas mais 0,5 m de faixa da claque, num total de 1,5 m | `CROWD_WALL` |
| Primeira fila | os pés a 1,8 m de altura, logo em cima do muro, sem nada à frente | `fanHeight` |
| Degraus | 1,3 m de altura por fila (0,9 m no escolar). Com o recuo de 0,7–0,8 m por metro de altura, dá cerca de 0,9–1 m de fundo por fila, uma inclinação de cerca de 53° | `FAN_ROW_STEP`, `slope` |
| Lugares | um adepto a cada 1,25 m e uma cadeira a cada 0,625 m | `FAN_SPACING` |
| Escadas | 1,3 m de largura | `AISLE_HALF` |

Nas imagens de `dist-check/gpu-fase2/` vimos o seguinte:

- Na câmara a meio do campo (`x14`), a bancada lateral é só uma faixa no topo, e o banco, as placas e a faixa ficam todos colados no mesmo plano.
- Nas câmaras dos cantos (`x3`, `x25`), a bancada lê-se bem, mas na Grande Arena as cadeiras azul-escuras quase desaparecem contra o espelho também azul-escuro.
- O público da primeira fila assenta diretamente no muro, sem barreira nem passagem à frente.
- As filas são muito altas, por isso a bancada parece uma parede de prateleiras e não uma encosta.

## 1. Vida real

### Regras FIBA (Official Basketball Rules 2026 e o anexo Equipment)

- **Zona livre:** o campo mede 28 × 15 m, com uma zona sem obstáculos de pelo menos 2 m à volta. O piso tem portanto no mínimo 32 × 19 m. Fontes: Rules 2026, art. 2, e Equipment 2026, §10.2.
- **Faixa de contorno:** no Nível 1, uma faixa de cor bem contrastante com pelo menos 2 m de largura à volta do campo (Equipment §11.1). É o nosso `apron`.
- **Bancos:** qualquer obstáculo, incluindo o treinador e os suplentes sentados, fica a pelo menos 2 m do campo. Há 16 lugares em cada zona do banco, e as outras pessoas ficam pelo menos 2 m atrás do banco (Rules, art. 2.5.5).
- **Mesa de oficiais:** pelo menos 6 m de comprimento e 0,8 m de altura, sobre um estrado de pelo menos 0,2 m (Equipment §11.2).
- **Público:** todos os espectadores sentados a pelo menos 2 m da linha de contorno (Equipment §11.3). Um guia australiano de instalações recomenda 5 m.
- **Teto:** 7 m livres no mínimo (Equipment §11.4).
- **Suporte do cesto:** no Nível 1, a frente do acolchoado fica a pelo menos 2 m da linha final. No Nível 2 basta 1 m (Equipment §1.4.3).
- **Placas de publicidade (Equipment §15):**
  - ficam a pelo menos 2 m das linhas, até 1 m de altura, acolchoadas no topo e nas pontas;
  - nos topos, deixam pelo menos 0,9 m livres de cada lado do suporte do cesto;
  - do lado da mesa, deixam 2 m de cada lado da mesa;
  - em jogos televisionados, ficam na lateral oposta à câmara principal;
  - podem ir à frente da mesa, alinhadas com ela.
- **Luz na bancada:** nas 15 primeiras filas, entre 10 % e 25 % da luz do campo, e a partir daí cada vez menos (Equipment §12.2.4). É assim que um pavilhão grande pode ter o campo claro e a bancada a fugir para o escuro.
- **Lugares:**
  - 0,48 m de banco corrido contam como um lugar (§16.2);
  - assento com pelo menos 0,35 m de fundo e no máximo 0,45 m de altura, encosto de 0,3 m (§16.4);
  - linha de vista com h = 800 mm e d > 100 mm (diagrama 18).

### Normas de bancadas (Guia Verde do Reino Unido, que segue a EN 13200)

O texto da EN 13200 é pago. Os números abaixo vêm do *Guide to Safety at Sports Grounds* (5.ª edição, 2008), que remete para a EN 13200-1 e cuja tabela do índice da EN 13200-3 aponta para os mesmos tipos de barreira.

- **Barreira à frente da primeira fila:**
  - até 530 mm à frente das cadeiras, 0,8 m de altura e pelo menos 200 mm de largura;
  - se tiver 500 mm de largura, pode descer para 0,7 m;
  - nos outros casos, 1,1 m (§11.4, diagrama 11.2).
- **Atrás da última fila, nas pontas das filas, ao fundo das escadas e nas escadas:** 1,1 m. Os separadores dentro das escadas podem ter 1,0 m.
- **Largura de um lugar:**
  - 460 mm no mínimo, mais 40 mm com braços;
  - recomenda 500 mm (§12.13).
- **Fundo de cada fila:**
  - 700 mm no mínimo e 800 mm recomendados, em linha com a EN 13200-1;
  - nos bancos corridos antigos aceitam-se 610 mm.
- **Passagem entre filas:** 400 mm, ou 305 mm em filas curtas (§12.14).
- **Lugares por fila:** no máximo 14 com escada de um só lado e 28 com escada dos dois lados (§12.16). A 0,5 m por lugar, dá uma escada a cada 7 m ou a cada 14 m.
- **Escadas:**
  - 1,1 m de largura, ou 1,2 m em obra nova;
  - no máximo 12 degraus por lanço em obra nova e 16 nas antigas;
  - degraus iguais e sem espelhos abertos (§8).
- **Bancadas telescópicas de pavilhão**, segundo catálogos de fabricantes:
  - 0,80, 0,85 ou 0,95 m de fundo de fila, conforme o modelo de cadeira;
  - 0,28 a 0,45 m de altura por fila;
  - 1,2 a 1,5 m de fundo quando recolhidas;
  - os modelos de 3 a 6 filas têm 1,25 a 2,75 m de altura.

  Numa bancada de pavilhão real, a inclinação fica nos 20–30°. A nossa tem cerca de 53°.

### Pavilhões reais (escala)

| Tipo | Exemplos | Lugares | Como se reconhece |
|---|---|---|---|
| Escolar ou ginásio | pavilhões das escolas, Nível 2 | 0–300 | Bancada telescópica de 3 a 6 filas numa lateral, bancos sem costas ou corridos, paredes claras com espaldares, janelas altas, cestos presos à parede ou ao teto, linhas de outros desportos no chão, luz uniforme vinda de cima e das janelas. |
| Municipal | pavilhões municipais da Liga Portuguesa, Pavilhão da Luz n.º 2 (1800) | 500–2500 | Uma ou duas bancadas fixas de betão com assentos de plástico sem costas (em concha) na cor do clube, um muro de betão com publicidade pintada ou em lona, placar na parede, a faixa da claque na grade da primeira fila. |
| Grande pavilhão de clube | Dragão Arena (2179), Pavilhão Fidelidade (≈2400, em quatro bancadas), Pavilhão João Rocha (≈3000) | 2000–3500 | Quatro bancadas à volta, cadeiras com costas, placas LED a 2 m das linhas, mesa em estrado, cubo de placar por cima do meio campo, campo iluminado e bancada mais escura. |
| Arena | MEO Arena em Lisboa (≈20 000), pavilhões da ACB e da Euroliga | 5000–20 000 | Anel contínuo com dois anéis de bancada, uma fita LED a separá-los, vomitórios (túneis de acesso a meio da bancada), lugares VIP ao nível do chão, teto escuro com projetores, público que se perde no escuro. |

### O que faz um pavilhão parecer pequeno ou grande

- **Pequeno:**
  - poucas filas e uma parede logo atrás;
  - teto e paredes visíveis e claros, com luz igual em todo o lado;
  - lugares vazios à vista;
  - bancos corridos, todos da mesma cor;
  - publicidade pintada ou cartazes presos à parede;
  - a bancada encostada ao campo, sem camadas.
- **Grande:**
  - **camadas de profundidade** entre o campo e o público: zona livre, placas, um corredor, a barreira e só depois as cadeiras;
  - filas que se repetem até sair do quadro;
  - bancada a escurecer para cima;
  - uma fita de luz a meio da bancada;
  - vomitórios escuros a interromper as filas;
  - cadeiras individuais com padrão de cor;
  - gente na fila do chão;
  - placar suspenso.

## 2. Jogos

Estas descrições são observação nossa, feita de memória a partir de vídeos e capturas públicas. Convém confirmá-las com vídeos antes de decidir. Os dados factuais dos jogos (estúdio, data, tipo) têm fonte. Os pormenores visuais não.

- **Calciobit A** (a nossa referência de estilo; ver [camara-e-estilo.md](../calciobit/camara-e-estilo.md)):
  - o público é uma faixa de pixel art no topo do ecrã;
  - o muro e as placas de publicidade coloridas servem de fronteira clara entre o campo e a bancada;
  - o tamanho do estádio diz-se pelo muro e pela altura da bancada: muro de pedra ou campo sem bancada nos pequenos, bancadas altas com arcadas nas taças;
  - a claque tem um plano próprio.

  A lição é que, a pouca resolução, **a fronteira** (muro e placas) faz mais do que o pormenor das cadeiras.
- **Jogos de basquetebol estilo NES ou 16 bits** (por exemplo *Basketball Classics*, da Namo Gamo, e os arcade dos anos 90 com câmara lateral):
  - o público é uma textura de cabeças repetida em duas ou três cores, a ondular com poucos frames;
  - as placas fazem uma fita horizontal contínua por baixo;
  - a primeira fila tem mais contraste, e as de trás ficam mais escuras ou com menos saturação.
- **Hoop Land e Hoop League Tactics** (Koality Game): pixel art de basquetebol para telemóvel, com público nas bancadas e placar visível. Em pixel art de telemóvel, o placar e a cor do clube na bancada bastam para dizer «pavilhão».
- **Gestão em pixel art isométrica** (o género dos jogos de clube da Kairosoft): bancadas em blocos isométricos, cada lugar um bloco de cor e as pessoas como sprites de 2 a 3 cores. Os lugares vazios mostram-se de propósito, como sinal de progresso: o clube cresce e a bancada enche.
- **Gestão com motor 3D low-poly** (o género dos motores de jogo 3D dos simuladores de gestão de futebol):
  - o público são cartões planos (*billboards*) com variação de cor;
  - as cadeiras vazias leem-se pela cor do clube;
  - as placas LED animadas são o elemento mais visível à volta do campo;
  - o anel de bancada desaparece no escuro.
- **HD-2D** (pixel art sobre cenário 3D, o estilo que o nosso cenário já segue): luz e sombra no cenário 3D, bonecos planos nítidos por cima e profundidade de campo. A profundidade nasce de **camadas com luz diferente**, não de pormenor.

### Truques que se repetem

1. **Uma linha clara a separar** o campo da bancada: o topo das placas, um corrimão, um rebordo.
2. **Primeira fila mais clara e mais contrastada**, e as de trás a escurecer e a perder saturação.
3. **Cadeiras como blocos de 2×2 a 3×3 píxeis**, com um píxel claro em cima (a aresta do encosto) e uma frincha escura entre elas. Os encostos leem-se como um tracejado.
4. **Padrão de cor na bancada:** blocos da cor do clube, uma letra ou uma faixa diagonal feita com as cadeiras. Lê-se mesmo vazia.
5. **Variedade de público com uma paleta curta:** 4 a 6 cores de camisola, em que a do clube vale o dobro, e poucas peles e cabelos.
6. **Interrupções regulares** (escadas, vomitórios, faixas) para a bancada não virar textura.

## 3. Melhorias propostas para o nosso jogo

A ordem é a da prioridade, ou seja, o ganho a dividir pelo risco. Em todas:

- as contas mudam em `Camera.drawScene` e em `src/ui/gpu/venue-shader.ts` ao mesmo tempo, e corre-se `npm run gpu-check`;
- quem usa `sideFanSpot`, `endFanSpot`, `seats` e `chairPhase` (os balões da bancada, as bandeiras e a claque) mexe-se com a geometria;
- primeiro mostra-se uma imagem de pré-visualização ao dono, e depois o trabalho passa pela revisão do skill visual-design.

### P1. Corredor e guarda-corpos à frente da primeira fila

**Referências:**

- Guia Verde §11.4: uma barreira de 0,8 m até 530 mm à frente das cadeiras, ou de 1,1 m nos outros casos.
- FIBA: público a pelo menos 2 m da linha de contorno.
- A ideia da camada de profundidade (ver «grande» acima).

**Proposta:**

- O muro passa a 1,2 m: placas de 0 a 1 m e um rebordo de betão de 1 a 1,2 m.
- Por cima do muro, um **corredor de 1,0 m de fundo**, ao nível z = 1,2. Leva a primeira fila de y = −11 para y ≈ −12.
- À frente do corredor, um **guarda-corpos de 0,9 m** (z de 1,2 a 2,1):
  - no municipal, um tubo metálico com montantes a cada 1,5 m;
  - na arena, um vidro: um píxel claro em cima e um véu muito leve.
- A faixa da claque passa do muro para o guarda-corpos, pendurada nele, como nas bancadas reais.
- A primeira fila começa 0,4 m acima do corredor.

**Por pavilhão:**

- **Rua:** não muda.
- **Escolar:** sem corredor. A bancada telescópica fica encostada à parede do pavilhão, com 0,8 m de piso livre à frente do primeiro banco e um corrimão só nas pontas.
- **Municipal:** um tubo pintado na cor secundária do clube.
- **Arena:** vidro e corredor um pouco mais largos (1,2 m).

**Risco:**

- A bancada sobe cerca de 0,5 m e recua 1 m, por isso a câmara a meio do campo mostra menos uma fila.
- Os balões e as bandeiras estão presos a `fanHeight` e têm de se mover com a bancada.
- O corrimão não pode cortar o aro nem a bola em lançamentos altos junto à linha lateral. O corrimão é fino e a bola passa à frente dele, mas é preciso confirmar com um ensaio de cesto junto à lateral.

### P2. Cadeiras que se leem

**Referências:**

- Guia Verde §12.13: 460–500 mm por lugar.
- FIBA §16.4: encosto de 0,3 m.
- O truque 3 (cadeiras como blocos com aresta clara).
- A lacuna que vimos nas imagens: na arena, as cadeiras azul-escuras desaparecem contra o espelho azul-escuro.

**Proposta:**

- Uma cadeira a cada **0,5 m**. Hoje são 0,625 m. Os adeptos podem continuar a 1,25 m, um lugar sim e outro não, mais um ocasional.
- Cada cadeira é um bloco de 0,42 m com uma frincha de 0,08 m. O encosto tem 0,3 m acima do assento, com uma aresta superior clara (`chairTop`).
- O espelho do degrau fica **pelo menos 0,25 de luminosidade abaixo** da cadeira.

**Por pavilhão:**

- **Escolar:** sem cadeiras. Tábuas corridas de madeira, sem costas, como hoje, mas com a junta a cada 0,5 m mais visível.
- **Municipal:** assentos de plástico sem costas (em concha), mais baixos: só 0,15 m de encosto. As cores alternam por blocos, com a cor do clube nos blocos do meio e um tom neutro nos das pontas.
- **Arena:** cadeiras rebatíveis com costas, com um **desenho na bancada** feito com as cores do clube, por exemplo uma faixa diagonal ou a inicial do clube num bloco central, visível quando os lugares estão vazios.

**Risco:**

- O desenho e as cadeiras a 0,5 m podem fazer ondas de interferência (moiré) ao longe. Com o traçador de raios e com o GPU, convém fazer a média do texel.
- O contraste a mais pode competir com os jogadores. A regra é manter a saturação abaixo da das camisolas.

### P3. Placas de publicidade soltas nos topos e na lateral da câmara

**Referências:**

- FIBA §15: placas a pelo menos 2 m das linhas, com 1 m de altura, acolchoadas.
- Um vão de 0,9 m de cada lado do suporte do cesto.
- Do lado do banco e da mesa, só alinhadas com a mesa.

**Proposta:**

- Nos topos (Municipal e Arena), as placas saem do muro e ficam **soltas a 2 m da linha final** (x = −2 e x = 30), com 1 m de altura, um vão de 0,9 m de cada lado do suporte do cesto e um chão escuro entre elas e a bancada, que continua a x = −4 e x = 32.
- Na lateral do banco (y negativo), as placas continuam no muro, porque o banco a 2,1 m não deixa espaço.
- **Na Arena, as placas passam a LED:**
  - a cor fica constante;
  - de vez em quando a placa muda para a cor do clube durante um cesto, com 2 a 3 frames;
  - não pode piscar durante o jogo.

**Por pavilhão:**

- **Rua:** nada.
- **Escolar:** nada. Ficam os colchões de proteção na parede atrás do cesto.
- **Municipal:** placas de lona ou pintadas, soltas só nos topos.
- **Arena:** placas LED soltas.

**Risco:**

- Uma placa de 1 m a 2 m da linha pode tapar os pés dos jogadores junto à linha final nas câmaras dos cantos. O suporte do cesto já está a cerca de 1–2 m, por isso é preciso confirmar com `x3` e `x25`.
- Mais um objeto a desenhar nos dois caminhos.

### P4. A bancada escurece para cima e o campo fica claro (Arena e Municipal)

**Referências:**

- FIBA §12.2.4: nas 15 primeiras filas, 10–25 % da luz do campo, e menos daí para cima.
- O truque 2 e a ideia de camadas com luz diferente do HD-2D.

**Proposta:**

- A luz da bancada passa a depender da fila. Hoje há um só `dim` por pavilhão.
- **Arena:** começa em 0,85 na primeira fila e desce até 0,45 na décima.
- **Municipal:** vai de 0,95 a 0,7.
- **Escolar e Rua:** ficam iguais, com luz uniforme.

**Risco:**

- A arena já é escura (`ambient 0,68`) e os balões e as bandeiras do fundo podem perder leitura. Os sprites do público devem receber menos escurecimento do que o betão.
- Mexe na paleta das duas implementações.

### P5. Proporção dos degraus

**Referências:**

- Guia Verde e EN 13200-1: 0,8 m de fundo por fila recomendados.
- Telescópicas: 0,28–0,45 m de altura por fila.
- Nas bancadas fixas, até cerca de 0,55 m nos anéis de cima. Na vida real, 20–35° de inclinação.

**Proposta:**

- Sem tentar chegar ao real, porque os nossos adeptos de cabeça grande precisam de altura, baixar o degrau de 1,3 m para **cerca de 1,0 m** e aumentar o fundo para **cerca de 1,0 m**, o que dá 45°. Na prática, `FAN_ROW_STEP` passa a 1,0 e `slope` a cerca de 1,0.
- O escolar fica com os seus 0,9 m de degrau, mas com 0,8 m de fundo.

**Por pavilhão:** muda o Municipal e a Arena.

**Risco:**

- É o risco mais alto. Com degraus mais baixos, as cabeças da fila de trás tapam o tronco da fila da frente, e o público pode virar um amontoado.
- Mudam também o número de filas (`fanRows`), o tamanho das texturas e a posição de tudo o que depende de `fanHeight`.
- Só se deve avançar depois de uma folha de ensaio de `npm run review` com as duas versões lado a lado.

### P6. Mesa de oficiais e lugares ao nível do chão (Arena e Municipal)

**Referências:**

- FIBA §11.2: mesa de 6 m e 0,8 m de altura, em estrado de 0,2 m.
- Art. 2.5.5: 16 lugares por banco e outras pessoas pelo menos 2 m atrás.
- Os lugares VIP ao nível do chão, típicos das arenas grandes.

**Proposta:**

- A mesa já existe junto ao banco: confirmar que tem 6 m, 0,8 m de altura e um estrado visível de 0,2 m, com placas alinhadas na frente.
- **Na Arena,** uma fila de cadeiras ao nível do chão nos topos, entre as placas soltas (P3) e a bancada, de x = −3 a −2,5, com público sentado e quieto.

**Por pavilhão:** só a Arena tem a fila do chão. É o sinal mais barato de casa grande.

**Risco:**

- Mais público para animar e ordenar com os jogadores.
- A fila do chão fica perto do suporte do cesto e não pode confundir a leitura de quem está dentro do campo. Por isso tem de ser escura, com pouca saturação, e ficar no vão da P3.

### Outras ideias (prioridade mais baixa)

- **Vomitórios na Arena:** uma boca escura de 2,4 m de largura e 2,2 m de altura a meio da bancada lateral, por exemplo entre as filas 4 e 6, longe do túnel dos balneários. Interrompe a textura e diz «arena». O risco é baixo, mas mexe em `seats` e em `inAisle`.
- **Escadas mais frequentes:**
  - segundo o Guia Verde, uma escada a cada 28 lugares, cerca de 14 m;
  - na lateral, com 36 m, ficam 2 a 3 escadas, o que bate com o que há;
  - basta confirmar que nenhum troço passa de 14 m.
- **Fita LED entre anéis (Arena):** um segundo anel de bancada por trás de uma fita de luz de 0,9 m, na cor do clube, a cerca de 7–8 m de altura. Raramente aparece na câmara, por isso só compensa se aparecer nos planos de canto.
- **Escolar:**
  - colchões azuis na parede atrás dos cestos (2 m de altura);
  - bancada telescópica com a estrutura metálica visível nas pontas;
  - lugares vazios à vista: a densidade já é de 0,3.
- **Rua:** um murete de betão de 0,45 m ou degraus de jardim numa lateral, onde se sentam 3 a 5 pessoas. É o equivalente a uma «bancada» de rua, e o risco é baixo.

## Fontes

### Regras e normas

- FIBA, *Official Basketball Rules 2026*, art. 2 (campo, bancos, mesa): <https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-v1-0.pdf>
- FIBA, *Official Basketball Rules 2026: Basketball Equipment*, §1.4.3, §10, §11, §12.2.4, §15 e §16: <https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-equipment-v1-0.pdf>
- *Guide to Safety at Sports Grounds* (Guia Verde), 5.ª edição, 2008, §8, §11.4, §12.13–12.16: <https://www.jesip.org.uk/uploads/media/incident_reports_and_inquiries/Guide%20to%20Safety%20at%20Sports%20Grounds.pdf>
- SGSA, lugares e barreiras (6.ª edição do Guia Verde): <https://sgsa.org.uk/physical-factors/spectator-accommodation/seating/> e <https://sgsa.org.uk/physical-factors/spectator-accommodation/seats-with-barriers/>
- EN 13200-3:2018, elementos de separação (índice: alturas de barreiras e barreira à frente de uma fila): <https://iteh.es/catalog/standards/cen/c87deee4-9d2d-4653-b7bd-82c79a13986c/en-13200-3-2018>
- Guia de dimensões desportivas da Austrália Ocidental (5 m até ao público): <https://cdn.dlgsc.wa.gov.au/sport-and-recreation/sports-dimensions-guide/basketball>
- Basketball England, placares (montados a 4 m ou mais): <https://www.basketballengland.co.uk/media/5a5ncpfm/basketball-scoreboard-and-shot-clock-guidance.pdf>

### Bancadas telescópicas (fabricantes)

- ARQMAT, ficha técnica (profundidade de fila de 800, 850 e 950 mm; altura de 280 a 450 mm): <https://cdn.shopify.com/s/files/1/0475/8264/2331/files/FT__Retractable_Seating_System_ARQMAT.pdf>
- Daplast, bancada telescópica: <https://pdf.archiexpo.com/pdf/daplast-sl/retractable-bleacher-t-3/125039-288456.html>
- Stila, bancada telescópica: <https://stilastructure.com/uploads/products/telescopic-grandstand.pdf>

### Pavilhões portugueses

- Dragão Arena: <https://en.wikipedia.org/wiki/Drag%C3%A3o_Arena>
- Pavilhão João Rocha: <https://en.wikipedia.org/wiki/Pavilh%C3%A3o_Jo%C3%A3o_Rocha>
- Pavilhão Fidelidade: <https://en.wikipedia.org/wiki/Pavilh%C3%A3o_Fidelidade>
- Brochura de eventos do Benfica (quatro bancadas, 2440 lugares): <https://media.slbenfica.pt/-/media/BenficaDP/Images/generic_content_pages/slbusiness/eventos/BEventosPT1.pdf>
- Lista de pavilhões em Portugal: <https://en.wikipedia.org/wiki/List_of_indoor_arenas_in_Portugal>

### Jogos (dados factuais)

- *Basketball Classics* (Namo Gamo): <https://store.steampowered.com/app/819630> e a crítica da Creative Bloq: <https://www.creativebloq.com/entertainment/gaming/basketball-classics-switch-review-it-feels-like-an-nes-throwback-in-a-good-way>
- *Hoop League Tactics* (Koality Game): <https://apps.apple.com/app/id1484372351>
- *Hoop Land* (Koality Game): <https://apps.apple.com/au/app/hoop-land/id1605197976>
- Calciobit A: [docs/referencias/calciobit/](../calciobit/README.md)
