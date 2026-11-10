# Câmara e estilo visual do Calciobit A

Tirado primeiro das imagens soltas das [pastas de jogo](jogo/) e de [menu](menu/), e depois medido e corrigido nas [sequências](sequencias/) tiradas dos vídeos. Os tempos vêm da contagem de frames: a 10 fps cada frame é 0,1 s, a 30 fps é 33 ms. Os píxeis são do ecrã de 640×360 das sequências.

## Câmara do jogo ([jogo/camara-geral](jogo/camara-geral/README.md), [sequencias/jogo-camara](sequencias/jogo-camara/))

- **Posição:** alta e inclinada, a cerca de 30–60°, a olhar de um dos lados do campo. Nunca é vista de cima, e só muito raramente é de perfil puro.
- **Planos:**
  - plano largo, centrado no meio campo, com a bancada numa faixa no topo do ecrã;
  - plano diagonal de canto, quando a bola está perto da área ou da baliza.
- **Seguir a bola:** a câmara vai um pouco atrás da bola e anda devagar, cerca de 35 px/s, com a bola no terço central. Não há zoom com a bola a correr.
- **Do largo ao diagonal:** não há corte. A câmara desliza para o lado da baliza e roda ao mesmo tempo, em cerca de 1,6 s, com o zoom igual. A bancada deixa de ser uma faixa horizontal e sobe para o lado da baliza. O regresso faz-se da mesma maneira ([plano-largo-para-diagonal](sequencias/jogo-camara/plano-largo-para-diagonal/README.md)).
- **Distância:** varia entre vídeos. Nalguns canais os bonecos aparecem duas vezes maiores; pode ser uma opção de zoom ou o tamanho do ecrã, não se confirmou.

### Grandes planos

Só aparecem com o jogo parado: sorteio, pontapé de saída, faltas e cartões, fiscal de linha, cantos e apito final. Não se viu nenhum numa disputa com a bola a correr. Seguem quase sempre a mesma gramática:

1. **Entrada:** um corte seco para um plano 2–2,5 vezes mais próximo e mais baixo. A bancada sai do quadro e fica só o muro. Mesmo a 30 fps não há frames intermédios.
2. **Zoom:** a câmara aproxima-se mais cerca de 2 vezes em 0,5 s, primeiro depressa e depois devagar.
3. **Pausa:** o plano fica parado 1–1,5 s, mais se houver uma faixa com o nome do jogador.
4. **Saída**, de uma de duas maneiras:
   - um zoom-out rápido, de 0,2–0,3 s, que acaba num corte para o plano largo (pontapé de saída, cartão vermelho);
   - um corte seco para preto e um fundido linear de 1,0–1,2 s a partir do preto (sorteio, cartão amarelo, fora de jogo). O preto entra de uma vez, sem fade de saída. Parece servir para esconder o salto dos jogadores para as posições do recomeço, mas isto não está confirmado.

Exceções:

- **Canto:** o zoom para a bandeirola é contínuo, sem corte, cerca de 3 vezes em 0,6 s. Depois a câmara volta a seguir a bola com um zoom-out de 0,6 s ([canto-grande-plano-e-cruzamento](sequencias/jogo-camara/canto-grande-plano-e-cruzamento/README.md)).
- **Fiscal de linha:** os botões redondos saem pela direita; nos outros grandes planos ficam no ecrã ([fora-de-jogo-fiscal-e-linha](sequencias/jogo-camara/fora-de-jogo-fiscal-e-linha/README.md)).

Sequências: [sorteio-zoom-e-fade](sequencias/jogo-camara/sorteio-zoom-e-fade/README.md), [pontape-de-saida-corte-e-zoom-out](sequencias/jogo-camara/pontape-de-saida-corte-e-zoom-out/README.md), [cartao-vermelho-corte](sequencias/jogo-camara/cartao-vermelho-corte/README.md), [cartao-amarelo-zoom-e-saida](sequencias/jogo-camara/cartao-amarelo-zoom-e-saida/README.md).

### Repetições ([jogo/replay](jogo/replay/README.md))

- **Letreiro:** «REPLAY» em branco no canto superior esquerdo, a piscar a 1 Hz, 0,5 s aceso e 0,5 s apagado.
- **Entrada e saída:** sempre pelo preto, com um corte seco e um fundido de cerca de 1 s. Não há faixas nem cortinas.
- **Interface:** não tem marcador nem botões redondos. Em baixo há uma linha branca fina, a barra de tempo, e o botão ▶ verde, que fica amarelo quando se toca nele ([repeticao-golo-saida](sequencias/jogo-camara/repeticao-golo-saida/README.md)).
- **Ângulo:** depende da repetição.
  - A de um golo usa um plano alto e diagonal a partir de um canto, que desliza devagar sem zoom. Às vezes a câmara fica baixa, atrás da área, com as placas de publicidade («SHOOT!/GOAL!») ao fundo.
  - A de um fora de jogo usa um plano lateral quase igual ao do jogo, começa congelada cerca de 2 s com uma linha vermelha vertical em perspetiva, e só depois a jogada corre.

