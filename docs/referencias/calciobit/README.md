# Referências visuais: Calciobit A (telemóvel)

Imagens do **Calciobit A** (カルチョビットA, iOS e Android), o jogo japonês de gestão de futebol para telemóvel. Não são do Calciobit de GBA nem do 3DS. Servem para estudar como um jogo do género organiza os menus, os fluxos e a câmara num ecrã só, em vez de copiarmos a estrutura de ecrã duplo do 3DS.

**Só referência.** A regra [«Original, não cópia»](../../../AGENTS.md) continua: nada destas imagens (arte, logótipos, nomes, textos) entra no jogo. Copia-se a ideia de organização, nunca o aspeto.

## O que há aqui

- **[fluxos-ui.md](fluxos-ui.md):** o caminho entre ecrãs, que botões há em cada menu e a ordem antes, durante e depois de um jogo.
- **[camara-e-estilo.md](camara-e-estilo.md):** a câmara do jogo, o marcador, os golos e o estilo visual (cores, molduras, tipografia).
- **Uma pasta por ecrã**, em `menu/`, `jogo/` e `cena/`. Cada uma tem um `README.md` com cada imagem, a descrição, as etiquetas e a origem, mais uma `_folha.jpg` com todas as imagens juntas. Para um agente, a folha basta para ver o ecrã de uma vez.
- **[sequencias/](#sequências):** 36 sequências de frames tiradas dos vídeos, com as animações, os movimentos de câmara e as transições. Cada uma tem uma `_folha.jpg` numerada e um `README.md` frame a frame.
- **[catalogo-completo.jsonl](catalogo-completo.jsonl):** as 1141 imagens classificadas, incluindo as que não ficaram aqui, com a ligação à miniatura original no YouTube. Uma linha JSON por imagem: `categoria`, `ecra`, `etiquetas`, `descricao`, `qualidade`, `overlay`, `video`, `miniatura`.

## Como foi feito (e os limites)

- Em 10 de novembro de 2026, 18 pesquisas no YouTube deram 369 vídeos do Calciobit A, com os do 3DS e do GBA deixados de fora.
- **Imagens soltas:** o YouTube não deixou a sessão na nuvem descarregar vídeos. Para as pastas de ecrã usaram-se só as imagens públicas de cada vídeo: a capa e três frames automáticos a 25 %, 50 % e 75 % da duração. A origem de cada imagem leva o segundo aproximado do vídeo.
- **Sequências:** as animações, os movimentos de câmara e as transições vieram depois, de vídeos descarregados num computador local (ver [Sequências](#sequências)).
- Das 1476 imagens tiraram-se as quase iguais e ficaram 1141. Quatro agentes classificaram-nas pela taxonomia abaixo.
- Aqui ficaram as 420 melhores: sem capas e, fora dos menus, sem texto do youtuber por cima, com no máximo duas por vídeo em cada ecrã. Estão reduzidas a 800×450.
- A classificação foi feita pelas miniaturas. Algum texto japonês pequeno pode estar mal lido, e as fronteiras entre ecrãs vizinhos (camara-geral e interface-durante-jogo, golo e festejo) são uma decisão de quem classificou.

## Como procurar

- **Por ecrã:** usa as tabelas abaixo, ou abre a `_folha.jpg` da pasta.
- **Por etiqueta:** usa a tabela de etiquetas, ou procura no catálogo, por exemplo `grep '"placar"' catalogo-completo.jsonl`.
- **Nomes dos ficheiros:** `<ecra>/<ecra>-NN.jpg`. O número só ordena: as primeiras de cada pasta são as de melhor qualidade.

## Sequências

Sequências de frames tiradas dos vídeos, para estudar o que as imagens soltas não mostram: animações, movimentos de câmara e transições entre ecrãs. Foram extraídas em 10 de novembro de 2026 de 17 vídeos de oito canais, descarregados a 720p e apagados no fim.

- **Organização:** `sequencias/<area>/<nome>/`, com `frame-0001.jpg`… a 640×360, uma `_folha.jpg` com os frames numerados e um `README.md`.
- **README de cada sequência:** o que acontece frame a frame, a duração, o fps e a origem, com a ligação ao segundo do vídeo e as etiquetas.
- **fps:** 10 para movimentos de câmara e transições, 30 para animações curtas. Para medir uma duração, conta os frames e divide pelo fps.
- **Total:** 36 sequências, cerca de 32 MB. As conclusões estão em [fluxos-ui.md](fluxos-ui.md) e [camara-e-estilo.md](camara-e-estilo.md).

### Jogo e câmara

Em [sequencias/jogo-camara/](sequencias/jogo-camara/): como a câmara segue a bola, os grandes planos, a repetição e os penáltis.

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Canto: zoom para a bandeirola e cruzamento](sequencias/jogo-camara/canto-grande-plano-e-cruzamento/README.md) | 3,4 s | 10 | 34 | [ver](sequencias/jogo-camara/canto-grande-plano-e-cruzamento/_folha.jpg) |
| [Cartão amarelo: corte, zoom, faixa e saída pelo preto](sequencias/jogo-camara/cartao-amarelo-zoom-e-saida/README.md) | 5,2 s | 10 | 52 | [ver](sequencias/jogo-camara/cartao-amarelo-zoom-e-saida/_folha.jpg) |
| [Cartão vermelho: corte e zoom para o árbitro](sequencias/jogo-camara/cartao-vermelho-corte/README.md) | 2,8 s | 10 | 28 | [ver](sequencias/jogo-camara/cartao-vermelho-corte/_folha.jpg) |
| [Fora de jogo: fiscal de linha, preto e repetição com a linha](sequencias/jogo-camara/fora-de-jogo-fiscal-e-linha/README.md) | 5,6 s | 10 | 56 | [ver](sequencias/jogo-camara/fora-de-jogo-fiscal-e-linha/_folha.jpg) |
| [Desempate por penáltis: entrada e câmara fixa](sequencias/jogo-camara/penaltis-entrada-desempate/README.md) | 3,4 s | 10 | 34 | [ver](sequencias/jogo-camara/penaltis-entrada-desempate/_folha.jpg) |
| [Penálti: remate com a câmara fixa](sequencias/jogo-camara/penaltis-remate-camara-fixa/README.md) | 3,5 s | 10 | 35 | [ver](sequencias/jogo-camara/penaltis-remate-camara-fixa/_folha.jpg) |
| [Do plano largo ao plano diagonal, sem corte](sequencias/jogo-camara/plano-largo-para-diagonal/README.md) | 3,0 s | 10 | 30 | [ver](sequencias/jogo-camara/plano-largo-para-diagonal/_folha.jpg) |
| [Pontapé de saída: corte, zoom e saída pelo zoom-out](sequencias/jogo-camara/pontape-de-saida-corte-e-zoom-out/README.md) | 2,8 s | 10 | 28 | [ver](sequencias/jogo-camara/pontape-de-saida-corte-e-zoom-out/_folha.jpg) |
| [Repetição de golo: «REPLAY» a piscar e saída pelo preto](sequencias/jogo-camara/repeticao-golo-saida/README.md) | 3,8 s | 10 | 38 | [ver](sequencias/jogo-camara/repeticao-golo-saida/_folha.jpg) |
| [Sorteio: corte, zoom e corte a preto](sequencias/jogo-camara/sorteio-zoom-e-fade/README.md) | 3,7 s | 10 | 37 | [ver](sequencias/jogo-camara/sorteio-zoom-e-fade/_folha.jpg) |

### Golo e festejo

Em [sequencias/golo-festejo/](sequencias/golo-festejo/): o resultado gigante, a claque, a repetição do golo, os festejos e as habilidades especiais.

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Claque depois de um golo marcado](sequencias/golo-festejo/claque-golo-marcado/README.md) | 4,9 s | 10 | 49 | [ver](sequencias/golo-festejo/claque-golo-marcado/_folha.jpg) |
| [Claque depois de um golo sofrido](sequencias/golo-festejo/claque-golo-sofrido/README.md) | 4,4 s | 10 | 44 | [ver](sequencias/golo-festejo/claque-golo-sofrido/_folha.jpg) |
| [Festejo em fila com mergulho](sequencias/golo-festejo/festejo-mergulho-em-fila/README.md) | 5,3 s | 10 | 53 | [ver](sequencias/golo-festejo/festejo-mergulho-em-fila/_folha.jpg) |
| [Festejo com zoom: saltos de braços no ar](sequencias/golo-festejo/festejo-zoom-saltos/README.md) | 3,4 s | 10 | 34 | [ver](sequencias/golo-festejo/festejo-zoom-saltos/_folha.jpg) |
| [Habilidade num canto: duas cartas e um nome curto](sequencias/golo-festejo/habilidade-banana-canto/README.md) | 0,77 s | 30 | 23 | [ver](sequencias/golo-festejo/habilidade-banana-canto/_folha.jpg) |
| [Habilidade especial: as cartas e o nome a escrever-se](sequencias/golo-festejo/habilidade-entrada-cartas-nome/README.md) | 1,0 s | 30 | 30 | [ver](sequencias/golo-festejo/habilidade-entrada-cartas-nome/_folha.jpg) |
| [Regresso ao jogo e ficha do marcador](sequencias/golo-festejo/regresso-ficha-marcador/README.md) | 3,8 s | 10 | 38 | [ver](sequencias/golo-festejo/regresso-ficha-marcador/_folha.jpg) |
| [Resultado gigante: entrada e troca do algarismo](sequencias/golo-festejo/resultado-entra-golo-sofrido/README.md) | 1,13 s | 30 | 34 | [ver](sequencias/golo-festejo/resultado-entra-golo-sofrido/_folha.jpg) |

### Entrada e saída

Em [sequencias/entrada-saida/](sequencias/entrada-saida/): a antevisão, o túnel, o alinhamento, o intervalo, o fim do jogo e a cerimónia do título.

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Alinhamento até ao sorteio](sequencias/entrada-saida/alinhamento-ate-ao-sorteio/README.md) | 2,6 s | 10 | 26 | [ver](sequencias/entrada-saida/alinhamento-ate-ao-sorteio/_folha.jpg) |
| [Antevisão: as faixas entram](sequencias/entrada-saida/antevisao-faixas-entram/README.md) | 2,0 s | 10 | 20 | [ver](sequencias/entrada-saida/antevisao-faixas-entram/_folha.jpg) |
| [Antevisão: as faixas saem para a esquerda](sequencias/entrada-saida/antevisao-faixas-saem/README.md) | 2,4 s | 10 | 24 | [ver](sequencias/entrada-saida/antevisao-faixas-saem/_folha.jpg) |
| [Apito final do jogo do título](sequencias/entrada-saida/apito-final-titulo/README.md) | 5,8 s | 10 | 58 | [ver](sequencias/entrada-saida/apito-final-titulo/_folha.jpg) |
| [Fim de jogo normal: passagem para o resumo](sequencias/entrada-saida/fim-para-resumo/README.md) | 4,5 s | 10 | 45 | [ver](sequencias/entrada-saida/fim-para-resumo/_folha.jpg) |
| [Intervalo: ida ao balneário e regresso](sequencias/entrada-saida/intervalo-balneario-e-regresso/README.md) | 7,4 s | 10 | 74 | [ver](sequencias/entrada-saida/intervalo-balneario-e-regresso/_folha.jpg) |
| [Do mapa ao túnel «LIVE»](sequencias/entrada-saida/mapa-para-tunel-live/README.md) | 3,0 s | 10 | 30 | [ver](sequencias/entrada-saida/mapa-para-tunel-live/_folha.jpg) |
| [Mosaico «WE ARE THE CHAMPIONS»](sequencias/entrada-saida/mosaico-we-are-the-champions/README.md) | 2,4 s | 10 | 24 | [ver](sequencias/entrada-saida/mosaico-we-are-the-champions/_folha.jpg) |
| [Painel do título no ecrã gigante (liga)](sequencias/entrada-saida/painel-trofeu-liga/README.md) | 8,0 s | 10 | 80 | [ver](sequencias/entrada-saida/painel-trofeu-liga/_folha.jpg) |

