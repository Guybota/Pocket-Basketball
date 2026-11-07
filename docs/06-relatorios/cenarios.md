# R6 — Revisão de cenários, arte e áudio

Revisão só de leitura, feita a 7 de novembro de 2026. Vi 25 capturas em `dist-check/` e li o código de `src/ui/art/`, `audio.ts`, `music.ts` e partes de `match-view.ts`, `main.ts` e `menus.ts`.

## 0. Antes de mais: muitas capturas estão a meio da cortina

As capturas `escritorio.png`, `despedido.png`, `fim-epoca.png`, `trofeus.png`, `semana-livre.png`, `equipamento.png` e a metade de baixo de `combo.png` aparecem lavadas, num verde-cinza baço. Não é a paleta. É a cortina `stage-in`, que começa com `opacity: .35` (`src/ui/style.css:513-514`), e o `browser-check` fotografa antes de ela acabar. Quem rever as imagens julga mal o contraste. **Correção:** esperar mais de 200 ms ou desligar as animações no `browser-check` (por exemplo com `reducedMotion`). Pela mesma razão, `fim.png` mostra "8 - 8" no topo e 46-47 na tabela: o número que conta foi apanhado a meio. Esforço baixo, prioridade alta, porque todas as revisões visuais dependem disto.

## 1. O que está bem

- **A paleta e a identidade são coerentes.** Creme, laranja e azul-petróleo; bonecos de cabeça grande; retratos simples (`balneario.png`, `intervalo.png`).
- **O balneário é a melhor cena do jogo.** Os cacifos têm as cores do equipamento (azul e amarelo antes do jogo, amarelo ao intervalo); há o resultado no quadro (`intervalo.png`), a marquesa, o cesto das bolas, o treinador a apontar. Tem vida.
- **Há pavilhões diferentes por divisão** (`src/ui/art/court.ts:98-193`): Campo do Bairro (asfalto, rede e relva, em `divisao-0.png`), Pavilhão Escolar, Pavilhão Municipal (`divisao-1.png`) e Grande Arena (`divisao-3.png`, `momento-afundanco.png`). O Campo do Bairro é muito bom.
- **Os patrocinadores têm humor**: "SOPA DA AVO", "SESTA FM", "BIFANA MAX", "BAILARICO" (`court.ts:55`).
- **As poses já cobrem o essencial**: reações (`fists`, `handsHead`, `slump`), o treinador (`think`, `point`), o descanso (`drink`, `board`) e os movimentos especiais (`stepBack`, `fadeaway`, `hook`, `swat`, `shove`, `fumble`) (`src/ui/art/sprites.ts:100-130`). Os contactos lêem-se bem (`contacto-encontrao.png`).
- **O tempo e a estação existem** (`src/ui/art/town.ts:92-102`): um tom quente no outono, noite com luzes em dezembro (`semana-livre.png`, com as luzes de Natal nos telhados), e neve em janeiro e fevereiro.
- **As vozes têm cara**: secretária, adjunto e presidente, e a cara pode contradizer a frase. O adjunto diz "Não foi tão mau como pareceu" com cara de enterro (`playoffs-jogo.png`). É o tom do documento 05.

## 2. Inconsistências de estilo

