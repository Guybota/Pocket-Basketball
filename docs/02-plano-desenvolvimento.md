# Plano de desenvolvimento: Pocket Basketball

Baseado em [01-pesquisa-npfc.md](01-pesquisa-npfc.md). As fórmulas e os números aqui são **pontos de partida meus**, a afinar em testes, e não valores do jogo original.

## 1. Regra de ouro: o que copiar e o que não copiar

Copiamos **a estrutura e o ciclo**, que em geral não estão protegidos. **Não** copiamos sprites, música, textos, nomes de cartas ou de combos, logótipos, nem o nome "Pocket Football Club".

Isto não é aconselhamento jurídico. Se fores vender o jogo, fala com um advogado, porque um clone muito próximo também pode gerar queixas por imitar o aspeto geral. Verifica também se o nome "Pocket Basketball" está livre nas lojas onde vais publicar.

## 2. O que muda do futebol para o basquetebol

A maior parte do jogo traduz-se diretamente:

| NPFC | Pocket Basketball | Nota |
|---|---|---|
| Kicking | **Lançamento** | Precisão e alcance |
| Speed | Velocidade | Igual |
| Stamina | Resistência | Igual |
| Technique | Técnica | Drible e passe |
| Toughness | Físico | Contacto, ressalto e recuperação |
| Jumping | Salto | Ressaltos, desarmes de lançamento, afundanços |
| Willpower | Vontade | Lances livres, fora de casa, fins de jogo |
| GK/DF/MF/FW | Base, Escolta, Extremo, Extremo-Poste, Poste | |
| 25 jogadores | **15 jogadores** | Mesma proporção, cerca de 2-3× os titulares |
| Mínimo 15 para ranking | Mínimo 10 | |
| Formação (4-4-2…) | Sistema ofensivo (1-4, 2-3, 3-2) e defensivo (individual, zona 2-3, 1-3-1) | |
| Zona: posição | **Pressão:** zona recuada ↔ campo inteiro | Defesa |
| Zona: comprimento | **Espaçamento:** jogo interior ↔ jogo exterior | Ataque |
| Ataque/defesa | **Ritmo:** meio-campo ↔ transição | |
| Golo repetido no fim | Melhores 3-5 jogadas do jogo | Ver desafio 1 |
| Cartões, fora de jogo | Faltas pessoais (5), bónus de equipa | |

**12 tipos de jogador** (movimento sem bola):

| Tipo NPFC [F] | Tipo basket | Comportamento |
|---|---|---|
| Balanced | Equilibrado | Sem tendência |
| Backup | Sexto Homem | Rende mais vindo do banco |
| Marker | Sombra | Colado ao adversário direto |
| Stopper | Guarda do Aro | Fica perto do cesto |
| Seeker | Ressaltador | Procura ressaltos |
| Dynamo | Dínamo | Corta e ajuda em todo o lado |
| Worker | Operário | Faz bloqueios e defende |
| Maverick | Solista | Cria o próprio lançamento |
| Chancer | Oportunista | Espera solto para lançar |
| Sprinter | Contra-ataque | Corre à frente na transição |
| Explorer | Cortador | Movimentos para o cesto |
| Creator | Organizador | Procura o passe |

## 3. Os quatro desafios que o basquetebol cria

**Desafio 1: há demasiados cestos para cada um ser um momento.** No futebol, 2 ou 3 golos em 8 minutos são eventos raros. Num jogo real de basquetebol há cerca de 180 posses de bola, o que daria menos de 3 segundos por posse. É ilegível.

*Decisão:* **4 períodos de 2 minutos reais, com 60 a 70 posses no total** (cerca de 7 segundos cada) e **resultados de 35 a 50 pontos por equipa**. A festa fica reservada aos momentos raros: afundanços, triplos, reviravoltas, o último lançamento. Um cesto normal só atualiza o marcador.

**Desafio 2: 10 jogadores num campo pequeno amontoam-se.** O futebol tem muito espaço; aqui os sprites sobrepõem-se.

*Decisão:* câmara em meio-campo, ordenação por profundidade, sprites de 24 px com contorno forte e o portador da bola sempre com etiqueta. Ver [o estudo visual](03-estudo-visual.html).

**Desafio 3: a altura importa.** O cesto, os ressaltos e os afundanços vivem no eixo vertical.

*Decisão:* a simulação é 2D + altura da bola. A sombra no chão mostra onde a bola vai estar, como o NPFC já faz com a bola de futebol.

**Desafio 4: o basquetebol tem substituições ilimitadas e faltas.** Geri-las à mão a cada minuto seria cansativo.

*Decisão:* rotações automáticas configuradas nas Opções de Comando. Pedir **desconto de tempo** (2 por parte) é a forma principal de intervir: pausa, muda tática ou jogadores, continua. Também responde à crítica de "impotência" no original.

## 4. Melhorias face ao original

"Idêntico" é o objetivo, mas estas falhas foram criticadas e custa pouco corrigi-las:

1. **Velocidade ×1, ×2, ×4** nos jogos. Sair a meio continua a custar o resto das cartas.
2. **Desconto de tempo**, como acima.
3. **Efeito visível das táticas:** o painel de estatísticas mostra de onde vieram os pontos (interior, triplos, contra-ataque).

Fica de fora: multijogador local, conteúdo pago e tudo o que dependa de hardware (StreetPass).

## 5. Arquitetura

Pontos que condicionam tudo o resto:

- **Simulação separada da apresentação.** Corre a passo fixo de 20 Hz, sem saber nada de sprites. Isto permite simular épocas inteiras sem ecrã para afinar o equilíbrio, e simular os outros jogos da liga.
- **Simulação determinista.** Mesma semente + mesmas equipas = mesmo jogo. Assim, uma gravação são só os dados de entrada e não um vídeo, e o **Match ID e a videoteca saem quase de graça**. Usa um gerador de números aleatórios próprio. `Math.sin`, `Math.random` e funções semelhantes estão proibidos em `src/sim/`, porque o resultado de algumas pode variar entre browsers.
- **Multijogador assíncrono:** cada equipa é um ficheiro JSON com as Opções de Comando. Com isto, um servidor mínimo chega para guardar e servir equipas.
- **Dados em ficheiros** (cartas, combos, nomes, equipas) para afinar sem recompilar.

**Máquina de estados da posse de bola:**

```
Reposição → Transição → Meio-campo → Ação (passe | drible | lançamento)
                ↑                         ↓
                └── Ressalto / Falta / Lance livre / Roubo
```

**Lançamento:** a fórmula está em [shot.ts](../src/sim/shot.ts) e os números em [balance.ts](../src/sim/balance.ts).

```
P(cesto) = base(distância)
         + inclinação × (talento / 20 − 3)
         − penalização × pressão × (1 − serenidade × (Vontade / 20 − 3))
         − penalização × cansaço
         + bónus de Vontade nos últimos 30 segundos e fora de casa
```

O talento é o Lançamento de longe; perto do cesto, é uma mistura de Físico, Salto e Técnica. Os valores internos são de 0 a 100 e a nota é só a sua leitura, como no original, onde o jogador sobe devagar até mudar de letra.

**Crescimento por treino, primeira versão:**

```
ganho = valor_carta × multiplicador_potencial × (1 − fadiga_atual) + bónus_combo
```

## 6. Motor e plataforma

**Decisão: TypeScript com Canvas, sem motor de jogo tradicional, para telemóvel em vertical e depois PC.** Toda a implementação é feita com Claude e Codex, por isso o que conta é o projeto ser todo em texto, com testes rápidos e resultados que um agente consiga verificar sozinho.

| Peça | Escolha |
|---|---|
| Simulação | TypeScript puro em `src/sim/`, sem dependências |
| Jogo em campo | Canvas 2D |
| Menus e fichas | HTML e CSS por cima do Canvas |
| Testes | Vitest; Playwright para capturas de ecrã a partir da Fase 1 |
| Telemóvel e PC | Capacitor; Tauri ou Electron |

