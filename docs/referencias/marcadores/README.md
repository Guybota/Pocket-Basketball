# Marcadores de parede de pavilhão: referências

Pesquisa para desenhar um marcador original em pixel art (cerca de 35 px de largura) pendurado na parede dos pavilhões do jogo. Não guardámos imagens (têm direitos de autor): as fichas e fotografias estão descritas por palavras e ligadas na lista de fontes.

## Resumo

- O marcador de entrada é uma **caixa preta de alumínio com frente de policarbonato ou acrílico antirreflexo**, dígitos de LED em pontos (7 segmentos feitos de pontinhos) e **etiquetas autocolantes brancas** («HOME / GUEST», «LOCAL / VISITANTE», «CASA / VISITANTE»). Os americanos (Daktronics, Electro-Mech, Nevco) pintam a caixa com a cor da escola (azul, grená, verde); os europeus (Bodet, Stramatel, Favero, Euronix) são quase sempre pretos.
- Mostra, por ordem de tamanho: **pontos das duas equipas** e **tempo de jogo** (os maiores), **período** (1 dígito), **faltas de equipa** (1 dígito por equipa), **posse** (uma seta ou um ponto por equipa) e **tempos mortos** (pontinhos por equipa). Nomes eletrónicos de equipa e faltas individuais só nos modelos maiores.
- Disposição mais comum: **tempo ao centro em cima, pontos grandes à esquerda e à direita**, período ao centro em baixo, faltas por baixo de cada pontuação. O modelo pequeno da Favero (FC50H15) faz ao contrário: pontos em cima, tempo ao centro em baixo, período e faltas nos cantos de baixo.
- **Cores:** o padrão da indústria é misturar vermelho, âmbar e verde. Tipicamente o tempo é de uma cor (vermelho ou âmbar), os pontos de outra, e o período e as faltas de uma terceira (verde ou âmbar). A FIBA só impõe cores nos relógios por cima das tabelas: **24 s em vermelho, cópia do tempo de jogo em amarelo**, e a seta de posse em **vermelho vivo**. O quadrado da 5.ª falta de equipa é **vermelho**.
- **Relógio de 24 s:** à parte, por cima das tabelas (ou em pé nas pontas da mesa, nos pavilhões modestos). Não faz parte do marcador de parede.
- **Décimas:** no último minuto do período o tempo passa de `MM:SS` para `SS.d` (regra FIBA e comportamento de série dos Daktronics de entrada).

## 1. Que informação mostram

| Campo | O que mostra | Notas |
|---|---|---|
| Pontos casa/fora | 0–199 (3 dígitos, o primeiro só pode ser «1») | Os maiores dígitos do painel, ao lado do tempo. |
| Tempo de jogo | `MM:SS` decrescente; `SS.d` no último minuto | FIBA 3.3: «mm:ss», exceto no último minuto, «ss:f». Daktronics BB-2101: décimas abaixo de um minuto. |
| Período | 1 dígito (1–4; «O» de prolongamento na FIBA) | Muitas vezes com a palavra «PERIOD» / «PARTE» impressa ao lado. |
| Faltas de equipa | 0–9 por equipa, um dígito | FIBA: 1 a 4, e depois **um quadrado todo vermelho** no lugar do número. Os americanos usam antes uma luz «BONUS» / «B». Voltam a zero em cada período (manual Stramatel). |
| Posse / seta | Uma seta ou um ponto por equipa, aceso de um lado só | Stramatel: a tecla alterna «casa / visitante / setas apagadas». A seta oficial FIBA é um aparelho à parte no centro da mesa, em vermelho. |
| Tempos mortos | 3 pontos de luz por equipa (Favero, FIBA tabela 2) | Alguns modelos têm um contador de tempo morto que usa o próprio relógio (nos FIBA nível 1 tem de ser outro). |
| Nomes | Autocolante fixo («HOME/GUEST», «LOCAL/VISITANTE») ou matriz de LED de 3+ letras | FIBA pede no mínimo 3 caracteres por nome; nos baratos é só a etiqueta. |
| 24 s | Painel separado, 2 dígitos vermelhos | Por cima e atrás de cada tabela (FIBA 5.6) ou em pé no chão (Euronix SEG3, Favero KIT24s). |

