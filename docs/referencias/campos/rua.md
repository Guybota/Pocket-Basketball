# Referências: o campo de rua

Pesquisa de 13 de novembro de 2026 para melhorar o campo de rua (a divisão mais baixa). Segue o formato de [pavilhões e bancadas](../pavilhoes/README.md): o que temos, a vida real com medidas e fontes, o que outros jogos fazem e uma lista de melhorias por prioridade.

**Só referência.** A regra [«Original, não cópia»](../../../AGENTS.md) continua a valer: dos campos pintados e dos outros jogos tiram-se ideias de leitura e de composição, nunca os desenhos dos artistas, as marcas nem a arte dos jogos. As descrições abaixo são texto nosso, e não descarregámos imagens.

## O que temos hoje (para comparar)

Visto em `dist-check/campos/audit-d0.png` e em `src/ui/art/court.ts` (`drawOpenScene`, `OPEN_SHAPE`, `STREET_SEATS`).

| Elemento | Hoje |
|---|---|
| Chão do campo | alcatrão cinzento-azulado escuro, quase liso, com placas muito ténues; garrafões azuis e círculo central azul com emblema |
| Linhas | brancas, finas, inteiras e limpas |
| À volta do campo | o mesmo alcatrão até à rede (a 3,5 m da lateral e a 4 m dos topos), depois 1,6 m de passeio liso |
| Rede | malha de arame de 2,2 m (`FENCE_HEIGHT`), células de 0,4 m, postes a cada 4 m, sem porta nem remates |
| Fora da rede | relva lisa com faixas diagonais de 4 m, até um pano de fundo a 14 m (`BACKDROP`) |
| Fundo | prédios em cartão com janelas regulares, árvores redondas iguais, céu azul liso |
| Mobiliário | bancos de pedra em dois degraus atrás dos cestos; público encostado à rede do fundo |
| Luz | dia, uniforme; não há candeeiros nem sombras projetadas |

**Na câmara do jogo** (as três vistas de baixo da imagem) vê-se sobretudo: o alcatrão, a rede do fundo com o público à frente, os bancos de pedra, e por cima uma faixa estreita de relva, árvores e um ou dois prédios. **De longe** nota-se o grande vazio: um rectângulo de alcatrão muito maior do que o campo e um relvado verde sem nada, como uma maqueta. O campo parece «um pavilhão sem teto» e não um sítio de bairro.

## 1. Vida real

### O que torna um campo de rua reconhecível

1. **O chão gasto e remendado:** alcatrão ou betão com fissuras, remendos de cor diferente, poças secas, linhas meio apagadas e marcas de outros jogos (futsal, andebol) por cima.
2. **A rede alta à volta** (a «jaula»), muitas vezes com uma porta, buracos, uma parte dobrada e coisas presas: casacos, sacos, uma garrafa.
3. **Tabelas de rua:** de metal perfurado ou acrílico riscado, postes em pescoço de cisne pintados, aros às vezes sem rede ou com rede de corrente.
4. **O bairro à volta:** prédios com varandas e roupa a secar, empenas com murais, grafitos nos muretes, carros estacionados, candeeiros, árvores com caldeira, bancos de jardim.
5. **O público é informal:** sentado em muretes, nos degraus, encostado à rede ou de pé com bicicletas e trotinetes.
6. **Muitas vezes é um polidesportivo:** em Portugal o «campo de rua» típico é o polidesportivo descoberto da junta de freguesia, com balizas de futsal nos topos e as tabelas atrás delas, piso verde e vermelho (ou cinzento) e rede alta só atrás das balizas.
7. **A nova vaga dos campos pintados:** desde 2015, muitos campos foram renovados com o piso inteiro pintado por artistas (blocos de cor, padrões, letras), o que já é por si um sinal de «campo de rua» moderno.

### Chão

