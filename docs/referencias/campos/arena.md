# Referências: a Grande Arena

Pesquisa de 13 de novembro de 2026 para a Grande Arena (a casa dos clubes de topo, de 8 000 a 20 000 lugares). Completa a [pesquisa dos pavilhões e bancadas](../pavilhoes/README.md), que já trata das normas de bancadas, do corredor e guarda-corpos, das cadeiras, das placas soltas, da luz por fila, dos degraus e da fila do chão (P1 a P6). Aqui não se repete isso. Esta página trata do que só uma arena grande tem.

**Só referência.** A regra [«Original, não cópia»](../../../AGENTS.md) continua a valer: dos jogos e das arenas reais tiram-se ideias de leitura e de composição, nunca arte, cores próprias, logótipos ou marcas. As descrições são texto nosso. Não se descarregou nenhuma imagem. As fotografias com licença já estão em [cenarios/pavilhoes-reais/](../cenarios/pavilhoes-reais/README.md) (`europa/` e `nba/`), e as capturas de jogos em [cenarios/jogos-basquete-pixel/](../cenarios/jogos-basquete-pixel/README.md).

## Como está hoje

Imagem: `dist-check/campos/audit-d3.png` (em cima, o pavilhão inteiro de longe; em baixo, três planos com a câmara do jogo). Valores em `src/ui/art/court.ts`, entrada `'Grande Arena'`.

- **Piso:** madeira cor de mel quente, áreas e círculo central azul-escuros, emblema ao centro. A faixa à volta (`apron`) é azul-noite lisa, sem nada escrito.
- **Placas:** laranja e azul-noite alternados, pintadas no muro, com texto. Na câmara do jogo são a coisa mais viva da imagem.
- **Bancada:** quatro lados e cantos cortados (`chamfer`), cadeiras azul-escuras sobre betão azul-escuro, `dim` 0,55 igual em todas as filas, `ambient` 0,68 e `spot` 0,42.
- **Túnel:** uma boca escura a meio da lateral do fundo.
- **O que falta:** nada ao nível do chão entre o campo e as placas (sem lugares de pista, sem fotógrafos, sem câmaras de TV); nada no ar (sem placar suspenso, sem fita LED, sem camarotes, sem teto); a luz não separa o campo da bancada (a bancada perde-se, mas por ser escura de cor, não por estar no escuro).
- **De longe** vê-se outro problema: à frente do campo (o nosso lado, y positivo) há um retângulo enorme de faixa azul-noite vazia. Na câmara do jogo quase não aparece, mas nos planos largos (intervalo, apresentação) parece um parque de estacionamento.

## 1. O que torna uma arena grande reconhecível

Um pavilhão municipal diz «sala de desporto». Uma arena diz «espetáculo». Os sinais, por ordem de força para a nossa câmara:

1. **O campo é um palco iluminado e a bancada está no escuro.** No municipal a luz é igual em todo o lado. Na arena o campo tem 1 500 a 3 000 lux e a bancada recebe cada vez menos com a altura (ver a P4 da pesquisa anterior). Várias equipas da NBA instalaram luz que se apaga sobre os lugares e deixa só o campo aceso.
2. **Ecrãs que emitem luz.** Placas LED à volta do campo, fita LED nas frentes de cada anel, cubo de vídeo suspenso por cima do meio campo. São as únicas coisas na bancada mais claras do que o campo, e mudam de cor quando há cesto.
3. **Camadas ao nível do chão.** Entre a linha e a primeira cadeira da bancada há gente: duas filas de lugares de pista, fotógrafos sentados no chão atrás das linhas finais, operadores de câmara, mesa de oficiais e comentadores. No municipal o muro está logo ali.
4. **Um anel contínuo e dois ou três andares.** A bancada dá a volta toda, com um anel de baixo e um de cima separados por uma fita de luz ou por uma fila de camarotes envidraçados.
5. **Piso de televisão.** Faixa à volta numa cor forte do clube, o nome do clube ou da cidade pintado na faixa lateral, patrocinadores pintados atrás das linhas finais, verniz que reflete as placas.
6. **Teto alto e escuro.** Treliças, passadiços técnicos, projetores, faixas de títulos e camisolas retiradas penduradas.
7. **Público que faz coisas em conjunto.** Na Europa: claque atrás de um cesto com faixas compridas, bandeiras, coreografias que pintam a arena numa ou duas cores. Na NBA: lanternas dos telemóveis na apresentação, t-shirts iguais oferecidas à entrada, mascote.