## 2. Disposição, dígitos e cores (modelos concretos)

**Favero FC50H15** (Itália, «para pavilhões pequenos», 91×60 cm, dígitos de 15 cm). Caixa preta. Em cima, «HOME» e «GUEST» em letras brancas grandes. Linha de cima: pontos da casa em **vermelho** (3 dígitos), dois pontos verticais (os pontos de tempo morto, até 3) e pontos de fora em **verde**, com um ponto à direita (posse). Linha de baixo: faltas da casa em **vermelho** à esquerda (1 dígito), **tempo `15:00` em verde ao centro**, faltas de fora em **vermelho** à direita. O período aparece num dos dígitos laterais. Os dígitos são de pontos de LED bem separados. Etiquetas opcionais «LOCAL-VISITANTE».

**Euronix MDG D18S** (Espanha). Caixa preta, frente de acrílico, três linhas separadas por filetes. Em cima ao centro, o tempo `00:0` em **âmbar/laranja**, com uma pequena seta branca de posse no canto superior esquerdo. Linha do meio: pontos «LOCAL» em **vermelho/magenta** à esquerda, «PARTE» (período) em **verde** ao centro, «VISITANTE» em **vermelho** à direita. Linha de baixo: «FALTAS» em **verde** de cada lado e, ao centro, «DORSAL / FALTA» (número do jogador e faltas individuais) em **âmbar**. Etiquetas brancas impressas por baixo de cada campo. Nos dígitos acesos veem-se os **segmentos apagados em tom escuro** (ex.: o «8» fantasma atrás de «1»).

**Electro-Mech LX2350-ETN** (EUA, 2,7×0,9 m). Caixa pintada (na ficha, azul real) com filete branco. Em cima à esquerda e à direita, o nome da equipa em matriz **âmbar**; ao centro, o tempo em **vermelho** dentro de uma moldura preta. Por baixo dos nomes, os pontos em **âmbar** (3 dígitos). Ao centro em baixo, «PERIOD» em letras brancas pintadas e o período em **verde**. Por baixo de cada pontuação, três janelas pequenas: «B» de bónus em **verde** e uma seta de posse **vermelha** do lado de fora. Dígitos de 12" (tempo e pontos) e 9" (período), indicadores de 3". Cores de série: âmbar, vermelho e verde; 18 cores de caixa à escolha.

**Daktronics BB-2101** (EUA, entrada, 1,2×2,4 m). Tempo até 99:59, «HOME» e «GUEST» até 199, período até 9, luzes de posse e bónus. Dígitos mistos **vermelho e âmbar** ou brancos; etiquetas «HOME» e «GUEST» em vinil branco. Opção ColorSmart: os dígitos mudam entre vermelho, âmbar e verde para mostrar quem ganha e se o relógio corre, está parado ou abaixo de um minuto.

**Bodet 8025 / BT6025** (França). A versão base traz **autocolantes «Home / Visiting»**; a «Alpha» troca-os por nomes em LED programáveis. Quando o teclado está desligado o marcador mostra **a hora e a temperatura** (apaga-se entre as 00:00 e as 08:00).

**Stramatel série 452** (França, muito comum em pavilhões europeus). Os pavilhões de topo usam os grandes (452 ML 3123-123: 8,9×2,6 m, dígitos até 30 cm, nomes de jogadores, faltas e pontos individuais, setas de posse, contador de tempo morto). O 24 s é um par de painéis à parte.

**FIBA, diagrama 9 (nível 1)**: nomes de 3 letras em caixas no topo, pontos em vermelho por baixo, período num quadrado ao centro, três quadradinhos de tempos mortos (amarelos os gastos) por baixo de cada pontuação, tempo grande ao centro em baixo, faltas de equipa nos cantos de baixo (o quadrado vermelho ocupa o lugar do número). De lado, os painéis de jogadores (número, nome, cinco bolas de faltas, a 5.ª a vermelho, pontos).