### Menus e transições

Em [sequencias/menus-transicoes/](sequencias/menus-transicoes/): as mudanças de ecrã, a resposta ao toque, o mapa da cidade, a ficha, o treino com cartas e o mercado.

| Sequência | Duração | fps | Frames | Folha |
|---|---|---|---|---|
| [Taxa de apoio a subir, mapa e entrada no escritório](sequencias/menus-transicoes/apoio-adeptos-e-entrar-escritorio/README.md) | 3,8 s | 10 | 38 | [ver](sequencias/menus-transicoes/apoio-adeptos-e-entrar-escritorio/_folha.jpg) |
| [Mapa da cidade: avançar a semana até à semana de jogo](sequencias/menus-transicoes/cidade-avancar-semana/README.md) | 2,3 s | 10 | 23 | [ver](sequencias/menus-transicoes/cidade-avancar-semana/_folha.jpg) |
| [Do mapa da cidade à federação (N.LEAGUE) e o menu de separador](sequencias/menus-transicoes/cidade-entrar-federacao/README.md) | 1,9 s | 10 | 19 | [ver](sequencias/menus-transicoes/cidade-entrar-federacao/_folha.jpg) |
| [Do escritório ao mapa e do mapa ao treino](sequencias/menus-transicoes/escritorio-cidade-treino/README.md) | 4,6 s | 10 | 46 | [ver](sequencias/menus-transicoes/escritorio-cidade-treino/_folha.jpg) |
| [Ficha do jogador: fechar uma e abrir outra](sequencias/menus-transicoes/ficha-jogador-fechar-abrir/README.md) | 1,3 s | 30 | 39 | [ver](sequencias/menus-transicoes/ficha-jogador-fechar-abrir/_folha.jpg) |
| [Mercado: a secretária responde e o adjunto toma a palavra](sequencias/menus-transicoes/mercado-resposta-secretaria/README.md) | 2,8 s | 10 | 28 | [ver](sequencias/menus-transicoes/mercado-resposta-secretaria/_folha.jpg) |
| [Regresso ao mapa da cidade e o cartão do próximo jogo](sequencias/menus-transicoes/regresso-cidade-proximo-jogo/README.md) | 2,3 s | 10 | 23 | [ver](sequencias/menus-transicoes/regresso-cidade-proximo-jogo/_folha.jpg) |
| [Treino: três cartas fazem um combo e abrem o «SPECIAL MENU»](sequencias/menus-transicoes/treino-combo-cartas-special-menu/README.md) | 8,9 s | 10 | 89 | [ver](sequencias/menus-transicoes/treino-combo-cartas-special-menu/_folha.jpg) |
| [Treino: «SPECIAL MENU» descoberto](sequencias/menus-transicoes/treino-special-menu-descoberto/README.md) | 2,8 s | 10 | 28 | [ver](sequencias/menus-transicoes/treino-special-menu-descoberto/_folha.jpg) |