**O que se perde:** um editor visual, e uma versão para consolas ficaria muito difícil. O áudio e o desempenho no WebView têm de ser testados em telemóveis reais logo na Fase 1.

**Porquê a vertical:** reproduz diretamente os dois ecrãs do original, com o jogo em cima e o painel tátil em baixo, e permite jogar com uma só mão. A resolução base é **360×640**, escalada por múltiplos inteiros.

**No computador:** quando a janela é mais larga do que alta, o campo fica grande à esquerda e o painel à direita. A arte continua em píxeis grandes, entre 240 e 290 de altura, conforme o ecrã.

As regras de trabalho para os dois agentes estão em [AGENTS.md](../AGENTS.md).

## 7. Fases

Ordem pensada para testar primeiro o maior risco: **ver um jogo tem de ser divertido**. Se não for, nada do resto salva o jogo. As durações são estimativas minhas para uma pessoa a tempo parcial, e têm grande margem de erro.

| Fase | Entrega | Critério para avançar | Estimativa |
|---|---|---|---|
| **0. Simulação sem ecrã** | 5 contra 5 em texto; simula 1000 jogos | Resultados de 35-50 pontos; a equipa melhor ganha cerca de 70% | 3-4 semanas |
| **1. Jogo visível** | Campo, sprites, marcador, ×1/×2/×4 | **3 pessoas veem um jogo inteiro sem pedir para saltar** | 4-6 semanas |
| **2. Ciclo central** | Cartas nos jogos, treino, 3 espaços, 20 cartas, 30 combos, atributos, táticas | Quem vê o jogo nota a diferença entre um jogador treinado e o mesmo por treinar | 6-8 semanas |
| **3. Uma época completa** | Cidade, calendário, liga, 4 divisões com subidas e descidas, plantel, confiança, despedimento, gravar | Alguém joga uma época inteira e quer outra | 6-8 semanas |
| **4. Carreira** | 3 taças, transferências, contratos, envelhecer, 12 tipos | Triplete possível em 8-12 épocas | 8-10 semanas |
| **5. Conteúdo e polimento** | 32 cartas, 130 combos, táticas que se anulam, som, tutorial, repetições, videoteca | Teste com 10 pessoas sem ajuda | 8-12 semanas |
| **6. Online assíncrono** | Enviar equipas, ranking, Match ID, mercado | Rankings estáveis | 4-6 semanas |

**Total: 9 a 13 meses a tempo parcial.** O multijogador está em último porque depende de tudo, mas o formato de equipa e a simulação determinista ficam preparados desde a Fase 0.

### Estado da Fase 0: critérios cumpridos

Resultados de `npm run sim` com 1000 jogos:

| Critério | Objetivo | Resultado |
|---|---|---|
| Pontos por equipa | 35 a 50 | Média de 41,4; de 36,0 na Liga Iniciados a 48,5 na Pro Liga 1 |
| Resultados dentro do intervalo | | 64%, porque a sorte de um jogo curto afasta os restantes |
| Posses por jogo | 60 a 70 | 69,5 |
| Segundos por posse | Cerca de 7 | 7,2 |
| A melhor equipa ganha | Cerca de 70% | 70,8% |
| Efeito de cada atributo | Todos contam, nenhum domina | Entre 56,6% e 61,7% com uma nota acima |

**Ainda não está na simulação:** táticas, os 12 tipos de jogador e as cartas, que pertencem às Fases 2 e 4. O movimento dos jogadores só foi verificado por testes, e será visto pela primeira vez na Fase 1.

### Estado da Fase 1: construída, à espera do teste com pessoas

O jogo corre no browser, com câmara a seguir a bola, velocidades ×1, ×2 e ×4, som sintetizado, e os quatro campos. Funciona em vertical e em horizontal, com o campo ao lado do painel no computador. `npm run browser-check` confirma:

- **Repetições:** o mesmo jogo dá o mesmo resultado em Node e no Edge.
- **Desempenho:** menos de 16 ms por frame com o processador 4× mais lento.

**Falta o critério da fase:** 3 pessoas verem um jogo inteiro sem pedir para saltar. A Fase 2 começou por decisão do dono do projeto, sem este teste, que continua por fazer.

**Ainda por confirmar:** telemóveis reais, Safari e Firefox, e se o som é agradável. Os testes não conseguem ouvir nem sentir o ritmo do jogo.

### Estado da Fase 2: construída, à espera de alguém a ver

O clube fica guardado no browser. Cada semana tem um treino e um jogo: 20 cartas em 4 categorias, 3 espaços por jogador, 30 combos, potencial e cansaço. As cartas ganham-se nas jogadas da equipa, e mesmo a perder se ganha uma. As táticas (pressão, ataque e ritmo) mudam-se antes e durante o jogo.

Medições com um treinador automático simples, 60 clubes de 30 semanas na Liga Avançada:

| Medida | Resultado |
|---|---|
| Contra a mesma equipa sem treino, depois de 5 semanas | Ganha 55,6% (480 jogos) |
| Contra a mesma equipa sem treino, depois de 10 semanas | Ganha 69,0% (480 jogos) |
| Contra a mesma equipa sem treino, depois de 20 semanas | Ganha 83,1% (480 jogos) |
| Cartas ganhas por jogo | Cerca de 8 |
| Combos descobertos ao fim de 29 semanas | Cerca de 18 em 30 |

Estes números já incluem a regra da Fase 3 que torna o treino menos rentável quanto mais alto está o atributo.

**Falta o critério da fase:** alguém ver um jogo e notar a diferença entre o jogador treinado e o mesmo por treinar. Os números acima dizem que o treino pesa no resultado, mas não que se vê.

**Uma simplificação:** abandonar um jogo a meio não custa nada, porque só o fim do jogo é guardado. A semana repete-se com a mesma semente.

### Estado da Fase 3: construída, à espera de alguém a jogar

**O que existe:**

- **Liga:** 40 clubes em 4 divisões de 10. Cada época tem 18 jornadas, em casa e fora, e uma semana livre, com um particular opcional. Os outros jogos da jornada são simulados a sério.
- **Subidas e descidas:** os 2 primeiros sobem e os 2 últimos descem. Toda a gente começa na Liga Iniciados. Esta parte estava planeada para a Fase 4 e veio para aqui por decisão do dono do projeto, porque sem ela o clube ficava forte demais para a liga.
- **Confiança:** começa em 60%. Sobe e desce com os resultados, conta mais contra quem é melhor e metade num particular. Abaixo de 3% há despedimento, e a carreira neste clube acaba.
- **Casa e fora:** contam na simulação, pela Vontade.
- **Plantel:** tocar em dois jogadores troca-os, e os cinco primeiros são os titulares. A ficha mostra a época de cada um.
- **Cidade:** isométrica, no estilo do estudo visual, com quatro quarteirões à volta de uma rotunda e tudo centrado para caber num telemóvel. Os edifícios têm etiquetas tocáveis à frente: Pavilhão, Escritório, Treino, Federação, Torre e Aeroporto. O pavilhão cresce a cada divisão.
- **Clubes antigos:** um clube guardado na Fase 2 entra numa liga nova, com tudo o que tinha treinado.

**Medições com o treinador automático da Fase 2, sem qualquer tática:**

| Medida | Resultado |
|---|---|
| Lugar médio por época | 4,9 na 1.ª, 2,7 na 2.ª, depois entre 1,3 e 2,4 enquanto sobe |
| Chegada à Pro Liga 1 | Época 5 para 6 em 9 clubes, época 6 para os 9 (10 carreiras, um despedido antes) |
| Depois de chegar | Acaba sempre em 1.º a partir da época 7 |
| Despedido, com treino | 2 em 30, ambos na época 2 |
| Despedido, sem treino | 4 em 30 em 3 épocas; 7 em 10 em 10 épocas, medido com a confiança inicial de 50% |
| Sem treino, a subir | Quase nunca sai da última divisão |

