# Revisão R5: progressão e ciclo de longo prazo

Âmbito: `src/sim/league.ts`, `cup.ts`, `playoff.ts`, `training.ts`, `teamgen.ts`, `src/ui/club.ts`, `club-screens.ts`, `season-screens.ts`, `staff.ts`, `trophies.ts`, `setup.ts`, `menus.ts` e `main.ts` (guardar e carregar). Capturas vistas: `fim-epoca.png`, `trofeus.png`, `renovacoes.png`. Fiz só leitura, mais um script de economia no scratchpad (`econ.ts`, que corre `newClub` em cada divisão).

## 1. O ciclo, por escala de tempo

| Escala | O que o jogador faz | Avaliação |
|---|---|---|
| **5 min** | Ver parte de um jogo (≈8 min a ×1, `docs/02` §Fase 3), apanhar cartas (`training.ts:199-227`) e treinar 1 a 3 jogadores com cartas (`club.ts:688`) | Bom e fiel ao original. O gancho imediato são as cartas e os combos por descobrir (33 combos, `training.ts:52-90`) |
| **1 época** | 31 semanas (`league.ts:39`): 18 jornadas, Federação, Continental e Mundial (`cup.ts:164-168`), playoffs (`playoff.ts:248-251`) e renovações no fim (`club.ts:889`, `menus.ts:441`) | A estrutura é rica, mas longa. Na Pro Liga 1 podem ser até ≈40 jogos oficiais, ou seja, mais de 5 h a ×1 |
| **10 épocas** | Subir 4 divisões (época 5-6) e procurar o triplete (época 7-11 com o treinador automático, `docs/02` §7E) | Tem um objetivo claro até ao triplete. **Depois disso não há nada** |

## 2. Achados

### 2.1 Bugs e incoerências

1. **A vitrina sobrepõe troféus.** `trophyList` devolve 12 troféus, mas `drawShelf` só tem 2 prateleiras de 5 (`trophies.ts:68`, `n % 5`). Os troféus 10 e 11 (Mundial e Triplete) desenham-se por cima dos troféus 5 e 6 (Subida e Treinador do Ano). Justamente os dois maiores troféus do jogo nunca aparecem bem. Na captura `trofeus.png` só se veem 10 silhuetas. **Custo: XS.**
2. **«Melhor Marcador» é dado de graça.** Basta acabar uma época, porque há sempre um `topScorer` (`trophies.ts:32`, prateleira na linha 42 do mesmo ficheiro). Proposta: pedir, por exemplo, o melhor marcador **da divisão** ou mais de 500 pontos.
3. **O menu do Escritório anuncia «Confiança e objetivos»** (`menus.ts:867`), mas não existe nenhum objetivo. O presidente diz frases genéricas, que dependem só da confiança (`staff.ts:60-65`).
4. **O dinheiro não passa de época para época.** No fim da época, `money` volta a ser o orçamento mais os prémios (`club.ts:898`), e o que sobrou perde-se. Uma venda só serve para essa época (`club.ts:617-622`).

### 2.2 Economia sem tensão nas divisões de cima

Valores de `econ.ts`, com a semente 12345:

| Divisão | Orçamento | Salários iniciais | Sobra | Contratação de outro clube (salário + valor) |
|---|---|---|---|---|
| Iniciados | 600 | 516 | 84 | ≈140 |
| Avançada | 900 | 648 | 252 | ≈160 |
| Pro 2 | 1400 | 780 | 620 | ≈210 |
| Pro 1 | 2200 | 912 | **1288** | ≈240 |

- Na Pro Liga 1 sobra dinheiro para ≈5 estrelas por época. O limite real é o plantel máximo de 15 (`balance.ts:480`), não o dinheiro.
- O dinheiro só serve para jogadores. Não há instalações, staff com efeito, compra de cartas nem bilheteira. Os orçamentos estão em `balance.ts:474`.
- O staff (`staff.ts`) é só cara e frase: não tem nenhuma mecânica.
- A taxa de aceitação é fixa, 70% (`balance.ts:490`, `club.ts:638`), e os jogadores não pensam em dinheiro nem em prestígio.

### 2.3 Jogadores: entradas, saídas e envelhecimento