## Ecrãs
### Menus e ecrãs de gestão

| Ecrã | Imagens | Folha |
|---|---|---|
| [anuncio](menu/anuncio/README.md) | 1 | [ver](menu/anuncio/_folha.jpg) |
| [apresentacao-jogo](menu/apresentacao-jogo/README.md) | 5 | [ver](menu/apresentacao-jogo/_folha.jpg) |
| [calendario](menu/calendario/README.md) | 1 | [ver](menu/calendario/_folha.jpg) |
| [cartas-habilidades](menu/cartas-habilidades/README.md) | 8 | [ver](menu/cartas-habilidades/_folha.jpg) |
| [classificacao-liga](menu/classificacao-liga/README.md) | 7 | [ver](menu/classificacao-liga/_folha.jpg) |
| [dialogo-mensagem](menu/dialogo-mensagem/README.md) | 25 | [ver](menu/dialogo-mensagem/_folha.jpg) |
| [emblema-equipamento](menu/emblema-equipamento/README.md) | 10 | [ver](menu/emblema-equipamento/_folha.jpg) |
| [escritorio-clube](menu/escritorio-clube/README.md) | 25 | [ver](menu/escritorio-clube/_folha.jpg) |
| [ficha-equipa](menu/ficha-equipa/README.md) | 3 | [ver](menu/ficha-equipa/_folha.jpg) |
| [informacao-liga](menu/informacao-liga/README.md) | 1 | [ver](menu/informacao-liga/_folha.jpg) |
| [jogador-ficha](menu/jogador-ficha/README.md) | 25 | [ver](menu/jogador-ficha/_folha.jpg) |
| [mercado-transferencias](menu/mercado-transferencias/README.md) | 20 | [ver](menu/mercado-transferencias/_folha.jpg) |
| [plantel-lista](menu/plantel-lista/README.md) | 5 | [ver](menu/plantel-lista/_folha.jpg) |
| [pre-jogo](menu/pre-jogo/README.md) | 25 | [ver](menu/pre-jogo/_folha.jpg) |
| [relatorio-pos-jogo](menu/relatorio-pos-jogo/README.md) | 13 | [ver](menu/relatorio-pos-jogo/_folha.jpg) |
| [scout-recrutamento](menu/scout-recrutamento/README.md) | 1 | [ver](menu/scout-recrutamento/_folha.jpg) |
| [taticas-formacao](menu/taticas-formacao/README.md) | 10 | [ver](menu/taticas-formacao/_folha.jpg) |
| [titulo](menu/titulo/README.md) | 15 | [ver](menu/titulo/_folha.jpg) |
| [torneio-taca](menu/torneio-taca/README.md) | 4 | [ver](menu/torneio-taca/_folha.jpg) |
| [treino](menu/treino/README.md) | 25 | [ver](menu/treino/_folha.jpg) |