**Falta o critério da fase:** alguém jogar uma época inteira e querer outra. Uma época tem 18 jogos, o que dá cerca de 2 horas e meia a velocidade ×1. Só uma pessoa pode dizer se isso cansa.

**Limites conhecidos:**

- A partir da época 7, a Pro Liga 1 deixa de ter desafio. Resolve-se na Fase 4, com as taças, o envelhecimento e as transferências.
- Um treinador razoável ainda pode ser despedido na época 2, em cerca de 7% das carreiras simuladas. Pode ser demasiado duro, e só jogando se percebe.
- A Torre e o Aeroporto só respondem pela secretária: o clube guarda-se sozinho, e o jogo online é da Fase 6.
- Lesões, orçamento e o nome do clube à escolha ficam para mais tarde.

**Linha de 3:** é mais curta do que a da FIBA, com raio de 6,30 m em vez de 6,75 m e cantos a 5,70 m do centro em vez de 6,60 m. Os bonecos são grandes para o campo, e com as medidas reais pareciam estar sempre em cima da linha. Os lugares de ataque ficam pelo menos 50 cm para um dos lados, e só se lança com os pés na linha à pressa, com menos de 2 segundos de posse.

**Ressaltos:** depois de bater no aro, a bola sobe em cerca de 70% das vezes e cai logo nas outras. Os jogadores correm para onde ela vai cair.

### Menus como no original

Os menus aprovados no protótipo são agora os do jogo, em `src/ui/menus.ts`, sempre com a ficha ou a cena em cima e as decisões em baixo.

- **Treino:** treina-se um jogador de cada vez, com a lista das notas, o quadro de cartas e a animação quando sai um combo. Cada jogador treina uma vez por semana, e quem não treinou treina sozinho no fecho da semana.
- **Antes do jogo e intervalo:** o balneário, com plantel, táticas e equipamento. No intervalo, as trocas e as táticas entram como comandos do treinador, por isso o jogo continua a poder ser repetido.
- **Semana livre:** propostas de jogo-treino ou de particular, com escolha do adversário. O jogo-treino são dois períodos num pavilhão sem público. Dá menos cartas e cansa menos, e não conta para a liga, para a confiança nem para o historial.
- **Emblema e equipamentos:** editáveis no Escritório, guardados no clube. O equipamento veste os bonecos, os retratos e as cores da interface.
- **Troféus:** calculados a partir da carreira do treinador, que acompanha o treinador quando muda de clube.

O formato do clube guardado passou para a versão 3. Os clubes das versões 1 e 2 são migrados ao abrir. As cores e as letras de um clube guardado são validadas, porque vão parar ao HTML da página.

### Revisão antes da Fase 4

Feito a 31 de outubro de 2026, depois de uma revisão do jogo inteiro:

- **Criar clube:** escolhe-se o nome, o emblema e as cores antes da primeira semana. O nome curto e as letras do emblema acompanham o nome.
- **Jogo-treino em qualquer semana:** um por semana, antes do jogo oficial ou na semana livre. Não fecha a semana, cansa metade de um jogo e só dá cartas. O particular continua a ser só da semana livre.
- **Federação:** a jornada vê-se qualquer uma, com setas. As propostas de jogo mudam todas as semanas.
- **Computador:** o quadro de cartas usa a largura toda e a ficha do jogador mostra a época dele mesmo com cartas escolhidas.
- **Movimentos especiais:** o nome aparece junto a quem o fez, por baixo quando está junto ao cesto de cima e encostado à margem num canto. A Mão Rápida tem pose própria e o Step-back desliza para trás em vez de mudar de sítio num só passo. `npm run anim-check` desenha todas as poses e uma tira de imagens de cada movimento numa cena à parte, sem correr o jogo.
- **Equilíbrio:** os comportamentos que faziam perder (Cortador, Fugitivo, Poste, Penetrador) ganham agora a jogada que é a sua, com um bónus de finalização; o Fugitivo recebe o passe de saída e o Ressaltador chega melhor ao ressalto. O peso ajuda mais nos ressaltos e nos encontrões e cansa menos; não ajuda na finalização, porque isso subia os pontos na Pro Liga 1 acima dos 50. O crossover prende o defensor mais tempo, o step-back afasta-se mais e o alley-oop tenta-se mais vezes.

Medições com 600 jogos cada, depois da afinação (antes entre parênteses). A equipa de referência, com dois titulares «equilibrados», fica em 49%, por isso é esse o zero:

| Medida | Resultado |
|---|---|
| 15 kg mais pesados | 50% (45%) |
| Cortador / Fugitivo / Ressaltador | 51% / 51% / 52% (46% / 47% / 51%) |
| Poste / Penetrador | 48% / 49%, ao nível da referência (48% / 49%) |
| Crossover / Step-back / Alley-oop | 50% / 59% / 53% (54% os três) |
| A melhor equipa ganha | 71% |
| Pontos por divisão | 36 a 50 |
| Físico, o atributo que mais pesa | 65% |

O Poste e o Penetrador deixaram de prejudicar, mas também não ajudam, e o Crossover oscilou entre 50% e 56% consoante as outras afinações. Com 600 jogos, 3 pontos percentuais são ruído, por isso só vale a pena voltar a afiná-los com mais jogos ou quando a Fase 4 acrescentar os tipos de jogador.

**Ficou por fazer:** testes com pessoas (os critérios das Fases 1 a 3), uma proteção contra o despedimento na época 2, uma forma de guardar o clube fora do browser, e uma velocidade acima de ×4.

## 7A. Decisões durante o jogo

- **Descontos de tempo:** 2 por parte e 1 no prolongamento. Entram logo se a equipa tiver a bola, ou na bola parada seguinte. O relógio para e os jogadores recuperam um pouco de energia. A equipa adversária pede um quando sofre um parcial de 8 pontos ou mais.
- **Substituições:** entram na bola parada seguinte. Uma troca manual desliga a rotação automática da equipa, que se pode voltar a ligar. Quem é excluído por faltas é sempre trocado.
- **Repetições:** as decisões do treinador ficam registadas com o momento em que aconteceram, por isso semente, equipas e comandos repetem o jogo exatamente.
- **Tempo de posse:** ao fim de 11 segundos sem lançamento, a bola passa para o adversário, com buzzer.

## 7B. Corpo e movimentos especiais

**Corpo:** cada jogador tem altura e peso. Com o físico, decidem o tipo de corpo que se vê em campo e no retrato. Também contam no jogo: a altura ajuda nos ressaltos, nos desarmes, na finalização perto do cesto e na pressão sobre quem lança; o peso ajuda no contacto e nos ressaltos, mas faz correr mais devagar e cansar mais depressa.

**Movimentos especiais:** aprendem-se no treino, e os jogadores do clube começam sem nenhum. Os adversários gerados já trazem alguns.

| Movimento | O que faz | Combinação de cartas |
|---|---|---|
| Crossover | Deixa o defensor parado e abre caminho para o cesto | Drible + Sprints + Ler a Defesa |
| Step-back | Recua antes de lançar para ganhar espaço | Lançamento + Drible + Bailarico |
| Alley-oop | Passe alto para um colega afundar, sem desarme possível | Passe Picado + Saltos + Pick & Roll |
| Afundanço de Força | Perto do cesto, não pode ser desarmado | Pesos + Saltos + Sopa da Avó |
| Mão Rápida | Rouba a bola muito mais vezes | Sprints + Ler a Defesa + Sesta |

**Comportamentos em campo:** cada jogador tem um comportamento sem bola e outro com bola. Já existem na simulação e mudam mesmo o posicionamento e as decisões. O manual do original confirma o princípio para o movimento sem bola: há 12 tipos, que mudam com o treino. O comportamento com bola é uma extensão nossa.

