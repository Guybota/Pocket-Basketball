# Revisão R4: mecânicas da simulação

Revisão só de leitura, a 7 de novembro de 2026, sobre o ramo atual (`e359347`). Nada foi alterado no repositório.

## Como medi

- `npm run sim -- 400` (o `npm run sim` com 1000 jogos passa dos 10 minutos nesta máquina de 4 núcleos; 33 ms por jogo).
- `npm run watch-match -- 42`, `-- 7` e `-- 1234`.
- Um script meu (fora do repositório, na pasta temporária `exp/tactics.ts`) que joga a equipa espelho de `batch.ts` (`generateTeam(100000+i, 'Base', 55)`) contra si própria, com campo alternado, mudando só uma coisa num dos lados: 500 jogos por linha (300 na medição dos roubos forçados).
- **Ruído:** com 500 jogos o erro-padrão de uma percentagem de vitórias é cerca de 2,2 pontos. Abaixo de ±4,5 pontos de 50% não há efeito demonstrado.

Os valores da Liga Betclic e da FIBA abaixo são **ordens de grandeza de memória** (médias típicas de ligas FIBA europeias de topo), não confirmados numa fonte nesta revisão. Servem para comparar por posse, porque o jogo comprime 40 minutos em 8 com cerca de metade das posses.

## 1. Realismo das estatísticas

Por equipa e por jogo; o jogo tem 33,5 posses por equipa (67,1 no total), uma liga FIBA tem cerca de 72.

| Medida | Sim (400 jogos, nível 55) | Por 100 posses | Liga FIBA típica (aprox.) | Leitura |
|---|---|---|---|---|
| Pontos | 42,0 | 125 | 105 a 112 | Ataque muito eficiente |
| 2 pontos | 59,5% | | 50 a 53% | Alto |
| 3 pontos | 40,5% | | 33 a 36% | Alto |
| Parte de lançamentos de 3 | 37,9% | | 38 a 42% | Bem |
| Lances livres | 69,0%, 4,3 tentativas | 12,8 tentativas | 70 a 75%, ~26 tentativas | Metade dos lances livres |
| Faltas | 3,9 | 11,6 | ~26 | Metade das faltas |
| Bolas perdidas | 3,4 | 10,1 | 14 a 17 | Poucas |
| Ressaltos ofensivos | 29,5% | | 27 a 31% | Bem |
| Desarmes | 1,2 | 3,6 | 3 a 4 | Bem |
| Cestos assistidos | 89% e 93% (sementes 42 e 7) | | 55 a 65% | Quase todos |
| Prolongamentos | 5,5% | | ~5% | Bem |
| Diferença média | 9,2 pontos (22% do resultado) | | ~12 em 80 (15%) | Um pouco larga |

O que daqui resulta:

1. **O ataque é eficiente demais e quase só se decide no lançamento de campo.** 2 e 3 pontos estão 6 a 7 pontos percentuais acima do real, e faltas, lances livres e bolas perdidas estão a metade. O valor esperado de um lançamento é quase igual dos dois lados (2 pontos: 1,19; 3 pontos: 1,22), o que é realista na proporção, mas as percentagens absolutas que o jogador lê no quadro final parecem de NBA 2K, não de Liga Betclic.
2. **As faltas quase não existem como mecânica.** Com 3,9 faltas por equipa num jogo, o limite de 3 faltas coletivas por período (`balance.ts:276`, `match.ts:1250`) quase nunca se atinge, e com 5 faltas para sair (`balance.ts:277`) ninguém é excluído: no jogo 42 o máximo foi 2 faltas por jogador. Desaparecem os problemas de faltas, o bónus e as faltas no fim do jogo, que são as decisões de banco mais típicas do basquetebol.
3. **As assistências não dizem nada.** Conta como assistência qualquer passe nos 3 segundos antes do cesto (`match.ts:1066`), numa posse que dura 8,2 segundos. Quase todos os cestos são assistidos, incluindo ressaltos ofensivos e penetrações.
4. **Segundos por posse: 8,2**, contra o objetivo de "cerca de 7" do `simulate.ts`. As posses estão no intervalo (67,1 entre 60 e 70), por isso é o objetivo de texto que está desatualizado, ou a posse ficou mais lenta com as reposições e as trocas.

