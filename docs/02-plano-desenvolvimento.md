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
| **5. Conteúdo e polimento** | 32 cartas, 130 combos, som, tutorial, repetições, videoteca | Teste com 10 pessoas sem ajuda | 8-12 semanas |
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

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Ver jogos aborrece, como criticaram no original | É a Fase 1; velocidade e desconto de tempo |
| Um atributo ou uma tática domina tudo | Simulações em massa na Fase 0, repetidas em cada mudança |
| Criar e equilibrar 130 combos dá muito trabalho | Tabela de dados, com um teste automático que limita os ganhos de cada combo; nomes e humor ficam para o fim |
| Queixas por imitação | Arte e textos originais; estilo próprio nos detalhes (ver estudo visual) |