| Sem bola | O que faz | Combinação de cartas |
|---|---|---|
| Atirador Parado | Espera aberto na linha de 3 | Lançamento + Ler a Defesa + Sesta |
| Cortador | Corta para o cesto vezes sem conta | Sprints + Passe Picado + Ler a Defesa |
| Poste Baixo | Fica sempre perto do cesto | Pesos + Saltos + Pick & Roll |
| Ressaltador | Corre para o cesto em cada lançamento | Saltos + Sprints + Pesos |
| Contra-ataque | Larga a defesa em lançamentos longos e corre para o outro lado | Sprints + Bailarico + Passe Picado |
| Bloqueador | Faz bloqueios para o colega com a bola | Pick & Roll + Pesos + Ler a Defesa |
| Sombra | Defende colado ao adversário direto | Ler a Defesa + Sprints + Massagem |

| Com bola | O que faz | Combinação de cartas |
|---|---|---|
| Organizador | Procura primeiro o passe | Passe Picado + Ler a Defesa + Pick & Roll |
| Solista | Prefere resolver sozinho | Drible + Lançamento + Sopa da Avó |
| Penetrador | Ataca o cesto em drible | Drible + Sprints + Pesos |
| Lançador | Procura o lançamento de 3 | Lançamento + Lances Livres + Sesta |
| Poste de Costas | Joga perto do cesto, de costas | Pesos + Passe Picado + Saltos |

Regras:

- Uma combinação certa desbloqueia o movimento de forma permanente. Cada jogador sabe no máximo 2.
- Uma combinação de comportamento substitui o comportamento atual, como os tipos do original.
- Só conta um combo por jogador em cada semana: o maior que as cartas formarem.
- Um combo novo só se revela ao treinar. A lista mostra apenas as categorias das cartas de cada um.
- Tudo isto vive em dados, em `src/sim/training.ts`, para acrescentar combinações sem mexer no resto do código.

## 7C. Colisões e encontrões

**Ninguém atravessa ninguém.** Cada jogador ocupa cerca de 40 cm de raio, um pouco mais se for pesado. Quem se sobrepõe é afastado, e cede mais quem tem menos força. A força vem do físico, do peso e da altura, e o cansaço tira-a. Quem está a lançar não se move, e quem quer passar contorna o outro.

**Encontrões:** quando dois adversários chocam de frente, ganha o mais forte, com alguma sorte. Quem perde corre mais devagar por um instante, e numa diferença grande cambaleia e deixa de defender. Num jogo há cerca de 130 toques que só abrandam, e cerca de 8 fortes, que se veem.

**Ganhar posição no ressalto:** os jogadores disputam o sítio onde a bola vai cair, e o mais forte fica mais perto. O relato conta-o, cerca de 34 vezes por jogo.

**Jogo de costas:** perto do cesto, com um defensor colado, quem gosta de jogar de costas ou é claramente mais forte recua na direção do cesto a empurrar. Um defensor mais fraco cede terreno e contesta pior o lançamento; um mais forte aguenta. Acontece cerca de 6 vezes por jogo.

**Efeito medido:** uma nota acima só em físico ganha 66,5%, o valor mais alto dos atributos, que vão de 55,5% a 61,8%. A decisão mais demorada de quem tem a bola passou de 0,85 s para 0,74 s. Ficaram 42,1 pontos por equipa, 68,8 posses e 7,5 segundos por posse.

## 7D. Papéis, reposições e início do jogo

**Ressalto:** nem toda a gente vai. Disputam a bola 2 atacantes e 2 defensores, os mais perto e com esse papel. Os grandes e os Ressaltadores atacam o cesto, cada um no seu lugar. O base e os de Contra-ataque recuam, para evitar o contra-ataque, e os Atiradores Parados ficam onde estão. Os defensores que não disputam seguram o sítio.

**Transição:** sem pressão, a defesa espera o ataque perto do meio-campo. Só a Sombra e as equipas em pressão seguem o adversário até ao outro lado. Quem ganha o ressalto, se for grande, procura o base com um passe.

**Reposições:** depois de um cesto, da linha de fundo; nos outros casos, da lateral mais perto da bola. Repõe o jogador mais perto, fora de campo, exceto o base, que vem sempre receber. Vêm dois receber em cerca de um terço das vezes, e sempre contra uma defesa em pressão. O passe vai para o mais solto, não pode ser intercetado e nunca conta como assistência.

**Início do jogo:** as equipas entram em campo a andar e colocam-se à volta do círculo. O árbitro atira a bola, e salta o que chega mais alto de cada equipa. Quem salta melhor tem vantagem, de 1% por ponto de diferença, até 70% no máximo, para a mesma equipa não ganhar sempre. O vencedor toca a bola para um colega. O relógio só anda depois disto. Nos outros períodos há reposição do meio-campo, com a posse alternada: começa quem perdeu a bola ao alto. O prolongamento volta a ter bola ao alto.

**Árbitro:** atira a bola ao alto, acompanha o jogo por trás da bola e levanta os braços quando apita, com "FALTA" ou "FORA" escrito por cima. Só existe na imagem: não influencia o jogo nem choca com os jogadores.

## 7E. Fase 4: carreira

Desenho decidido a 1 de novembro de 2026, antes de escrever código. O objetivo da fase é dar à carreira um fim à vista, o triplete, e tirar à Pro Liga 1 a falta de desafio.

### Calendário

A época passa de 19 para 29 semanas. As 18 jornadas da liga continuam, e entre elas entram as semanas das taças. Para quem não joga a taça nessa semana, é uma semana livre, com jogos-treino e particulares.

| Semanas | O que há |
|---|---|
| 18 | Jornadas da liga, como hoje |
| 6 | Taça da Federação: pré-eliminatória e 5 eliminatórias |
| 4 | Taça Continental: 4 eliminatórias |
| 1 | Mundial de Clubes: uma final |

### As três taças

- **Taça da Federação.** Todos os 40 clubes. Os 10 da Liga Iniciados e os 6 piores da Liga Avançada jogam uma pré-eliminatória; os 8 vencedores juntam-se aos outros 24 e seguem-se 5 eliminatórias a um jogo. Casa e fora decidido pelo sorteio, e a final em campo neutro. Qualquer clube a pode ganhar desde a primeira época, mas um clube da Liga Iniciados tem de passar 6 rondas.
- **Taça Continental.** 16 clubes: os 4 primeiros da Pro Liga 1 da época anterior e 12 clubes estrangeiros, gerados com nomes próprios e nível ao de cima da Pro Liga 1. 4 eliminatórias a um jogo.
- **Mundial de Clubes.** Uma final entre o campeão continental e um campeão de outro continente, gerado com nível acima de tudo o que há cá.
- **Triplete:** Pro Liga 1, Taça da Federação e Mundial de Clubes na mesma época. O critério da fase é que seja possível em 8 a 12 épocas com um treinador razoável, medido com o treinador automático.

Os outros jogos de cada ronda são simulados a sério, como na liga. Ganhar uma taça dá cartas e dinheiro, e conta para os troféus da carreira.

### Potencial, saídas e contratos

Verificado a 1 de novembro de 2026: o original **não tem idade**. A ficha mostra "anos no clube", o Potencial, o Tipo e o cansaço, e o tempo passa pelo Potencial, que desce de época para época. Um jogador com o Potencial no fim, ou que quase não jogou, sai do clube por vontade própria. Os jogadores novos vêm do mercado. O jogo segue o mesmo desenho, sem idades:

- **Potencial a descer.** No fim de cada época o Potencial de cada jogador desce alguns pontos, mais depressa quanto mais épocas leva no clube e mais jogos jogou. Treinar continua a render conforme o Potencial, por isso um veterano deixa de melhorar e, com o Potencial perto do fim, começa a perder Velocidade, Salto e Resistência.
- **Saídas.** No fim da época, quem tem o Potencial no fim sai do clube, e o balanço da época diz quem foi. A saída por falta de jogos, que guias de fãs atribuem ao Calciobit, não está confirmada no NPFC e fica de fora. Enquanto não houver mercado (passo 6), cada saída é substituída por um jogador livre gerado, fraco e com Potencial alto, para o plantel nunca ficar abaixo de 10.
- **Anos no clube.** Contam-se a partir de agora e aparecem na ficha, como no original.
- **Orçamento.** Cada época o clube recebe um orçamento conforme a divisão, mais os prémios das taças. Cada jogador tem um salário conforme a nota. O que sobra é o que há para contratar.
- **Contratos de um ano.** No fim da época, cada jogador pede renovação, com um salário novo. Decide-se um a um: fica ou sai. Não se pode começar a época com salários acima do orçamento.