| # | Problema | Onde | Prioridade |
|---|---|---|---|
| 1 | **Três tipos de letra misturados.** Há uma fonte bitmap 3×5 só com maiúsculas e sem acentos (`src/ui/art/font.ts:2-8`), que dá "PROGNOSTICO", "OH NAO...", "ESTAO COM MEDO", "ARBITRO!" (`match-view.ts:403`, `apresentacao.png`, `momento-cesto.png`). Há a fonte de ecrã em HTML ("Afundanço!", com cedilha, no mesmo ecrã), e a fonte de texto da interface. Os balões sem acentos parecem um erro, não um estilo. | font.ts, match-view.ts | Alta, esforço baixo: acrescentar Ã, Õ, Ç, É, Á e Ê ao `FONT` |
| 2 | **Várias escalas de píxel no mesmo campo.** O chão é reamostrado em perspetiva, por isso as linhas e a área azul ficam serrilhadas e com espessuras diferentes (`divisao-1.png`, `divisao-3.png`, `momento-afundanco.png`). Os bonecos ficam a ~1×, os balões e o marcador a 2× (`text(..., 2)`) e o cartaz da cidade a 1× (`town.ts:236`). | court.ts, match-view.ts | Média: pelo menos alinhar as linhas do campo a píxeis inteiros, ou engrossá-las 1 px |
| 3 | **As cartas rodadas partem a grelha de píxeis.** No `combo-animacao.png`, as cartas estão inclinadas e as bordas ficam escadeadas e tremidas. Os bonecos por cima estão a outra escala e sobrepõem-se às cartas sem chão. | menus.ts (combo) | Média |
| 4 | **"técnica" quase invisível no `combo.png`**: está a cor de tinta escura sobre o fundo escuro. | combo / stat colors | Alta, esforço baixo |
| 5 | **O prognóstico tapa o círculo central e o emblema** na entrada das equipas (`apresentacao.png`, `jogo.png`). É uma caixa grande e opaca no meio do campo. | match-view.ts:155,679 | Baixa: mais pequeno, ou por baixo do marcador |
| 6 | **"Afundanço!" tapa o cesto** precisamente no afundanço (`momento-cesto.png`). | match-view floaters | Média: pôr o letreiro por baixo da ação |
| 7 | **O balão da bancada sai do ecrã à esquerda** no esquema horizontal ("OH NAO..." cortado em `momento-cesto.png`). O limite em `drawBubbles` é a largura da câmara, não a parte visível. | match-view.ts:1360 | Baixa |
| 8 | **Muito creme vazio**: metade de baixo de `combo-animacao.png` e de `titulo.png`, e quase metade de `despedido.png` e `trofeus.png`. | menus | Média |
| 9 | **As etiquetas da cidade continuam caixas grandes** e tapam os edifícios (`cidade-inteira.png`). O documento 05 já o apontava. | town UI | Baixa |

## 3. O que parece repetido ou vazio

- **A cidade é sempre a mesma.** Em `cidade-inteira.png` (setembro, Iniciados) e em `playoffs-cidade.png` (abril, Pro Liga 1) só mudam o cartaz e as pessoas. `arenaHeight` cresce 0,5 por divisão (`town.ts:74`), o que é quase invisível. O resto do mapa é floresta repetida: dois terços do ecrã vertical são o mesmo pinheiro.
- **Os pavilhões variam só pela divisão da casa** (`courtTextures(division, venue, …)`, `match-view.ts:200`). Fora de casa, na mesma divisão, todos os campos são iguais exceto na cor de destaque. Não há pavilhões com assinatura de cada adversário.
- **As horas do dia** só mudam num mês: dezembro é noite (`town.ts:99`). Nunca chove. No pavilhão não há luz de dia nem de noite.
- **A bancada diz 8 frases** (`!!!`, `ARBITRO!`, `ESTAO COM MEDO`, `EU TAMBEM O TIRAVA`, `NAO ENTRA!`, `OH NAO...`, `QUE BOMBA!`, `VAMOS!`). Ao fim de 3 jogos já se repetem.
- **As cenas desenhadas são só 3** (`SceneKind`: `lockerPre`, `lockerHalf`, `gym`, em `scenes.ts:12`). O escritório, a federação, o mercado, os troféus e o fim de época não têm cena: são caixas sobre fundo axadrezado (`escritorio.png`, `federacao-*.png`).
- **O despedimento não tem cena**: emblema, números e "Despedido" em letra grande (`despedido.png`). A frase do presidente ("pede as chaves do pavilhão") merecia uma imagem.
- **No fim da época sem título**, só há emblema e tabela (`fim-epoca.png`). A cena de confetti (`menus.ts:1277`) só aparece com título.
- **A vitrine dos troféus** é feita de silhuetas pretas sobre fundo escuro (`trofeus.png`), e o efeito "por ganhar" fica triste em vez de convidar.

## 4. Áudio