**Padrão que se repete:** os campos do mesmo tipo têm a mesma cor; pontos e tempo em cores diferentes; período e faltas, os números pequenos, numa terceira cor (verde ou âmbar). Vermelho é sempre a cor de «perigo»: 5.ª falta, seta de posse, 24 s, faixa de fim de período.

## 3. Segmentos apagados e estados do jogo

- **Segmentos apagados:** nos LED de pontos com frente de acrílico ou policarbonato, os segmentos apagados ficam **ligeiramente visíveis**, um tom muito escuro da cor do dígito sobre o preto (vê-se na foto do Euronix D18S; na do Favero quase desaparecem). Nos antigos marcadores de lâmpadas (Nevco, Daktronics dos anos 70–90) as lâmpadas apagadas veem-se como pontos **cinzento-claros**, e o «8» fantasma é bem visível. Os zeros à esquerda costumam ficar apagados (pontos `7`, não `007`). Este último ponto é observação de fotografias e vídeos, não vem de ficha técnica.
- **Antes do jogo:** o Stramatel tem um «pre-match timer» que conta para trás até ao início, com os pontos a 0–0. O Bodet mostra a hora do dia quando não está em jogo. Período em branco ou 1.
- **Intervalo:** no Stramatel, no fim de cada período arranca sozinho um «rest timer» **a contar para cima**; as faltas de equipa voltam a zero e os tempos mortos só no intervalo grande. Outros modelos (ScoreVision) põem a contagem decrescente do intervalo no relógio.
- **Fim:** no fim do último período o relógio fica em `0.0` (ou `00:00`), e o resultado final fica aceso até alguém desligar. A buzina toca sozinha quando o tempo chega a zero; nos FIBA nível 1, uma faixa **vermelha** à volta da tabela acende-se ao mesmo tempo, e uma **amarela** quando acabam os 24 s.

## 4. Pavilhão municipal contra liga profissional

| | Pavilhão municipal / escola | Liga profissional |
|---|---|---|
| Tamanho | 1 painel na parede lateral, 0,9–2,5 m, dígitos de 15–25 cm | Dois painéis nos topos ou cubo central, dígitos de 25–30 cm, muitas vezes vídeo |
| Nomes | Autocolante fixo «CASA / VISITANTE» ou «HOME / GUEST» | Matriz de LED com nome ou sigla de 3 letras |
| Jogadores | Nada, ou dorsal e faltas do último jogador (Euronix) | Painéis laterais com número, apelido, faltas (5 bolas) e pontos de cada jogador |
| Cores | 1 a 3 cores de LED; muitos são **só vermelhos** ou vermelho e verde | Cores contrastantes, nomes em âmbar ou branco, ecrãs de vídeo |
| Caixa | Preta (Europa) ou pintada na cor da escola (EUA), com placa de patrocínio ou brasão por cima | Integrada na arquitetura, com fitas de LED e publicidade à volta |
| 24 s | Nenhum, ou painéis portáteis em pé no chão nas pontas da mesa | Painéis de 3–4 faces por cima de cada tabela, com cópia do tempo em amarelo e faixas de LED vermelha e amarela |
| Seta de posse | Ponto ou seta no próprio marcador, ou um aparelho na mesa | Aparelho à parte, vermelho, no centro da mesa |

Não encontrámos fornecedores portugueses com fichas técnicas próprias. Os pavilhões portugueses usam sobretudo marcas espanholas, francesas e italianas (Euronix, Bodet, Stramatel, Favero, Mondo), por isso as etiquetas aparecem tanto em inglês como em espanhol. Em português fazem sentido «CASA / VISITANTE» ou «CASA / FORA».

## Recomendações para o nosso marcador (~35 px)

A esta largura só cabem quatro coisas legíveis: **pontos, tempo, período e posse**. As faltas de equipa e os tempos mortos entram como pontos de luz, não como dígitos.