### Transferências

- **Mercado.** No Escritório, uma lista de jogadores que se renova todas as semanas: uns livres, outros de outros clubes. Os livres aceitam logo, se houver dinheiro. Aos outros faz-se uma proposta, que demora 1 a 3 semanas e pode ser recusada. O clube de origem recebe outro jogador em troca, para a liga não ficar desequilibrada.
- **Prazo.** Depois da semana 20 não há propostas a jogadores de outros clubes.
- **Plantel.** Entre 10 e 15 jogadores. Vender também é possível, pelo valor do jogador.

### Os 12 tipos

Dos 12 tipos do original, 9 já existem como comportamentos sem bola e com bola. Faltam três, que entram nesta fase, cada um com o seu combo:

| Tipo | O que faz |
|---|---|
| Sexto Homem | Recupera mais depressa no banco e entra sempre fresco |
| Dínamo | Corta para o cesto e ajuda na defesa, com mais roubos |
| Guarda do Aro | Na defesa fica perto do cesto, com mais desarmes |

A ficha do jogador passa a mostrar o tipo, com o nome da tabela da secção 2. Os tipos continuam a mudar com o treino, como hoje.

### O adversário e os alvos

Antes do jogo e ao intervalo vê-se o plantel do adversário com as notas, como no original, mas não as táticas dele, porque também as muda a meio do jogo. Marcam-se até dois adversários: quem os defende cola-se a eles, e os outros ficam um passo mais soltos. Os alvos entram na simulação como tática, por isso ficam registados para a repetição, e esquecem-se no fim da semana.

Táticas que se anulam umas às outras, como ritmo rápido contra pressão alta, ficam para a Fase 5.

### Ordem de trabalho

1. Calendário novo e Taça da Federação, com testes e o treinador automático a medir quantas épocas leva a ganhá-la.
2. Playoffs na Pro Liga 1 e na Pro Liga 2, com quadros desenhados.
3. Taça Continental, Mundial, prémios e troféus.
4. Potencial a descer, saídas e anos no clube, sem idades, como no original.
5. Orçamento, salários e renovações no fim da época.
6. Mercado de transferências.
7. Os três tipos novos e os seus combos.

Cada passo acaba com `npm run check` e `npm run browser-check`, e o formato do clube guardado sobe para a versão 4 no primeiro passo, com migração.

### Estado do passo 1: calendário e Taça da Federação

Feito a 1 de novembro de 2026. A época tem 29 semanas, a Taça da Federação sorteia-se ronda a ronda e os jogos dos outros clubes simulam-se mesmo nas semanas em que não jogamos. A Federação mostra a taça num separador, o balanço da época diz até onde se chegou, e a taça conta para os troféus da carreira. O clube guardado está na versão 4; os da versão 3 entram na taça se ela ainda não tiver começado.

Com o treinador automático, 10 carreiras de 8 épocas:

| Época | Divisão média | Taça ganha | Ronda média alcançada |
|---|---|---|---|
| 1 a 3 | Iniciados a Avançada | 0 em 10 | 0,2 a 1,1 |
| 4 e 5 | Avançada a Pro Liga 2 | 1 em 10 | 2,0 a 2,5 |
| 6 | Pro Liga 1 | 3 em 10 | 3,5 |
| 7 e 8 | Pro Liga 1 | 4 a 5 em 10 | 3,8 a 4,4 |

A primeira taça chega por volta da época 4, e na Pro Liga 1 ganha-se em cerca de metade das épocas. É o ritmo pedido para o triplete em 8 a 12 épocas, que depende ainda das outras duas taças.

**Alvos:** marcar um adversário tira-lhe cerca de 10% dos pontos, medido em 300 jogos, sem mudar quem ganha em mais de 2 ou 3 pontos percentuais, que é o ruído da medição. É uma decisão com efeito visível no jogador marcado, não um botão de ganhar.

### Estado do passo 2: playoffs nas duas ligas profissionais

Feito a 1 de novembro de 2026, por decisão do dono do projeto depois da [pesquisa sobre o basquetebol português](04-pesquisa-basquetebol-portugues.md). Ficou com as medidas da Liga Betclic e da Proliga, com as meias-finais encurtadas:

| Liga | Quem entra | Rondas | Decide |
|---|---|---|---|
| Pro Liga 1 | os 8 primeiros | quartos e meias à melhor de 3, final à melhor de 5 | o campeão |
| Pro Liga 2 | do 2.º ao 5.º | meias e final à melhor de 3 | a segunda subida; o 1.º sobe logo |

- O quadro emparelha 1.º-8.º, 4.º-5.º, 2.º-7.º e 3.º-6.º, e o melhor classificado joga em casa os jogos ímpares.
- Cada ronda é uma semana, a seguir à 29: os jogos da série jogam-se seguidos, com o balneário entre eles, e só o cansaço de cada jogo, sem o descanso da semana. Para quem não se apura, ou é eliminado, o resto joga-se de uma vez e a época fecha-se.
- As descidas continuam a ser as da fase regular. Na Pro Liga 1, "campeão" passa a ser quem ganha a final.
- A Federação tem um separador Playoffs e, tanto para os playoffs como para a Taça, um **quadro desenhado** no ecrã de cima, com o nosso clube a dourado. Na Taça o quadro mostra quartos, meias e final; as rondas anteriores ficam na lista.
- O clube guardado está na versão 5.

Um erro que vale a pena lembrar: o nosso clube tem o número 0, e um `0` é falso em JavaScript. Um "há vencedor?" escrito como `if (winner)` fazia a série nunca acabar quando o vencedor éramos nós. As comparações com um número de clube são sempre `!== null`.

As outras duas taças passam a ser o passo 3.

### Estado do passo 3: Taça Continental e Mundial de Clubes

Feito a 1 de novembro de 2026.

- **Clubes de fora:** 13 clubes gerados, com nomes nossos, a seguir aos 40 da liga: 12 continentais com nível acima da Pro Liga 1, e um campeão de outro continente acima de todos. Os níveis só oscilam de época para época.
- **Taça Continental:** os 4 primeiros da Pro Liga 1 da época anterior (na primeira época, os 4 mais fortes) e os 12 de fora. Oitavos, quartos, meias e final, a um jogo, nas semanas 4, 12, 20 e 26.
- **Mundial de Clubes:** nasce quando há campeão continental: uma final na semana 28 contra o campeão do outro continente.
- **Prémios:** 4, 5 e 6 cartas por ganhar a Federação, a Continental e o Mundial; 2, 2 e 3 por perder a final. Cada taça dá 10% de confiança.
- **Troféus:** Taça Continental, Mundial e Triplete (Pro Liga 1, Taça da Federação e Mundial na mesma época) deixaram de ser exemplos. O balanço da época diz "Triplete!" ou "Dobradinha!".
- **Federação:** o separador Taça escolhe entre Federação, Continental e Mundial, com o quadro desenhado de cada uma.
- O clube guardado está na versão 6; os anteriores recebem os clubes de fora e a Taça Continental ao abrir.

Com o treinador automático, 10 carreiras de 12 épocas (2 despedidos na época 2):

| Época | Divisão | Taça da Federação | Continental | Mundial | Triplete |
|---|---|---|---|---|---|
| 5 | Pro Liga 2 a 1 | 3 em 8 | 0 | 0 | 0 |
| 6 | Pro Liga 1 | 3 em 8 | 1 | 0 | 0 |
| 7 | Pro Liga 1 | 4 em 8 | 4 | 1 | 1 |
| 8 a 9 | Pro Liga 1 | 5 a 6 em 8 | 1 a 3 | 1 | 1 |
| 10 a 12 | Pro Liga 1 | 7 em 8 | 3 a 6 | 2 a 4 | 2 a 4 |