- O envelhecimento faz-se pelo Potencial (`club.ts:852-858`): perde-se 3 + 1 por época no clube + 0,05 por jogo. Um jogador com 80 de Potencial dura ≈9-10 épocas, e quem chega a 0 sai (`club.ts:859-861`). É fiel ao original e está bem feito, com despedida e retrato (`main.ts:599-608`).
- **As despedidas não ficam na memória do clube.** `farewells` fica guardado no `history` (`club.ts:883`), mas só se mostra uma vez (`main.ts:591`). Não há lendas, camisolas retiradas nem recordes individuais.
- **Os clubes da IA não envelhecem nem mudam de plantel.** `aiTeam` gera a equipa a partir da semente e do nível (`club.ts:321-337`), e o nível só se aproxima do da divisão (`club.ts:833-838`). Quem compramos continua a jogar no clube de origem (é um atalho documentado). O mundo fica estático, e os rivais não ganham identidade.
- Os contratos duram um ano e decidem-se só com fica ou sai (`club.ts:498-510`). Não há duração, cláusulas nem pedidos de saída por falta de minutos.

### 2.4 Divisões, confiança e despedimento

- Há 4 divisões, sobem 2 e descem 2 (`league.ts:110-125`). As outras divisões ordenam-se pelo nível, com sorte (`league.ts:128`). Funciona.
- O despedimento acontece abaixo de 3% de confiança (`balance.ts:497`). No original o jogo acaba aí. Aqui o treinador recomeça **sempre na Liga Iniciados**, com os troféus da carreira (`main.ts:519`, `menus.ts:862`). Não há convites de outros clubes nem modo difícil.
- Não há nível de dificuldade nenhum: `createScreen` só tem nome, emblema e equipamento (`menus.ts:467-484`).
- O plano já regista despedimentos na época 2 em ≈7% das carreiras (`docs/02` §Fase 3) e continua sem proteção.

### 2.5 Troféus e histórico

- Há 12 troféus (`trophies.ts`) e todos ficam com o treinador (`club.ts:667`). Falta um registo de recordes: maior vitória, sequência de vitórias, mais pontos num jogo, melhor época de um jogador.
- O Historial é uma tabela com época, divisão, lugar, V-D e desfecho (`menus.ts:851-862`). Não mostra taças, melhor marcador nem quem saiu.

### 2.6 Guardar e carregar

- Há uma só gravação, em `localStorage` (`main.ts:51`, `169-189`), com migrações da v1 à v13 (`club.ts:1208-1250`). É sólido.
- Exportar e importar em JSON na Torre (`main.ts:344-385`) é bom, e no telemóvel usa a folha de partilha.
- Riscos:
  - «Criar clube» no título apaga o clube atual depois de confirmar, sem cópia automática.
  - Não há várias gravações.
  - O Safari em iOS pode limpar o `localStorage` ao fim de 7 dias sem uso, se o jogo não estiver instalado como app.

### 2.7 Rejogabilidade e fim de jogo

- **Não há fim de jogo.** Depois do triplete não há cerimónia, créditos nem «nova carreira+».
- O mundo é fixo: os nomes dos clubes estão em `setup.ts:199-207` e o pool de jogadores em `teamgen.ts:98`. Só a repartição muda entre carreiras.
- O Aeroporto está vazio (`season-screens.ts:99`), e os rivais especiais estão desligados (`club.ts:1031`).
- Pontos onde o jogo fica repetitivo:
  - (a) Iniciados e Avançada: as épocas 1 a 4 só dão a Federação como objetivo extra.
  - (b) Pro Liga 1 depois do triplete: o clube acaba sempre em 1.º a partir da época 7.
  - (c) As renovações todos os anos sem nenhuma decisão real: o `autoRenew` fica com toda a gente.

## 3. Propostas

Custo: XS < 1 dia, S 1-3 dias, M ≈1 semana, L várias semanas. A prioridade P1 é a primeira a fazer.

