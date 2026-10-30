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

As regras de trabalho para os dois agentes estão em [AGENTS.md](../AGENTS.md).

## 7. Fases

Ordem pensada para testar primeiro o maior risco: **ver um jogo tem de ser divertido**. Se não for, nada do resto salva o jogo. As durações são estimativas minhas para uma pessoa a tempo parcial, e têm grande margem de erro.

| Fase | Entrega | Critério para avançar | Estimativa |
|---|---|---|---|
| **0. Simulação sem ecrã** | 5 contra 5 em texto; simula 1000 jogos | Resultados de 35-50 pontos; a equipa melhor ganha cerca de 70% | 3-4 semanas |
| **1. Jogo visível** | Campo, sprites, marcador, ×1/×2/×4 | **3 pessoas veem um jogo inteiro sem pedir para saltar** | 4-6 semanas |
| **2. Ciclo central** | Cartas nos jogos, treino, 3 espaços, 20 cartas, 30 combos, atributos, táticas | Quem vê o jogo nota a diferença entre um jogador treinado e o mesmo por treinar | 6-8 semanas |
| **3. Uma época completa** | Cidade, calendário, 1 liga, plantel, confiança, despedimento, gravar | Alguém joga uma época inteira e quer outra | 6-8 semanas |
| **4. Carreira** | 4 divisões, 3 taças, transferências, contratos, 12 tipos, descontos de tempo | Triplete possível em 8-12 épocas | 8-10 semanas |
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

**A confirmar na Fase 1:** as repetições só foram testadas em Node. É preciso confirmar que o mesmo jogo dá o mesmo resultado nos browsers e nos telemóveis.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Ver jogos aborrece, como criticaram no original | É a Fase 1; velocidade e desconto de tempo |
| Um atributo ou uma tática domina tudo | Simulações em massa na Fase 0, repetidas em cada mudança |
| Criar e equilibrar 130 combos dá muito trabalho | Tabela de dados, com um teste automático que limita os ganhos de cada combo; nomes e humor ficam para o fim |
| Queixas por imitação | Arte e textos originais; estilo próprio nos detalhes (ver estudo visual) |