**Dígitos:** fonte de 3×5 px com segmentos (3 px de largura + 1 px de intervalo). Pontuação até 3 dígitos = 11 px. Zeros à esquerda apagados.

**Disposição sugerida (35×17 px, por dentro de 1 px de caixa):**

```
 ┌─────────────────────────────────┐
 │        ▒▒▒ ▒▒▒ : ▒▒▒ ▒▒▒        │  tempo ao centro, âmbar
 │ ▒▒▒▒▒▒▒▒▒▒▒  ◂▒▒▒▸  ▒▒▒▒▒▒▒▒▒▒▒ │  pontos casa (vermelho) · período (verde) com seta de posse · pontos fora (vermelho)
 │  ■ ■ ■  ● ● ● ●      ● ● ● ●  ■ ■ ■ │  tempos mortos (3) e faltas de equipa (até 4, depois quadrado vermelho)
 └─────────────────────────────────┘
```

Contas da largura: 1 caixa + 1 margem + 11 (casa) + 3 + 3 (período) + 3 + 11 (fora) + 1 margem + 1 caixa = 35 px. Altura: 1 + 1 + 5 (tempo) + 2 + 5 (pontos) + 1 + 1 (pontos de luz) + 1 = 17 px; se sobrar altura, uma faixa de 2–3 px por cima para o patrocínio ou o brasão da câmara municipal (pavilhões modestos) ou para o nome da liga.

1. **Tempo** ao centro em cima, `MM:SS` (4 dígitos + 1 px de dois pontos = 17 px). No último minuto, `SS.d` (o ponto passa para baixo). Cor: **âmbar** (`#ffb000`-ish).
2. **Pontos** à esquerda (casa) e à direita (fora), na mesma linha, em **vermelho** (os dois da mesma cor, como nos marcadores reais; a equipa distingue-se pelo lado). São os números mais importantes, por isso a linha mais brilhante.
3. **Período** num só dígito **verde** entre as pontuações. A **posse** é um píxel ou um triângulo de 2 px **vermelho** do lado da equipa que tem a seta, colado ao período.
4. **Faltas de equipa:** até 4 pontos de 1 px **verdes ou âmbar** por baixo de cada pontuação; à 5.ª, os quatro dão lugar a um **quadrado vermelho** de 3×3 (a ideia da FIBA, fácil de ler em pixel art). **Tempos mortos:** 2–3 pontos de 1 px que se apagam quando gastos. Se ficar ilegível, cortar primeiro os tempos mortos.
5. **Sem etiquetas impressas** a 35 px (uma letra de 3×5 já gasta o espaço de um dígito). Em alternativa, uma risca de 1 px na cor de cada equipa por cima da pontuação, como substituto dos autocolantes «CASA / VISITANTE».
6. **Caixa preta** (`#0a0a0c`) com rebordo de 1 px cinzento-escuro e um píxel de brilho num canto (frente de acrílico). Nos pavilhões americanizados ou de escola, rebordo largo pintado na cor do clube.
7. **Segmentos apagados visíveis** num tom muito escuro da cor do dígito (cerca de 15–20 % do brilho), para se ver o «88:88» fantasma. É o que dá o charme e ajuda a ler a forma dos dígitos a esta escala.
8. **Estados:** antes do jogo, `0 0`, período apagado e o tempo a contar para trás até ao salto inicial (ou a hora do dia); intervalo, tempo do intervalo; fim, `0.0` fixo e o resultado aceso, com o vencedor a piscar devagar (licença nossa, não é comportamento de série).
9. **24 s fora do marcador.** Se quisermos mostrá-los, são caixinhas separadas de 2 dígitos **vermelhos** por cima das tabelas, com a cópia do tempo em **amarelo**, só nas ligas de cima; nos pavilhões modestos, nada ou um painel em pé ao lado da mesa.
10. **Variação por liga:** marcador só vermelho e sem faltas nos pavilhões mais pobres; três cores e faltas no meio; nas ligas de topo, faixa de nomes de 3 letras em âmbar por cima e as faixas de LED vermelha e amarela nas tabelas. A Grande Arena pode ter ecrã de vídeo, fora do âmbito desta referência.