**Proposta de afinação** (tudo em `balance.ts`; precisa de `npm run sim` e dos limites de `sim-balance.test.ts:50-61`):

- `threeChance` 0,54 → cerca de 0,49 (3 pontos para 35 a 36%).
- `openLayupChance` 0,92 → cerca de 0,85 e `rimChance` 0,82 → cerca de 0,76 (2 pontos para 52 a 54%).
- Faltas para o dobro: `rimFoulChance` 0,34 → cerca de 0,5, `reachFoulChance` 0,012 → cerca de 0,025 e `jumperFoulChance` 0,09 → 0,12. Mantém-se `teamFoulLimit` 3, que passa a ser atingido.
- Bolas perdidas para 14 a 15 por 100 posses: `interceptBase` e `badPassBase` mais altos.
- Assistência só com o passe nos últimos `catchAndShootSeconds` (1,2 s) ou sem drible depois de receber, e nunca depois de um ressalto ofensivo.

Conta rápida: com 36 posses por equipa, 5 bolas perdidas, 8 lances livres a 72%, 36% de 3 em 38% dos lançamentos e 53% de 2, dá cerca de 40 pontos. O objetivo de 35 a 50 mantém-se, as posses sobem um pouco (cerca de 72 por jogo). O objetivo de 60 a 70 posses teria de subir para 65 a 75. **Os limites dos testes são contrato:** a mudança tem de ser dita na entrega.

Há uma vantagem extra: os lances livres valorizam o jogo interior, que hoje perde (ver secção 3).

## 2. Táticas, trocas e descontos: o impacto real

Equipa igual contra si própria, só um lado muda (500 jogos; o controlo neutro deu 49,8%):

| Mudança no lado A | Vitórias de A | O que muda nas estatísticas de A |
|---|---|---|
| Pressão "Normal" (−1) | **53,2%** (54,3% noutra amostra de 300) | Faltas 4,0 → 2,6 |
| Pressão campo inteiro (+1) | **47,6%** (42,7% noutra amostra) | Faltas 4,0 → 4,9; **bolas perdidas forçadas 3,5 → 3,5** |
| Ataque 3 pontos (+1) | 49,0% | Parte de 3: 39,5% → 53,9% |
| Ataque 2 pontos (−1) | **42,0%** | Parte de 3: 13,3% |
| Ritmo rápido (+1) | **43,6%** | Posses 33,3 → 34,3 |
| Ritmo lento (−1) | 49,4% | Posses 32,1 |
| Zona | 48,0% | Faltas 2,5 |
| Alvos nos 2 melhores rivais | 49,4% | |
| Opções: os 2 melhores | 50,0% | Parte de 3: 44,5% |
| **Sem pedir descontos** | **52,4%** | |
| Rotação manual, sem trocas | **21,0%** | Sofre 44,4 contra 37,1 |

Duelos (A contra B, cada lado com a sua):

| A contra B | Vitórias de A |
|---|---|
| Zona contra ataque de 2 pontos | **62,4%** |
| Zona contra ataque de 3 pontos | **40,4%** |
| Ritmo rápido contra pressão total | 49,8% |
| 3 pontos contra pressão total | 49,8% |
| Pressão total contra ritmo lento | 47,8% |

Conclusões:

