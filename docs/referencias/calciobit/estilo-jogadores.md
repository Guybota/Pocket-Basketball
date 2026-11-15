# Os jogadores de corpo inteiro do Calciobit A

Estudo dos bonecos de pé na fila do treino (e nas cartas), para desenhar os nossos com o mesmo acabamento, mas originais. Imagens: [treino-01, 02, 06, 10, 11, 21, 22](menu/treino/), [cartas-habilidades-03, 05 a 08](menu/cartas-habilidades/), e as sequências [treino-entrada-centro-e-fila](sequencias/menus-transicoes/treino-entrada-centro-e-fila/), [treino-fila-trocar-jogador](sequencias/menus-transicoes/treino-fila-trocar-jogador/) e [treino-normal-jogador-ja-treinado](sequencias/menus-transicoes/treino-normal-jogador-ja-treinado/). Medido com PIL em capturas de 800×450, que são JPEG de vídeo, por isso as medidas valem ±1 px.

Estuda-se a abordagem (proporções, leitura, acabamento). As caras, os penteados e as personagens não se copiam. O gerador está em [src/ui/art/figure-svg.ts](../../../src/ui/art/figure-svg.ts).

## Tamanho e proporções

- **No ecrã:** na fila, cada boneco mede ~173–177 px de altura num ecrã de 450, ou seja ~39 % da altura. O primeiro da fila, o selecionado, aparece ~1,8 vezes maior, cortado pelas gavetas de cartas. Os outros encolhem um pouco em perspetiva.
- **Cabeça:** ~72 px em 177, ou seja ~2,45 cabeças de altura (0,41 da altura). A cara é quase tão larga como os ombros (cabeça/ombros ≈ 0,93–1,0).
- **Corpo:** tronco curto e pernas curtas. Do fim dos calções ao chão vai ~25 % da altura. As meias e as botas são grandes e pesadas.

## Cabeça e cara

- **Forma:** larga nas maçãs do rosto, com os lados quase retos e o queixo arredondado. Varia entre cabeças mais longas e mais largas.
- **Olhos:** pequenos, amendoados, com branco e íris escura, e uma pálpebra de cima marcada a tinta. Ficam pouco abaixo do meio da cabeça.
- **Sobrancelhas:** grossas, escuras e muitas vezes inclinadas («sérias»). São elas que dão a expressão.
- **Nariz:** desenhado a traço, com a cana e a base em «U» com narinas. É dos traços mais fortes da cara.
- **Boca:** uma linha curta. Às vezes tem uma prega ou um sorriso discreto. Quase todos estão sérios ou neutros, nunca tristes.
- **Orelhas:** grandes, em semicírculo, de lado, com uma curva interior.

## Cabelo

- **Tipos:** curto com franja, risca, espetado, encaracolado, comprido até aos ombros, grisalho e louro.
- **Desenho:** a borda é irregular, com madeixas que partem a silhueta em cima e nos lados. Cobre o cimo das orelhas e tem traços interiores de madeixa.

## Contorno e sombreamento

- **Contorno:** quase preto e quente. Tem ~1,5 px a 800 de largura (~0,9 % da altura), é mais grosso na silhueta e mais fino por dentro.
- **Tons:** 2 a 3 por material, em cores planas:
  - a pele é quase lisa, com uma sombra sob o queixo e no pescoço;
  - a camisola tem pregas e uma sombra nos lados;
  - os calções têm uma prega ao meio.

## Corpo e equipamento

- **Pose de fila:** de pé, de frente, com as mãos atrás das costas. Vê-se o braço até ao cotovelo e o punho espreita junto à anca. Os pés ficam afastados à largura dos ombros.
- **Equipamento:** é de futebol: camisola de manga comprida (às vezes com uma risca vertical), calções lisos, meias até ao joelho com remate e botas pretas. Os suplentes usam colete com «SUB».
- **Pele:** quatro ou cinco tons, do claro ao muito escuro.

## Variação entre jogadores

Na mesma equipa mudam a cara, o cabelo e a cor da pele e do cabelo. A roupa e a pose ficam iguais. A altura muda pouco na fila. Na mesma folha não há dois jogadores iguais.

## O jogador «escurecido»

Quem já treinou nessa semana fica escurecido ([cartas-habilidades-08](menu/cartas-habilidades/cartas-habilidades-08.jpg), [treino-11](menu/treino/treino-11.jpg)):

- **Escurecimento:** ~0,40 de multiplicação. A camisola verde passa de 174 a 67 no G e a meia amarela fica a ~0,39.
- **Contorno e matiz:** o contorno continua preto e o matiz fica quente.
- **Carimbo:** branco no peito, «特訓済» (já treinado).

## O nosso jogador (figure-svg.ts)

- **O que se aproveita do Calciobit:**
  - a cabeça grande (~2,5 a 2,9 cabeças, com a cabeça igual em todos e a altura no corpo);
  - o contorno mais grosso por fora;
  - 2 a 3 tons planos com luz de cima à esquerda;
  - olhos com branco;
  - a pose de mãos atrás das costas;
  - o escurecido quente, com o contorno sem escurecer.
- **O que é nosso:**
  - o equipamento de basquetebol: camisola sem mangas com debrum, número em letra própria, calções ao joelho com faixa lateral, meias e sapatilhas de cano alto;
  - a construção das caras, a partir dos bits de `look.face` (os mesmos do retrato): 4 cabeças, 4 olhos, 4 narizes, bocas, barbas;
  - os cabelos (curto com quatro franjas, comprido, corte alto, afro, caracóis curtos, careca, rapado, fita);
  - a tinta `#1b2230`.
- **O selo «treinado»:** fica para o ecrã, não para o boneco.
- **Folha e comparação:** `node src/tools/figuras-svg.ts [ronda]` grava em `dist-check/figuras-svg/` e confirma que nenhuma cara sai da caixa do desenho.