### Jogo (dentro do campo)

| Ecrã | Imagens | Folha |
|---|---|---|
| [adeptos-claque](jogo/adeptos-claque/README.md) | 9 | [ver](jogo/adeptos-claque/_folha.jpg) |
| [bola-parada](jogo/bola-parada/README.md) | 5 | [ver](jogo/bola-parada/_folha.jpg) |
| [camara-geral](jogo/camara-geral/README.md) | 20 | [ver](jogo/camara-geral/_folha.jpg) |
| [entrada-jogadores](jogo/entrada-jogadores/README.md) | 12 | [ver](jogo/entrada-jogadores/_folha.jpg) |
| [falta-cartao](jogo/falta-cartao/README.md) | 8 | [ver](jogo/falta-cartao/_folha.jpg) |
| [festejo](jogo/festejo/README.md) | 12 | [ver](jogo/festejo/_folha.jpg) |
| [fim-jogo](jogo/fim-jogo/README.md) | 5 | [ver](jogo/fim-jogo/_folha.jpg) |
| [golo](jogo/golo/README.md) | 15 | [ver](jogo/golo/_folha.jpg) |
| [habilidade-especial](jogo/habilidade-especial/README.md) | 12 | [ver](jogo/habilidade-especial/_folha.jpg) |
| [interface-durante-jogo](jogo/interface-durante-jogo/README.md) | 12 | [ver](jogo/interface-durante-jogo/_folha.jpg) |
| [intervalo](jogo/intervalo/README.md) | 12 | [ver](jogo/intervalo/_folha.jpg) |
| [placar-resultado](jogo/placar-resultado/README.md) | 10 | [ver](jogo/placar-resultado/_folha.jpg) |
| [replay](jogo/replay/README.md) | 10 | [ver](jogo/replay/_folha.jpg) |
| [substituicao](jogo/substituicao/README.md) | 9 | [ver](jogo/substituicao/_folha.jpg) |

