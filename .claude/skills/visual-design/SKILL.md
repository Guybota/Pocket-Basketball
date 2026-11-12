---
name: visual-design
description: Diretrizes para criar ou mudar arte, animação, pixel art, cores, ícones, emblemas, fontes e interface no Pocket Basketball, tudo desenhado por código em src/ui/art/, src/ui/match-view.ts e src/ui/style.css. Usa sempre que fores desenhar um boneco, uma pose, um efeito, um ecrã, um componente, um ícone, um emblema ou uma paleta, ou rever arte e animação. Inclui a regra obrigatória de revisão por um agente revisor.
---

# Arte, animação e interface do Pocket Basketball

O jogo não tem imagens feitas à mão. Bonecos, campo, cidade, retratos, emblemas, ícones e letra são desenhados por código num canvas, e a interface é HTML e CSS por cima. Este skill diz como desenhar, animar e compor de forma coerente com o que existe, e como rever o resultado.

As referências têm o detalhe, os números e as fontes. Lê só a que precisares:

| Ficheiro | O que tem |
|---|---|
| [references/codigo.md](references/codigo.md) | **Lê primeiro.** Como o código de arte, animação e interface funciona hoje: cores, píxeis, fonte, poses, tempo, campo, cidade, identidade, componentes, verificações e as lacunas conhecidas. |
| [references/pixel-art.md](references/pixel-art.md) | Linhas, contornos, leitura em tamanho pequeno, sombreamento, dithering, isometria, escala e canvas, e pixel art gerada por código. A secção 12 é a lista de verificação. |
| [references/animacao.md](references/animacao.md) | Os 12 princípios em bonecos de 16 a 32 píxeis, tempos, smears, paragem no golpe, tremor, sub-píxel, animação em código, o movimento do basquetebol, efeitos e «sumo». A secção 10 é a tabela de tempos. |
| [references/ui.md](references/ui.md) | Heurísticas, toque, acessibilidade, teoria da interface de jogos, jogos de gestão de desporto, interface em pixel art, tabelas e dados. A secção 9 tem os números para copiar. |
| [references/cor.md](references/cor.md) | OKLCH, rampas, paletas conhecidas, luz e tempo, peles, equipamentos, cor na interface, daltonismo e código para contraste e simulação. A secção 0 é o resumo. |
| [references/design-grafico.md](references/design-grafico.md) | Composição, fonte bitmap com acentos, ícones, heráldica e emblemas, equipamentos, cartas, troféus, charme, guia de estilo, design generativo e originalidade. |
| [references/revisao.md](references/revisao.md) | Métodos de revisão, humana e por IA, e como funciona o cenário de teste do agente revisor. |

Os relatórios marcam o que não foi verificado, como [NV] ou [não verificado]. Esses números são ponto de partida, não lei.

## Regras do projeto

- **Original.** Nada copiado nem parecido com recursos de outros jogos (Nintendo, Kairosoft e outros) nem com marcas reais: logótipos da NBA ou da FIBA, emblemas de clubes reais. Cuidado, por exemplo, com leão verde e branco, águia vermelha ou dragão azul e branco. Estuda-se a abordagem, não o resultado.
- **Desenhado por código e determinista.** O que varia sai de uma semente: o hash do nome, do emblema, da semana ou do jogo. Na arte não se usa `Math.random`; a exceção atual são os flashes de fotografia. Fora de `src/sim/` podes usar `Math.sin` e funções parecidas.
- **Escala inteira, com uma exceção.** A arte desenha-se a 1× e mostra-se a múltiplos inteiros, com `imageSmoothingEnabled = false` e `image-rendering: pixelated`. A exceção, por decisão do dono: no jogo, a tela tem a resolução do ecrã e os bonecos do mundo (jogadores, bancos, público) têm o tamanho da distância à câmara, como no Calciobit (`drawSprite(…, scale)` com `Camera.depthScale`). O desenho amplia-se primeiro por um inteiro e só depois se ajusta, por isso só as bordas ficam suaves. No jogo, o campo inteiro também enche o ecrã com qualquer escala: a tela desenha-se ampliada pelo inteiro logo acima do necessário e o browser ajusta-a com suavização (`image-rendering: auto`, em layout.ts), em vez de crescer aos saltos e deixar margens. O cenário do campo vai passando para a placa gráfica (`src/ui/gpu/`, three.js; por agora o chão e as linhas), desenhado à resolução do ecrã: texels nítidos (cada borda num só píxel do ecrã), média dos mipmaps ao longe e linhas com largura real e um mínimo em píxeis do ecrã. Tudo o resto continua a escala inteira. Proibido:
  - escalas fracionárias;
  - `rotate` (exceto os frames de queda que já existem);
  - `stroke` e `arc` com anti-aliasing;
  - `fillText` com fontes do sistema dentro da arte;
  - transformações CSS que desfocam.

  Coordenadas sempre inteiras, arredondadas sempre da mesma maneira.