| Elemento | Medidas e notas | Fonte |
|---|---|---|
| Campo inteiro | 28 × 15 m, com 2 m livres à volta (as mesmas regras do pavilhão) | FIBA, guia de recintos exteriores |
| Campo de 3x3 | 15 × 11 m de jogo; 18 × 14 m de área com a margem. Um campo inteiro dá dois de 3x3 | FIBA, guia de recintos exteriores |
| Materiais | alcatrão, betão, ladrilhos de polipropileno de 10–20 mm, borracha de 8–13 mm. A FIBA aceita qualquer piso duro e plano para 3x3 | FIBA, guia de recintos exteriores |
| Escoamento | inclinação até 1 % num só plano; desníveis até 5 mm debaixo de uma régua de 3 m. Na prática, ficam poças nos pontos baixos (*birdbaths*, «banheiras de pássaros») | FIBA; cadernos de encargos de repintura |
| Pintura | uma camada negra de enchimento acrílico e depois 2 a 3 demãos de cor; as linhas repintam-se a cada 3–5 anos | cadernos de encargos de repintura; FIBA |
| Fissuras | as finas enchem-se com um mástique de borracha, e as largas (mais de 2,5 cm) com uma membrana; os remendos ficam visíveis como linhas mais escuras ou mais lisas | cadernos de encargos de repintura |
| Cores típicas | polidesportivo português: verde no campo e vermelho-tijolo à volta, ou azul e verde; alcatrão cinzento-escuro com linhas brancas ou amarelas | Time Out Lisboa; requalificações municipais |

**O desgaste tem um padrão**, que se vê em qualquer fotografia de campo velho:

- a tinta gasta-se primeiro **debaixo dos cestos**, no garrafão e na linha de lance livre, onde se pisa mais;
- as linhas apagam-se **aos bocados**, não por igual;
- as fissuras seguem as **juntas** do betão (em quadrícula de 3 a 5 m) ou formam uma teia no alcatrão velho;
- os remendos são **rectângulos** de alcatrão mais escuro e mais novo;
- folhas e areia juntam-se **nos cantos e encostadas à rede**.

### À volta

| Elemento | Medidas e notas | Fonte |
|---|---|---|
| Rede | malha de arame de 3 a 4 m nos polidesportivos, alta atrás das balizas; a «Cage» de Nova Iorque tem cerca de 6 m. Postes a cada 2,5–3 m, com um tubo em cima | Wikipedia, West Fourth Street Courts; requalificações em Portugal |
| Poste do cesto | tubo galvanizado de 11–14 cm, em pescoço de cisne, com a tabela 1,2 a 1,8 m à frente do poste; o poste a pelo menos 1 m da linha final | catálogos de fabricantes; FIBA |
| Tabela | 1,07 × 1,83 m de aço perfurado (os furos deixam passar o vento), branca com o quadrado e o rebordo pintados; ou acrílico riscado e amarelado | catálogos de fabricantes |
| Rede do aro | de nylon ou de corrente; muitas vezes não tem | catálogos de fabricantes |
| Bancos e muretes | bancos de jardim, muretes de betão de 0,4–0,5 m, degraus de praça. Em Bussum (Países Baixos) a FIBA cita quatro bancos de material reciclado | FIBA, guia de recintos exteriores |
| Bebedouro | aparece nas listas de equipamento; numa ficha de Lisboa nota-se precisamente a falta dele | Junta de Freguesia de Alvalade |
| Outros jogos | balizas de futsal (3 × 2 m) nos topos, mesas de ping-pong, aparelhos de calistenia, pista de skate ao lado | Time Out Lisboa; Barcelona (Ciutat Vella) |
| Árvores | a FIBA desaconselha campos junto a árvores (folhas e raízes), mas na cidade estão quase sempre lá | FIBA, guia de recintos exteriores |

### Fundo

- **Prédios de habitação** de 4 a 12 andares (bairros sociais em Chelas, Marvila, Vale da Amoreira), com varandas, estendais, marquises e antenas. Uma empena cega virada para o campo é o sítio natural de um mural: em Lisboa (Calçada de Carriche) a pintura sobe do chão do campo para a escada e para a empena do prédio.
- **Ao pé do rio ou do porto:** a Doca de Santo Amaro fica debaixo da Ponte 25 de Abril, e a Doca do Espanhol junto ao porto. Gruas, armazéns e a ponte dão fundo de cidade com poucos elementos.
- **Outras coisas à volta:** lojas de rua, a fachada de um palácio (Largo Conde de Bonfim), uma piscina municipal (Ameixoeira), uma pista de skate (Parque das Nações).

### Luz e hora do dia