### Desempate por penáltis

- **Entrada:** é a única passagem com fade de saída e de entrada, 0,5 s cada.
- **Câmara:** depois de 1,5 s com as equipas alinhadas no meio-campo, inclina-se e recua em 0,4 s até ficar atrás e por cima da baliza, a olhar para o campo. Fica fixa em todos os penáltis: o batedor vem do topo do ecrã e a bola vem na direção da câmara.
- **Interface:** a ficha do batedor troca de canto conforme a equipa, num fundido cruzado de 0,3 s. O quadro em baixo marca ○ verde ou × vermelho, sem animação ([penaltis-entrada-desempate](sequencias/jogo-camara/penaltis-entrada-desempate/README.md), [penaltis-remate-camara-fixa](sequencias/jogo-camara/penaltis-remate-camara-fixa/README.md)).
- **Penáltis durante o jogo:** não apareceram em nenhum vídeo.

## Marcador e golo ([jogo/golo](jogo/golo/README.md), [jogo/placar-resultado](jogo/placar-resultado/README.md), [sequencias/golo-festejo](sequencias/golo-festejo/))

- **Barra do marcador:** fina e escura, no topo. Mostra a abreviatura de cada equipa, o resultado numa cápsula e o relógio, com os descontos em «+N». O relógio não para nos grandes planos.
- **Resultado gigante:** algarismos em blocos com contorno preto, a meio do campo. O da equipa que marcou fica amarelo ou laranja e o outro branco. É igual no golo marcado e no sofrido.
- **Como entra** ([resultado-entra-golo-sofrido](sequencias/golo-festejo/resultado-entra-golo-sofrido/README.md)):
  - por um corte seco, a 100 %, ainda com o resultado antigo e os dois algarismos brancos;
  - 0,33 s depois, só o algarismo novo troca, já amarelo e a cerca de 125 %;
  - fica assim 0,33 s e encolhe para 100 % em 0,3 s, a abrandar.
- **Por cima do resultado:** duas faixas escuras finas, cada uma com o emblema e o nome de uma equipa. Entram com o resultado e não se mexem.
- **Saída:** um corte seco para preto, sem escala nem fade, ao fim de 2,4 a 6,8 s.
- **«ゴール!!»:** não é do jogo. É uma legenda de um youtuber, em letra de sistema, que continua por cima do preto e da claque (CtR9CmLxZ9I, de 381 s a 388 s).
- **Câmara no golo:** nos vídeos de 2025 fica larga e não muda. Nos de 2019 e 2021 faz um zoom rápido sobre os marcadores quando aparece o resultado. Pode ser da versão do jogo ou de uma opção ([festejo-zoom-saltos](sequencias/golo-festejo/festejo-zoom-saltos/README.md)).
- **Festejos** ([jogo/festejo](jogo/festejo/README.md)), vistos por baixo do resultado:
  - saltos no lugar com os dois braços no ar ([festejo-zoom-saltos](sequencias/golo-festejo/festejo-zoom-saltos/README.md));
  - correr a socar o ar, juntar numa fila e mergulhar de barriga em cadeia ([festejo-mergulho-em-fila](sequencias/golo-festejo/festejo-mergulho-em-fila/README.md));
  - nos vídeos de 2025, os bonecos levantam os braços onde estão, vistos de longe.
- **A seguir ao resultado:** a claque, a repetição e a ficha do marcador. A ordem e as durações estão em [fluxos-ui.md](fluxos-ui.md).

## Habilidades e combinações ([jogo/habilidade-especial](jogo/habilidade-especial/README.md))

- **Cartas:** duas ou três cartas ilustradas pequenas no canto inferior esquerdo, com moldura vermelha, azul ou amarela: as cartas que fazem o combo. Aparecem de uma vez, sem animação.
- **Nome:** em amarelo grosso com contorno, encostado à direita em baixo, por exemplo «ノールックパス» (passe sem olhar) ou «バナナシュート» (remate em arco). Começa 0,2 s depois das cartas e escreve-se da esquerda para a direita, cada letra num fade de 2–3 frames. Leva cerca de 0,7 s, seja qual for o comprimento. Por baixo entra pela direita uma faixa branca translúcida ([habilidade-entrada-cartas-nome](sequencias/golo-festejo/habilidade-entrada-cartas-nome/README.md), [habilidade-banana-canto](sequencias/golo-festejo/habilidade-banana-canto/README.md)).
- **No campo:** nada muda. O relógio, a câmara e o jogo seguem normais, sem abrandamento, zoom nem efeito. Os zooms com desfoque de alguns vídeos curtos parecem ser da edição.
- **Duração:** as cartas e o nome ficam a jogada toda. Se dá golo, ficam por baixo do resultado gigante; na repetição fica só o nome.

## Transições entre ecrãs

