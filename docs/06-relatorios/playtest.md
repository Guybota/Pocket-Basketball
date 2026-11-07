# Teste de jogo R8: jogador novo, telemóvel 360×640 com toque

Joguei com o Playwright (Chromium, `hasTouch`, `deviceScaleFactor 1`) contra o `npm run dev`. Criei o clube "Leões de Alfama", passei a pré-época (um jogo-treino e um particular) e joguei o 1.º jogo da liga com time-out, uma troca e táticas. Depois acelerei o resto da época: os jogos correram a 40× com o gancho `setSpeedRaw`, o treino foi feito com as cartas disponíveis e as semanas livres foram passadas à frente. Cheguei ao fim da época 1 (7.º lugar, 9 V e 9 D na liga, eliminado na pré-eliminatória da taça) e às renovações, e entrei na época 2. Não houve erros de consola em nenhuma sessão.

Todas as capturas estão em `/tmp/claude-0/-home-user-Pocket-Basketball/32f7ae8f-cf51-5b25-8081-569df0733c98/scratchpad/playtest/`. Abaixo indico só o nome do ficheiro.

## Diário

### 1. Título e criação do clube: 2 toques, cerca de 10 s
- O título é bonito: a cidade isométrica e o logótipo têm charme logo à entrada (`s1-01-titulo.png`).
- O ecrã de criar clube é claro. A abreviatura acompanha o nome escrito (Leões de Alfama dá ALF). O editor do emblema é rico, com 8 páginas de desenhos e 21 símbolos (`s2-01-criar.png`, `s3-01-emblema.png`).
- A cidade funciona bem como menu, e a secretária diz o que fazer a seguir (`s3-02-cidade.png`).
- **Fricção:** o número em "Treino (6)" não se explica. Só depois percebi que são as cartas por usar.
- **Fricção:** a linha de estado no fundo parte-se mal: "… Liga Iniciados · 0 / V · 0 D".

### 2. Treino e cartas: cerca de 7 toques por jogador
- A lista do plantel tem 7 ícones de atributos **sem legenda** (`s4-01-treino.png`). Um jogador novo não sabe o que querem dizer o ícone do caixote laranja, o da bola escura ou o do H amarelo. Os botões do rodapé (setas, prancheta, halteres) também não têm texto.
- As posições BAS, ESC, EXT, EXP, POS e SUP não se explicam. "EXP" (Extremo-Poste) é difícil de adivinhar.
- O ecrã das cartas é muito bom: grelha por categorias, ilustrações e pré-visualização do efeito ("Lançamento +++ · Velocidade +++ · Técnica ++") (`s5-01-cartas.png`, `s6-01-cartas-escolhidas.png`).
- **Confusão:** no resultado do treino, a fila de cima mostra uma nota acima em todos os atributos, B B C B C C B contra C C D C D D C (`s6-03-treino-resultado.png`). Pensei que o jogador tinha subido em tudo. Na lista, as notas continuavam iguais. A fila de cima parece ser a nota seguinte, mas nada o diz.
- No resultado do treino, a palavra "técnica" fica cinzento-escuro sobre fundo escuro e quase não se lê.
- Quando acabam as cartas, o botão de abrir as cartas fica desligado sem explicação.
- Descobri um combo ("Voz de Ouro") por acaso, à 5.ª semana, e foi um bom momento. Mas o título "Combo secreto descoberto! / Voz de Ouro" fica parcialmente tapado pelo painel (`L1-02-combo.png`). O ecrã também não diz o que o combo dá: mostra só as subidas de atributos.
- Os nomes das cartas mudam entre ecrãs. No treino aparecem "Corrida", "Ler Defesa", "Agilidade", "Quadro" e "Lançar". No fim do jogo aparecem "Corrida Longa", "Ler a Defesa", "Escada de Agilidade", "Quadro Tático" e "Lançamento" (`L1-03-resultado.png`).
- **Momento bom:** na época 1, o Brandão passou de C C D C D D C para A B C B C C B, e nota-se a evolução (`s22-02-trocas-fundo.png`).

### 3. Pré-época: jogo-treino e particular
- A escolha de propostas, entre jogo-treino e particular, é clara e diz o custo de cada uma (`s8-01-pavilhao.png`).
- No balneário, o adjunto disse a mesma frase ("Jogo partido. Ganha quem tiver as pernas mais frescas…") antes dos 3 primeiros jogos, contra adversários diferentes.
- **Ritmo:** a velocidade normal é lenta. 15 s reais deram 9 s de relógio, e 64 s reais deram 37 s. Um período de 2:00 demora cerca de 3,5 min, e um jogo de liga cerca de 14 min mais os intervalos. **Não há controlo de velocidade para o jogador**. Para avançar a época tive de usar o gancho de depuração.
- O particular terminou com "Particular, não conta para a liga" e, na mesma linha, "Confiança −2%" (`s15-08-fim-particular.png`). Parece contraditório.
- Se fechar a página a meio do jogo, volto à cidade com a semana por jogar, sem penalização. Isto permite repetir um jogo até ganhar.
- No jogo-treino, o quadro mostra os períodos 1, 2, 3 e 4, mas só se jogam 2. Os dois traços ficam lá para sempre.
- O separador **"Banco"** mostra quem está em campo. O nome engana.