### Estado dos passos 4 a 7: tempo, dinheiro, mercado e os três tipos

Feitos de uma vez a 1 de novembro de 2026, a pedido do dono do projeto.

- **Potencial a descer (4):** no fim da época cada jogador perde 3 pontos de Potencial, mais 1 por época no clube e 0,05 por jogo jogado, com sorte de ±2. Abaixo de 20 de Potencial perde Velocidade, Salto e Resistência, a 30% da distância ao fim. Quem chega a 0 sai, e o balanço da época diz quem saiu e quem chegou: por cada saída entra um livre gerado, 4 níveis abaixo da divisão e com Potencial entre 65 e 90. A ficha mostra "Na equipa X ép.", contado desde a chegada.
- **Orçamento e renovações (5):** o orçamento é 600, 900, 1400 ou 2200 mil conforme a divisão, mais os prémios (200 pela Federação, 400 pela Continental, 600 pelo Mundial, 300 por ganhar os playoffs e 150 por perder a final). O salário é 5 mil mais 1 por ponto de nota, com o Potencial a pesar 30%. Entre o balanço e a época seguinte aparece o ecrã **Renovações**: cada um pede o que vale agora, começa-se com todos os que cabem, dos mais caros para baixo, e só se começa a época dentro do orçamento; quem não fica sai, e abaixo de 10 entram livres. A Direção mostra Orçamento, Salários e Sobra.
- **Mercado (6):** no Escritório. Todas as semanas, 3 livres e até 5 jogadores de clubes da nossa divisão ou da de cima, com nota e salário; um livre entra logo se houver dinheiro, um de outro clube pede o dobro do salário e responde dentro de 1 a 3 semanas, com 70% de aceitar, e o dinheiro fica reservado até à resposta. Depois da semana 20 só há livres. No Plantel, **Vender** (dois toques) dá o valor do jogador, nunca abaixo de 10 no plantel; o máximo são 15, contando as propostas à espera. Um atalho honesto: os plantéis dos outros clubes são gerados a partir da semente, por isso quem nos vem de lá continua a jogar lá; ao mercado não interessa, porque a liga fica equilibrada e o jogador é nosso.
- **Os três tipos (7):** Sexto Homem (recupera 70% mais depressa no banco e entra com 15 pontos mais de cansaço admitido), Dínamo (corta como o cortador, mais devagar, e rouba e interceta 60% mais) e Guarda do Aro (larga o seu homem quando ele está para lá da linha dos 3 pontos, a 7,5 m, e desarma o dobro). Entram nas listas de posições do gerador e têm combos únicos: Faísca do Banco, Pilha Elétrica e Guarda do Aro, 33 combos ao todo. Em 100 jogos com os cinco titulares do tipo, contra equipas equilibradas: roubos 217 → 269 com dínamos, desarmes 93 → 169 com guardas do aro, cansaço dos cinco 279 → 215 com sextos homens. Com dois titulares o efeito do dínamo perde-se no ruído: os roubos são sobretudo interceções, e o bónus foi posto também aí. A primeira versão, com 5 pontos de Potencial por época e livres 8 níveis abaixo, deixava o treinador automático sem triplete em 12 épocas e despedia metade; os números acima são os suavizados.
- O clube guardado está na versão 8.

Com o treinador automático, que não usa o mercado, 6 carreiras de 12 épocas (1 despedido na época 10):

| Época | Divisão | Nível | Taça da Federação | Continental | Mundial | Triplete |
|---|---|---|---|---|---|---|
| 6 | Pro Liga 1 | 63 | 3 em 6 | 0 | 0 | 0 |
| 7 | Pro Liga 1 e 2 | 57 | 2 em 6 | 0 | 0 | 0 |
| 8 a 10 | Pro Liga 1 | 65 a 78 | 0 a 1 em 6 | 0 | 0 | 0 |
| 11 | Pro Liga 1 | 84 | 3 em 5 | 2 | 2 | 2 |
| 12 | Pro Liga 1 | 89 | 3 em 5 | 1 | 1 | 1 |

O envelhecimento faz o que devia: a primeira vaga de saídas chega na época 7 e atrasa o triplete da época 7 para a 11, ainda dentro das 8 a 12 pedidas, mas no fim do intervalo. Um treinador que use o mercado chega antes.

O primeiro triplete chega na época 7, e nas épocas 10 a 12 acontece em cerca de metade das carreiras. **O critério da Fase 4, triplete possível em 8 a 12 épocas, está cumprido.** O que ainda não bate certo é a equipa continuar a subir de nível sem parar, até 93 na época 12: é o que a idade, no passo 4, vai travar.

## 7F. Notas para a Fase 5

- **Tutorial curto.** Por decisão do dono do projeto, a 1 de novembro de 2026, o tutorial é só o primeiro jogo e o primeiro treino, não a época inteira: o que chega para perceber o ciclo ver o jogo, ganhar cartas, treinar.
- **Táticas que se anulam** vêm da Fase 4, onde ficaram adiadas.
- Antes de empilhar conteúdo, falta alguém jogar: os critérios das Fases 1 a 4 só pessoas os respondem.

### Estado do polimento de charme

Feito a 1 de novembro de 2026, a partir da [análise visual](05-analise-visual-charme.md), tudo fora da simulação:

- **Pessoas com cara:** a secretária (cidade), o adjunto (balneário, intervalo e fim do jogo) e o presidente (direção, renovações, balanço da época, despedimento), com retratos fixos e quatro expressões; a cara pode contradizer a frase, como no original ("Não foi tão mau como pareceu", de luto).
- **A bancada e o banco reagem:** balões de fala no público nos cestos de 3, afundanços, faltas, trocas, descontos e no fim; três poses novas (punhos no ar, mãos na cabeça, cabisbaixo) para quem marca um cesto decisivo, quem falha um lance livre, quem faz falta ou leva um afundanço, e para quem perde; o treinador no banco festeja e protesta.
- **O jogo como espetáculo:** apresentação dos cinco de cada lado antes da bola ao alto (saltável, 3,5 s); uns segundos de festa ou cabeças baixas no fim, com "Vitória!" ou "Derrota..."; **Rever o lance**, que volta a correr o jogo até três segundos antes do cesto decisivo e mostra-o em câmara lenta, graças à simulação determinista.
- **A cidade viva:** seis pessoas a andar e pombos na rotunda; a luz muda com o mês (manhã, tarde dourada, anoitecer, noite com janelas acesas) e há chuva e neve em certas semanas; o emblema e as cores do clube no pavilhão e nas bandeiras da rotunda, o cartaz do próximo jogo, faixas de festa nas duas primeiras semanas depois de um título. As etiquetas são placas pequenas e **toca-se nos edifícios**.
- **Momentos:** a despedida de quem chega ao fim do Potencial, com retrato triste, anos, jogos e pontos; o jogador a fazer o treino de cada carta antes de as cartas se juntarem no combo; confetti no balanço de uma época com título ou taça.
- **Adversários de jogo-treino com carácter:** Universidade do Cais (fracos, potencial 95), Veteranos Unidos (fortes, sem resistência) e Os Sósias (a nossa equipa).
- **Música sintetizada por estado:** cidade, pavilhão, vitória, derrota e despedida, em loops curtos; o botão Som cala tudo.
- **Transições:** cortina entre ecrãs, o resultado a contar, as cartas a virar ao entrar, a nota a saltar quando sobe.
- **Cada pavilhão com a sua cara:** o clube da casa pinta o garrafão, o círculo e a orla do campo, e metade da bancada veste a cor dele. A cor de cada clube da liga vem da semente (`clubColor`); a nossa vem do equipamento. Um jogo fora deixa de parecer um jogo em casa.
- **O troféu levantado:** no balanço de uma época com título ou taça, os cinco iniciais festejam e o do meio ergue a taça, com o confetti por cima.
- **Ecrã de título:** o jogo abre sempre no título, com "Continuar" e "Criar clube". Ao fim de 8 segundos sem tocar, corre um jogo de demonstração entre dois clubes da divisão de cima, como uma máquina de arcada.
- **Roupa de rua:** o presidente de fato e gravata, a secretária de blusa com colar. Só o adjunto fica de fato de treino.
- **Paragens com vida (2 de novembro):** nos descontos e no fim de cada período as equipas juntam-se à frente do seu banco, e voltam a andar para a reposição; ao intervalo saem para o balneário com a imagem a escurecer, e a segunda parte clareia com elas já em campo. Quem repõe fica bem atrás da linha e assenta os pés antes de passar; quem afunda corre com a bola até ao aro; quem ganha o ressalto vai buscar a bola ao chão em vez de ela lhe aparecer nas mãos. O cansaço sobe a metade da velocidade e o limite de tempo seguido em campo passou de 60 para 200 segundos: um titular joga um período inteiro, sai a meio do seguinte e volta descansado.
- **Mais perto do original (2 de novembro):** bancadas inclinadas com gente grande, muro baixo e bandeiras do clube, e espaço à volta do campo; a câmara inclina-se quando a bola desce para a linha de baixo. Prognóstico antes do jogo (notas e casa). Ecrã de trocas com prancheta: os cinco como bonecos no seu lugar, com o nome na cor da energia, e a tabela de pontos, ressaltos, assistências, faltas e minutos; a prancheta serve também a ficha do adversário, onde se marcam os alvos. **Sem posições fixas** (formato 9): o lugar na lista é o papel em campo, e cabe ao treinador escolher pelas notas. Altura e peso em três estrelas. **Condição física** (verde, amarelo, vermelho) separada da energia do jogo: a energia inicial vem da condição e da resistência, a resistência faz recuperar mais de semana para semana, e quem joga cansado arrisca-se a uma **lesão** de 1 a 4 semanas, com a cruz na ficha e fora da equipa e do treino. O separador das cartas deixou de piscar e nada se seleciona no browser.
- **Trocas por toque e bancada viva (2 de novembro):** nas trocas toca-se em dois jogadores quaisquer: campo com banco substitui na bola parada seguinte, campo com campo troca de lugar, banco com banco troca a ordem de entrada (comando `reorder`, para a repetição); setas verde e vermelha e um losango marcam o que está pendente, e tocar em quem está marcado desmarca; a lista mostra as sete notas e a altura. Vinte e quatro adeptos desenhados na primeira fila da bancada, com a cor da casa, que acenam, festejam os cestos da casa e baixam a cabeça com os da visita; os balões saem deles. O treinador veste fato de treino com fecho, mãos à vista e calças, anda à frente do seu banco (os bancos ficaram mais longe da linha) e para a pensar com a mão no queixo, a apontar, ou a dar instruções no desconto. O público é todo feito de bonecos, como no original: até cinco filas de canto a canto, sentados, de pé a festejar os cestos da casa e de mãos na cabeça com os da visita, com bandeiras; a textura da bancada ficou só com as cadeiras. Um túnel no centro da bancada lateral leva aos balneários, por onde as equipas saem ao intervalo (a mesa e o banco visitante passaram para a direita dele). Durante o jogo, a aba **Liga** mostra os outros jogos da jornada no mesmo ponto do relógio (simulados ao começar o nosso, com as sementes com que a semana os fecha) e a classificação ao vivo; a aba Stats passou a ter os números de cada jogador. O quadrado no peito das camisolas desapareceu.
- **Emblema com mais variedade (2 de novembro):** oito formas (escudo, escudo redondo, círculo, oval, losango, hexágono, placa, galhardete), onze fundos (liso, riscas, aros, metades, quartos, faixa, chevron, raios, xadrez, anel, pintas), vinte símbolos (bola, cesto, estrela, raio, coroa, âncora, torre, pinheiro, onda, sol, lua, serra, chama, asa, tridente, cruz, pedra, pata, foguetão, coração) e a cor do contorno (tinta, claro, dourado; `border` é opcional no formato, por isso os clubes guardados continuam iguais). O símbolo e as letras ficaram centrados. As listas vivem em `src/ui/art/kit.ts` e servem o editor e os mockups de `docs/mockups/editor-v2.html`.
- **Editores como no original (2 de novembro):** o emblema vê-se numa bandeira a ondear sobre as colinas, com a grelha de desenhos por páginas (forma e fundo juntos), os símbolos em grelha, três chips de cor com uma só paleta, o contorno e as letras; os equipamentos estão num roupeiro, pendurados em cabides, com os nossos bonecos vestidos por baixo do escolhido e o adversário da semana ao canto, e o editor tem a peça, uma só paleta e os desenhos em miniatura (quatro novos: Finas, Aros, Diagonal, Laterais). O campo de rua tem um portão no centro da grade, dois bancos de dois degraus com alguns espectadores, e prédios e árvores para lá da grade. Nos descontos os jogadores bebem água e o treinador fala-lhes de prancheta na mão. A bola nunca fica no ar: cai nas paragens, a pausa espera por ela, quem repõe vai buscá-la ao chão e leva-a até à linha (também no início de cada período), e nas substituições quem entra vem do banco a andar e quem sai vai sentar-se a andar. O prognóstico passou para a entrada das equipas, com a bancada a festejar de bandeira na mão se a confiança for alta. O público não usa fita na cabeça e só metade veste a camisola do clube. O cartaz do pavilhão diz «ARE VS TOR». Os retratos ganharam óculos, sinal, sobrancelhas grossas e carrapito; a secretária, o adjunto e o presidente têm caras fixas. Segurar o dedo numa imagem mostra o que é, em vez do menu do sistema.
- **Campo de rua ao ar livre (2 de novembro):** deixou de ser quatro paredes com a rede pintada: o chão continua para lá da rede (passeio e relva), a rede é só a malha com postes, varão e o portão, desenhada por cima do que está atrás, e ao longe há um pano de fundo com prédios, árvores e céu; árvores à volta com paralaxe; os bancos dos espectadores passaram para trás de cada cesto, longe dos bancos das equipas, com o degrau alto atrás e pouca gente; e há quem veja o jogo do lado de fora, encostado à rede, que para isso é uma camada desenhada por cima deles.
- **Enchente pela confiança (2 de novembro):** em todos os campos e pavilhões, a quantidade de público cresce com a confiança da direção: a um terço, só os fiéis; perto de cem, casa cheia (`attendance` na vista do jogo, de 0 a 1).
- **Câmara (2 de novembro):** escolhida entre doze enquadramentos fotografados (`docs/mockups/capture-camera.mjs`): baixa e longe, com a lente aberta (altura 11, distância 11,8, lente 290, a olhar para −1,1), para se verem os dois lados do campo. A câmara é afinável pelo gancho `__pocket.tuneCamera`.
- **Dentro das linhas (2 de novembro):** com a bola em jogo ninguém sai das linhas; um empurrão encosta à linha, e quem acabou de repor desliza para dentro (`lineSlide`). Um poste que ganha a bola longe do cesto passa-a quase sempre ao base em vez de subir a driblar; só com muita técnica fica com ela de vez em quando (`outletPassChance`, `outletSkilledFrom`, `outletSkillSlope`). No campo de rua a malha da rede é fixa ao mundo, em células de 40 cm (ancorada ao ecrã deslizava sobre a grade quando a câmara rodava), e passa a véu onde a célula fica com menos de 4 píxeis, e a camada da rede limpa-se em cada frame também onde o campo a tapa (os píxeis da frame anterior ficavam lá e arrastavam-se sobre o campo quando a câmara rodava), e o passeio e a relva de fora são lisos; o chão de todos os campos tem versões a metade e a um quarto, escolhidas fila a fila pela distância, para não haver moiré a arrastar ao longe. O alcatrão do campo de rua perdeu as rachas finas (eram elas que pareciam uma malha a arrastar) e ficou com manchas largas de pouco contraste. E, como ao longe cada linha do ecrã cobre meio metro de chão na vertical mas só uns centímetros na horizontal, cada píxel dessas filas é a média de até quatro texels ao longo desse troço: eram esses traços horizontais a saltar que se viam como «a malha a arrastar». Na horizontal mistura-se entre dois texels vizinhos, porque uma coluna que salta de texel em texel treme com a câmara. Durante o jogo não há música, só o som do pavilhão.
- **A cidade é o menu (2 de novembro):** a cidade não tem painel nenhum: o mapa ocupa a janela toda, a secretária e a linha da semana ficam numa nota no canto do mapa. O pavilhão abre o balneário numa semana com jogo (com um «Jogo-treino» lá dentro, antes do jogo) e as propostas numa semana livre; as táticas estão no treino, o plantel no escritório. A barra de cima diz quando é o jogo («Jogo esta semana», «Jogo daqui a N semanas») e numa semana livre tem «Passar a semana ›» (`weeksToNextGame`). Nos lances livres o árbitro vai buscar a bola ao aro e leva-a a andar ao lançador entre cada lance (3 s por lance, 2 s de preparação). Como o passe de saída e a reposição a ir buscar a bola tiravam tempo às posses, as decisões com bola ficaram um pouco mais rápidas (0,30 a 0,64 s), e a divisão de baixo voltou a passar dos 35 pontos.
- **Táticas a sério (2 de novembro):** a pressão tem três modos (normal, meio campo e campo inteiro: `halfCourtPickUpU` diz onde se pega a bola a meio campo, e em campo inteiro pega-se logo); a defesa é homem a homem ou zona (`ZONE_SPOTS` no `court.ts`: o mais perto fecha a quem tem a bola a 0,8 e os outros puxam-se para a bola; a zona deixa lançar mais de 3); o ataque foca-se em 2 pontos, livre ou 3 pontos (`spacing`), e é a simulação que escolhe a jogada de cada posse a partir daí (`playsInside`, `playsMixed`, `playsOutside`): livre, bloqueio e corte (o poste bloqueia o defensor de quem tem a bola e rola para o cesto quando ele avança) ou bloqueios sem bola (um grande bloqueia o defensor do lançador, que corta para um ponto do arco); o jogador não escolhe jogadas nem espaçamento, só o foco. Quem sofre pressão alta vê um colega aproximar-se para oferecer linha de passe (`pressHelpDistance`) e passa mais para a frente (`pressBreakPassChance`); um defensor bloqueado pressiona metade (`screenPressureFactor`). Um jogador livre deixou de ficar parado: só segura a bola com 60 % do peso quando ninguém o pressiona (`openHoldFactor`), e por isso as decisões voltaram a 0,33 a 0,74 s para as posses não passarem das 70. Os adversários da liga usam zona 30 % das vezes. No treino também se trocam as posições («⇄ Trocar», as mesmas setas do plantel). Durante o jogo, tocar num jogador mostra o nome por cima dele uns dois segundos. O desconto do adversário também pára o jogo para o jogador, com as trocas abertas como num desconto nosso; e num desconto ou ao intervalo, se ninguém tocar em nada durante 30 s, o jogo continua sozinho.
- **Pré-época e condição (2 de novembro):** a época tem 31 semanas: duas de pré-época, sem jogo oficial, e depois as 18 jornadas e as taças (Federação nas semanas 4, 8, 12, 16, 20 e 24; Continental nas 6, 14, 22 e 28; Mundial na 30). Os clubes guardados andam duas semanas para a frente (versão 10). Os jogos-treino e os particulares só existem nas semanas livres, ao tocar no pavilhão; o balneário de uma semana com jogo já não os oferece. A condição física aguenta a época toda: um jogo inteiro tira 10 % (era 22 %), o treino cansa menos de metade (1, 2 e 3 % por carta) e de semana para semana fica 40 % do cansaço (era 50 %).
- **Bola perdida à vista e painel quieto (2 de novembro):** quando um jogador perde a bola (mau passe ou bola escapada), ela rola pelo chão até à linha mais perto (`lostBallRollSpeed`), e só aí a reposição é do adversário; antes passava logo a bola parada e nunca se via a bola a sair. O painel do jogo só se redesenha quando o HTML muda: era reescrito a cada 250 ms e as caras recarregavam, a piscar.
- **Mundo fixo, como no original (2 de novembro):** há um pool de 504 jogadores igual em todas as carreiras (`PLAYER_POOL` em `teamgen.ts`: nome, posição natural e corpo fixos, 180 apelidos); em cada carreira o pool reparte-se ao acaso pelos 40 clubes (`dealPool`, 12 por clube pelos lugares do plantel, sem apelidos repetidos no mesmo clube) e os atributos, o potencial e os movimentos sorteiam-se. Os 40 clubes são sempre os mesmos em cada divisão (os primeiros 10 nomes na última divisão, e assim por diante; o nosso entra no lugar do último da sua divisão, e um 41.º nome é a reserva). Cada clube tem identidade fixa (`art/identity.ts`): emblema único, sem letras e com 21 símbolos próprios de 14 por 14 a duas cores que o editor não mostra (leão, touro, águia, peixe, cavalo, mocho, lobo, barco, ponte, castelo, farol, moinho, dragão, urso, tubarão, galo, gaivota, espiga, tocha, elétrico, rosa dos ventos) e um par forma-símbolo que só se repete ao fim de 168 clubes, e dois equipamentos; contra uma camisola parecida veste o alternativo (`kitAgainst`). Os rivais vestem o equipamento deles no jogo, e os emblemas aparecem no marcador, na prancheta do adversário, na classificação e no aviso do próximo jogo, que passou do cartaz do pavilhão para o centro de cima da cidade. Os clubes guardados recebem jogadores do pool (versão 11), mas mantêm as divisões que tinham.
- **Federação a sério e só pausa (2 de novembro):** na federação, a aba «Divisões» deixa ver qualquer divisão (os clubes das outras ordenam-se pelo nível, porque só a nossa se joga jogo a jogo), tocar num clube abre o plantel dele na aba «Plantel», e tocar num jogador mostra a ficha dele em cima (`clubPlayerCard`: notas, comportamentos, potencial, altura, peso e movimentos, com o equipamento do clube). Durante o jogo deixou de haver botões de velocidade: é sempre ×1, só há «Pausa»; a verificação automática continua a acelerar pelo gancho `setSpeedRaw`.
- **Ícones das divisões (2 de novembro):** cada divisão tem o seu ícone (`art/leagues.ts`: bola de bronze, seta de prata, escudo dourado com duas estrelas, coroa de ouro), na federação, na aba das divisões, na prancheta do adversário e na nota da cidade.
- **Trocas e paragens sem saltos (2 de novembro):** com trocas, a bola parada dura 1,6 s (`substitutionSeconds`) para quem entra vir a andar desde a linha do banco e quem sai ir sentar-se antes da reposição. A vista tem um relógio de animação próprio que, com a simulação parada (desconto, intervalo), anda com o tempo real: o público, os jogadores a beber água e o treinador continuam a mexer-se na pausa. O treinador tem posição própria e vai sempre a andar para onde tem de ir (roda da equipa ou passeio em frente ao banco), em vez de saltar de sítio no fim do desconto.

Ficou de fora: cartas absurdas novas (são conteúdo da Fase 5) e o tom dos nomes por divisão (mudar nomes muda clubes guardados).

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Ver jogos aborrece, como criticaram no original | É a Fase 1; velocidade e desconto de tempo |
| Um atributo ou uma tática domina tudo | Simulações em massa na Fase 0, repetidas em cada mudança |
| Criar e equilibrar 130 combos dá muito trabalho | Tabela de dados, com um teste automático que limita os ganhos de cada combo; nomes e humor ficam para o fim |
| Queixas por imitação | Arte e textos originais; estilo próprio nos detalhes (ver estudo visual) |