| Situação | Notas | Fonte |
|---|---|---|
| Dia | sol forte, sombras duras e curtas dos postes, da rede e das árvores no chão. A FIBA aconselha orientar o campo norte-sul para o sol não se pôr atrás de um cesto | FIBA, guia de recintos exteriores |
| Fim de tarde | luz rasante e quente, sombras compridas da rede em losangos | (observação) |
| Noite | projetores LED nas laterais, apontados às linhas de lance livre e altos para não encandear; pelo menos 100 lux para lazer (50 lux já serve para treino num meio campo) e 1200 lux para televisão. Postes de 8 a 12 m | FIBA; fornecedores de iluminação |
| Noite sem projetores | só os candeeiros da rua: poças de luz amarelada, o meio do campo mais escuro do que as pontas | (observação) |

## 2. O que se vê de uma câmara alta como a nossa

A câmara olha de cima e de lado para o campo e para a lateral do fundo. Na prática:

- **O chão ocupa 70–80 % do ecrã.** O que lá estiver pintado (desgaste, remendos, cor) é o que mais se vê. Hoje é uma mancha escura quase lisa.
- **A rede do fundo é a fronteira.** Com 2,2 m, vê-se como uma faixa fina. Uma rede mais alta (3 a 4 m) enche mais o ecrã e diz «jaula» logo.
- **O que fica atrás da rede do fundo** aparece numa faixa estreita no topo: é aí que tem de estar a vida (carros, muretes, um mural, uma árvore).
- **As sombras projetadas no chão** (postes, rede, árvores, tabelas) são enormes vistas de cima e dão profundidade sem custar pormenor.
- **As tabelas** são os objetos altos que mais se veem nas câmaras dos cantos. Uma tabela perfurada ou riscada diz «rua» melhor do que qualquer prédio.
- **Os prédios ao longe** quase nunca aparecem na câmara do jogo. Só valem nas vistas largas (intervalo, entrada no campo, `npm run campos`).

## 3. Jogos

Estas descrições são observação nossa, de memória, a partir de vídeos e capturas públicas. Convém confirmá-las com vídeos antes de decidir. Os factos (estúdio, data, tipo) têm fonte. Os pormenores visuais não.

- **Street Hoop / Dunk Dream** (Data East, 1994, arcada Neo Geo): basquetebol 3 para 3 em campos de rua de vários países. Câmara lateral alta. Cada campo distingue-se por um fundo pintado com uma ou duas coisas típicas e por **gente encostada à rede**, animada com poucos frames. Lição: o país ou o bairro diz-se com **um só objeto marcante** no fundo.
- **NBA Street** (EA, 2001): campos com nome de sítio (Rucker Park, Venice Beach, um terraço, uma praça). Cada um tem uma assinatura forte: o mar e a areia, a rede alta, o pavimento pintado. Lição: **cada campo tem uma ideia, não dez**.
- **Basketball Classics** (Namo Gamo): pixel art à NES, com uma mistura de campos modernos e antigos. Lição: com pouca resolução, **a cor do chão e das linhas** chega para mudar o sítio.
- **Streetball Fury** (indie, pixel art 2D, câmara lateral): mistura basquetebol de rua e luta, com mapas feitos à mão. Lição: o fundo é um **cenário em camadas** (prédios, rede, gente) e o chão é uma faixa.
- **Hoop Land** (Koality Game): basquetebol em pixel art 2D, com desenhos de campo personalizáveis. Lição: um campo diz-se pelo **desenho pintado no chão**, mesmo sem cenário.
- **Jogos HD-2D e de gestão isométricos** (o mesmo género que já citámos nos pavilhões): pixel art plana sobre um cenário 3D simples. Dão vida à rua com **sombras de árvores no chão**, objetos pequenos repetidos (vasos, carros, sacos, bicicletas), **luz quente de candeeiros** à noite e partículas leves (folhas, pó).

### Truques que se repetem

1. **Um elemento marcante por campo**: uma ponte, um mural, um prédio com estendais. Não muitos.
2. **O chão conta a história**: manchas de desgaste nas zonas de mais uso, remendos, linhas apagadas, um desenho pintado.
3. **Sombras projetadas** de objetos fora do ecrã (árvores, postes), que mostram que há mundo à volta.
4. **Pessoas encostadas à rede**, sentadas em muretes ou de pé ao lado de bicicletas.
5. **Objetos pequenos em pixel art** junto à rede: sacos, garrafas, casacos, uma bola parada.
6. **Variação de hora**: a mesma rua de dia, ao fim de tarde e à noite com candeeiros muda o ambiente sem arte nova.

## 4. Melhorias propostas para o nosso campo de rua