- **Polígonos com `fillPolygon`** (pinta pelo centro do píxel) e linhas com `pixelLine`. Não uses o `fill()` do canvas.
- **Tinta `#1b2230` em vez de preto.** O contorno é de 1 píxel de tinta, as sombras na interface são duras e sem desfoque, e há uma sombra debaixo das figuras.
- **Cores com nome.** Usa os tokens CSS (`--ink`, `--paper`, `--ball`, `--gold`…) e o `INK` de `palette.ts`. Não acrescentes literais hex novos se já houver um token. O ouro é para o S, os combos, a seleção e os raros; o laranja da bola é para a bola e as ações principais.
- **Português de Portugal** nos textos e nos comentários, inglês nos identificadores. Um comentário de uma linha diz o porquê.
- **Decisões do utilizador, que não se desfazem sem perguntar:**
  - a barra do treinador tem só ícones, e a velocidade mostra «X1/X2/X4»;
  - as linhas das listas têm 34 píxeis;
  - as notas S a E têm as cores quentes atuais;
  - não há chuva;
  - o ecrã de título cabe sem scroll;
  - não há zoom com dois dedos;
  - a «Torre» mantém o nome.

## O ciclo de trabalho

1. **Lê o código que vais tocar** e a parte do `codigo.md` que lhe diz respeito. Reaproveita o que existe: `fillPolygon`, `text()`, `remember()`, `POSES`, `iconFrom`, os componentes CSS.
2. **Descreve o resultado numa frase**: o que comunica, onde aparece, a que tamanho e em que estado.
3. **Vê as regras** na referência do tema: pixel art, animação, interface, cor ou design gráfico.
4. **Desenha à escala real primeiro.** Um boneco de 22 píxeis não ganha pormenor por ser desenhado a 4×.
5. **Liga ao jogo** e acrescenta o caso ao `anim-check` ou ao `browser-check`, se ainda lá não estiver.
6. **Pede a revisão obrigatória** (secção abaixo), corrige o que o revisor encontrar e repete até passar.
7. **Antes de entregar:**
   - corre `npm run check` e `npm run browser-check`, e olha para as imagens;
   - se mexeste em poses ou efeitos, corre também `npm run anim-check`;
   - envia ao utilizador as imagens ou as folhas de frames com `SendUserFile`.

## Pixel art

- **Leitura primeiro.** Cada pose tem de se reconhecer pela silhueta a preto e ler-se em tons de cinzento. A bola é o objeto com mais contraste no campo.
- **Linhas:** só declives inteiros (1:1, 1:2, 2:1…) com segmentos iguais. As curvas sobem ou descem sem voltar atrás. Sem cantos em L no contorno, e píxeis soltos só de propósito, como o brilho de um olho.
- **Sem anti-aliasing exterior** em bonecos sobre fundos que mudam, e nenhum a 16 píxeis.
- **Sem dithering** em jogadores, caras, texto, ícones e emblemas.
- **Sombreamento:** uma só direção de luz, de cima. Usa 3 a 4 tons por material, sem «pillow shading» (sombra que só acompanha o contorno).
- **Proporções:** a cabeça tem o mesmo tamanho em todos os jogadores; a altura muda no tronco e nas pernas (`pixelsForHeight`). Os olhos são de 1 píxel e a expressão faz-se com a sobrancelha e a boca.
- **Isometria (cidade e cenas):**
  - linhas 2:1, nunca 45° no chão;
  - as faces de um cubo com três valores fixos (topo claro, esquerda média, direita escura);
  - ordem de desenho por i+j e pela altura.
- **Arte gerada por código:**
  - as variações saem de parâmetros com semente, e não de ruído;
  - os padrões vêm de uma lista fechada;
  - cada peça gerada é validada por contraste e vista lado a lado com as outras, para não saírem todas «iguais».

## Animação

- **A unidade de tempo é o tick: 50 ms, ou 3 frames a 60 fps.** As poses duram múltiplos de um tick. O `animTick` acelera a 2× e 4× e para na pausa.
- **Os tempos e o número de poses** de cada movimento estão na tabela da secção 10 de `animacao.md`. Por exemplo:

  | Movimento | Poses | Tempo |
  |---|---|---|
  | Corrida | 4 a 8 | 80 a 100 ms cada |
  | Lançamento em suspensão | 5 | 150 / 100 / 150 / 250 / 100 ms; o pulso fica em «pescoço de ganso» até a bola chegar perto do aro |
  | Afundanço | 6 | com uma paragem de 50 a 83 ms no aro |
  | Pó | 3 a 5 | 50 a 70 ms |