## 2. Elementos com medidas

As medidas vêm das fontes no fim. Quando o número é de uma arena concreta, diz-se qual.

### Piso e beira do campo

| Elemento | Medida | Nota |
|---|---|---|
| Campo | 28 × 15 m | FIBA |
| Faixa à volta, cor contrastante | ≥ 2 m | FIBA Nível 1; já é o nosso `apron` |
| Linhas | 5 cm (NBA até 10 cm quando o campo e a faixa são da mesma cor) | |
| Início da bancada elevada | 3,7 a 5,5 m da linha | guia de instalações da FIBA |
| Lugares de pista | 2 filas no piso, estrado de 7,5 a 10 cm; encosto da 1.ª fila a ≥ 0,87 m das placas | FIBA |
| Corredor entre lugares de pista e bancada elevada | ≥ 1,2 m | FIBA |
| Placas LED | ≤ 1 m de altura, ≥ 2 m da linha, vão de 0,9 m de cada lado do suporte do cesto, 2 m de cada lado da mesa | FIBA |
| Mesa de oficiais | estrado de 0,2 m, até 10 pessoas; na NBA, vidro acrílico à volta | FIBA, NBA |
| Comentadores | 3 posições à beira do campo, em frente à mesa | FIBA |
| Fotógrafos e câmaras de mão | 1 a 3 câmaras por linha final, com corredores de fuga de 0,8 × 2 m; na WNBA, fotógrafos a ≥ 1,8 m da linha, sentados em bancos baixos | FIBA, WNBA |
| Entradas das equipas | idealmente uma por canto; evitar túnel ao centro | FIBA |

### No ar e na bancada

| Elemento | Medida | Nota |
|---|---|---|
| Altura livre por cima do campo | ≥ 7 m; 14 m recomendados para grandes transmissões | FIBA |
| Cubo de vídeo central | faces laterais de 5,5 × 10 m (Minneapolis) a 9,6 × 17 m (Cleveland); faces dos topos mais pequenas | imprensa técnica |
| Alternativa europeia | dois ecrãs, um em cada topo, ou cubo mais um ecrã em frente aos bancos | FIBA |
| Fita LED nas frentes dos anéis | 0,75 a 0,9 m de altura, uma por anel, à volta toda (≈ 270 m numa arena da NBA) | Los Angeles, Kentucky |
| Fundo de cada fila | ≥ 0,865 m; lugar ≥ 0,465 m | FIBA |
| Treliças do teto | vãos de ≈ 100 m, até ≈ 10 m de altura de treliça; os passadiços e a grelha de luzes ficam no banzo de baixo, todos à mesma cota | Kansas City |
| Câmara principal de TV | 18 a 30 m da linha lateral, 6 a 15 m de altura, ≈ 17,5° para baixo, do lado oposto aos bancos | FIBA |
| Luz no campo | 1 500 a 3 000 lux, 4 000 a 6 000 K | FIBA |
| Lotação de arenas da Euroliga | Belgrado ≈ 19 400, Atenas (OAKA) ≈ 19 000, Kaunas ≈ 15 400 | |

A câmara principal de TV da FIBA (alta, lateral, a 17,5°) é quase a nossa câmara. Por isso o que se vê numa transmissão é uma boa referência para o que deve aparecer no nosso ecrã.

## 3. O que se vê da nossa câmara

A câmara do jogo está alta e de lado, e olha para a lateral do fundo. Nos três planos de `audit-d3.png`:

