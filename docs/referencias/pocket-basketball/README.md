# Referências do Pocket Basketball em movimento

O mesmo levantamento que se fez ao Calciobit A em [../calciobit/sequencias/](../calciobit/sequencias/), agora no nosso jogo: as animações, a câmara e as transições, gravadas em vídeo e cortadas em sequências de frames. Serve para comparar os dois jogos lado a lado. A comparação, com as lacunas por prioridade, está em [comparacao-calciobit.md](comparacao-calciobit.md).

## Como foi feito

- **Gravação:** `npm run sequences` (`src/tools/sequences.ts`) abre o jogo no Edge, em 1280×720, e percorre-o como um jogador: menus, um jogo inteiro, as paragens, o fim do jogo e uma final que dá o título. Grava tudo em tempo real e guarda o segundo de cada momento em `dist-check/sequencias/marcas.json`. A gravação foi feita no commit 2de1e62.
- **Momentos:** dentro do jogo, o script salta de momento em momento com a API de depuração (`pauseAt`). Os cortes entre momentos são do script, não do jogo, e os README dizem quando isso acontece.
- **Extração:** as sequências foram tiradas dos vídeos com o mesmo extrator do Calciobit, em frames de 640×360. Cada pasta tem os frames, uma `_folha.jpg` numerada e um `README.md` frame a frame, com a ligação à sequência do Calciobit que lhe corresponde.
- **fps:** 10 para câmara e transições, 30 para animações curtas, como no Calciobit. Quatro sequências compridas e quase paradas estão a 5 fps para caber na quota; o README de cada uma diz porquê.
- **Total:** 28 sequências, cerca de 21 MB.

## Limites da gravação

- **O vídeo só tem imagens quando o ecrã muda.** O browser manda uma imagem a cada mudança, até 25 por segundo. Um ecrã parado não deixa imagens, por isso as sequências a 30 fps têm frames repetidos e um fundido muito curto pode não se ver. As durações estão certas; os agentes confirmaram-nas imagem a imagem e no código.
- **Os toques são do script.** Um clique automático dura poucos milissegundos, por isso a falta de resposta ao toque nos botões tem de ser confirmada com o dedo.
- **Ficou por gravar:** o roubo e o desarme com o jogo a correr (saíram congelados ou cortados), um choque com alguém no chão, o fim de um desconto, uma derrota, um jogo fora, o prolongamento, «Passar a semana» a sério, perguntas sim/não, o esquema vertical e o som.

## Sequências

### Jogo e câmara

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Ressalto e afundanço: a câmara não reage ao cesto](sequencias/jogo-camara/cesto-sem-corte/README.md) | 2,8 s | 10 | 28 | [ver](sequencias/jogo-camara/cesto-sem-corte/_folha.jpg) |
| [Desconto de tempo: zoom contínuo para o banco](sequencias/jogo-camara/desconto-zoom-ao-banco/README.md) | 1,0 s | 30 | 30 | [ver](sequencias/jogo-camara/desconto-zoom-ao-banco/_folha.jpg) |
| [Falta e lance livre: tudo no plano de jogo](sequencias/jogo-camara/falta-e-lances-livres-plano-fixo/README.md) | 6,0 s | 5 | 30 | [ver](sequencias/jogo-camara/falta-e-lances-livres-plano-fixo/_folha.jpg) |
| [Mudança de lado: a câmara desliza e roda de um cesto ao outro](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/README.md) | 3,8 s | 10 | 38 | [ver](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/_folha.jpg) |
| [Repetição: o triplo e a saída por corte](sequencias/jogo-camara/repeticao-cesto-e-saida/README.md) | 1,8 s | 10 | 18 | [ver](sequencias/jogo-camara/repeticao-cesto-e-saida/_folha.jpg) |
| [Repetição: entrada por corte seco](sequencias/jogo-camara/repeticao-entrada-corte/README.md) | 1,7 s | 10 | 17 | [ver](sequencias/jogo-camara/repeticao-entrada-corte/_folha.jpg) |

### Cesto e festejo

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Afundanço de Força: dois avisos seguidos para a mesma jogada](sequencias/cesto-festejo/afundanco-de-forca/README.md) | 2,7 s | 10 | 27 | [ver](sequencias/cesto-festejo/afundanco-de-forca/_folha.jpg) |
| [Afundanço: aviso, «+2», balão e tremor no mesmo frame](sequencias/cesto-festejo/afundanco-tremor-e-aviso/README.md) | 1,6 s | 25 | 40 | [ver](sequencias/cesto-festejo/afundanco-tremor-e-aviso/_folha.jpg) |
| [Cesto normal: «+2» ao lado do aro e o jogo continua](sequencias/cesto-festejo/cesto-normal-mais-dois/README.md) | 3,0 s | 10 | 30 | [ver](sequencias/cesto-festejo/cesto-normal-mais-dois/_folha.jpg) |
| [Movimento especial: crossover, palavra e aviso](sequencias/cesto-festejo/crossover-palavra-e-aviso/README.md) | 3,0 s | 10 | 30 | [ver](sequencias/cesto-festejo/crossover-palavra-e-aviso/_folha.jpg) |
| [Repetição do lance decisivo, no relatório](sequencias/cesto-festejo/repeticao-lance-decisivo/README.md) | 3,0 s | 10 | 30 | [ver](sequencias/cesto-festejo/repeticao-lance-decisivo/_folha.jpg) |