| # | Proposta | O que resolve | Custo | Prioridade | Notas |
|---|---|---|---|---|---|
| 1 | Corrigir a vitrina: 3 prateleiras ou 6 por prateleira (`trophies.ts:68`) | Bug visível | XS | **P1** | — |
| 2 | **Objetivos da direção por época** («ficar no top 4», «chegar aos quartos da Taça»), com bónus ou penalização de confiança e de orçamento | Época sem objetivo nas divisões de baixo; o menu promete objetivos | S | **P1** | Fica em `endSeason`, guardado no save (v14) |
| 3 | **Dinheiro a passar de época** (parte da sobra) e uma saída para ele: **instalações** com níveis (ginásio: mais 1 jogador treinado por semana ou menos cansaço; departamento médico: lesões mais curtas; olheiros: o mercado mostra o Potencial; pavilhão: mais orçamento) | Economia sem tensão no topo; o staff sem efeito | M | **P1** | Os números ficam em `balance.ts`. Liga ao pavilhão que já cresce na cidade |
| 4 | **Livro de recordes e Galeria de Lendas** a partir de `farewells` e `stats`: melhor marcador de sempre, jogos, títulos e camisola retirada | O clube não tem memória; as despedidas ficam só num ecrã | S | **P1** | Os dados já existem em `history[].farewells` |
| 5 | Prémios individuais no fim da época: MVP da liga, Revelação, Melhor Defesa, calculados com as stats que já existem (`club.ts:381` estima as dos outros clubes) | Dá ao jogador um momento por cada atleta, além do coletivo | S | P2 | Corrige também o troféu «Melhor Marcador» |
| 6 | Proteção na primeira época (a confiança não desce dos 10% até à jornada 9) e um **nível de dificuldade** ao criar o clube: orçamento, confiança inicial e nível dos rivais | Despedimentos na época 2; rejogabilidade | S | P2 | — |
| 7 | **Convites ao ser despedido ou ao fim de N épocas:** propostas de 2-3 clubes de divisões diferentes, com a carreira a continuar | Recomeçar sempre do zero; a carreira do treinador como meta | M | P2 | `newClub` já aceita a divisão e a carreira (`club.ts:227`) |
| 8 | **Rival:** o clube que mais vezes nos ganhou, ou o vizinho fixo, com dérbi marcado no calendário, faixa na cidade, mais confiança e mais cartas | Mundo estático; jornadas iguais | S | P2 | — |
| 9 | **Desafios e cenários** com semente fixa: «subir com 600 mil», «triplete em 6 épocas», «salvar um clube da Pro 1 em último» | Fim de jogo; rejogabilidade curta | M | P2 | O determinismo torna-os justos e partilháveis |
| 10 | **Partilha do Match ID:** um código com a semente, as equipas e os `commands` que reabre o jogo e a repetição | Viralidade e um gancho de rede barato | S-M | P2 | Já existem `replayMatch` e `matchHash` (`main.ts:902`, `1220`). As equipas têm de ir no código, comprimidas |
| 11 | Contratos de 1 a 3 anos e jogadores que pedem para sair com poucos minutos | As renovações são uma decisão vazia | M | P3 | Muda o formato de dados, por isso tem de se anunciar |
| 12 | Clubes da IA com plantéis que evoluem (o pool envelhece, há trocas entre clubes) | O mundo não muda | L | P3 | Pesa no tamanho do save e no equilíbrio |
| 13 | **Assíncrono pelo Aeroporto:** exportar a equipa como código ou ficheiro e jogar um particular contra o clube de um amigo; mais tarde, um ranking num servidor | O Aeroporto vazio; o espírito do NPFC | M (só ficheiro) / L (servidor) | P3 | O formato JSON e a simulação determinista já o permitem |
| 14 | Eventos sazonais: torneio de Natal na semana livre de dezembro (já há luzes, `docs/02` linha 562), All-Star a meio da época e pré-época com digressão | Semanas livres repetitivas | S cada um | P3 | — |
| 15 | Ecrã de «fim» depois do primeiro triplete (créditos e o plantel na vitrina), mais o modo «Lenda»: continuar com objetivos de dinastia (3 tripletes, 10 títulos) | Fim de jogo | S | P2 | — |
| 16 | Várias gravações (3) e cópia automática antes de «Criar clube» | Perder o clube | S | P2 | — |

## 4. Ordem recomendada

1, 2, 4 e 3. Depois 6, 16, 5 e 15. Depois 8, 7, 10 e 9. Por fim, 11 a 14.

Os quatro primeiros dão objetivo à época e memória à carreira sem mexer na simulação: só `src/ui/` e `balance.ts`, mais uma versão do save. Antes de qualquer item P2 ou P3, o plano (`docs/02` §7F) lembra que falta alguém jogar uma época completa.