- **Sempre à vista:** o piso e a faixa à volta; a lateral do fundo com a mesa, o banco e as placas; as primeiras 4 a 6 filas da bancada do fundo; nos planos dos cantos, a bancada do topo em diagonal.
- **Raramente à vista:** a fila de cima da bancada, o lado de cá (o nosso), o teto.
- **Nunca à vista:** o placar suspenso (está por cima do meio campo, acima da borda de cima do ecrã), a fita LED entre anéis e os camarotes, exceto nos planos largos.

Consequência: **o que se põe no chão e na primeira dezena de filas vale muito mais do que o que se põe no ar.** O que está no ar só entra na câmara do jogo de forma indireta: pela luz que lança no campo e pelo reflexo no verniz. Nos ecrãs largos (apresentação, intervalo, fim de jogo, `npm run campos` de longe) vale a pena mostrá-lo de corpo inteiro.

## 4. O que outros jogos fazem

Observação nossa, a partir de capturas e vídeos públicos. Os pormenores visuais devem confirmar-se antes de decidir. A pesquisa anterior já trata do Calciobit, do Hoop Land, do Basketball Classics, da Kairosoft e dos motores 3D de gestão. Aqui só o que é novo ou próprio das arenas.

- **Campo como única zona clara.** Em quase todos os jogos de basquetebol em pixel art com arenas (Hoop Land, Super Basketball Classics, Basketball Takeover), a bancada é escura ou numa cor lisa da equipa e o campo é quente e claro. O contraste faz a escala, não o pormenor.
- **Reflexo no piso.** O Basketball Classics e o Super Basketball Classics põem um reflexo curto e esbatido da bancada e das placas no piso das arenas, e não nos campos simples. O reflexo é o sinal de «piso caro».
- **Feixes de luz.** O Pixel Dunking (itch.io) usa faixas de luz verticais por cima de uma bancada em leque para dizer «arena grande» com poucos píxeis.
- **Público em fundo animado.** Os jogos de 8 bits de futebol americano (o caso clássico é o Tecmo Super Bowl) tratam a bancada como um fundo com poucos frames de animação, não como pessoas soltas. Os pacotes de recursos atuais fazem o mesmo com filas inteiras desenhadas num só cartão, mais uma primeira fila separada com mais pormenor.
- **Primeira fila com caras, o resto massa.** Super Basketball Classics e afins: uma fila sentada junto à linha com sprites inteiros, e atrás filas que se perdem no escuro.
- **Bandeiras e faixas na cor de quem joga.** Um jogo de futebol em pixel art no itch.io (Soccer Champions) mudou as bandeiras e faixas da bancada para as cores das duas equipas em campo, e diz que foi o que mais deu vida ao estádio.
- **Ecrã de apresentação com o estádio cheio.** O Retro Bowl quase não mostra o público durante o jogo; a ocasião nasce nos ecrãs de entrada com a bancada cheia e bandeiras. Para nós: a arena inteira pode viver nos planos largos, e o jogo fica limpo.
- **Silhuetas em primeiro plano.** Cabeças escuras na borda de baixo do ecrã (o nosso lado) dão profundidade sem desenhar a bancada de cá.
- **Na vida real, a bancada como ecrã.** A arena dos Clippers (Intuit Dome) tem luzes nos lugares e transforma o público num ecrã. Para nós é a ideia de pontinhos de luz na bancada escura (telemóveis) na apresentação e no fim de jogos grandes.

### Truques para escala com poucos píxeis

1. Tudo o que emite luz (LED, cubo, fita) desenhado sem sombra nem `ambient`, à luz máxima, com um halo de 1 píxel.
2. Escurecer por camadas: campo, faixa, placas, lugares de pista, bancada de baixo, fita, bancada de cima, teto. Cada camada um degrau mais escura e menos saturada.
3. Repetição até sair do quadro: a última fila nunca se vê acabar.
4. Gente pequena junto ao campo (fotógrafos, câmaras, lugares de pista) dá a medida do resto.
5. Reflexo das placas e do cubo no piso, curto, vertical e esbatido. Nunca dos bonecos.