- **Quase tudo é um fundido para preto.** Nos menus, 0,6–0,8 s ao todo. À volta do jogo, 0,9–1,3 s a escurecer, 0,2–0,5 s de preto e 0,7–1 s a clarear. Os pormenores estão em [fluxos-ui.md](fluxos-ui.md).
- **Clarão branco:** só nos momentos de título, antes da bancada em festa e antes do painel ([apito-final-titulo](sequencias/entrada-saida/apito-final-titulo/README.md)).
- **Antevisão:** as faixas entram a abrandar e saem a acelerar, por cima do estádio 3D, que se mexe devagar ([antevisao-faixas-entram](sequencias/entrada-saida/antevisao-faixas-entram/README.md)).
- **Janela do resumo:** cresce do centro do campo desenhado, de forma linear, em 0,6 s ([fim-para-resumo](sequencias/entrada-saida/fim-para-resumo/README.md)).

## Estádios e relvado

- **Relvado:** verde vivo e liso, com riscas largas, círculos concêntricos, xadrez ou losangos. Nos campos pequenos aparece gasto, com manchas de terra.
- **Variedade de estádios:**
  - pista de atletismo vermelha, azul ou castanha;
  - muro de pedra ou cinzento, bancada pequena, ou campo sem bancada;
  - nas taças internacionais, bancadas altas com arcadas;
  - placas de publicidade coloridas.
- **Luz:** há jogos de dia e à noite.
- **Público:** pixel art numa faixa no topo do ecrã. Atrás da baliza há uma claque com bandeiras do emblema.
- **Claque:** câmara baixa e fixa, de frente para a baliza do fundo. Num golo marcado, seis bandeiras brancas enormes com o emblema balançam em arco, cerca de um vaivém por segundo, e os adeptos saltam. Num golo sofrido a claque é a mesma, sem bandeiras e quieta. Num estádio grande é filmada de cima, na diagonal. O céu segue a hora do jogo.
- **Balões dos adeptos:** amarelos com bicos para os gritos («いいぞっ»), ovais brancos com contorno para os comentários («おっと», «うむむ…»). Cada balão fica cerca de 1 s.

## Bonecos e retratos

- **Dois estilos lado a lado:**
  - no campo, bonecos pequenos e cabeçudos em pixel art;
  - fora do campo, retratos grandes em desenho vetorial cartoon, com contorno grosso (adjunto, secretária, jogadores).
- **Contraste:** o choque entre os dois estilos é de propósito.
- **Nomes dos jogadores:** etiqueta por cima de cada um, com o número num quadrado de cor e o nome em fundo claro. No golo e no recomeço acendem-se as etiquetas de todos durante um momento.
- **Ficha do marcador:** caixa verde-escura translúcida com cantos arredondados, retrato vetorial à esquerda e texto branco.

## Interface

- **Cor de base:** verde.
  - Botões redondos verdes com seta, para avançar e para voltar.
  - Botões redondos com ícone e o rótulo por baixo.
- **Molduras:** creme, azul claro, verde ou laranja, com os cantos arredondados.
- **Diálogos:** barra preta translúcida, com o nome da personagem numa etiqueta e uma seta para continuar. Aparecem e desaparecem num fade de 0,2–0,3 s, e o texto escreve-se a cerca de 25 caracteres por segundo.
- **Resposta ao toque:** o botão fica amarelo vivo durante um frame, sem escala nem afundar ([ficha-jogador-fechar-abrir](sequencias/menus-transicoes/ficha-jogador-fechar-abrir/README.md)).
- **Botões redondos laterais:** entram e saem a rolar, a rodar 90° em cerca de 0,3 s, e abrandam no fim ([escritorio-cidade-treino](sequencias/menus-transicoes/escritorio-cidade-treino/README.md)).
- **Curvas de animação:** os fades são lineares. Os deslizes e os botões abrandam no fim, e as faixas que saem aceleram. Só o cartão do próximo jogo e o algarismo do golo ressaltam ou encolhem com escala.
- **Fundos de recompensa:** favos hexagonais (amarelos ou azuis) no combo de cartas, e raios amarelos e laranja com silhuetas brancas no «SPECIAL MENU».
- **Notas em letra:** grossas, em itálico e coloridas. S e A em laranja, B e C em azul, E em cinzento.
- **Posições com cor fixa:** GK roxo ou rosa, DF vermelho, MF laranja ou amarelo, FW azul.
- **Tipografia:** sem serifa e branca, com contorno nos títulos. Os títulos usam faixas vermelhas com letras douradas. Na cerimónia o painel é o ecrã gigante do estádio, verde-claro na liga e cinzento-escuro na taça, e só a palavra do título é dourada ([painel-trofeu-liga](sequencias/entrada-saida/painel-trofeu-liga/README.md)).
- **Logótipo:** amarelo e vermelho, com contorno preto.
- **Vertical:** há gravações em vertical, com o marcador ao longo do lado ([jogo/camara-geral](jogo/camara-geral/README.md)). O jogo funciona deitado e de pé.