- **Arcos:**
  - a bola e os saltos fazem parábolas (`4H·t(1-t)`);
  - um passe longo ou picado tem arco, e quem o tenta intercetar salta;
  - a altura no ápice cresce com a distância.
- **Arredondamento:** arredonda a âncora do boneco (os pés) e desenha as articulações a partir dela, para nada tremer. Um objeto lento move-se de píxel em píxel, sempre com a mesma regra de arredondamento.
- **O cenário em perspetiva que se mexe com a câmara** (linhas do campo, arestas, texturas do chão) não se resolve na resolução da arte. Já se experimentou, com a G2:
  - Linhas de 1 píxel de arte (Bresenham) rastejam aos blocos de 4 a 6 píxeis do ecrã.
  - Linhas suavizadas (Wu) ou pintadas na textura tremem menos, mas, ampliadas, ficam desfocadas ao longe e nas curvas.
  - Só desenhar à resolução do ecrã as deixa nítidas e estáveis. Num jogo a 30 fps, cada frame tem 33 ms ao todo, mas o traçador de raios em JavaScript à resolução do ecrã leva 33 a 63 ms por frame. Por isso, o caminho é a placa gráfica: ver [docs/08-plano-gpu.md](../../../docs/08-plano-gpu.md).
- **O «sumo» na medida de um jogo de gestão calmo:**
  - tremor do ecrã de 1 a 2 píxeis de arte, só em momentos raros como o afundanço;
  - paragem no golpe de 33 a 83 ms, também só em momentos raros;
  - nunca clarões no ecrã inteiro (WCAG 2.3.1).
- **Efeitos de ecrã contam em tempo real, não em ticks.** O tremor do afundanço dura 200 ms reais, muda de posição 15 vezes por segundo, mexe 1 píxel de arte e desliga-se acima de 2×; a paragem no aro também conta em tempo real (`realTime`).
- **Movimento reduzido** (`reducedMotion()`): congela o público, tira flashes e tremor, e corta os confetes para 10 a 20 %. A informação continua toda lá.
- **Contra trocas rápidas:** não troques entre frente e costas, nem entre poses, em menos de 0,5 s (`TURN_LOCK_TICKS`).

## Interface

- **Toque:** pelo menos 44×44 px CSS, com as listas a 34, por decisão do utilizador, e 8 px entre alvos. As ações principais ficam em baixo, ao alcance do polegar.
- **Contraste:**
  - 4,5:1 em todo o texto (a regra do texto grande não vale para fontes bitmap finas);
  - 3:1 em controlos, ícones e foco;
  - 7:1 no modo de alto contraste.
- **Nunca só cor.** A letra da nota é a informação e a cor só reforça. Prefere azul contra laranja a verde contra vermelho.
- **Estados:** todo o controlo tem normal, foco (contorno dourado), premido (desce 1 píxel), selecionado (ouro) e desligado. A ação dispara ao largar.
- **Espaços** em píxeis de arte de 1, 2, 4, 6, 8, 12 e 16; margem lateral de 16 px CSS no telemóvel.
- **Tempos de resposta:**
  - toque com resposta no mesmo frame;
  - transições pequenas de 150 a 200 ms;
  - mudanças de ecrã até 400 ms.
- **Ações frequentes a 1 ou 2 toques.** Os nomes nas tabelas abrem o jogador ou a equipa.
- **Acessibilidade:** o foco entra em cada ecrã novo; botões de ícone com `aria-label` e `title`; imagens com `alt`; uma mensagem no `#live` a cada 3 s, no máximo; atalhos em `keys.ts`.
- **Testa em 640×360** (tem de caber), em 844×390 (telemóvel deitado), em 1280×720 e em 1920×1080. O jogo é só na horizontal. Testa também com letra grande e alto contraste.

## Cor

- **A claridade manda.** Mede-a em OKLCH L, nunca em HSV ou HSL. Se lê em cinzentos, lê a cores.
- **Rampas:** 4 a 6 passos com saltos de L iguais (0,10 a 0,15). O matiz roda 15 a 30° no total, para quente nas luzes e para frio nas sombras, e o croma é máximo nos tons médios. Nas peles, as sombras ficam mais vermelhas, não cinzentas.
- **Luz do dia e tempo:** não mexas nas rampas; aplica uma transformação por cima de tudo.
- **Equipas:** distinguem-se primeiro pela claridade, uma clara e outra escura (ΔL ≥ 0,25), e depois pelo matiz. Confirma com simulação de daltonismo (ΔE_OK ≥ 0,15). O código está na secção 11 de `cor.md`.
- **Tokens semânticos** na interface: bom, mau, aviso, selecionado e desligado. O mau não é a cor da equipa visitante.