Pela ordem do que mais se nota na câmara do jogo, a dividir pelo risco. Em todas: as contas mudam em `Camera.drawScene` e em `src/ui/gpu/venue-shader.ts` ao mesmo tempo (corre-se `npm run gpu-check`); primeiro mostra-se uma imagem de pré-visualização ao dono, e depois o trabalho passa pela revisão do skill visual-design.

### R1. Chão gasto com padrão (o maior ganho)

- **Desgaste onde se joga:** clarear e dessaturar o alcatrão e a tinta azul num oval debaixo de cada cesto (cerca de 6 × 5 m, centrado no garrafão) e um pouco no círculo central.
- **Linhas apagadas aos bocados:** em troços de 0,5–2 m, a linha perde 30–70 % do contraste, decidido por um ruído fixo por posição (estável, sem tremer com a câmara).
- **Juntas e fissuras:** juntas de betão em quadrícula de 4 m, ou duas a três fissuras compridas e finas em zigue-zague, um píxel mais escuras.
- **Remendos:** 3 a 5 rectângulos de 1–3 m com alcatrão mais escuro e mais liso, fora das linhas principais.
- **Poças secas:** 1 ou 2 manchas mais escuras junto à rede, nos pontos baixos.
- **Risco:** baixo. É só a textura do chão, nos dois caminhos. Há que evitar ruído fino que faça moiré ao longe (o mesmo cuidado que levou à relva lisa).

### R2. Mais pequeno à volta: o campo dentro do bairro

- **Encurtar o alcatrão de fora:** a rede passa para cerca de 2 m das linhas (a zona livre da FIBA), em vez de 3,5–4 m. O vazio escuro à volta é o que mais faz parecer pavilhão.
- **Faixa de cor à volta do campo:** em vez do mesmo alcatrão, um vermelho-tijolo ou verde gasto (o polidesportivo português), que separa o campo da margem.
- **Risco:** médio. Mexe em `WALL_Y`, `WALL_NEAR_X`, `WALL_FAR_X` só no campo aberto, e em quem lá encosta coisas (`STREET_SEATS`, o público da rede, o túnel).

### R3. Rede mais alta, com remates e uma porta

- Subir a rede de 2,2 m para **3,5 m**, com o tubo de cima e postes a cada **3 m** (hoje 4 m).
- Uma **porta** de 1 m na lateral do fundo (já há o vão do túnel: pode passar a ser a porta).
- Um troço **dobrado ou com buraco** e dois ou três objetos presos (casaco, saco), em pixel art.
- **Sombra da malha** no chão, em losangos, com o sol: é o que mais diz «jaula» vista de cima.
- **Risco:** médio. Uma rede mais alta tapa mais o público encostado e o que está atrás; há que confirmar que não corta o aro nas câmaras dos cantos.

### R4. Tabelas de rua

- Tabela de **aço perfurado** (furos de um píxel escuro em grelha) ou de acrílico riscado e amarelado, consoante o clube.
- Poste em **pescoço de cisne**, pintado (verde-escuro, azul ou amarelo), com 1,2–1,8 m de recuo. Hoje o braço tem 3,5 m (`HOOP_SHAPE.arm`): só muda a cor e talvez a curva.
- Aro **sem rede** ou com **rede de corrente** (cinzenta, que tilinta: há som a fazer pelo skill sound-design).
- **Risco:** baixo a médio. A tabela é desenhada nos dois caminhos e nos modelos 3D (`fixtures.ts`).

### R5. A faixa de vida atrás da rede do fundo

É a única parte do «fora» que a câmara do jogo vê. Por ordem:

1. **Muretes e degraus** onde se senta o público (o murete de 0,45 m já proposto nos pavilhões), em vez de todos de pé em fila.
2. **Bicicletas, trotinetes, sacos de desporto e uma bola parada** encostados à rede.
3. **Dois ou três carros estacionados** e um **candeeiro** a cada 15–20 m, na rua por trás.
4. **Árvores com sombra no chão do campo**, a ocupar uma ponta: a sombra vê-se mais do que a árvore.
- **Risco:** baixo. Objetos parados em pixel art; passam pela revisão.

### R6. Um elemento marcante por clube (ou por bairro)