## 5. Melhorias para a nossa Grande Arena

Por ordem do que mais se nota na câmara do jogo. Em todas valem as regras da pesquisa anterior: as contas mudam em `Camera.drawScene` e em `src/ui/gpu/venue-shader.ts` ao mesmo tempo (e corre-se `npm run gpu-check`), primeiro mostra-se uma imagem de pré-visualização ao dono, e o trabalho passa pela revisão do skill visual-design. As P1 a P6 da [pesquisa anterior](../pavilhoes/README.md#3-melhorias-propostas-para-o-nosso-jogo) continuam válidas e não se repetem aqui; onde uma melhoria depende delas, diz-se.

### A1. Placas LED que brilham (alto ganho, risco baixo)

- As placas da arena passam a emissivas: cor plena, sem `ambient` nem sombra, um píxel mais claro no rebordo de cima.
- Um reflexo curto delas no piso, na faixa à volta, que já tem `reflection` 0,28.
- Mudam todas para a cor do clube durante 1 a 2 segundos depois de um cesto da casa ou de um triplo, e voltam. Nunca a piscar em jogo corrido.
- A frente da mesa de oficiais também é uma placa LED, alinhada com as outras.
- **Risco:** a placa a brilhar pode competir com as camisolas; manter a saturação abaixo da das camisolas e a luminosidade abaixo da do piso.

### A2. Luz de palco (alto ganho, risco médio; junta-se à P4)

- O campo fica um pouco mais claro e mais frio do que hoje (madeira mais clara, à moda da Euroliga), e a faixa, as placas apagadas e a bancada descem.
- A bancada escurece com a altura (P4: de 0,85 na 1.ª fila a 0,45 na 10.ª) e, por cima disso, uma vinheta suave nas bordas do ecrã.
- Uma «poça» de luz sobre o campo: a luz do chão cai depressa para lá da faixa, de modo que os lugares de pista e o banco ficam em meia-luz.
- Nos descontos de tempo e no intervalo, modo espetáculo: o campo baixa, dois ou três focos passeiam pelo piso, e aparecem pontinhos de luz na bancada (telemóveis).
- **Risco:** os balões e as bandeiras do fundo perdem leitura; o público recebe menos escurecimento do que o betão. A cor do piso entra na leitura da bola.

### A3. Gente ao nível do chão (alto ganho, risco médio)

- **Fotógrafos:** 2 ou 3 por linha final, sentados no chão nos cantos, fora do vão do cesto, de costas para nós. Um píxel branco de flash nos afundanços e nos triplos.
- **Câmaras de TV:** um operador de pé com a câmara ao ombro em cada canto do fundo, mais um tripé baixo junto à mesa.
- **Comentadores:** duas cabeças com auscultadores na ponta da mesa.
- **Lugares de pista:** uma fila de cadeiras soltas (não de bancada) entre as placas e a bancada, nos troços da lateral do fundo que não têm banco nem mesa, e nos topos (é a P6). Público sentado e quieto, em meia-luz, com pouca saturação.
- **Risco:** mais sprites junto às linhas podem confundir quem está em campo. Escuros, quietos e sempre fora da zona livre de 2 m.

### A4. Faixa à volta com nome e patrocínios (ganho médio, risco baixo)

- Na faixa lateral do fundo, entre a linha e as placas, o nome do clube ou da cidade pintado em letras grandes, na cor clara do clube sobre a cor da faixa.
- Atrás de cada linha final, uma palavra de patrocinador inventada.
- A cor da faixa deixa de ser azul-noite fixa e passa a ser a cor escura do clube da casa.
- **Risco:** texto em perspetiva serrilha. As letras vão como as linhas: traçadas no mundo, ou numa textura grande e filtrada.

### A5. O placar suspenso pela luz (ganho médio, risco baixo)

- Na câmara do jogo, o cubo não se vê, mas vê-se a sua luz: um reflexo retangular e pálido no piso, perto do círculo central, que muda de cor com o que o cubo mostra (cor do clube depois de cesto).
- Nos planos largos e na apresentação, o cubo inteiro: quatro faces, as dos lados com cerca de 6 × 11 m, a cerca de 20 m de altura, uma fita LED em baixo e em cima, o resultado e o relógio nas faces.
- Os relógios de posse por cima de cada tabela, se ainda não existem (confirmar).
- **Risco:** um reflexo no meio do campo pode esconder a bola. Muito ténue e nunca em movimento rápido.

### A6. Túnel dos jogadores (ganho médio, decidir com o dono)

- A FIBA recomenda entradas nos cantos e não ao centro. Hoje o nosso túnel está a meio da lateral do fundo, tapado pelo banco e pela mesa.
- Proposta: a boca passa para um canto do fundo, mais alta (2,4 × 2,2 m), com uma luz branca no interior, e o resto da bancada fica contínua. Na entrada das equipas, fumo baixo e focos.
- **Risco:** mexe nas cenas de entrada e no intervalo (`src/tools/cenas/intervalo-tunel.json`) e nas sequências gravadas. Perguntar antes, porque o Calciobit tem o túnel ao centro e pode ter sido escolha.

### A7. Segundo anel, fita LED e camarotes (ganho só nos planos largos e de canto)

- Por cima da 10.ª a 12.ª fila, uma fita LED de 0,9 m na cor do clube a dar a volta toda; por trás, uma fila de camarotes envidraçados com luz quente lá dentro; por cima, o anel de cima, mais escuro e mais íngreme.
- Na câmara do jogo pode aparecer no topo do ecrã nos planos dos cantos. Confirmar com `npm run campos` antes de investir.

### A8. Teto (só planos largos)

- Treliças escuras com passadiços e uma grelha de projetores no banzo de baixo, todos à mesma altura; faixas de títulos e camisolas retiradas do clube penduradas por cima de um topo.
- Também resolve o «buraco» por cima da bancada nos planos de longe.

### A9. Público de arena (ganho médio, risco baixo; junta-se à P2)

- Claque atrás de um dos cestos, com uma faixa comprida pintada e bandeiras nas cores do clube (já há bandeiras: dar-lhes um bloco próprio).
- Em jogos grandes (finais, dérbis), coreografia: todo o público com a mesma cor de camisola, ou duas cores em blocos.
- Mascote na faixa à volta durante os descontos de tempo.
- Silhuetas escuras de cabeças na borda de baixo do ecrã, do nosso lado.
- A lacuna da pesquisa anterior continua: cadeiras azul-escuras sobre betão azul-escuro. Na arena, cadeiras na cor do clube e betão quase preto, ou um desenho nas cadeiras (P2).

### A10. O espaço vazio do nosso lado (só planos largos)

- O retângulo de faixa vazia à frente do campo enche-se: lugares de pista, a posição das câmaras de TV e o início da bancada de cá, a 3,7 a 5,5 m da linha como manda a FIBA.

## Fontes

### Normas e medidas

- FIBA, guia de instalações, desenho do pavilhão (bancada a 3,7–5,5 m, lugares de pista, mesa, placas, teto de 14 m, luz, cubo de vídeo, câmaras, comentadores, entradas nos cantos): <https://venueguide.fiba.basketball/vanue-design>. A referência mais útil desta página.
- FIBA, guia de instalações, tendências (piso de vidro LED que também é ecrã): <https://www.venueguide.fiba.basketball/technology-trends>. O piso pode ser ecrã, mas é mais espesso do que a madeira.
- FIBA, *Official Basketball Rules 2026: Basketball Equipment*: <https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-equipment-v1-0.pdf>. Placas, faixa à volta e luz, já resumidas na pesquisa anterior.
- Basketball England, normas de instalações da liga nacional (placas a ≥ 2 m e ≤ 1 m): <https://www.basketballengland.co.uk/media/2260/national-basketball-league-facility-standards.pdf>. Confirma as medidas das placas fora da FIBA.
- WNBA, regras para os meios de comunicação (fotógrafos a ≥ 6 pés, bancos sem metal, corredores de fuga): <https://cdn.wnba.com/sites/1611661319/2024/11/2024-WNBA-Media-Policy-OUTLINE-Final_.pdf>. Onde e como se sentam os fotógrafos.
- NBA, novas regras da linha lateral (câmaras fora do piso, mesa com acrílico): <https://www.nba.com/news/nba-announces-new-enhancements-sideline-official-release>. Mostra que os fotógrafos e câmaras ficam fora da madeira.
- PetaPixel, fotografar um jogo da NBA: <https://petapixel.com/2025/04/09/ref-butts-and-slam-dunks-what-its-like-photographing-an-nba-game>. Como é a vida dos fotógrafos na linha final, de dentro.

### Ecrãs, fitas LED e teto

- Athletic Business, o cubo de Cleveland (9,6 × 17 m nas faces laterais): <https://www.athleticbusiness.com/facilities/stadium-arena/article/15146156/cleveland-cavaliers-unveil-nbas-largest-scoreboard>. Tamanho de um cubo grande face ao campo.
- BD+C, cubos da NBA (Minneapolis, 5,5 × 10 m mais faixas por cima): <https://www.bdcnetwork.com/minnesota-timberwolves-join-pack-nba-teams-new-high-res-video-screens>. Um cubo de tamanho médio, com faixas LED por cima.
- NBA, o novo placar de Charlotte (faces laterais e dos topos com tamanhos diferentes): <https://www.nba.com/hornets/hornets-introduce-new-scoreboard-design>. As faces dos topos são mais pequenas.
- iA Stage, o cubo e a grelha técnica do Chase Center: <https://iastage.com/chasing-a-dream>. Passadiços acessíveis de quase todo o perímetro.
- Coliseum, três fitas LED em Los Angeles, uma por anel: <https://www.coliseum-online.com/daktronics-power-up-crypto-com-arena/amp/>. Fitas de ≈ 0,75 m nas frentes de cada anel.
- Sports Video Group, fitas de 360° nas frentes da bancada: <https://www.sportsvideo.org/2025/07/29/university-of-tennessee-brings-new-view-to-food-city-center-with-11-display-centerhung-system-from-daktronics/>. Uma só fita a dar a volta toda.
- Structure Magazine, as treliças do Sprint Center: <https://www.structuremag.org/wp-content/uploads/2014/09/Sprint-Center-Feature1.pdf>. Treliças muito altas com os passadiços no banzo de baixo.

### Luz

- Athletic Business, a nova luz LED dos Pacers: <https://www.athleticbusiness.com/facilities/stadium-arena/news/15152051/pacers-new-led-lighting-comes-with-adjustment-period>. Campo aceso e lugares no escuro, como um palco.
- NBA, a luz de palco dos Timberwolves: <https://www.nba.com/timberwolves/news/timberwolves-unveil-new-stage-lighting-at-target-center-as-part-of-continued-emphasis-on-a-world-class-fan-experience>. As primeiras filas ficam em meia-luz, o resto escuro.
- Star Tribune, a mesma luz vista pelos adeptos: <https://www.startribune.com/wolves-and-hometown-fans-to-be-dramatically-lit-this-season/601499394>. O efeito dramático contado de fora.
- ISP, as luzes nos lugares do Intuit Dome: <https://www.isp-audio.com/en/installation-case-studies/lighting-installation/12941-intuit-dome-enhances-the-fan-experience-with-an-elation-lighting-system>. A bancada usada como ecrã de luz.
- Philips, a luz LED da arena Sinan Erdem para uma Final Four: <https://images.philips.com/is/content/PhilipsConsumer/PDFDownloads/Global/Case-studies/ODLI20180413_001-UPD-en_AA-sports-erdem-0318v2.pdf>. Projetores separados para o campo e para a bancada.
- LEDVANCE, a luz da Žalgirio Arena: <https://www.ledvance.com/en-uk/professional-lighting/projects/great-lighting-for-great-champions>. Luz feita para a televisão da Euroliga.
- Euroliga, espetáculos antes do jogo: <https://www.euroleaguebasketball.net/euroleague/news/pregame-shows-aiming-to-set-new-level-of-live-entertainment>. Centenas de projetores para a apresentação das equipas.

### Piso e ambiente

- ESPN, como nasceram os pisos pintados da taça da NBA: <https://africa.espn.com/nba/story/_/id/38772965/how-bold-new-nba-season-tournament-courts-came-fruition>. Piso todo pintado e uma faixa de cor de cesto a cesto.
- Uni Watch, os 30 pisos da taça da NBA: <https://uni-watch.com/2023/10/30/nba-unveils-30-new-court-designs-for-in-season-tourney/>. Variedade de pisos pintados para comparar.
- Sports Illustrated, os pisos da NBA ordenados: <https://www.si.com/nba/2016/02/03/power-ranking-all-30-nba-floor-designs>. Frases e nomes pintados na faixa lateral.
- ABC News, a «fila das celebridades» do Madison Square Garden: <https://abcnews.com/culture/story/superstars-new-york-city-knicks-compose-celebrity-row-133687941>. Os lugares de pista como montra.
- Novosti, coreografia do Partizan na arena de Belgrado: <https://www.novosti.rs/c/sport/kosarka/1419206/partizan-bajern-minhen-evroliga-koreografija-navijaci-arena-najnovije-vesti>. A arena inteira a preto e branco com bandeirinhas.
- Eurohoops, os dérbis de Belgrado: <https://www.eurohoops.net/en/trademarks/1951271/top-3-euroleague-belgrade-derbies>. Mais de 18 000 numa arena cheia.
- Lista das arenas da Euroliga (lotações): <https://kaweah.freedombox.rocks/kiwix/wikipedia_en_all_maxi_2023-10/List_of_EuroLeague_arenas>. Cópia da Wikipédia; confirmar números no sítio de cada arena.

### Jogos

- Soccer Champions, diário de desenvolvimento (bandeiras e faixas nas cores das equipas): <https://claryu.itch.io/soccer-champions/devlog/925585/devlog-gameplay-polish-a-more-lively-stadium>. O que mais deu vida ao estádio.
- Vice, o Tecmo Super Bowl (público como fundo animado): <https://vice.com/en/article/tecmo-super-bowl-the-video-game-that-changed-football>. O truque clássico da bancada a 8 bits.
- Fórum Blitz Basic, público em cartões com filas inteiras: <https://blitz-community.github.io/blitzbasic-backup/forums/b3d-programming/35862.html>. Uma fila inteira num só cartão.
- Creative Bloq, crítica do Basketball Classics: <https://www.creativebloq.com/entertainment/gaming/basketball-classics-switch-review-it-feels-like-an-nes-throwback-in-a-good-way>. Arenas em pixel art com sabor a 8 bits.
- 148Apps, crítica do Hoop Land: <https://www.148apps.com/reviews/hoop-land-review>. Basquetebol em pixel art para telemóvel, simples à primeira vista.
- Capturas de jogos já guardadas: [cenarios/jogos-basquete-pixel/README.md](../cenarios/jogos-basquete-pixel/README.md) (Hoop Land, Basketball Classics, Super Basketball Classics, Pixel Dunking, Basketball Takeover, Retro Bowl).
- Fotografias de arenas já guardadas, com licença: [cenarios/pavilhoes-reais/README.md](../cenarios/pavilhoes-reais/README.md) (OAKA, Belgrado, Paris, Madison Square Garden, Golden 1 Center, Toronto, Rupp Arena).