1. **Nenhuma tática ganha ao neutro.** Em sete escolhas, cinco são indiferentes (dentro do ruído) e três são armadilhas: ataque de 2 pontos (−8), ritmo rápido (−6) e pressão total (−2 a −7). A única que parece ajudar é a pressão "Normal", que é a mais passiva. Quem mexe nas táticas, na média, perde.
2. **A pressão total não rouba mais bolas.** O efeito da tática só entra nos roubos ao portador (`match.ts:1236`), mas a maior parte das bolas perdidas são interceções (`match.ts:1194`), que ignoram a pressão. A descrição no ecrã ("Rouba mais", `ui/club-screens.ts:12`) promete o que a simulação não dá: fica só o custo (faltas e cansaço, `balance.ts:412-414`).
3. **O único contra legível que existe é zona contra ataque.** A zona ganha 62% ao ataque de 2 pontos e perde 40% contra o de 3. É exatamente o tipo de pedra-papel-tesoura que o NPFC promete. Mas o jogador não vê a tática do adversário (decisão do plano, secção 7E), e a IA escolhe ao acaso, sem reagir no jogo (`ui/club.ts:33` e `:327`; a simulação nunca chama `setTactics` para a IA). Só se descobre o contra a olhar para a parte de 3 pontos no painel e a mudar ao desconto.
4. **Os descontos não servem para nada no resultado.** Sem descontos ganha-se 52,4%. O desconto tira 0,12 de cansaço a **todos os dez em campo**, das duas equipas (`match.ts:683`): o adversário recupera tanto como quem pediu. Não há embalo para quebrar, porque o parcial (`s.run`) só serve para a IA decidir pedir o seu (`match.ts:659`).
5. **E os descontos dão cartas.** Cada desconto pedido tem 40% de dar Quadro Tático e 30% de dar Ver Vídeo (`training.ts:205`). Como não custam nada, o ótimo é pedir os 4 a cada jogo para "colher" cerca de 2,8 cartas (até ao limite de 9). É a única estratégia dominante clara que encontrei, e é contra o espírito do desconto.
6. **As trocas importam, e muito:** sem trocas perde-se 79% dos jogos. O cansaço está a fazer o seu trabalho. Mas a rotação automática já é boa (`match.ts:759-786`), por isso a decisão manual raramente ganha ao automático: é um seguro, não uma arma. Está bem assim para o NPFC.
7. **Alvos e opções são neutros.** Marcar os dois melhores rivais custa +0,7 faltas e não muda o resultado; as opções mudam o estilo (mais 3 pontos) mas não o resultado. Legíveis no comportamento, invisíveis na tabela.
8. **Legibilidade das etiquetas:** "Normal" é o −1 na pressão e o 0 no ritmo, e o valor por omissão da pressão (`NEUTRAL_TACTICS`, `types.ts:91`) é "Meio campo", não "Normal".

## 3. Atributos, comportamentos, movimentos

Do `npm run sim -- 400` (50% seria sem efeito; ruído ±2,5):

- **Atributos, +17 num só:** força 63,0%, resistência 61,8%, velocidade 59,8%, lançamento 59,5%, salto 58,5%, técnica 57,5%, vontade 56,8%. Todos contam e nenhum domina. É um bom resultado. Uma nota acima em tudo dá 92,8%; a melhor equipa ganha 66,5%, um pouco abaixo dos 70% pedidos.
- **Comportamentos com bola, dois titulares:** lançador 59,5%, marcador 56,0%, organizador 54,8% contra penetrador **42,5%** e jogo de costas **46,0%**.
- **Comportamentos sem bola:** à espera do passe 53,8% e cortador 53,5% contra poste **46,3%** e guarda do aro 47,5%.
- **Movimentos, a equipa toda:** step-back e afundanço de força 58,3%, crossover 54,5%, mão rápida 55,3%, **alley-oop 48,8%** (sem efeito).

O padrão é um só: **o jogo de fora ganha, o de dentro perde.** Bate com a tática de 2 pontos a 42%. O jogo interior não traz o que traz no basquetebol real: faltas, lances livres, problemas de faltas no adversário. A afinação da secção 1 corrige as duas coisas de uma vez.