## Design gráfico

- **Uma hierarquia por ecrã:** um ponto focal, alinhamento à grelha de píxeis e espaço vazio de propósito.
- **Letra (`font.ts`):**
  - só maiúsculas, com 3×5 e acentos por cima;
  - deixa espaço para os acentos em todo o texto, e testa-os (há capturas `acentos-*` no `browser-check`);
  - **o til atual do Ã e do Õ é reto e lê-se como mácron**, e faltam º ª « » e €.
- **Ícones:**
  - grelha de 16 (botões) ou 8 (dentro do texto), traço consistente e luz de cima à esquerda;
  - têm de se reconhecer pela silhueta;
  - na barra do treinador, mostram-se a exatamente 2×.
- **Emblemas:**
  - simetria e contraste entre cores (a regra da tintura da heráldica);
  - têm de ler a 16 e a 24 píxeis;
  - dois clubes da mesma liga não podem parecer iguais;
  - nada que lembre um clube real.
- **Equipamentos:** padrões de uma lista fechada (riscas, aros, faixas…), e a camisola tem de ler no campo contra a do adversário.
- **Cartas e troféus:** a raridade e o prestígio comunicam-se por forma e brilho em degraus, não só por cor. Usa rampas de ouro, prata e bronze.
- **Charme:** calor, papel, pequenos pormenores e humor discreto, como o cão, o pombo ou o adepto a dormir. É coerente com o que já existe, não um estilo novo.

## Revisão obrigatória

**Sempre que acrescentas ou mudas uma animação, uma pose, um efeito ou um asset visual** (boneco, cenário, ícone, emblema, carta, componente ou ecrã), lança um agente revisor separado com o Agent tool. Ele recebe o que mudou e a lista de verificação do tema, e não a tua conclusão.

O revisor:

1. **Começa pelo mais simples que chegue.** Muitas vezes não é preciso pôr o asset em jogo: basta exportar a sprite sheet. São as poses ou os frames de uma animação lado a lado, à escala 1× e ampliados a um múltiplo inteiro, com o número e o nome de cada frame. Também podes mostrar os vários aspetos (pele, cabelo, equipamento) e as versões de frente, de costas e espelhada. Só passa ao cenário de teste quando o que se quer ver depende do movimento no campo: o arco da bola, os defesas, o tempo entre ações ou um fluxo.
2. **Monta cenários de teste sem abrir o jogo inteiro.** Por exemplo:
   - um campo vazio com um só jogador a lançar ou a fazer um movimento especial, com o número de defesas à escolha;
   - um só componente da interface;
   - um fluxo curto, como um desconto de tempo.
3. **Grava o cenário a 30 fps com os frames numerados** (`frame-0001.png`, …) e faz uma folha de contacto com o número desenhado em cada frame.
4. **Mede o que se pode medir em código**, nas sprite sheets e nos frames:
   - cores fora da paleta;
   - contorno contínuo;
   - tremor da âncora do boneco de frame para frame;
   - estabilidade da caixa do boneco;
   - contraste;
   - nada a sair do ecrã.
5. **Olha para as folhas e escreve um relatório.** Cada problema leva o frame, as coordenadas e a regra que falha, e é confirmado com uma medida sempre que possível.

**Medir primeiro, olhar depois.** Um modelo de visão sozinho é fraco a rever arte: o melhor apanhou 43 % das falhas no GlitchBench, e quase nenhuma das que se estendem por vários frames. Também conta mal píxeis e julga mal cores. Por isso as medidas em código vêm primeiro, o olhar vem depois, e cada problema que o olhar encontra é confirmado com uma medida. Ajuda muito dar ao revisor uma imagem de referência e dizer-lhe o que o frame deve mostrar.

**Gravações reprodutíveis.** Os flashes de fotografia usam `Math.random`, por isso grava com movimento reduzido ou com uma semente.

**Grava à escala real do jogo.** Num `MatchView` montado à mão, usa uma tela de 360·N × 216·N com `canvas.dataset.artScale = 'N'`, com N = 4 (1440×864). Com `artScale = '1'`, os bonecos são reduzidos a frações de píxel e saem esborratados, e o cenário não mostra os blocos que o jogador vê. Isso engana a revisão nos dois sentidos.