### Entrada e saída

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Do balneário à apresentação dos cinco](sequencias/entrada-saida/balneario-para-apresentacao/README.md) | 2,2 s | 10 | 22 | [ver](sequencias/entrada-saida/balneario-para-apresentacao/_folha.jpg) |
| [Os cinco entram em campo e a bola ao alto](sequencias/entrada-saida/bola-ao-alto/README.md) | 7,2 s | 5 | 36 | [ver](sequencias/entrada-saida/bola-ao-alto/_folha.jpg) |
| [Fim com título: a cerimónia do troféu](sequencias/entrada-saida/cerimonia-do-titulo/README.md) | 6,0 s | 5 | 30 | [ver](sequencias/entrada-saida/cerimonia-do-titulo/_folha.jpg) |
| [Da cidade ao balneário](sequencias/entrada-saida/cidade-para-balneario/README.md) | 0,4 s | 30 | 12 | [ver](sequencias/entrada-saida/cidade-para-balneario/_folha.jpg) |
| [Fim de jogo normal: passagem para o relatório](sequencias/entrada-saida/fim-do-jogo-para-relatorio/README.md) | 1,8 s | 10 | 18 | [ver](sequencias/entrada-saida/fim-do-jogo-para-relatorio/_folha.jpg) |
| [Fim do 1.º período](sequencias/entrada-saida/fim-do-periodo-1/README.md) | 2,8 s | 5 | 14 | [ver](sequencias/entrada-saida/fim-do-periodo-1/_folha.jpg) |
| [Intervalo: regresso ao campo](sequencias/entrada-saida/intervalo-regresso/README.md) | 1,6 s | 10 | 16 | [ver](sequencias/entrada-saida/intervalo-regresso/_folha.jpg) |
| [Intervalo: do campo ao balneário](sequencias/entrada-saida/intervalo-saida-para-balneario/README.md) | 2,0 s | 10 | 20 | [ver](sequencias/entrada-saida/intervalo-saida-para-balneario/_folha.jpg) |

### Menus e transições

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Da cidade ao escritório e do escritório ao mercado](sequencias/menus-transicoes/cidade-escritorio-mercado/README.md) | 2,2 s | 10 | 22 | [ver](sequencias/menus-transicoes/cidade-escritorio-mercado/_folha.jpg) |
| [Da cidade à federação](sequencias/menus-transicoes/cidade-para-federacao/README.md) | 0,6 s | 30 | 18 | [ver](sequencias/menus-transicoes/cidade-para-federacao/_folha.jpg) |
| [Da cidade ao pavilhão, em semana de jogo](sequencias/menus-transicoes/cidade-para-pavilhao/README.md) | 0,6 s | 30 | 17 | [ver](sequencias/menus-transicoes/cidade-para-pavilhao/_folha.jpg) |
| [Da cidade ao treino](sequencias/menus-transicoes/cidade-para-treino/README.md) | 0,6 s | 30 | 17 | [ver](sequencias/menus-transicoes/cidade-para-treino/_folha.jpg) |
| [Mercado: abrir um jogador e contratar](sequencias/menus-transicoes/mercado-abrir-e-contratar/README.md) | 1,6 s | 10 | 16 | [ver](sequencias/menus-transicoes/mercado-abrir-e-contratar/_folha.jpg) |
| [Do ecrã-título ao «criar clube»](sequencias/menus-transicoes/titulo-para-criar-clube/README.md) | 0,5 s | 30 | 15 | [ver](sequencias/menus-transicoes/titulo-para-criar-clube/_folha.jpg) |
| [Treino: três cartas fazem um combo secreto](sequencias/menus-transicoes/treino-combo-de-cartas/README.md) | 1,8 s | 30 | 55 | [ver](sequencias/menus-transicoes/treino-combo-de-cartas/_folha.jpg) |
| [Do resultado do treino de volta à cidade](sequencias/menus-transicoes/treino-para-cidade/README.md) | 1,7 s | 10 | 17 | [ver](sequencias/menus-transicoes/treino-para-cidade/_folha.jpg) |
| [Treino: escolher cartas](sequencias/menus-transicoes/treino-toque-nas-cartas/README.md) | 0,7 s | 30 | 22 | [ver](sequencias/menus-transicoes/treino-toque-nas-cartas/_folha.jpg) |