- Uma **empena com mural** atrás do topo, nas cores do clube, com o emblema; ou a pintura do campo a subir pela empena, como em Lisboa.
- Variantes possíveis, uma por clube: **prédios com estendais**; **a ponte e o rio**; **armazéns e gruas do porto**; **pista de skate** ao lado.
- Hoje os prédios estão a 14 m e quase não se veem na câmara. Um elemento grande atrás do topo do cesto vê-se nas câmaras dos cantos.
- **Risco:** médio. Arte nova de cenário e uma escolha por clube; texto e desenhos têm de ser originais.

### R7. Piso pintado à maneira dos campos de arte (opcional, por clube)

- Alguns clubes de rua com o campo **pintado em blocos de cor** (formas geométricas grandes, 2 a 4 cores do clube), com as linhas por cima. Lê-se muito bem vista de cima.
- Já existe a ideia de `STREET_TONES` (alcatrão, verde, tijolo): seria um quarto tom, com padrão.
- **Risco:** médio. Pode competir com os jogadores: a saturação tem de ficar abaixo das camisolas, e o desenho tem de ser nosso.

### R8. Hora do dia e luz

- **Sombras projetadas** dos postes, das tabelas e da rede, com a direção do sol (curtas ao meio-dia, compridas ao fim de tarde).
- **Noite:** dois a quatro projetores em postes de 8–10 m nas laterais, apontados às linhas de lance livre, com o meio do campo um pouco mais escuro; ou só candeeiros de rua, com poças de luz amarela. O `TimeOfDay` já muda o céu.
- **Risco:** médio a alto. Mexe na luz dos dois caminhos e nos bonecos (que não devem ficar escuros de mais).

### Outras ideias (prioridade mais baixa)

- **Balizas de futsal** pequenas nos topos, atrás dos cestos: dizem «polidesportivo português» logo. Pouco risco se ficarem fora do campo.
- **Relva menos lisa de longe:** caminhos de terra batida, um canteiro, um caixote do lixo, um bebedouro. Só para as vistas largas.
- **Folhas e papéis** a passar com o vento, raros, como partículas.
- **Grafitos** pequenos nos muretes e nos postes (letras inventadas, nunca nomes reais).

## Fontes

### Normas e guias

- FIBA, guia de recintos exteriores (pisos, 3x3, escoamento, luz, orientação, postes): <https://www.venueguide.fiba.basketball/outdoor-courts-and-facilities>
- Basketball England, guia de equipamento exterior (não abriu: devolveu 403; fica para confirmar): <https://www.basketballengland.co.uk/media/5x1cgc25/basketball-equipment-guidance-outdoor.pdf>
- Guia de dimensões desportivas da Austrália Ocidental, basquetebol: <https://cdn.dlgsc.wa.gov.au/sport-and-recreation/sports-dimensions-guide/basketball>
- Iluminação de campos de basquetebol (fornecedor; níveis de lux e altura dos postes): <https://en.reformsports.com/how-should-basketball-court-lighting-be-designed/>

### Pisos, fissuras e repintura

- Caderno de encargos de repintura de campos (crack repair, camada negra de enchimento): <https://www.bidnetdirect.com/public/supplier/solicitations/statewide/443548132114/abstract>
- Repintura de campos de ténis em Fowler Park (reparação de fissuras e poças): <https://www.bidnetdirect.com/georgia/solicitations/open-bids/statewide/Resurface-of-Tennis-Courts-at-Central-Park-Fowler-Park/22421619428>
- Mapei, «Art meets asphalt»: um campo de Brooklyn fissurado, preparado e pintado: <https://www.mapei.com/us/en-us/realta-mapei/article-detail/art-meets-asphalt>
- Legendary Sports Construction, repintura de um campo de basquetebol: <https://legendarysportsconstruction.com/resurfacing-a-basketball-court/>

### Tabelas e postes

- Gared, tabela de aço perfurado de 42 × 72 polegadas: <https://www.sportsfacilitiesgroup.com/store/42-x-72-perforated-steel-rectangular-backboard-with-target-and-border-gared-basketball>
- City Hoops, ficha do poste em pescoço de cisne (recuo de 1800 mm): <https://cdn.shopify.com/s/files/1/1713/4277/files/City_Hoops_-_Gooseneck_-_Product_Sheet.pdf>
- Jaypro, sistema em pescoço de cisne com tabela de aço perfurado: <https://www.schooloutlet.com/products/jaypro-basketball-system-gooseneck-pole-6-ft-offset-perforated-steel-backboard-rectangular-outdoor-656-perf-xx>

### Campos em Portugal