**O combo dominante:** Mão Quente (`training.ts:74`) dá +9 de lançamento por cima das cartas (14 em bruto, o maior ganho num só atributo) **e** torna o jogador lançador, o melhor comportamento com bola. Assim que se descobre, é a escolha óbvia para qualquer extremo ou base. Sugestão: tirar 3 ao ganho do combo, ou dar ao lançador um custo legível (pior a defender, menos ressaltos).

## 4. Treino e progressão

- O ganho por carta é `ganho × (0,6 + 0,8 × potencial) × (1 − cansaço/2) × (1 − atributo/140)` (`training.ts:113` e `:118`). Um jogador médio (potencial 70, atributo 55, cansaço 0,1) aproveita cerca de 0,67 por ponto de carta: com um combo de 3 cartas sobe 6 a 10 pontos numa semana, uma nota (17) em 2 a 3 semanas de combos.
- O que trava é a falta de cartas: até 9 por jogo mais 1 ou 2 no fim (`training.ts:211` e `:223`), para 15 jogadores × 3 lugares. É o ciclo do NPFC e funciona: escolher quem treina é a decisão.
- O plano mede o triplete nas épocas 7 a 11 com o treinador automático (secção 7E), dentro do pedido. A curva parece certa; o risco é a descoberta de combos ficar resolvida por guias, como no original. 33 combos é pouco ao lado dos 131 do NPFC, mas chega para a Fase 5.
- **Os números de cansaço e lesões estão na interface**, não em `balance.ts`: `ui/club.ts:16-29` (`MATCH_FATIGUE`, `INJURY_BASE`, `INJURY_PER_FATIGUE`, etc.) e `:376-377`, `:512-513`. Quebra a regra "os números de equilíbrio ficam todos em `balance.ts`" e põe lógica de carreira com aleatoriedade (`ui/club.ts:735`) fora de `src/sim/`, onde os testes de determinismo não a veem.
- A lesão só depende de ter jogado (`played(index) > 0`), não de quanto: 30 segundos em campo arriscam tanto como 8 minutos.

## 5. Variedade e emergência

Os três jogos vistos têm boa textura: posições ganhas, desarmes seguidos de ressalto ofensivo, roubos, afundanços de força, trocas, descontos da IA depois de parciais. 5,5 movimentos especiais por jogo é um bom ritmo de "momentos". Faltam, por causa das secções 1 e 2:

- **Fins de jogo:** sem faltas intencionais nem gestão do bónus, um jogo apertado acaba como os outros minutos. O lançamento decisivo só tem o efeito de vontade (`balance.ts:187`, `shot.ts:39`).
- **Assistências** como história (quem cria jogo): hoje toda a gente tem.
- **Parciais:** o jogo regista-os mas eles não mudam nada.

## 6. Profundidade contra simplicidade

O NPFC é simples porque tem poucas decisões e cada uma se nota. Aqui há o contrário: muitas decisões (7 táticas, alvos, opções, ordem do banco, trocas, descontos, 11 + 6 comportamentos, 5 movimentos), mas metade não muda o resultado. **Antes de acrescentar mecânicas, vale mais fazer as que já existem contar.** Por ordem de retorno:

1. Desconto só para quem o pede (recupera a sua equipa, não a outra), e sem cartas pelo desconto, ou com uma só por jogo.
2. Pressão a entrar nas interceções e nas bolas perdidas por passe, para que a pressão total seja um risco com recompensa.
3. Afinação da secção 1 (faltas, lances livres, percentagens), que também salva o jogo interior.
4. Um contra por tática, como o que a zona já tem: ritmo rápido contra pressão total, pressão contra equipa de técnica baixa.

## 7. Mecânicas novas, no espírito do NPFC

Todas cabem nas regras de determinismo se o estado ficar em `MatchState` ou no `Player`/`Team` (JSON simples) e a aleatoriedade vier de `rng.ts`. Custo: P pequeno (≤ 1 dia, um ficheiro), M médio (vários ficheiros e testes), G grande.