## Fontes

- FIBA, *Official Basketball Rules 2026 – Basketball Equipment* (secções 3 a 9, diagramas 9, 10 e 13, tabela 2): https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2026-equipment-v1-0.pdf
- Favero FC50H15, ficha (pontos vermelho/verde, tempo verde, «HOME / GUEST», tempos mortos em 3 pontos, posse em 1 ponto): https://www.favero.com/es3_pdf-249-4.pdf
- Favero KIT24s, 24 s em painéis à parte, dígitos vermelhos de 20 cm: https://favero.com/en3b_pdf-17-2.pdf
- Euronix MDG D18S, marcador multidesportos (tempo âmbar, pontos vermelhos, «PARTE» e «FALTAS» verdes, etiquetas «LOCAL / VISITANTE»): https://www.euronix.es/wp-content/uploads/2024/06/MARCADOR-MULTIDEPORTIVO-EMDG-D18S.pdf
- Euronix MDG SEG3, 24 s em pé (27 cm vermelhos, tempo de jogo em amarelo de 10 cm): https://www.euronix.es/wp-content/uploads/2024/06/MARCADOR-MULTIDEPORTIVO-EMDG-SEG3.pdf
- Euronix MDG D18JVFL (período, faltas individuais, nomes): https://www.euronix.es/wp-content/uploads/2024/06/MARCADOR-MULTIDEPORTIVO-EMDG-D18JVFL.pdf
- Electro-Mech LX2350-ETN, ficha com desenho a cores: https://assets.electro-mech.com/manuals/specs/basketball/LX2350-ETN%20Spec%20Sheet.pdf
- Electro-Mech, gama de basquetebol: https://www.electro-mech.com/basketball/
- Daktronics BB-2101 (entrada; décimas abaixo de 1 min; vermelho/âmbar; «HOME / GUEST» em vinil branco; ColorSmart): https://daktronics.com/en-us/products/sports/BB-2101
- Daktronics, gama de basquetebol: https://www.daktronics.com/en-us/products/sports/basketball
- Bodet BT6000, manual (teclas, hora do dia quando parado): https://www.manualslib.com/manual/1259335/Bodet-Bt6000.html?page=14
- Bodet 8025 / BT6025 Alpha (autocolantes contra nomes em LED): https://archiexpo.com/prod/bodet-sport/product-154129-1823300.html
- Stramatel, marcadores de basquetebol (gama): https://stramatel.com/en/sport/indoor-collective-sports/basketball
- Stramatel 452 ML 3123-123 (topo, FIBA nível 1): https://stramatel.com/en/sport-range/scoreboard-452-ml-3123-123
- Stramatel, manual da consola 452M alpha (pre-match timer, rest timer a contar para cima, faltas a zero por período, setas de posse): https://bin.yhdistysavain.fi/1590599/5NOuSLRdMQ4TdkijaqYB0ZtAYT/Stramatel%20-%20operating%20instructions%20in%20English.pdf
- Stramatel, faixas de LED vermelha e amarela (Bundesliga): https://www.kuebler-sport.com/stramatel-led-strips-u4105.html
- OES Scoreboards (dígitos de várias cores misturados): https://www.oes-scoreboards.com/?p=3447
- Keep The Score, explicação dos campos de um marcador: https://keepthescore.com/blog/posts/basketball-scoreboard-explained/
- Wikipedia, *Scoreboard* (7 segmentos de lâmpadas, LED e segmentos basculantes): https://en.wikipedia.org/wiki/Scoreboard
- DGE, formação de arbitragem de basquetebol (equipamento da mesa: sinalizadores de faltas, posse alternada): https://plataforma.dge.mec.pt/pluginfile.php/143418/mod_resource/content/1/PNFJAE%20-%20ACD%20Basquetebol_v2.pdf
