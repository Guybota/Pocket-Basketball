# Pocket Basketball e Calciobit A: diferenças e lacunas

Comparação feita com as [28 sequências do Pocket Basketball](README.md) e as [36 do Calciobit A](../calciobit/README.md#sequências), área a área. Cada ponto aponta para a sequência que o prova. Os nomes entre parênteses retos são pastas de `sequencias/` deste levantamento; os do Calciobit levam o caminho.

A regra continua: copia-se a ideia (o ritmo, a ordem, a gramática da câmara), nunca o aspeto. E um golo do Calciobit não é um cesto qualquer: num jogo de basquetebol há dezenas de cestos, por isso o par de um golo é um momento raro.

## Nova gravação, 14 de novembro de 2026

O jogo foi gravado outra vez com `npm run sequences`, com a placa gráfica a sério, depois de muitas mudanças: um só ecrã horizontal, a câmara mais alta, os pavilhões refeitos, as mesas por liga, o placar vivo do Municipal e os bonecos presos ao mundo. Os vídeos ficam em `dist-check/sequencias/`; as sequências de `sequencias/` continuam a ser as da gravação anterior.

**Defeitos antigos:** resolvidos o 1, o 2, o 4 e o 5. O 3 continua: um movimento ainda tem dois avisos com nomes diferentes («AFUNDANÇO» por cima do jogador e «Afundanço de Força!» em baixo).

**Lacunas 1 a 23:**
- **Resolvidas:** 10, 14, 16, 18, 20, 21, 22 e 23; quase todas a 2 (faltam o clarão, os suplentes a saltar e os vencidos) e a 11 (falta o retrato).
- **Feita com defeito:** a 3 (o grande plano da falta entra por corte).
- **Parciais:** 1, 5, 6, 8, 9, 13 e 15.
- **Por fazer:** a 12 (o lance livre continua no plano largo, sem nome nem percentagem).
- **Por confirmar:** a 7 (nenhum movimento gravado mostrou as cartas; o jogo gravado era entre dois rivais), a 4 e a 19 (a 5 fps não se veem).
- **Fora do plano:** a 17, por decisão do dono.

**Corrigido logo a seguir à gravação:** depois do intervalo, a câmara ficava cerca de 8 s parada no túnel enquanto se jogava no outro cesto, à espera de que os suplentes chegassem ao banco. Agora segura o túnel só até o jogo recomeçar.

**Não é do jogo:** nas gravações, os momentos grandes e as faixas de falta apareciam atrasados e com o resultado de outro lance. Vem da gravação: para saltar de momento em momento, `pauseAt` avança a simulação sem desenhar, e os avisos que nascem nesse salto só aparecem quando se volta a desenhar. A jogar, mesmo a x4, cada passo é desenhado.

### Defeitos novos

> **Resolvidos a 15 de novembro de 2026:** N8, N9 e N10.
> - No combo do treino, a cerimónia ocupa o ecrã todo, sem a janela, e acaba num cartão como o «SPECIAL MENU» do Calciobit: o título, o quadro do treino com o nome numa faixa inclinada, a mini-ficha com as barras a subir e, em baixo, uma faixa com o que mudou, que se toca para seguir. O treino sem combo fica como estava.
> - Na apresentação, o prognóstico fica no espaço à esquerda da janela do cinco inicial e as duas faixas dos clubes ficam encostadas à esquerda, uma por baixo da outra; o prognóstico sai com a bola ao alto, junto com as faixas.
> - Os botões do jogo flutuam sobre o campo inteiro, sem a coluna à direita.

> **Resolvidos a 14 de novembro de 2026:** o defeito antigo 3 e os novos N3, N4, N5 e N7.
> - Cada movimento tem um só aviso, o de baixo, com o nome completo; a palavra por cima do jogador saiu (e com ela o N7).
> - Com o resultado grande no ecrã, não há palavras no campo nem grande plano da falta; a faixa da falta espera por ele.
> - Momentos grandes só nos cestos que decidem, no último período ou no prolongamento: cerca de 0,4 por jogo em 40 jogos.
> - Os grandes planos da bola ao alto, da falta e do fim deslizam em ~0,5 s; a bola ao alto já está a 2× quando a bola sobe.

**Média**
- **N3. Textos empilhados.** Num afundanço com falta que é também momento grande ficam até sete textos no ecrã ao mesmo tempo (a palavra do movimento, «+2», o resultado grande, «FALTA», a ficha de quem marcou, o aviso do movimento e a faixa da falta). *Ideia:* uma ordem de prioridade com uma só zona de faixas; o momento grande esconde as palavras do mundo.
- **N4. Momentos grandes a mais.** Três num jogo, dois no primeiro período, todos depois de um movimento especial. *Ideia:* exigir também peso no jogo (último período, diferença curta, reviravolta) ou um limite por jogo.
- **N5. Grandes planos por corte.** A falta e a bola ao alto entram por corte seco, e o zoom do desconto leva cerca de 0,15 s. *Ideia:* aproximar e afastar em 0,4–0,6 s.
- **N6. O aviso do movimento fica demasiado tempo.** «Crossover!» fica cerca de 5 s e sobrevive ao cesto e à posse seguinte. *Ideia:* esconder no fim da jogada, no máximo cerca de 2 s.
- **N7. A palavra do movimento tapa o resultado grande e a mesa dos oficiais.**
- **N8. No combo do treino, a janela da direita fica vazia durante 2,8 s.**
- **N9. Na apresentação, a janela do cinco inicial tapa metade do prognóstico, e a barra fica depois 5 s por cima do campo.**

**Baixa**
- **N10.** A coluna dos botões do jogo é uma faixa opaca que corta cerca de 8 % do campo à direita; no Calciobit os botões flutuam sobre a cena.
- **N11.** Os botões do jogo continuam à vista no placar do título e na foto de equipa.
- **N12.** Na foto de equipa, a taça tapa a cara de um jogador e os pés do capitão saem da moldura.
- **N14.** Na federação, um quadradinho no fim de «Iniciados» e listas cortadas no fundo sem sinal de que rolam.
- **N15.** No escritório, as legendas colam-se aos botões redondos.
- **N16.** No balneário ao intervalo, «Intervalo» aparece duas vezes.
- **N17.** A x4, as faixas e o momento grande não encurtam.
- **N18.** No intervalo da final ficam cerca de 3 s de campo vazio antes do fundido.
- **N19.** Num cesto com falta, «+2» e «FALTA» aparecem separados, sem dizer 2+1.

### Lacunas novas face ao Calciobit

- O dia de jogo tem o mesmo ritmo dos menus: entrar no pavilhão leva o mesmo fundido de qualquer ecrã.
- O fim de um jogo normal não mostra o resultado final em grande.
- O título não tem clarão.
- **O treino sem combo** passou a ser como no Calciobit (15 de novembro de 2026): cartas juntas, ilustração de cada carta em grande, uma a uma, escada final com a mini-ficha e a faixa, e «Treinado» na lista. **Cada carta também deve ter uma ilustração própria**: hoje mostra a imagem da carta ampliada, como remedeio.
- **Cada combo deve ter uma ilustração única**, como cada treino especial do Calciobit (um desenho cómico do treino, por exemplo `menu/treino/treino-03.jpg` a `treino-07.jpg`). Hoje o quadro do cartão do combo (`comboCard` em `src/ui/menus.ts`) mostra as três cartas usadas, como remedeio. Falta desenhar uma cena por combo, em pixel art gerada por código, a passar pela revisão do skill visual-design.

### O que gravar a seguir

- Um movimento especial da nossa equipa que dê cesto, para a lacuna 7.
- Os toques e a ida para o jogo a 30 fps, para as lacunas 4 e 19.
- Um lance livre com o jogo apertado, a quinta falta, uma derrota e um prolongamento.

## A cidade contra o mapa do Calciobit, 15 de novembro de 2026

Comparação para ajuste futuro; nada mudou ainda. Capturas em [cidade/](cidade/): [pré-época](cidade/pre-epoca-1280x720.png), [semana de jogo](cidade/semana-de-jogo-1280x720.png) e [no telemóvel](cidade/semana-de-jogo-844x390.png). O Calciobit está em [fluxos-ui.md](../calciobit/fluxos-ui.md) («O mapa da cidade») e [cena/cidade-mapa](../calciobit/cena/cidade-mapa/README.md).

| | Calciobit | Pocket Basketball |
|---|---|---|
| Mapa | Cidade isométrica, 5 edifícios com etiqueta | Igual, com 6 sítios, jogadores a passear, carros e uma grua: mais vida |
| Estações e hora | Primavera com cerejeiras, verão, outono dourado, inverno; amarelado ao fim do dia | Luz do dia e noite; estações por confirmar (as capturas são todas de setembro) |
| Data | Mês e semana grandes em dois círculos, em cima à esquerda, com ▶ ao lado para passar a semana | «Setembro · Semana 3» em letra normal na faixa de cima; «Passar a semana ›» num botão ao centro |
| Próximo jogo | Cartão por baixo da data: equipas, lugar de cada uma na liga, «faltam N semanas» | Cartão em cima ao centro: emblemas, jornada, «Daqui a 2 semanas», casa ou fora; falta o lugar na liga |
| Semana de jogo | Bandeiras das duas equipas no estádio; o adjunto em retrato grande pergunta se vamos ao estádio (sim/não) | O cartão diz «Esta semana» e o «Passar a semana» desaparece; ninguém pergunta, é preciso saber que se toca no Pavilhão |
| Quem fala | O adjunto em retrato grande, numa caixa de diálogo | A secretária num cartão pequeno em baixo à esquerda, com a dica e uma linha de estado |
| Passar a semana | Corte pelo preto; a semana muda às escuras | O mapa escurece e volta (parecido) |
| Voltar ao mapa | O cartão do próximo jogo entra com um salto de escala (0,4 s) | Aparece sem animação |
| Rodapé | Uma dica a passar em letra pequena | Não há; a dica é a da secretária |

**Defeitos do nosso:**
- Na semana de jogo nada diz «vai jogar»: o caminho para o jogo, a coisa mais importante da semana, está escondido.
- No telemóvel o cartão da secretária tapa um quarto da cidade, e a cidade fica pequena no meio da floresta.
- A linha de estado da secretária repete o cartão de cima (jornada, casa ou fora) e mistura-se com a dica.

**Propostas, por ordem:**
1. Semana de jogo como no Calciobit: bandeiras das duas equipas no Pavilhão e o adjunto (ou a secretária) em retrato grande a perguntar «Há jogo esta semana. Vamos para o pavilhão?», com Sim e Não.
2. Data maior: mês e semana em destaque em cima à esquerda, com o ▶ de passar a semana ao lado, em vez do botão ao centro.
3. Cartão do próximo jogo com o lugar de cada equipa na liga e o salto ao aparecer.
4. Secretária mais leve: só a dica, numa faixa em baixo, sem a linha de estado repetida.
5. Estações no mapa, se ainda não houver (arte nova, para mais tarde).

## Em resumo (gravação anterior)

O Pocket Basketball já tem a mesma câmara de base e a mesma secura nos jogos normais. A diferença maior é de **ritmo**: faz tudo três a cinco vezes mais depressa e quase nunca para o jogo para marcar um momento. O Calciobit abranda, passa pelo preto e dá palco aos momentos raros: o golo, a falta, o título e a descoberta de um treino. O Pocket Basketball trata quase tudo ao mesmo nível.

| Momento | Calciobit | Pocket Basketball |
|---|---|---|
| Mudança de ecrã nos menus | 0,6–0,8 s, sempre pelo preto | 0,18 s, sem preto |
| Da antevisão à bola em jogo | cerca de 21 s | cerca de 10 s |
| Golo ou cesto grande | cerca de 20 s, com o jogo parado | 1,5–1,8 s, com o jogo a correr |
| Combo de cartas no treino | cerca de 9 s | 1,8 s |
| Título ganho | cerca de 45 s, em cinco momentos | cerca de 11 s, no mesmo campo |

## Igual ou equivalente

- **Câmara:** alta e lateral, nunca de cima. Muda do plano largo para o diagonal a deslizar e a rodar, sem corte e sem zoom. Não faz zoom com a bola a correr ([mudanca-de-lado-pan-e-rotacao](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/README.md); Calciobit: [plano-largo-para-diagonal](../calciobit/sequencias/jogo-camara/plano-largo-para-diagonal/README.md)).
- **Movimentos especiais:** o jogo não abranda e a câmara não muda ([crossover-palavra-e-aviso](sequencias/cesto-festejo/crossover-palavra-e-aviso/README.md)).
- **Fim de um jogo normal:** acaba seco, sem papelinhos nem festa. Os papelinhos são só para o título ([fim-do-jogo-para-relatorio](sequencias/entrada-saida/fim-do-jogo-para-relatorio/README.md)).
- **Mapa da cidade:** a câmara nunca se mexe, e não há cortinas, deslizes nem zooms entre ecrãs.
- **Balneário:** a mesma ideia de uma sala isométrica, antes do jogo e ao intervalo, com os botões do treinador ao lado.
- **Previsão antes do jogo:** o prognóstico com a barra faz o papel do TOTO, sem empate, como é próprio do basquetebol.

## O que o Pocket Basketball tem e o Calciobit não tem

- **Valor de cada cesto no campo:** o «+1», «+2» ou «+3» junto ao aro, e «FALTA» ou «FORA» a flutuar, sem parar o jogo ([cesto-normal-mais-dois](sequencias/cesto-festejo/cesto-normal-mais-dois/README.md)).
- **Bancada que fala durante o jogo:** frases ligadas ao lance e ao marcador, e um letreiro de cântico.
- **Desconto com grande plano:** zoom contínuo até 2× sobre o banco, com a equipa a juntar-se ([desconto-zoom-ao-banco](sequencias/jogo-camara/desconto-zoom-ao-banco/README.md)).
- **Fim de período com o banco:** a equipa vai ao banco e as trocas abrem com uma contagem no botão ([fim-do-periodo-1](sequencias/entrada-saida/fim-do-periodo-1/README.md)).
- **Repetição em câmara lenta** do lance que decidiu o jogo, com uma explicação no painel.
- **Relatório mais completo:** o resultado a contar, o que decidiu o jogo, os outros jogos da jornada e as cartas ganhas, num só ecrã.
- **Treino que mostra o ganho:** as sete barras sobem até à nota nova e aparece «Aprendeu Crossover» ([treino-combo-de-cartas](sequencias/menus-transicoes/treino-combo-de-cartas/README.md)).
- **Cerimónia com a taça:** a roda no círculo central e o capitão a erguer a taça em grande plano ([cerimonia-do-titulo](sequencias/entrada-saida/cerimonia-do-titulo/README.md)).
- **Cidade viva:** bonecos a andar nas ruas, mesmo durante as cortinas.

## Defeitos encontrados

São erros do que já existe, não ideias novas. Estão por ordem de gravidade. **Os cinco foram corrigidos no commit c0b0899** e confirmados numa gravação nova; as sequências mostram ainda o estado de antes.

1. **A barra do marcador tapa os balões da bancada.** Durante o jogo só se lê o início das frases («ISS…», «JÁ VIMOS P…»), e dois balões seguidos tapam-se um ao outro. Só na repetição, sem barra, se lê a frase inteira. As palavras do jogo já ficam por baixo da barra (`FLOATER_MIN_TOP`), mas os balões não ([afundanco-tremor-e-aviso](sequencias/cesto-festejo/afundanco-tremor-e-aviso/README.md), frame 30).
2. **A cena chega um frame depois do painel.** Ao abrir o mapa, o escritório ou o balneário, o primeiro frame mostra o painel sobre um buraco escuro ([cidade-escritorio-mercado](sequencias/menus-transicoes/cidade-escritorio-mercado/README.md), frames 3–4; [cidade-para-pavilhao](sequencias/menus-transicoes/cidade-para-pavilhao/README.md), frames 6–7).
3. **Dois avisos para a mesma jogada.** No afundanço de força, «Afundanço de Força!» é apagado no cesto e trocado por «Afundanço!», e ainda há a palavra por cima do jogador e a linha no painel ([afundanco-de-forca](sequencias/cesto-festejo/afundanco-de-forca/README.md)).
4. **O resultado volta a contar depois da repetição.** Ao sair de «Rever o lance», o relatório recomeça a contagem de 32–21 até 55–36, como se fosse a primeira vez ([repeticao-cesto-e-saida](sequencias/jogo-camara/repeticao-cesto-e-saida/README.md)).
5. **Um véu esbate o combo quando o painel do resultado aparece**, e o título «Combo secreto descoberto!» perde contraste ([treino-combo-de-cartas](sequencias/menus-transicoes/treino-combo-de-cartas/README.md), frames 48–55).

## Lacunas por prioridade

### Alta

> **Feitas a 10 de novembro de 2026:** as lacunas 2, 4 e 5.
> - **2.** Depois da cerimónia vem um palco próprio: o placar do pavilhão acende a prova, o clube e o troféu, linha a linha, e segue-se a foto de equipa. Os suplentes saltam no banco, e o relatório diz «Campeões» e mostra a tabela num título da liga.
> - **4.** Um botão tocado fica a tinta, ou a papel nos botões escuros, pelo menos 120 ms. No mapa, o edifício tocado ganha uma seta dourada.
> - **5.** Na apresentação, as faixas dos dois clubes mostram casa ou fora, o lugar na liga e a forma. A bola ao alto tem um grande plano a 2×, sem o marcador.
> - **Ficaram de fora:** a foto de equipa no escritório e a apresentação do adversário como clube noutros ecrãs.
>
> **Feitas a 10 de novembro de 2026, à noite:** o jogo passou a um só ecrã, como o Calciobit, e ficaram feitas as outras lacunas de interface.
> - **Ecrã único:** no jogo, o campo ocupa o ecrã, os botões do treinador são redondos à direita e o painel é uma janela aberta pelo INFO. Nos menus, a cena ocupa o ecrã e as fichas e as listas abrem em janelas. O escritório e o balneário têm botões redondos com legenda.
> - **Lacunas altas:** 1 (momentos grandes, com a imagem parada e o resultado grande), 3 (falta com grande plano e faixa), 6 (câmara mais calma, por experimentar a jogar) e 7 (cartas do combo ao lado do aviso).
> - **Lacunas médias e baixas:** 8 a 23, menos a 17, a ida para o jogo: a pergunta do adjunto saiu por decisão do dono (tocar no pavilhão entra logo) e as bandeiras no pavilhão ficaram por fazer e o «Rever» oferecido durante o jogo (9 ficou com o filme do jogo no relatório).



1. **Nenhum cesto é maior do que os outros.** Um afundanço de força decisivo tem o mesmo aviso de 1,8 s e o mesmo «+2» de um cesto qualquer, e tudo acaba antes da reposição. A câmara também não reage a nenhum cesto. O golo do Calciobit funciona porque é raro e para o jogo ([resultado-entra-golo-sofrido](../calciobit/sequencias/golo-festejo/resultado-entra-golo-sofrido/README.md)).
   - *Ideia:* reservar um «momento grande» a um a três cestos por jogo: um movimento especial que dá cesto, um cesto sobre o apito, uma reviravolta ou um triplo de empate no fim.
   - Nesse momento, a reposição espera cerca de 2 s e a imagem fica parada um instante. O resultado aparece grande a meio do campo, com o número novo maior e na cor da equipa, e assenta.
   - A câmara pode dar um empurrão curto, sem corte. Os cestos normais ficam como estão.
2. **O título não tem palco.** São cerca de 11 s no mesmo campo, uma faixa e papelinhos, e depois o relatório de um jogo normal. O Calciobit gasta cerca de 45 s com clarão, claque, suplentes a correr, o painel revelado passo a passo e o mosaico ([painel-trofeu-liga](../calciobit/sequencias/entrada-saida/painel-trofeu-liga/README.md), [mosaico-we-are-the-champions](../calciobit/sequencias/entrada-saida/mosaico-we-are-the-champions/README.md)).
   - *Ideia:* depois da roda, um clarão, que fica reservado aos títulos. Segue-se um ecrã próprio, por exemplo o placar do pavilhão a acender com a prova, o clube e a taça, um a um.
   - Depois, uma «foto de equipa» do plantel em pixel art, que podia ficar no escritório.
   - Os suplentes saltam do banco e os vencidos sentam-se de cabeça baixa. O relatório diz «Campeões» e mostra a classificação final.
3. **A falta não tem momento próprio.** É um «FALTA» pequeno a flutuar 1,6 s. Não se vê quem a fez nem quantas faltas leva ([falta-e-lances-livres-plano-fixo](sequencias/jogo-camara/falta-e-lances-livres-plano-fixo/README.md)). No Calciobit, a falta tem um grande plano do árbitro e uma faixa com o nome ([cartao-amarelo-zoom-e-saida](../calciobit/sequencias/jogo-camara/cartao-amarelo-zoom-e-saida/README.md)).
   - *Ideia:* no apito, o mesmo zoom curto do desconto, sem corte, sobre quem fez a falta, com uma faixa «Falta de Botelho · 3.ª falta».
   - A quinta falta ganha uma faixa própria e o jogador a sair.
4. **O toque não dá resposta à vista.** Nenhum toque gravado mostra resposta nos botões, nas etiquetas do mapa ou em «Contratar». O CSS só faz o botão afundar 1 px enquanto o dedo está em cima. No Calciobit, o botão fica amarelo durante um frame e a ação vem logo a seguir ([ficha-jogador-fechar-abrir](../calciobit/sequencias/menus-transicoes/ficha-jogador-fechar-abrir/README.md)).
   - Isto tem de ser confirmado com o dedo, porque os cliques do script são muito rápidos.
   - *Ideia:* um frame numa cor de destaque própria do jogo em qualquer botão, com a ação dois frames depois. No mapa, o edifício pisca.
5. **A entrada no jogo não cria expectativa.** A apresentação mostra os cinco de cada lado, mas não o adversário como clube: casa ou fora, divisão e lugar na liga. A bola ao alto fica no plano largo, sem grande plano. O Calciobit tem antevisão com faixas, claque, sorteio em grande plano e pontapé de saída ([bola-ao-alto](sequencias/entrada-saida/bola-ao-alto/README.md); Calciobit: [sorteio-zoom-e-fade](../calciobit/sequencias/jogo-camara/sorteio-zoom-e-fade/README.md)).
   - *Ideia:* uma faixa por clube a entrar escalonada no topo da apresentação, com o emblema, casa ou fora, o lugar na liga e a forma.
   - Na bola ao alto, um grande plano a 2× do círculo central. O zoom já existe no desconto e na cerimónia.
6. **A câmara anda depressa e roda a cada posse.** Atravessa cerca de um quarto do campo visível por segundo, quatro a cinco vezes mais do que o Calciobit, e roda de um diagonal para o outro em cada ataque ([mudanca-de-lado-pan-e-rotacao](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/README.md)).
   - *Ideia:* limitar a velocidade da câmara, como já se faz no fim do jogo (`END_CAMERA_SPEED`). Ficar a meio campo enquanto a bola atravessa e só rodar quando o ataque se instala.
   - Mudar isto mexe na leitura do jogo e precisa de ser experimentado: os protótipos de câmara anteriores foram postos de lado.
7. **Os movimentos especiais não mostram as cartas.** Só aparece o nome, e o jogador não liga o treino ao que vê. No Calciobit, as cartas que fazem o combo ficam no canto a jogada toda ([habilidade-entrada-cartas-nome](../calciobit/sequencias/golo-festejo/habilidade-entrada-cartas-nome/README.md)).
   - *Ideia:* duas ou três mini-cartas, com os ícones das cartas do treino, ao lado do aviso até ao fim da jogada, e um só aviso, por exemplo «Afundanço de Força! +2».

### Média

8. **O fim de um jogo normal não marca o momento.** Há a faixa «Vitória!», 3 s de jogadores a andar e um escurecimento. *Ideia:* 1 a 1,5 s de grande plano no apito, com os vencedores de braços no ar e os vencidos de cabeça baixa.
9. **A repetição está escondida, demora e sai a seco.** Só há uma, no relatório. São 6 s de câmara lenta antes do cesto e 0,6 s depois, com corte seco nos dois sentidos ([repeticao-entrada-corte](sequencias/jogo-camara/repeticao-entrada-corte/README.md)). *Ideia:* começar mais perto do lance e abrandar só no voo da bola. Ficar 1 s no cesto e entrar e sair por um fundido. Oferecer «Rever» depois de um momento grande.
10. **Não há resumo dos lances.** *Ideia:* um «filme do jogo» com os três a cinco momentos que o mudaram (maior parcial, ultrapassagem no marcador, último cesto), cada um com período, tempo e resultado. Usa a repetição que já existe.
11. **Não há ficha de quem marcou.** Só uma linha no painel, às vezes atrasada. *Ideia:* nos momentos grandes, uma ficha pequena no campo durante a reposição: retrato, nome, pontos de hoje e quem assistiu ([regresso-ficha-marcador](../calciobit/sequencias/golo-festejo/regresso-ficha-marcador/README.md)).
12. **O lance livre não tem enquadramento.** O cesto fica pequeno num canto e o lançador não tem nome. É o par do penálti, que no Calciobit tem câmara fixa e ficha do batedor ([penaltis-remate-camara-fixa](../calciobit/sequencias/jogo-camara/penaltis-remate-camara-fixa/README.md)). *Ideia:* com o jogo apertado, a câmara atrás do lançador, com o nome, a percentagem e os círculos dos lances.
13. **Contratar não dá retorno.** A linha desaparece e o dinheiro muda num frame, sem mensagem ([mercado-abrir-e-contratar](sequencias/menus-transicoes/mercado-abrir-e-contratar/README.md)). *Ideia:* a secretária confirma, e o dinheiro conta para baixo.
14. **O combo de cartas é curto e sem suspense:** 1,8 s, contra 9 s. *Ideia:* cerca de 3 a 4 s, com as cartas a entrar uma a uma e uma bola de luz passada entre elas até um «afundanço» no centro. Mantém-se o toque para saltar.
15. **As transições não mudam de ritmo.** Todas levam 0,18 s, também à volta do jogo. *Ideia:* passar por um azul escuro do jogo, não preto, em cerca de 0,5 s nos menus. Ao entrar no pavilhão e ao sair do relatório, uma passagem mais lenta, para o dia de jogo pesar mais. A cena desenha-se durante o escuro, o que também resolve o segundo defeito.
16. **O intervalo esconde o tempo.** Recomeça sozinho ao fim de 30 s sem nada à vista. *Ideia:* a contagem no botão «Segunda parte», como já acontece no fim de período.
17. **Ir para o jogo não tem cerimónia.** Em semana de jogo o pavilhão fica igual e um toque entra logo. *Ideia:* bandeiras das duas equipas no pavilhão e o adjunto a perguntar «Vamos para o pavilhão?».

### Baixa

18. **Falas sem ritmo:** aparecem com o ecrã, sem fade, e o texto vem inteiro. *Ideia:* fade de 0,2 s e texto letra a letra, com toque para completar.
19. **O cartão do próximo jogo não chama a atenção.** *Ideia:* entra com um pequeno ressalto de escala.
20. **O balneário é sempre a mesma imagem.** *Ideia:* jogadores sentados ao intervalo e de pé antes do jogo.
21. **«Repetição» é discreto.** *Ideia:* fazê-lo piscar, para dizer sem ler que não é ao vivo.
22. **Os raios do combo são sempre roxos.** *Ideia:* a cor da categoria de cartas que domina.
23. **A cápsula do marcador muda sem sinal.** *Ideia:* o algarismo de quem marcou pisca uma vez na cor da equipa.

## O que falta gravar

- **No jogo:** um roubo e um desarme com o jogo a correr, um choque com alguém no chão, o fim de um desconto, dois lances livres com um falhado e uma falta sem cesto.
- **Movimentos:** o step-back, o alley-oop e a mão rápida, com o segundo antes do movimento. Hoje o script entra já depois de o movimento começar.
- **Avisos:** «Sobre o apito!», «Reviravolta!» e «Parcial».
- **Fim do jogo:** uma derrota, um jogo fora e o prolongamento.
- **Cerimónia:** a cerimónia da taça, e a de liga a 10 fps.
- **Menus:** «Passar a semana» a sério, uma pergunta sim/não, a troca de separadores na federação, cartas novas depois de um jogo e uma contratação a outro clube.
- **Ainda sem gravação:** o som. O esquema vertical já não existe: o jogo passou a ser só horizontal, como o Calciobit.

Para gravar de novo, acrescenta-se o percurso em `src/tools/sequences.ts` e corre-se `npm run sequences`.