| Mecânica | O que é | Custo | Risco | Determinismo e formato |
|---|---|---|---|---|
| **Relatório do adjunto** | Ao intervalo e nos descontos, o adjunto diz uma frase: "Eles vivem do triplo" (parte de 3 > 45%), "O nosso 4 está carregado de faltas". Torna legível o contra da zona e a fadiga | P | Quase nenhum; só lê o estado | Só interface; nada muda na simulação |
| **Embalo (parcial)** | Com um parcial de 8+ (`s.run`, já existe), a equipa embalada ganha +2 a 3% no lançamento até sofrer um cesto ou o adversário pedir desconto. Dá ao desconto o seu papel real | P | Bola de neve; limitar o bónus e a duração | Estado em `MatchState`; sem sorteios novos. Muda todos os jogos: rever os limites dos testes |
| **Faltas no fim do jogo** | A perder por 3 a 6 nos últimos 20 s, falta-se de propósito ao pior lançador de lances livres em campo. Cria drama e dá valor a quem tem vontade | P | Prolongar o fim; limitar a 2 ou 3 faltas | Decisão por regra; sorteio pelo gerador do jogo |
| **Jogadas desenhadas** | Cartas táticas ensinam jogadas à equipa (não ao jogador): "Chifres", "Saída da linha de fundo", "Último lançamento". No desconto escolhe-se uma, que corre nas 2 ou 3 posses seguintes, com um bónus pequeno para a opção | M | Mais um ecrã; tem de caber num toque | Lista de jogadas no `Team` (JSON); a escolha vira comando registado, como `setTactics` |
| **Entrosamento (química)** | Cada par de colegas soma minutos juntos; pares entrosados passam melhor (menos interceções) e ajudam mais na defesa. O manual do NPFC diz que "a capacidade de jogar em equipa melhora com os jogos" | M | Castiga o mercado; teto baixo (≤ 3%) | Mapa de pares no `Team`; muda o formato guardado: subir a versão e dizê-lo na entrega |
| **Personalidade** | Um traço por jogador, com humor: "Sangue Frio" (mais no fim do jogo), "Esquentado" (mais faltas e mais embalo), "Líder" (+vontade dos colegas em campo), "Preguiçoso" (rende menos no treino autónomo). Muda raramente, por um combo | M | Mais texto na ficha; equilibrar como os comportamentos | Campo novo no `Player`; muda o formato e os testes de validação |
| **Lesões ligadas aos minutos e às quedas** | O risco cresce com os minutos jogados e com as quedas do jogo (`fallSeconds`, afundanços em cima); mover a regra para `src/sim/` | P a M | Frustração se for frequente; a taxa atual chega | Hoje é aleatória na interface; em `src/sim/` passa a ser coberta pelos testes de proibição |
| **Olheiros** | Pagar para ver o Potencial verdadeiro dos jogadores do mercado (hoje o mercado mostra a nota). Dá uso ao dinheiro, que sobra | P | Pouco | Só carreira; sorteio por `weekSeed` |
| **Juniores** | Um jogador de formação por época, fraco e com Potencial alto | P | **O NPFC não tem formação** (pesquisa 01, secção 8 [M]); afasta-se do original. Só se o dono quiser | O mesmo gerador dos livres (`freeAgentLevelOffset`) |
| **Fadiga entre jogos com calendário apertado** | Já existe (`PLAYOFF_GAME_FATIGUE`, `ui/club.ts:16`). Não acrescentar mais | | | |

**O que eu faria, por esta ordem:** (1) desconto só para quem pede e sem colheita de cartas; (2) pressão nas interceções; (3) afinação da secção 1 com os limites dos testes revistos; (4) relatório do adjunto; (5) embalo e faltas no fim do jogo; e só depois (6) jogadas desenhadas ou personalidade. Entrosamento e juniores mudam o formato dos dados e afastam-se do núcleo; deixava-os para depois de alguém jogar, como o próprio plano diz (secção 7F).