**O que treme com a câmara mede-se com a câmara a andar.** Uma imagem parada não mostra rastejar nem cintilar em linhas, arestas e texturas. Faz uma passagem lenta de 0,02 m por frame, com `cam.aim` preso e `cam.forgetScene()` em cada frame. Conta os píxeis que voltam à cor de dois frames antes (A-B-A, com ΔL > 0,04): esses píxeis estão a piscar. Compara sempre com o jogo atual medido da mesma maneira.

**Um crítico sem contexto encontra o que o autor não vê.** Além do revisor, para mudanças grandes (um cenário novo, um motor novo), lança um agente que não sabe o que mudou nem porquê. Diz-lhe só para comparar com o jogo e para medir tudo o que afirmar. Foi assim que se encontraram as dobras abertas e o sinal trocado no protótipo 3D.

**Imagens para o utilizador:** em JPEG de até cerca de 350 KB. PNGs grandes falham no envio quando o utilizador está no telemóvel. Para comparar, põe as versões uma por cima da outra na mesma imagem.

**A ferramenta: `npm run review -- <descrição.json> [outra.json …]`.** Grava em `dist-check/revisao/<nome>/`. Há exemplos em `src/tools/cenas/`, e os formatos (`SheetSpec` e `SceneSpec`) estão em `src/ui/review.ts`.

- **Folha de sprites** (`"kind": "sheet"`):
  - **O que se escolhe:**
    - as poses (`"all"` para todas), ou uma animação com tempo (`"frames": [["gather", 3], ["shoot", 2]]`, uma coluna por tick);
    - os aspetos (`player`, `kit`, `skin`, `hair` e os outros campos de `Look`);
    - as variantes (`front`, `ball`, `back`, `backBall`, `flip`, `flipBall`);
    - o `zoom`.
  - **O que grava:**
    - `folha.png` a 1× e `folha-ampliada.png`, com o número e o nome em cada célula;
    - `medidas.json`, com a caixa, os pés, os píxeis meio transparentes, as falhas de contorno, as cores e a diferença entre o virado e o espelho;
    - `avisos.txt`.
- **Cenário de teste** (`"kind": "scene"`):
  - **O que se escolhe:**
    - `force`, o evento que tem de acontecer, com os campos do `MatchEvent`, por exemplo `{"type": "move", "move": "powerDunk"}` ou `{"type": "made", "points": 3}`. Para um passe, `{"type": "pass"}`, ou `{"type": "pass", "lob": true}` para um em balão: quem passa é o ator, e quem recebe aparece sempre;
    - `setup`, em vez de `force`, para montar uma jogada sem esperar que aconteça num jogo: no primeiro ataque organizado, a posse passa a ser a jogada `play` (`free`, `pickRoll`, `pickPop`, `screens`, `iso` ou `postIso`) e a simulação continua daí. `holder` e `playFor` são postos de 1 a 5, e `attackers` e `defenders` dentro do `setup` põem os jogadores em `[u, v]`, metros a partir da linha de fundo atacada e para o lado. Há cenas prontas em `src/tools/cenas/jogada-*.json`;
    - `attackers` e `defenders`, quantos atacantes (o ator incluído) e quantos defesas se veem, os mais perto do ator. Os outros e o árbitro não se desenham. Para um passe ou uma jogada de equipa, põe 2 ou mais atacantes;
    - `division`, `week`, `before`, `after`, `fps` (30), `speed`, `crop` (null para o campo inteiro) e `reducedMotion`.
  - **O que grava:**
    - `frames/frame-0001.png`, …;
    - `folha.png`, a folha de contacto com «número · tick · pose» e o frame do evento a dourado;
    - `medidas.json`, com o tick, a pose e os píxeis mudados por frame;
    - `cena.json`, com a semente e o tick encontrados, para repetir logo;
    - `avisos.txt`: se a cena não é determinista (grava-se duas vezes e compara-se) e as poses que duram menos de um tick.
- **Avisos que já se sabem e são de propósito:** os frames de queda (`fallA`, `fallB`, `fallen`) são rodados e por isso têm píxeis meio transparentes e falhas no contorno. Nas poses com salto, os pés não ficam na mesma linha.
- **Ainda não faz:** componentes de interface e fluxos pela aplicação inteira. Para esses, usa as capturas do `browser-check`. Os efeitos (pó, rasto) só se veem dentro de um cenário.

Quem fez o asset corrige e volta a pedir revisão até não haver problemas. O detalhe do método, o protocolo e a lista de verificação estão em `references/revisao.md`.