- **Há quatro temas, e só dois tocam muito.** `MusicTheme = 'town' | 'win' | 'loss' | 'farewell'` (`music.ts:5`). O `win` e o `loss` são pequenas fanfarras de um compasso (`music.ts:107-108`). A cidade, o título e todos os menus partilham o mesmo `town` (`main.ts:316`). O balneário, o combo, o mercado e o fim de época sem título não têm música própria.
- **No jogo não há música** (`main.ts:318`), só o ambiente do pavilhão. É uma escolha válida, mas faltam um tema de entrada das equipas e uma tensão nos últimos 30 s.
- **Os efeitos são poucos e bons**: ressalto, rede, aro, apito, buzzer, palmas aos estalos (`audio.ts:166-205`). Faltam uma voz de multidão ("uuuh" no falhanço, um coro "de-fe-sa"), o chiar dos ténis numa travagem, o som da bola no asfalto no Campo do Bairro (deve ser diferente do soalho), um tambor de claque nas divisões altas, e sons para a interface (virar página, confirmar).
- **Mistura:** os efeitos ligam-se diretamente a `ctx.destination` (`audio.ts:99,116,138,155`), sem um barramento principal, sem compressor e sem baixar a música (*ducking*). Um `bigCheer` e a fanfarra `win` somam-se sem limite e podem saturar. Esforço baixo: criar um `sfxGain` e um `DynamicsCompressor` comuns.
- **O ambiente não muda com o pavilhão**: o Campo do Bairro e a Grande Arena usam o mesmo `ambience`. Só o volume muda, com `crowdLevel`.

## 5. Propostas (todas originais)

| Proposta | Charme | Esforço | Prioridade |
|---|---|---|---|
| Corrigir a espera das capturas e o contraste de "técnica" (§0, §2.4) | — | Muito baixo | 1 |
| Acentos na fonte bitmap e 20 a 30 frases de bancada por contexto (lance livre falhado: "ATÉ A MINHA AVÓ"; tempo pedido: "CAFÉ!"; jogo fora: "VÃO PARA CASA") | Alto | Baixo | 1 |
| **Cena do escritório**: a secretária à secretária, o vaso que murcha com a confiança, e um calendário com o próximo jogo. Usa `drawSceneFrame` | Alto | Médio | 2 |
| **Cena do despedimento**: o treinador sai do pavilhão com uma caixa de cartão; o presidente estende a mão para as chaves; a chuva liga-se | Muito alto | Baixo a médio | 2 |
| **Fim de época sem título**: o balneário vazio, com um cacifo aberto, se desce; o adjunto a varrer, se fica a meio | Alto | Baixo (a cena do balneário já existe) | 2 |
| **Pavilhão com assinatura por adversário**: uma semente do clube escolhe a cor do soalho, o patrocinador, o padrão da bancada e um adereço (uma mascote, uma tuba, um cão na linha) | Alto | Médio | 3 |
| **Cidade que cresce**: lotes vazios que ganham uma loja, um café e uma estátua do treinador a cada subida; menos floresta, mais bairro; obras visíveis na semana da subida | Alto | Médio | 3 |
| **Chuva e horas do dia** (manhã em setembro, tarde em março, chuva com uma semente semanal); no pavilhão, as janelas escuras à noite | Médio | Baixo | 3 |
| **Música**: um tema de balneário (baixo e palmas, tenso), um tema de entrada (4 compassos), um tema de combo (o arpejo a subir até ao sunburst), uma versão mais lenta da cidade à noite, e uma marcha solene na final | Alto | Médio | 3 |
| **Mistura**: um barramento principal com compressor e música mais baixa durante os efeitos; ambiente diferente por pavilhão (eco no Escolar, rua no Bairro) | Médio | Baixo | 3 |
| **Combo animado**: o boneco faz o treino absurdo durante 1 s (karaoke com microfone, sesta com "Z", fado com guitarra), sem rodar as cartas | Alto | Médio | 4 |
| **Pequenos humores no campo**: o cão que invade o Campo do Bairro; o adepto que adormece na Grande Arena quando se ganha por 30; a mascote que cai no intervalo; o pombo pousado no aro antes da bola ao alto | Muito alto | Baixo cada um | 4 |
| **A vitrine dos troféus** com a estante iluminada e as silhuetas a tracejado, com um "?" em vez do preto | Médio | Baixo | 5 |

## 6. Resumo

A base é sólida e tem identidade. O balneário e o Campo do Bairro são o padrão a seguir. Os problemas mais urgentes são técnicos: as capturas a meio da cortina, a fonte sem acentos, o contraste de "técnica" e a mistura de áudio sem barramento. O que mais falta para o charme do NPFC são **cenas nos menus** (o escritório, o despedimento, o fim de época sem título), **variedade por adversário** nos pavilhões e **mais música por estado de espírito**.