- Time Out Lisboa, catorze campos de Lisboa e arredores pintados por artistas (Doca de Santo Amaro, Chelas, Marvila, Carriche…): <https://www.timeout.pt/lisboa/pt/coisas-para-fazer/estes-campos-de-basquetebol-em-lisboa-sao-autenticas-obras-de-arte>
- Time Out Lisboa, o campo Chicago em Chelas: <https://www.timeout.pt/lisboa/pt/desporto/campo-basquetebol-chicago>
- Time Out Lisboa, o polidesportivo do Campo Mártires da Pátria: <https://www.timeout.pt/lisboa/pt/desporto/polidesportivo-do-campo-martires-da-patria>
- Time Out Lisboa, o mural de Kobe Bryant no campo e na empena de um prédio de 12 andares: <https://www.timeout.pt/lisboa/pt/coisas-para-fazer/lisboa-eterniza-kobe-bryant-em-campo-de-basket-e-predio-de-12-andares>
- Time Out Lisboa, o campo do Bairro das Faceiras (programa 3x3 BASKETART): <https://www.timeout.pt/lisboa/pt/desporto/campo-de-basquetebol-do-bairro-das-faceiras>
- Time Out Lisboa, o polidesportivo de Cacilhas: <https://www.timeout.pt/lisboa/pt/noticias/colectivo-crack-kids-da-cor-a-campo-de-basquetebol-em-cacilhas-090822>
- Junta de Freguesia de Alvalade, ficha do polidesportivo Teixeira de Pascoais (piso sintético, balizas, vedação metálica, sem bebedouro): <https://documentos.jf-alvalade.pt/jfalvalade-docs/uploads/document/file/11574/14_polidesport__teixeira_de_pascoais.pdf>
- Barlavento, requalificação do polidesportivo da Praia do Carvoeiro (piso sintético e redes de proteção): <https://barlavento.pt/desporto/lagoa-requalifica-polidesportivo-da-praia-do-carvoeiro>

### Campos noutros sítios

- Dezeen, o campo Pigalle Duperré em Paris, encaixado entre prédios e pintado em blocos de cor (2015): <https://www.dezeen.com/2015/08/12/pigalle-duperre-ill-studio-paris-basketball-court-multicoloured-installation/>
- Colossal, a versão de 2017 do mesmo campo, em gradientes: <https://www.thisiscolossal.com/2017/06/a-technicolor-basketball-court-emerges-in-paris/>
- Colossal, Project Backboard: campos de rua dos EUA transformados em grandes pinturas: <https://www.thisiscolossal.com/2017/10/basketball-courts-transformed-into-large-scale-artworks-by-project-backboard/>
- Bloomberg, Project Backboard e o desgaste rápido dos campos pintados: <https://www.bloomberg.com/news/articles/2018-02-07/project-backboard-turns-urban-basketball-courts-into-public-art>
- Wikipedia, West Fourth Street Courts («The Cage»), o campo pequeno com rede de cerca de 6 m: <https://en.wikipedia.org/wiki/West_Fourth_Street_Courts>
- Ajuntament de Barcelona, boletim de Ciutat Vella (tabelas, ping-pong e calistenia nas praças do Raval): <https://bcnroc.ajuntament.barcelona.cat/jspui/bitstream/11703/141521/3/Butlleti-de-districte-Ciutat-Vella_2025-07-04__2.pdf>
- Beteve, renovação das tabelas de streetball em Sants, Barcelona: <https://beteve.cat/general/streetball-barcelona-sants-renovacio-cistelles/>

### Jogos (dados factuais)

- *Street Hoop* / *Dunk Dream* (Data East, 1994): <https://www.giantbomb.com/games/3030-30106/> e a crítica da Nintendo Life: <https://www.nintendolife.com/reviews/neogeo/street_hoop>
- *NBA Street* (EA, 2001), série: <https://www.Wikipedia.org/wiki/NBA_Street_(series)>
- *Basketball Classics* (Namo Gamo): <https://www.creativebloq.com/entertainment/gaming/basketball-classics-switch-review-it-feels-like-an-nes-throwback-in-a-good-way>
- *Streetball Fury* (indie, pixel art): <https://store.steampowered.com/app/1813980>
- *Hoop Land* (Koality Game): <https://store.steampowered.com/app/2453660/_/>
- Pavilhões e bancadas (pesquisa anterior, com o Calciobit e o HD-2D): [../pavilhoes/README.md](../pavilhoes/README.md)