### Cenas fora do campo

| Ecrã | Imagens | Folha |
|---|---|---|
| [carregamento](cena/carregamento/README.md) | 1 | [ver](cena/carregamento/_folha.jpg) |
| [cena-historia](cena/cena-historia/README.md) | 9 | [ver](cena/cena-historia/_folha.jpg) |
| [cerimonia-trofeu](cena/cerimonia-trofeu/README.md) | 14 | [ver](cena/cerimonia-trofeu/_folha.jpg) |
| [cidade-mapa](cena/cidade-mapa/README.md) | 12 | [ver](cena/cidade-mapa/_folha.jpg) |
| [creditos](cena/creditos/README.md) | 1 | [ver](cena/creditos/_folha.jpg) |
| [estadio-exterior](cena/estadio-exterior/README.md) | 2 | [ver](cena/estadio-exterior/_folha.jpg) |
| [sala-trofeus](cena/sala-trofeus/README.md) | 1 | [ver](cena/sala-trofeus/_folha.jpg) |

### Etiquetas

Cada etiqueta, com o número de imagens e os ecrãs onde aparece.

| Etiqueta | Imagens | Ecrãs |
|---|---|---|
| emblemas | 101 | adeptos-claque, apresentacao-jogo, calendario, cena-historia, cidade-mapa, classificacao-liga, emblema-equipamento, escritorio-clube … |
| placar | 77 | camara-geral, entrada-jogadores, falta-cartao, golo, habilidade-especial, interface-durante-jogo, intervalo, placar-resultado … |
| notas-letras | 72 | bola-parada, cartas-habilidades, jogador-ficha, mercado-transferencias, plantel-lista, scout-recrutamento, taticas-formacao, treino |
| relogio | 61 | camara-geral, entrada-jogadores, falta-cartao, golo, habilidade-especial, interface-durante-jogo, intervalo, placar-resultado … |
| camara-alta | 56 | bola-parada, camara-geral, entrada-jogadores, falta-cartao, fim-jogo, golo, habilidade-especial, interface-durante-jogo … |
| bancada | 55 | adeptos-claque, apresentacao-jogo, camara-geral, carregamento, estadio-exterior, festejo, golo, habilidade-especial … |
| isometrico | 55 | cena-historia, cidade-mapa, dialogo-mensagem, escritorio-clube, fim-jogo, intervalo, pre-jogo, relatorio-pos-jogo … |
| balneario | 44 | dialogo-mensagem, fim-jogo, intervalo, relatorio-pos-jogo, treino |
| botoes-laterais | 42 | bola-parada, camara-geral, entrada-jogadores, escritorio-clube, falta-cartao, habilidade-especial, intervalo, jogador-ficha … |
| treinador | 41 | bola-parada, cidade-mapa, dialogo-mensagem, escritorio-clube, fim-jogo, intervalo, jogador-ficha, mercado-transferencias … |
| dialogo | 39 | cena-historia, cidade-mapa, dialogo-mensagem, escritorio-clube, fim-jogo, mercado-transferencias, pre-jogo, relatorio-pos-jogo … |
| botao-voltar | 39 | cartas-habilidades, classificacao-liga, emblema-equipamento, escritorio-clube, habilidade-especial, interface-durante-jogo, jogador-ficha, mercado-transferencias … |
| baliza | 37 | adeptos-claque, bola-parada, camara-geral, festejo, golo, habilidade-especial, interface-durante-jogo, placar-resultado … |
| estadio | 34 | camara-geral, cidade-mapa, escritorio-clube, interface-durante-jogo, placar-resultado, pre-jogo, replay, substituicao |
| botao-avancar | 33 | carregamento, cerimonia-trofeu, festejo, fim-jogo, habilidade-especial, interface-durante-jogo, pre-jogo, replay |
| retrato | 30 | dialogo-mensagem, habilidade-especial, jogador-ficha, mercado-transferencias, treino |
| publicidade | 29 | adeptos-claque, anuncio, bola-parada, camara-geral, festejo, golo, habilidade-especial, interface-durante-jogo … |
| treinador-adjunto | 28 | cena-historia, dialogo-mensagem, escritorio-clube, mercado-transferencias, relatorio-pos-jogo |
| numeros-grandes | 25 | golo, placar-resultado |
| adeptos | 24 | camara-geral, carregamento, cena-historia, estadio-exterior, festejo, golo, interface-durante-jogo, pre-jogo |
| bandeiras | 21 | adeptos-claque, festejo |
| texto-grande | 21 | classificacao-liga, escritorio-clube, informacao-liga, mercado-transferencias, plantel-lista, pre-jogo, scout-recrutamento, taticas-formacao … |
| botoes-redondos | 20 | bola-parada, escritorio-clube, falta-cartao, habilidade-especial, interface-durante-jogo, intervalo, substituicao |
| lista | 20 | calendario, classificacao-liga, jogador-ficha, mercado-transferencias, plantel-lista, pre-jogo, scout-recrutamento |
| caixa-texto | 19 | cidade-mapa, dialogo-mensagem, mercado-transferencias, treino |
| plano-largo | 18 | camara-geral, interface-durante-jogo, replay, substituicao |
| ficha | 18 | jogador-ficha, mercado-transferencias |
| retratos | 17 | cerimonia-trofeu, taticas-formacao, treino |
| circulo-central | 17 | camara-geral, entrada-jogadores, fim-jogo, interface-durante-jogo, intervalo |
| calendario | 16 | cidade-mapa, escritorio-clube |
| secretaria | 15 | cena-historia, dialogo-mensagem, escritorio-clube, mercado-transferencias, pre-jogo, sala-trofeus, titulo |
| casa-fora | 15 | calendario, emblema-equipamento, pre-jogo |
| caixa-dialogo | 15 | dialogo-mensagem, escritorio-clube, mercado-transferencias, relatorio-pos-jogo |
| jogador | 14 | cena-historia, dialogo-mensagem, treino |
| proximo-jogo | 14 | cidade-mapa, escritorio-clube, treino |
| mapa-cidade | 14 | cidade-mapa, dialogo-mensagem, escritorio-clube |
| logotipo | 14 | estadio-exterior, titulo |
| nome-jogador | 14 | camara-geral, habilidade-especial, interface-durante-jogo, replay, substituicao |
| cartas | 14 | cartas-habilidades, habilidade-especial, jogador-ficha, treino |
| vs | 14 | apresentacao-jogo, pre-jogo |
| percentagens | 13 | pre-jogo |
| zoom | 12 | bola-parada, camara-geral, falta-cartao, habilidade-especial |
| pontape-saida | 12 | entrada-jogadores |
| ilustracao | 12 | anuncio, cartas-habilidades, treino |
| posicao-liga | 11 | apresentacao-jogo, ficha-equipa, pre-jogo |
| probabilidades | 11 | apresentacao-jogo, pre-jogo |
| preco | 11 | jogador-ficha, mercado-transferencias |
| edificio | 10 | cena-historia, dialogo-mensagem, treino |
| campeoes | 10 | cerimonia-trofeu |
| confetti | 10 | cerimonia-trofeu, fim-jogo |
| faixa-vermelha | 10 | cerimonia-trofeu |
| festejo | 10 | cerimonia-trofeu, fim-jogo, golo, placar-resultado |
| edificios | 10 | cidade-mapa, escritorio-clube |
| replay | 10 | habilidade-especial, replay |
| home-away | 10 | apresentacao-jogo, pre-jogo |
| historico | 10 | classificacao-liga, jogador-ficha, mercado-transferencias |
| cidade-isometrica | 10 | escritorio-clube |
| confronto | 10 | pre-jogo |
| mapa-isometrico | 9 | cidade-mapa |
| botao-play | 9 | adeptos-claque, fim-jogo |
| icones-habilidades | 9 | jogador-ficha |
| valor | 9 | jogador-ficha, mercado-transferencias |
| orcamento | 9 | mercado-transferencias |
| versao | 9 | titulo |
| campo-treino | 8 | cartas-habilidades, cena-historia, dialogo-mensagem, treino |
| area | 8 | bola-parada, camara-geral, interface-durante-jogo, substituicao |
| bancos | 8 | dialogo-mensagem, fim-jogo, intervalo |
| cartas-habilidades | 8 | golo, habilidade-especial, relatorio-pos-jogo, treino |
| barras-atributos | 8 | jogador-ficha, treino |
| carreira | 8 | jogador-ficha |
| tipo-jogador | 8 | jogador-ficha, plantel-lista, scout-recrutamento, treino |
| escritorio | 7 | cena-historia, dialogo-mensagem, emblema-equipamento, escritorio-clube |
| balao-texto | 7 | festejo |
| quadro-tatico | 7 | dialogo-mensagem, fim-jogo, intervalo |
| nome-combo | 7 | golo, habilidade-especial |
| nomes-equipas | 7 | golo, placar-resultado, pre-jogo |
| nome-habilidade | 7 | cartas-habilidades, habilidade-especial |
| menu-especial | 7 | cartas-habilidades, treino |
| data-semana | 7 | dialogo-mensagem, escritorio-clube |
| selecao | 7 | dialogo-mensagem, jogador-ficha |
| paleta-cores | 7 | emblema-equipamento |
| texto-youtuber | 7 | emblema-equipamento, escritorio-clube, plantel-lista, taticas-formacao, titulo |
| toto | 7 | pre-jogo |
| live | 6 | cena-historia, jogador-ficha, pre-jogo |
| seta-avancar | 6 | cena-historia, dialogo-mensagem, relatorio-pos-jogo |
| primavera | 6 | cidade-mapa, escritorio-clube |
| cerejeiras | 6 | cartas-habilidades, cidade-mapa, escritorio-clube, treino |
| diagonal | 6 | camara-geral, habilidade-especial, interface-durante-jogo |
| arbitro | 6 | camara-geral, falta-cartao |
| bandeira | 6 | falta-cartao, jogador-ficha, pre-jogo |
| relvado | 6 | habilidade-especial, interface-durante-jogo, titulo, treino |
| jogadores-sentados | 6 | intervalo |
| resultados | 6 | calendario, ficha-equipa, torneio-taca |
| separadores | 6 | calendario, classificacao-liga, informacao-liga |
| avatar-youtuber | 6 | dialogo-mensagem, escritorio-clube, mercado-transferencias, relatorio-pos-jogo, treino |
| equipamento | 6 | emblema-equipamento, escritorio-clube, pre-jogo |
| personagem-youtuber | 6 | emblema-equipamento, escritorio-clube, relatorio-pos-jogo, titulo |
| barra-cansaco | 6 | jogador-ficha, taticas-formacao |
| potencial | 6 | jogador-ficha |
| historico-treino | 6 | jogador-ficha |
| separadores-posicao | 6 | mercado-transferencias |
| jogador-ficha | 6 | mercado-transferencias |
| bonecos | 6 | titulo |
| balao-fala | 5 | adeptos-claque |
| bandeirola-canto | 5 | bola-parada, camara-geral, golo, habilidade-especial |
| pixel-art | 5 | entrada-jogadores, festejo, titulo |
| cartao-amarelo | 5 | falta-cartao |
| quadro-substituicao | 5 | substituicao |
| jornada | 5 | apresentacao-jogo |
| nome-estadio | 5 | apresentacao-jogo, pre-jogo |
| fila-jogadores | 5 | cartas-habilidades |
| retratos-corpo-inteiro | 5 | cartas-habilidades |
| categorias-cartas | 5 | cartas-habilidades |
| classificacao | 5 | classificacao-liga, ficha-equipa, pre-jogo |
| liga | 5 | classificacao-liga, ficha-equipa, jogador-ficha |
| outono | 5 | escritorio-clube |
| faixas-amarelas | 5 | pre-jogo |
| formacao | 5 | taticas-formacao |
| listras-verdes | 5 | titulo |
| special-menu | 5 | treino |
| mesa-reunioes | 4 | cena-historia, escritorio-clube |
| confettis | 4 | cerimonia-trofeu, fim-jogo |
| faixa | 4 | adeptos-claque, cerimonia-trofeu |
| dica | 4 | cidade-mapa, escritorio-clube |
| botoes-sim-nao | 4 | cidade-mapa, dialogo-mensagem |
| canto | 4 | bola-parada, habilidade-especial |
| xadrez-relvado | 4 | camara-geral, entrada-jogadores |
| tempo-extra | 4 | camara-geral |
| icones-laterais | 4 | escritorio-clube, intervalo, jogador-ficha |
| numeros-led | 4 | substituicao |
| pontos | 4 | classificacao-liga |
| setas | 4 | classificacao-liga, informacao-liga |
| chat | 4 | emblema-equipamento, mercado-transferencias, relatorio-pos-jogo |
| barras | 4 | jogador-ficha, treino |
| posicoes-cores | 4 | plantel-lista |
| mapa-mundo | 4 | torneio-taca |
| treino-especial | 4 | treino |
| estrelas | 4 | treino |
| escritorio-isometrico | 3 | cena-historia, emblema-equipamento, escritorio-clube |
| taca | 3 | cerimonia-trofeu, emblema-equipamento, torneio-taca |
| sim-nao | 3 | cidade-mapa, escritorio-clube |
| calendario-semana | 3 | cidade-mapa |
| penaltis | 3 | bola-parada |
| noite | 3 | dialogo-mensagem, festejo |
| estrela | 3 | golo, treino |
| tatica | 3 | cartas-habilidades, habilidade-especial |
| pista-atletismo | 3 | habilidade-especial, placar-resultado, pre-jogo |
| segunda-parte | 3 | intervalo |
| cansaco | 3 | cartas-habilidades, plantel-lista |
| ligas | 3 | classificacao-liga, pre-jogo |
| tabela | 3 | classificacao-liga |
| pos-jogo | 3 | dialogo-mensagem |
| lesao | 3 | dialogo-mensagem, jogador-ficha |
| paginacao | 3 | emblema-equipamento |
| grelha | 3 | emblema-equipamento |
| paginas | 3 | emblema-equipamento |
| trofeu | 3 | escritorio-clube, torneio-taca |
| semana | 3 | escritorio-clube |
| webcam | 3 | escritorio-clube, treino |
| estilo-jogo | 3 | ficha-equipa |
| sliders | 3 | ficha-equipa |
| pe-preferido | 3 | jogador-ficha |
| posicao | 3 | jogador-ficha, pre-jogo |
| outro-clube | 3 | jogador-ficha, scout-recrutamento |
| estatisticas | 3 | jogador-ficha, mercado-transferencias |
| estatisticas-carreira | 3 | jogador-ficha, mercado-transferencias |
| contratacao | 3 | mercado-transferencias |
| precos | 3 | mercado-transferencias |
| zonas | 3 | taticas-formacao |
| marcacao | 3 | taticas-formacao |
| direcao-ataque | 3 | taticas-formacao |
| mentalidade | 3 | taticas-formacao |
| fundo-listrado | 3 | titulo |
| cartao-habilidade | 3 | treino |
| treino | 3 | treino |
| jogadores-de-pe | 3 | treino |