### 4. 1.º jogo da liga, com time-out, troca e táticas (cerca de 22 toques)
- Antes do jogo marquei a Amaral como alvo e pus a pressão em "Campo inteiro". Tocar no boneco do campo do adversário não marcou nada. Só a linha da lista marcou (`s19-01-alvo.png`).
- Nas táticas, o primeiro botão chama-se "Normal", mas a opção por omissão é "Meio campo". Esperava que "Normal" fosse a de omissão.
- O time-out não é imediato: espera pela próxima bola parada, cerca de 110 ticks. Depois aparece um bom ecrã, com o campo, as etiquetas de cansaço a cores e uma contagem decrescente ("Continuar jogo (23 s)") (`s18-06-timeout-pedido.png`). Ficou-me um time-out depois de o pedir, o que está certo.
- Fiz a troca Barreto (cansado, amarelo) ↔ Furtado (`s19-03-to-troca-feita.png`). Na lista, todos os suplentes passam a aparecer como "EXP", o lugar de quem sai. Faz sentido, mas confunde.
- 🔴 **Problema principal:** uma troca manual **desliga em silêncio a rotação automática** (`queueSubstitution`, `src/sim/match.ts:2218`). O botão "Rotação automática" está escondido no fundo da lista, por baixo de "Continuar jogo" (`s22-02-trocas-fundo.png`). Resultado: os mesmos 5 jogaram o jogo inteiro (4:06 cada um ao intervalo) e acabaram todos com etiquetas vermelhas, exaustos, no fim do 3.º período (`s19-11-pausa-adversario.png`). Perdemos por **10–39**. Um jogador novo não tem como perceber isto.
- 🔴 **As táticas mudadas durante o jogo ficam para sempre.** Pus "3 pontos" a meio do jogo e "Campo inteiro" antes dele. Na época 2, a ficha da Federação ainda mostra "Pressão alta · Ataque: 3 pontos" (`s21-02-federacao.png`). Joguei a época inteira assim sem me dar conta. Ao intervalo deste jogo tínhamos 1/9 de 3 e 3 ressaltos contra 16 (`s19-10-intervalo-stats.png`).
- As estatísticas ao intervalo ajudam a perceber porque se está a perder: 0/5 de 2, 1/9 de 3 e ressaltos 3–16. O adjunto, a 3–21, só diz "Não está tão mau como parece.", e no fim, a 10–39, "Não foi tão mau como pareceu." Isto não ajuda e soa a brincadeira.
- O relato é legível, com as jogadas mais recentes no topo (`s19-06-relato.png`).
- No ecrã final, os resultados dos outros jogos, as cartas ganhas e o melhor em campo são satisfatórios (`s19-12-fim.png`, `L1-03-resultado.png`).

### 5. Resto da época, acelerado (cerca de 25 semanas, 533 toques automáticos)
- Resultados: 9 V e 9 D na liga, 7.º lugar, e eliminado na Taça (29–41) (`L2-01-erro.png`, que é o balanço da época). A confiança andou entre 40 e 55% e nunca houve perigo de despedimento.
- As frases do adjunto repetem-se muito. Usou "Sofremos, mas ganhámos" em vitórias por 6, 8 e 9 pontos, e "Não foi tão mau como pareceu" em derrotas por 6, 8, 17 e 25.
- O Noronha estava lesionado 3 semanas na semana 3 e voltou a aparecer com "4 semanas" na semana 10. Parece uma nova lesão, mas não houve nenhum aviso dela.
- Há muitas semanas livres (taças continentais, mundial e eliminação na taça), cerca de 1 em cada 3. Se só passar a semana, a época parece vazia.
- O balanço do fim da época é bonito (`L2-01-erro.png`). "2 Cartas" no resumo não se explica.

### 6. Renovações e época 2
- O ecrã é claro: orçamento, salários, sobra e "Era › Pede" (`s20-01-apos-epoca.png`). Todas as linhas aparecem a amarelo, sem legenda que diga que amarelo significa renovar.
- No escritório, a primeira linha do menu ("Direção") aparece cortada no topo da lista (`s21-01-escritorio.png`). O presidente diz "Mantenha a equipa a subir", mas ficámos em 7.º e não subimos.
- Na época 2, com tudo a 0–0, a Federação põe o meu clube em "Lugar 1". O mesmo aconteceu com o adversário na época 1, que aparecia em "Lugar 10" antes de qualquer jogo.
- O aeroporto diz "ainda está em obras", e isso está bem explicado. A torre só muda a frase da secretária.

## Quero jogar mais uma semana?
Sim, pelo treino e pelos combos. A cidade, as cartas e o ecrã de fim de jogo têm charme. Mas, depois do 10–39, quase desisti, porque não percebi porquê. Só ao ler o código descobri a rotação desligada e as táticas que ficam guardadas.

## Toques e tempos
| Ação | Toques | Tempo real |
|---|---|---|
| Criar clube | 2–4 | cerca de 10 s |
| Treinar 1 jogador (3 cartas) | 6–7 | cerca de 8 s |
| Do pavilhão à bola ao alto | 3–4 | cerca de 5 s |
| Time-out + 1 troca + continuar | 4 | — |
| Jogo de liga à velocidade normal | — | cerca de 14 min (estimativa) |
| Época inteira acelerada | 533 | 10 min |
