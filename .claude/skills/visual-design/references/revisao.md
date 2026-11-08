# Revisão de arte, animação e interface: métodos humanos, automáticos e por agentes

Pesquisa para o Pocket Basketball: pixel art gerada por código, canvas mais interface HTML, ciclo a 60 fps, simulação determinista a 20 passos por segundo, feito só por agentes (Claude e Codex). Serve a regra do dono: **sempre que um agente acrescenta uma animação ou um asset visual, lança-se um agente revisor separado**, que monta cenários de teste ou folhas de sprites, grava frames numerados, mede o que se pode medir e escreve um relatório.

Marcas usadas:

- **[V]** confirmado numa fonte primária (documentação oficial, artigo, código lido);
- **[NV]** visto só em resumos, blogues ou agregadores, ou não confirmado: ponto de partida, não lei;
- **[Repo]** lido diretamente no código deste repositório.

Índice:

1. Revisão humana nos estúdios
2. Testes visuais automáticos
3. Cenários de teste e «sandboxes»
4. Revisão por IA e por agentes
5. Repositórios públicos
6. O repositório: o que já existe
7. Proposta: o cenário de teste e as folhas de sprites do revisor
8. Protocolo de revisão e lista de verificação
9. Fontes

---

## 1. Revisão humana nos estúdios

### 1.1 «Dailies» de animação

Nos estúdios de cinema e de jogos, as *dailies* são uma sessão curta, diária, em que cada animador mostra a versão do dia e o supervisor dá notas. O que se repete nas fontes:

- **Sessão de trabalho, não apresentação.** Cada plano tem poucos minutos; num relato da Pixar na SIGGRAPH, quem apresenta tem «um par de minutos» para defender a escolha [NV]. Sem limite, gastam-se 40 minutos numa só decisão (blogue da CGWire/Kitsu) [NV].
- **Uma só voz com autoridade final.** As notas vêm de uma pessoa clara; o resto do grupo comenta, mas não decide [NV].
- **Notas registadas e ligadas à versão.** Ferramentas como ShotGrid e Kitsu guardam a nota junto do plano e da versão. Um estúdio que mediu o histórico encontrou planos com a mesma nota repetida 3 ou 4 vezes: sinal de que as notas não ficavam registadas ou não eram verificadas [NV].
- **A nota diz o porquê.** «Se as pessoas não percebem o raciocínio, a direção é tão má como uma opinião de instinto» [NV].
- **Vários ângulos e velocidades.** Para animação de jogo, ver de perfil, de frente, de costas e da câmara do jogo, porque o peso e o tempo leem-se de maneira diferente em cada um [NV]. Ver em tempo real, a meia velocidade e frame a frame: um *pop* invisível a 100 % aparece a 50 % [NV].

**Para nós:** o revisor é a «sessão de dailies» de um asset. Cada versão recebe um número; as notas ficam no relatório com o frame, e a versão seguinte confirma que cada nota foi fechada. A meia velocidade corresponde à folha de contacto frame a frame; o «tempo real» é o GIF ou o MP4 a 30 fps.

### 1.2 Crítica de arte: Braintrust, «plussing» e Pixel Joint

- **Braintrust da Pixar** (Ed Catmull, *Creativity, Inc.*): um grupo que dá notas francas ao realizador, **sem autoridade** sobre ele; o realizador decide o que fazer com as notas. Franqueza, não brutalidade [V em várias fontes secundárias; o livro é a fonte primária].
- **«Plussing»:** cada crítica traz uma proposta que melhora o trabalho («sim, e se…»). Só encontrei a definição num blogue [NV], mas a ideia é útil: **cada problema leva uma sugestão de correção.**
- **Pixel Joint**, o fórum de referência de pixel art: o fórum WIP existe para «crítica construtiva (CC)»; pede-se a quem publica que seja específico e diga onde ficou preso, e que mostre uma peça de cada vez. Dar crítica é tratado como uma arte. As críticas típicas apontam uma zona concreta («demasiado pormenor na roupa da figura 1 e 2; simplificar torna-as mais legíveis») [V no fórum, sem regras formais encontradas]. A prática da comunidade, conhecida de outras fontes, é a **edição («edit»)**: quem critica devolve a imagem com a correção desenhada por cima, ao lado do original. É o «plussing» em píxeis.

**Para nós:** o revisor não tem autoridade para mudar o asset (não edita os ficheiros de quem fez); descreve e propõe. Quando a correção é de píxeis, pode juntar uma imagem com a proposta ao lado (*edit*), gerada a partir da cena, mas não muda o código.

### 1.3 Estrutura de uma nota acionável

Cruzando as fontes, uma nota que se consegue corrigir tem sempre:

1. **Onde:** o frame (ou o intervalo de frames), as coordenadas em píxeis de arte e a parte do corpo ou do componente.
2. **O quê:** o sintoma observável («o pé esquerdo desliza 2 px entre os frames 12 e 15 enquanto devia estar plantado»), não a impressão («a corrida parece estranha»).
3. **Porque é mau:** a regra ou o princípio que falha (com referência ao skill `visual-design`).
4. **Gravidade:** bloqueia, deve corrigir, sugestão.
5. **Proposta:** o que mudar e, se possível, onde no código.
6. **Prova:** a medida que confirma (por exemplo, o desvio da âncora em píxeis) ou, quando não há medida, a indicação «só visual».

Separar o que se vê (sintoma) do que se interpreta (causa) evita que o revisor «adivinhe» a causa e induza quem corrige em erro.

### 1.4 Lista de verificação de animação

Das fontes de QA de animação de jogos (guias da MocapOnline, a lista de Keith Lango, cursos de animação) e de pixel art [maioria NV, mas consensual]:

| Tema | O que procurar | Como se vê ou se mede |
|---|---|---|
| **Tempo** | cada pose dura o que a tabela de tempos pede; antecipação, ação e recuperação com durações diferentes | contar frames por pose na folha; comparar com `animacao.md` §10 |
| **Espaçamento** | aceleração e travagem (*ease*), não velocidade constante onde devia haver peso | posição da âncora por frame: diferenças sucessivas |
| **Arcos** | a bola e os saltos em parábola; as mãos em arco, não em linha reta com quebras | traçar a trajetória (a bola, o topo da cabeça) por cima da folha |
| **Silhueta** | cada pose-chave reconhece-se a preto | folha de silhuetas: pintar tudo o que não é fundo de uma cor |
| **Pops** | um membro ou o corpo salta de sítio de um frame para o seguinte | diferença entre frames seguidos; caixa do boneco a mudar de repente |
| **Tremor (*jitter*)** | o boneco treme parado, ou um objeto lento anda aos solavancos | âncora (pés) seguida frame a frame: oscilação de ±1 px sem movimento real |
| **Pés a deslizar** | o pé de apoio mexe-se em relação ao chão enquanto devia estar plantado | posição do pé no mundo durante o contacto |
| **Trocas rápidas** | frente e costas, ou duas poses, a alternar em menos de 0,5 s | contar mudanças de pose por janela de frames (`TURN_LOCK_TICKS`) |
| **Contorno** | contorno de 1 px de tinta contínuo, sem falhas nem duplicações | píxeis do contorno: vizinhança 8-conexa à volta da figura |
| **Paleta** | só cores da paleta; nada de cores intermédias criadas por mistura ou transparência | histograma de cores contra a lista permitida |
| **Sub-píxel** | mexer cores para sugerir movimento de menos de 1 px, e não deslocar meio píxel | coordenadas sempre inteiras; nenhuma cor nova |
| **Leitura a tamanho real** | lê-se a 1× e a 2×, não só ampliado | folha a 1× e a ampliação inteira lado a lado |
| **Ciclos** | o último frame liga ao primeiro sem salto | comparar o último e o primeiro frame do ciclo |
| **Movimento reduzido** | com `reducedMotion()` a informação continua lá | gravar a mesma cena com e sem |

As fontes classificam os pés a deslizar muito, o atravessar de corpos persistente e os pops evidentes como **bloqueantes** [NV].

### 1.5 Lista de verificação de interface

- **Alinhamento** à grelha de píxeis de arte (espaços de 1, 2, 4, 6, 8, 12, 16) e a uma coluna comum.
- **Transbordo:** texto cortado, reticências inesperadas, scroll horizontal (`scrollWidth > innerWidth`), elementos fora do ecrã nos quatro tamanhos (360×640, 844×390, 1280×720, 1920×1080), com letra grande e alto contraste.
- **Contraste:** 4,5:1 no texto, 3:1 em ícones, controlos e foco, 7:1 em alto contraste.
- **Estados:** normal, foco, premido, selecionado, desligado, vazio, a carregar, erro; cada um visto.
- **Alvos de toque** ≥ 44×44 px CSS (listas a 34, decisão do utilizador), 8 px entre alvos.
- **Escala inteira:** nada desfocado, `image-rendering: pixelated`, sem transformações CSS fracionárias.
- **Acessibilidade:** `aria-label`, foco ao entrar no ecrã, mensagens no `#live`.
- **Tempos:** resposta ao toque no mesmo frame, transições pequenas em 150 a 200 ms.

O `browser-check` já faz parte disto [Repo]: verifica scroll horizontal, problemas de acessibilidade (`a11yProblems`), que as fichas e as notas cabem, e grava capturas.

---

## 2. Testes visuais automáticos

### 2.1 Ferramentas de capturas e regressão visual

| Ferramenta | O que faz | O que tirar daqui |
|---|---|---|
| **Playwright `toHaveScreenshot`** | compara uma captura com uma imagem de referência guardada; opções `threshold` (distância de cor por píxel em YIQ, por omissão 0,2), `maxDiffPixels`, `maxDiffPixelRatio`, `mask` (tapa zonas), `animations: 'disabled'` (para animações CSS e Web Animations, acaba as finitas), `stylePath` (CSS injetado na captura) [V nas opções; valores por omissão NV] | O projeto já usa `playwright-core`, mas não o test runner; `toHaveScreenshot` vem com `@playwright/test`. Podemos fazer o mesmo com `getImageData` e uma comparação nossa, sem dependência nova. |
| **pixelmatch** (Mapbox) | diferença píxel a píxel com distância perceptual em YIQ (Kotsarenko e Ramos, 2009) e deteção de anti-aliasing (Vysniauskas, 2009); um píxel conta como anti-aliasing se tem vizinhos mais claros e mais escuros e poucos irmãos iguais [V no código] | É o algoritmo por baixo do Playwright e do PixiJS. **Em pixel art sem anti-aliasing, a deteção de anti-aliasing deve ficar desligada** (`includeAA: true`), senão esconde píxeis de contorno mudados. |
| **reg-suit** | compara pastas de capturas, guarda as referências num bucket e comenta o PR com o relatório | Modelo de «pasta de esperadas + pasta de atuais + relatório HTML». |
| **BackstopJS** | cenários em JSON (URL, seletores, viewports, `delay`, `readySelector`, `hideSelectors`), relatório HTML com deslizador antes/depois | O **formato de cenário em JSON** é o que propomos para as cenas. |
| **Percy, Chromatic** | serviços pagos: capturas na nuvem, revisão humana de cada diferença, aceitação de referências por PR. A Chromatic espera que a *play function* do Storybook acabe antes de capturar e, por omissão, para as animações CSS **no fim** (antes era no primeiro frame) [V] | A ideia de que **uma diferença não é um erro: é algo a rever e aceitar ou rejeitar**. Para canvas, a Chromatic recomenda desligar a biblioteca de animação ou trocar por imagem estática. |
| **Loki** | capturas de histórias do Storybook em Docker, para o render ser igual em todas as máquinas | O render depende da máquina; fixar o browser ajuda. |
| **Storybook interaction tests** | uma história (componente num estado) mais uma *play function* que clica e verifica | É o modelo do «componente isolado num estado» para a interface. |

### 2.2 Algoritmos de diferença de imagem

- **Por píxel, exato:** conta píxeis diferentes. Para a nossa arte, que é desenhada a 1× com cores inteiras e sem suavização, **é o mais útil**: uma diferença de um píxel é real.
- **Por píxel com tolerância (YIQ, pixelmatch):** útil para o HTML, onde o texto e os cantos têm anti-aliasing do browser.
- **SSIM:** compara estrutura (luminância, contraste, correlação) em janelas; bom para fotografia e compressão, **mau para pixel art**: uma janela de 8×8 dilui um píxel de contorno em falta, e não diz qual píxel mudou.
- **Perceptual (ꟻLIP da NVIDIA, LPIPS):** o ꟻLIP aproxima o que uma pessoa vê ao alternar entre as duas imagens e dá um **mapa de erro por píxel** [V]. Interessante para imagens renderizadas; para nós é mais do que precisamos.
- **Conclusão:** na arte do canvas, diferença exata, e um mapa de diferenças ampliado; no HTML, YIQ com tolerância pequena. Mais do que o número, o revisor precisa da **imagem de diferenças** (o original, o novo e as diferenças a vermelho, lado a lado), como faz o PixiJS.

### 2.3 Referências («golden images») e não-determinismo

Fontes de variação, e o remédio:

| Causa | Remédio |
|---|---|
| Tempo real (`performance.now`, `Date`, `requestAnimationFrame`) | relógio falso ou, melhor, chamar o render diretamente com um passo fixo (secção 7) |
| Aleatoriedade | semente; no three.js substituem `Math.random` por uma sequência fixa [V] |
| Fontes do sistema, anti-aliasing, GPU | a nossa arte não usa fontes do sistema dentro do canvas; o HTML usa, por isso as capturas de interface comparam-se com tolerância e no mesmo browser |
| Animações CSS | `animations: 'disabled'` ou CSS injetado |
| Diferenças entre GPU e drivers | a documentação da Unity avisa que GPU, sistema e drivers diferentes fazem falhar comparações com diferenças invisíveis [V] e organiza as referências por espaço de cor, plataforma e API gráfica. Para nós: referências geradas e comparadas na mesma máquina (o revisor compara «antes» e «depois» no mesmo momento), e não guardadas no repositório para todas as máquinas. |

**Recomendação para este projeto:** em vez de guardar imagens de referência no repositório (pesam e partem com qualquer mudança de arte), o revisor gera **o antes e o depois na hora**: o mesmo cenário com o código do ramo principal (`git worktree` do `main`) e com o código do ramo em revisão. A comparação é exata porque é o mesmo browser e a mesma máquina.

### 2.4 Render determinista

Técnicas conhecidas, da mais forte para a mais fraca:

1. **Conduzir o render diretamente, sem o ciclo do jogo.** Chamar `step()` e `render(alpha, dt)` com valores fixos e ler o canvas a seguir. Não depende de relógio nenhum. **É o que o `anim-page.ts` já faz** [Repo], e é a base da proposta.
2. **Relógio falso do Playwright (`page.clock`).** `install()` **antes** de `goto()` substitui `Date`, `setTimeout`, `setInterval`, `performance.now` e `requestAnimationFrame`; `pauseAt`, `runFor(ms)` e `fastForward` fazem andar o tempo e disparam os callbacks, incluindo os frames de animação [V na documentação oficial]. Serve para fluxos que só existem no ciclo do `main.ts` (desconto de tempo com o painel, transições de ecrã).
3. **Tempo virtual por substituição de funções** (timesnap, timecut, overcrank): substituem `requestAnimationFrame`, `Date`, `setTimeout` e `performance.now` por um relógio virtual, capturam um frame em cada passo e passam ao ffmpeg. Não cobrem animações CSS nem vídeo [V no README do timesnap]. O three.js faz o mesmo nos testes e2e: `performance.now = () => 0`, `Math.random` fixo e um `requestAnimationFrame` que só dispara quando o teste manda [V no código].
4. **CDP `HeadlessExperimental.beginFrame`:** o teste manda o browser compor um frame com um `frameTimeTicks` escolhido e pode receber a captura; precisa de `--run-all-compositor-stages-before-draw` e de controlo do *begin frame* [V no protocolo]. É experimental, só em headless, e há relatos de falhas fora do Linux [NV]. **Não precisamos dele**: o nosso render é síncrono num canvas e lê-se com `toDataURL`/`getImageData`.

### 2.5 Captura de frames de canvas

- `canvas.toDataURL('image/png')` ou `getImageData` depois de cada `render()` dá a imagem exata, sem compositor, sem escala do ecrã e sem a interface por cima. É o que o `anim-check` usa [Repo].
- `page.screenshot()` / `locator.screenshot()` apanha o que o utilizador vê (canvas mais HTML, escala CSS); serve para a interface e para fluxos.
- **Folhas de contacto e GIF:** com ffmpeg, por exemplo

  ```bash
  # folha 8×N com o número de cada frame
  ffmpeg -framerate 30 -i frame-%04d.png -vf "scale=iw*3:ih*3:flags=neighbor,drawtext=text='%{frame_num}':start_number=1:x=4:y=4:fontcolor=white:box=1:boxcolor=black,tile=8x6" folha.png
  # GIF a 30 fps, ampliado sem suavização
  ffmpeg -framerate 30 -i frame-%04d.png -vf "scale=iw*3:ih*3:flags=neighbor,split[a][b];[a]palettegen[p];[b][p]paletteuse" cena.gif
  ```

  Mas o ffmpeg não é garantido no Windows do dono. **Proposta:** fazer a folha no próprio browser, num canvas, com a fonte `text()` do jogo para os números (é pixel art, não precisa de fontes do sistema), e deixar o ffmpeg só como opção para o GIF/MP4.

---

## 3. Cenários de teste e «sandboxes»

### 3.1 Nos motores de jogo

- **Unity:** pré-visualização de animação no inspetor (um modelo num palco vazio, com linha de tempo e velocidade); *Playables* e *Timeline* para tocar uma animação num estado escolhido; o **Graphics Test Framework** compara a imagem de uma cena de teste com uma referência (`ImageAssert.AreEqual`), e a primeira execução falha de propósito para gerar a referência, que se extrai e revê [V].
- **Unreal:** o *Sequencer* toca uma sequência num nível de teste; os *Functional Screenshot Test actors* põem-se num nível e tiram a captura; o *Screenshot Comparison Tool* mostra as diferenças contra a «verdade» aprovada, para aceitar ou rejeitar. O **Gauntlet** é a camada que lança sessões do jogo (cliente, servidor) para correr testes e validar resultados; não faz comparação de imagens [V].
- **Godot:** cenas são unidades isoladas e qualquer cena se corre sozinha (F6). O *scene runner* do GdUnit4 simula teclas e rato e avança uma cena um número de frames; a comparação de capturas fica para ferramentas à parte, como o GdSnap ou o *Godot Visual Smoke Test Kit* (tolerância por canal e percentagem de píxeis mudados) [V em fontes da loja e PyPI; pormenores NV].

O padrão comum: **uma cena mínima, só com o que se quer ver, avançada frame a frame, capturada e comparada com o que foi aprovado.**

### 3.2 Na web

- **Phaser:** cada cena é «quase um mundo à parte»; uma prática da comunidade é **uma cena de teste por componente, aberta com `?scene=NomeTestScene`** [NV, skill de comunidade].
- **Storybook para jogos:** há quem use o Storybook para ver malhas, animações, interface e mapas isolados [NV, um relato].
- **PixiJS:** cada teste visual é um objeto `{ it, create(scene, renderer), pixelMatch, renderers }`: uma função monta a cena, o teste renderiza, compara com `tests/visual/snapshots/<id>.png` com pixelmatch (`threshold: 0.2`) e, se falha, desenha a imagem esperada, a atual e a diferença lado a lado [V no código].
- **Menus de depuração e seleção de nível** são o equivalente clássico: entrar diretamente num estado do jogo sem passar pelos menus.

### 3.3 Levar uma simulação determinista a uma situação

Três técnicas, combináveis:

1. **Procurar a semente.** Correr jogos com sementes seguidas até o evento acontecer e guardar `(semente, tick)`. É o que o `seedFor(move)` do `anim-page.ts` faz [Repo]. Vantagem: o estado é real, a simulação não foi tocada. Desvantagem: não se escolhe onde nem com quantos defesas; uma mudança de equilíbrio muda as sementes.
2. **Condicionar as equipas.** Dar o movimento a todos com `withMoves(team, [move])` (já existe em `teamgen.ts` [Repo]), subir os atributos, escolher táticas; o evento acontece mais cedo e com mais frequência.
3. **Encenar o estado** (*fixture*): criar o jogo com `createMatch`, avançar até uma fase calma e depois mexer nas posições, no dono da bola e nos alvos. É o mais flexível, mas pode criar estados que a simulação nunca produz. Como o `MatchState` sobrevive a JSON [Repo: regra do AGENTS.md], um estado encenado pode guardar-se como ficheiro e reabrir-se igual.

Os testes da simulação (`src/sim/sim-*.test.ts`) já usam equipas construídas à mão; o cenário visual pode reaproveitar os mesmos construtores.

---

## 4. Revisão por IA e por agentes

### 4.1 O que dizem os estudos

| Trabalho | O que mediu | Lição |
|---|---|---|
| **GlitchBench** (Taesiri et al., CVPR 2024) | 593 falhas de 205 jogos, tiradas do r/GamePhysics; os modelos multimodais têm de dizer o que está errado. O melhor (GPT-4V) acertou 43,4 % [V] | Sem contexto, «há algum erro nesta imagem?» falha mais de metade das vezes. |
| **VideoGameBunny** (Taesiri e Bezemer, WACV 2025) | modelo de 8B treinado com 389 565 pares imagem-instrução de jogos; bate modelos maiores a reconhecer anomalias e a ler o HUD [V] | O treino específico ajuda; para nós, o equivalente é **dar contexto**: o que a imagem devia mostrar. |
| **VideoGameQA-Bench** (NeurIPS 2025, Sony e U. Alberta) | testes visuais unitários, regressão visual, «agulha no palheiro», deteção de falhas e relatórios de erro, em imagem e vídeo [V] | Os modelos de ponta fazem relatórios úteis para cerca de metade das falhas reais, mas **falham em pormenores finos, regressões subtis e em localizar a falha em clipes longos** [V]. |
| **TempGlitch** (2026, U. Alberta e Sony) | falhas que só se veem ao longo de vários frames; 12 modelos | Ficam perto do acaso; mais frames ou modelos maiores quase não ajudam. A mesma equipa mostra que **comparar cada frame com um frame de referência** do mesmo vídeo melhora a deteção (RESP) [NV, resumos]. |
| **VLMs em canvas HTML5** (Macklon e Bezemer, 2025) | 100 capturas de 20 aplicações PixiJS, bugs de *layout*, render, aparência e estado | Com o README da aplicação, a descrição dos tipos de bug e **uma captura sem bug como referência**, chega a 100 % por aplicação; os bugs de **aparência** são os mais difíceis; os autores dizem que não substitui o teste manual [V no resumo]. |
| **«Vision language models are blind»** (BlindTest, ACCV 2024) | tarefas triviais: linhas que se cruzam, círculos sobrepostos, contar | 58,6 % de média; os modelos de «pensamento lento» não fazem melhor [V]. **Contar e localizar píxeis é exatamente o que um VLM faz mal.** |
| **EA SEED** (García Ling, Tollmar, Gisslén, AIIDE 2020) | redes convolucionais treinadas com falhas sintéticas de render (texturas em falta, manchas, alongamentos) | 64 a 99 % por classe, 6,7 % de falsos positivos, com uma medida de confiança para os reduzir [V]. Lição: **gerar exemplos com o erro de propósito** para saber se o detetor o apanha. |
| **Ubisoft La Forge, Commit Assistant** | prevê bugs no código, não na imagem; dizia apanhar 6 em 10 com 30 % de falsos alarmes [NV, imprensa 2018] | Não é revisão visual. |
| **modl.ai, King** | bots que jogam pelo ecrã; a King fala de cobrir com IA os testes mais repetitivos [NV] | Mais exploração do que revisão de arte. |
| **MLLM-as-a-Judge** (2024) | modelos como juízes de respostas multimodais | Preferem respostas numa posição (viés de posição), alucinam mais a ordenar muitos itens do que a comparar dois; pensar antes de julgar reduz a alucinação [V]. Trabalhos de 2026 mostram juízes que **acreditam na descrição escrita em vez da imagem** [NV]. |
| **Set-of-Mark** (Microsoft, 2023) | marcas numeradas desenhadas por cima de regiões da imagem | O modelo responde melhor quando pode dizer «a marca 7» do que quando tem de dar coordenadas, que dá mal [V]. |
| **GUIPilot, VLM-Fuzz, Minuku** (2025) | interfaces móveis: desvio do *mock-up*, exploração, problemas de ecrã | Restringir as ações e regiões que o modelo pode referir reduz a alucinação [V no resumo de GUIPilot]. |
| **agentic-visual-QA** (repositório) | agente de QA com verificações deterministas, LLM e VLM numa loja com 10 defeitos plantados | **O agente completo não encontrou mais defeitos do que as verificações deterministas sozinhas**; o gargalo passou a ser escolher as experiências e validar as provas [V no README]. |

**Conclusão:** um modelo multimodal é bom a dizer «esta pose não se lê», «o braço parece partido», «o texto está cortado», «isto não parece um afundanço», e a escrever o relatório. É mau a contar píxeis, a ver uma cor fora da paleta, a notar um tremor de 1 px e a localizar no tempo. Por isso: **primeiro medidas em código, depois o olhar do modelo, e cada achado do modelo confirmado por uma medida quando houver uma.**

### 4.2 Estratégias de pedido («prompting») para revisão visual

1. **Dar a referência.** Mostrar o «antes» e o «depois», ou um frame bom, ao lado. É o que mais ajuda nos estudos (Macklon e Bezemer; RESP).
2. **Dizer o que devia ver.** «Frames 1–6: preparação; 7–12: salto com a bola acima da cabeça; o pé de apoio não se mexe até ao frame 7.» O modelo compara com uma expectativa em vez de procurar «algo errado».
3. **Folhas com números e grelha.** Cada frame com o número desenhado; uma grelha de 8 px de arte por cima numa versão; marcas numeradas nas partes (Set-of-Mark: «A = cabeça, B = mão da bola, C = pé de apoio»). O modelo cita «frame 14, marca C».
4. **Ampliação inteira e recortes.** Um boneco de 22 px numa imagem de 360 px ocupa pouco do que o modelo vê. Recortar à volta do boneco e ampliar 4× ou 6× com vizinho mais próximo. Mandar poucas imagens grandes em vez de muitas pequenas.
5. **Rubrica fechada.** Uma lista de perguntas com «sim / não / não sei» e o frame, em vez de «o que achas?». Uma pergunta de cada vez reduz o viés de posição e a alucinação de ordenar muitos itens.
6. **Pedir frame e coordenadas, e depois verificar.** Cada achado com frame, zona e regra; o agente revisor confirma com uma medida (a âncora mexeu? há cor nova naquela zona?) e descarta o que não se confirma, ou marca «só visual».
7. **Não deixar o texto mandar.** O revisor recebe **o que mudou e a lista de verificação, não a conclusão de quem fez** (já está no skill). Assim não «acredita» na descrição.
8. **Plantar erros de propósito** (ideia da EA): de vez em quando, correr o revisor numa versão com um erro conhecido (um píxel de contorno apagado, uma cor errada, um pé que desliza) para saber se ele o apanha.

### 4.3 Medidas em código que completam o modelo

São as que um VLM não faz bem e o código faz exatamente. Detalhe na secção 7.6:

- **Paleta:** todas as cores da figura pertencem à lista; alfa só 0 ou 255.
- **Contorno:** cada píxel da figura que toca o fundo é tinta (`#1b2230`), salvo exceções declaradas; nenhuma falha no anel.
- **Tremor da âncora:** a posição dos pés (ou do centro de massa da silhueta) frame a frame; oscilação sem movimento real.
- **Caixa:** largura e altura da figura por frame; saltos maiores do que N px entre frames seguidos são *pops*.
- **Diferença entre frames:** frames seguidos iguais (pose parada demasiado tempo) ou com diferença enorme (salto).
- **Contraste e leitura:** claridade da figura contra o fundo; silhueta.
- **Fora do ecrã:** a figura ou o texto toca a borda do canvas ou do contentor.

---

## 5. Repositórios públicos

Encontrados com a pesquisa de código do GitHub e lidos onde foi possível (ficheiros obtidos de `raw.githubusercontent.com`).

### 5.1 Testes de capturas de canvas e de jogos

- **mrdoob/three.js — `test/e2e/deterministic-injection.js` e `puppeteer.js`** [V, lido]. Injeta antes do código da página: `Math.random` com semente fixa, `performance.now = Date.now = () => 0`, e um `requestAnimationFrame` que só chama o callback quando o teste diz que começou; também controla vídeos. Depois compara cada exemplo com uma captura. **Lição:** a determinação faz-se por substituição, antes do código da página, e o teste decide quando há frame.
- **pixijs/pixijs — `tests/visual/`** [V, lido]. Cada cena é `{ it, create, pixelMatch, renderers }`; compara com `snapshots/<id>.png` via pixelmatch e, se falha, gera a imagem esperado/atual/diferença lado a lado. Tem um *playground* com `DiffView`. **Lição:** o formato «cena descrita por um objeto mais uma função que a monta» e a imagem de diferenças.
- **excaliburjs/Excalibur — `src/spec/__matchers__/expect.visual.ts`** [V, lido]. Um *matcher* do Vitest, `toEqualImage(expected, tolerance = 0.995)`. **Lição:** os testes visuais podem viver no Vitest que já temos, com um *matcher* pequeno.
- **Jogos com `toHaveScreenshot`** encontrados pela pesquisa de código: `joshmu/typer`, `westpole/mathdefendergame` (`e2e/visual/game-screen.spec.ts`), `NanoForge-dev/Engine` (`e2e/graphics/game-2d.spec.ts`), `kursjan/dorfromantik` (`e2e/canvas.spec.ts`), `rivendale/ridge-city` (`e2e/canvas-smoke.spec.ts`) [encontrados; conteúdo NV]. Mostram que o padrão comum em jogos web pequenos é a captura do ecrã inteiro com tolerância; nenhum que eu tenha visto grava animações frame a frame.
- **playcanvas/engine — `examples/utils/thumbnails.mjs`**: gera miniaturas de todos os exemplos com um browser [encontrado; NV].
- **BabylonJS** tem testes de visualização contra capturas de *playgrounds* [conhecido; não confirmado nesta pesquisa].

### 5.2 Gravar frames e folhas de contacto

- **tungs/timesnap e tungs/timecut** [V no README]: tempo virtual, captura por frame a qualquer fps, ffmpeg para o vídeo.
- **upspawn/overcrank** [NV]: o mesmo, mais recente, com busca nas animações CSS.
- **heygen «hyperframes»** [NV]: captura com `beginFrame`, aquece uns frames antes de gravar para o compositor nunca ver o tempo voltar atrás.
- Scripts de *storyboard* e de folhas de frames em skills de vídeo (`zenstory-ai/video-recap-skills/.../storyboard.py`, `alfaris/full-production-studio/.../frames.py`) [encontrados; NV]: grelhas de frames com o tempo escrito, para modelos verem vídeo. **É exatamente a técnica de dar vídeo a um VLM como uma folha numerada.**

### 5.3 Agentes de QA visual com LLM/VLM

- **MartinCastroAlvarez/ui-review-agent** [V no README]: Playwright em telemóvel, tablet e computador, claro e escuro; **verificações deterministas primeiro** (geometria do DOM, transbordo, texto cortado, alvos de toque, contraste, axe-core, diferenças de píxeis) e um VLM local **só como conselheiro**; relatório HTML, JSON e JUnit, falha o CI acima de uma gravidade. Cada problema leva seletor, captura e vistas onde aparece. **É o desenho mais próximo do que queremos.**
- **RomanQuintero/agentic-visual-QA** [V no README]: o resultado honesto de que o agente com LLM e VLM não encontrou mais defeitos do que as verificações deterministas; o problema passou a ser escolher experiências e validar provas.
- **vaibhav-k/gpt6-astra-gameforge** [encontrado; NV]: ciclo fechado de construir e fazer QA visual de um jogo.

### 5.4 Configurações de Claude Code e Codex com revisão visual

- **OneRedOak/claude-code-workflows** [NV, agregadores]: três fluxos (código, segurança, design); o de design é um **subagente** que usa o Playwright MCP para abrir a aplicação, ver e rever a interface contra regras de design.
- **AslanMazhidov/design-review-skill** [V no README]: skill do Claude Code; abre a página no Playwright MCP, captura três larguras, «olha para os píxeis», audita por lista de verificação e propõe correções concretas. Justificação: sem ver, o modelo dá conselhos genéricos.
- **JanKups/screen-list** e **clairemullacelia/bakeloop-skill** [encontrados; NV]: capturas de todas as rotas para uma galeria de revisão; agentes de especificação, construção, teste e revisão com capturas como prova.
- **anthropics/skills** [V no README]: o repositório oficial de skills; inclui um skill de teste de aplicações web com Playwright (padrão de servidor + script + capturas).
- **Neste repositório** já existe o skill `visual-design` com a regra de revisão obrigatória e a referência a este `revisao.md` [Repo].

O que nenhum destes faz, e precisamos: **animação frame a frame de pixel art, com tempo fixo e medidas de píxeis.** Para isso, as melhores peças são as do three.js (tempo), do PixiJS (cena como objeto e diferenças) e do `anim-page.ts` que já temos.

---

## 6. O repositório: o que já existe

Lido sem alterar nada [Repo].

### 6.1 `anim.html` e `src/ui/anim-page.ts`

Página só para verificação, servida pelo Vite. Expõe `window.__anim` com:

- `poseSheet()`: **já é uma folha de sprites.** Todas as 24 poses de `POSE_NAMES` (de `idle` a `slump`) para três jogadores (aparências de `lookOf` de três jogadores do plantel), cada uma em quatro variantes: de frente, de frente com bola, de costas, virado com bola. Células de 40 px, fundo `#56767a`, desenhadas com `drawSprite` a 1×. **Não tem rótulos nem números**, nem versão ampliada, e a lista `POSE_NAMES` está escrita à mão (não segue `POSES` automaticamente, por isso uma pose nova pode ficar de fora).
- `moveStrip(move, frames)`: encontra uma semente onde o movimento acontece (`seedFor`, procura 120 sementes de `newClub(seed, 3)`), cria um `MatchView` numa tela de 360×216, avança até ao tick do evento, e grava `frames` imagens **uma por passo da simulação** (20 por segundo, `render(1, 0.05)`), recortadas 240×160 à volta do ator e coladas numa tira. Devolve também quantos rótulos flutuantes havia.
- `venueShot`, `townShot`, `humorShot`: pavilhões, cidade e os momentos de humor forçados (`view.humor.pigeon = true`, `dogAt`, `sleeper`, mascote no desconto de tempo com `requestTimeout`).

### 6.2 `src/tools/anim-check.ts`

Arranca o Vite (porta 4176), abre `anim.html` num Chromium do `playwright-core` (Edge no Windows, `BROWSER_PATH`/`BROWSER_CHANNEL` noutros), chama as funções de `__anim` e grava PNG em `dist-check/`. Falha se um movimento não aconteceu em nenhuma semente ou se não apareceu o nome por cima do jogador. Não mede píxeis.

### 6.3 `src/tools/browser-check.ts`

O teste do jogo inteiro: abre `?semente=7&divisao=2`, usa `window.__pocket` (estado, velocidade, `fastForward`, `setTownClock`, `replayMatchesCurrent`, `hashFor`), verifica o determinismo no browser contra o Node, acessibilidade, transbordo, e grava capturas com `animations: 'disabled'`. Já tem `frame-${i}.png` de alguns momentos do jogo, mas em tempo real.

### 6.4 `MatchView` e `step` (`src/ui/match-view.ts`)

- `new MatchView(g, home, away, seed, division, callbacks, controlled, visitor, homeKit, state, venue, attendance, awayKit, centreEmblem, ownEmblem, rivalEmblem, weather)`. Aceita um `MatchState` já feito (`state`), o que permite **encenar** um estado.
- `stepSim()`: guarda as posições anteriores, chama `step(s)` da simulação, segue a bola, atualiza o movimento, o árbitro, as nuvens de pó, os eventos. É **o único sítio onde o jogo avança** (regra do AGENTS.md).
- `render(alpha, simSeconds, realSeconds)`: `alpha` é a fração entre dois passos (interpolação), `simSeconds` o tempo de jogo decorrido neste frame; o relógio das animações (`animTime`, `animTick = floor(animTime·20)`) anda com a simulação e, parada, com o tempo real. A câmara suaviza com `exp`, o zoom do desconto de tempo também.
- Estado só da vista, que conta para a revisão: `views` (poses e bloqueios de viragem), `puffs` (pó), `floaters` (rótulos), `trail`, `referee`, `humor`, `camera` (com `lookX` e `project`).
- **Fontes de não-determinismo na imagem:**
  - os **flashes de fotografia** usam `Math.random` em `render()` (linhas 1195–1196), só com `excited && theme.flashes && !reducedMotion`. É a única exceção à regra da arte;
  - o tempo real (`realSeconds`) só entra quando a simulação está parada;
  - o pó e outros efeitos usam `globalAlpha`, que **cria cores fora da paleta** por mistura. Não é erro, mas as medidas de paleta têm de saber disso.
- `main.ts` faz o ciclo com `requestAnimationFrame` e `performance.now`, acumulador de passos e `render(min(1, acc), simSeconds, …)`; a semente do jogo novo vem de `Date.now() ^ performance.now()` (linha 357), por isso fluxos pelo `main.ts` precisam de `?semente=` ou de `page.clock`.

### 6.5 Os efeitos não são funções à parte

Os sprites são funções puras (`drawSprite(g, pose, look, x, y, flip, back, withBall)`, `drawShadow`, `drawReflection`, `drawBall`). Os **efeitos** (pó, rasto, *swish* da rede, confetes, rótulos flutuantes, sinais do árbitro) estão desenhados dentro de `MatchView.render()`, ligados ao estado da vista. Para uma folha de efeitos sem jogo, ou se extraem para funções `drawPuff(g, x, y, age, side)` e afins (uma mudança pequena em `match-view.ts`, para propor a quem faz arte, não ao revisor), ou se capturam a partir da cena.

---

## 7. Proposta: o cenário de teste e as folhas de sprites do revisor

Princípio: **reaproveitar o `anim.html`, o `anim-page.ts` e o arranque do `anim-check.ts`**, sem dependências novas. Duas ferramentas, por ordem de custo:

1. **Folha de sprites** (sem simulação): poses, frames de uma animação e efeitos, desenhados diretamente.
2. **Cena de teste** (com simulação): um campo com os jogadores escolhidos, conduzido passo a passo, gravado a 30 fps.

E uma terceira, mais rara: **fluxo pela aplicação inteira** (`index.html` com `page.clock`), para o que só existe no `main.ts` (painel, desconto de tempo com a interface, transições de ecrã).

### 7.1 Ponto de entrada

- Página: a mesma `anim.html`. O `anim-page.ts` ganha duas funções em `window.__anim`: `sheet(spec)` e `scene(spec)`, que devolvem imagens e medidas. Os componentes de interface (`src/ui/panel.ts`, `menus.ts`…) montam-se na mesma página com `?componente=` quando forem precisos.
- Ferramenta: `src/tools/review-scene.ts`, que reaproveita o arranque do `anim-check.ts` (Vite, browser, `save`) — o ideal é extrair esse arranque para uma função comum aos dois.
- Comando: `npm run review-scene -- cenas/afundanco-2-defesas.json`, que escreve em `dist-check/revisao/<nome>/`:

  ```
  dist-check/revisao/afundanco-2-defesas/
    cena.json            # a descrição usada, mais a semente e o tick encontrados
    frames/frame-0001.png … frame-0090.png   # 1×, exatos, do canvas
    folha.png            # folha de contacto, ampliada, com números
    folha-recorte.png    # o mesmo, recortado à volta do ator, ampliado 4×
    silhuetas.png        # a folha com a figura a uma só cor
    trajetorias.png      # o último frame com a âncora, a cabeça e a bola de cada frame marcadas
    medidas.json         # as medidas da secção 7.6, por frame
    antes/ …             # o mesmo gerado no main (git worktree), se pedido
    diferencas.png       # antes | depois | diferenças a vermelho, por frame
    cena.gif             # opcional, se houver ffmpeg
  ```

### 7.2 Formato das descrições

Um JSON por cena, guardado em `cenas/` (ou no relatório do revisor, se for de uma só vez). Sobrevive a `JSON.stringify`/`parse` como os dados do jogo.

**Folha de sprites:**

```json
{
  "kind": "sheet",
  "name": "lancamento-poses",
  "poses": ["gather", "shoot", "dunk"],
  "frames": null,
  "looks": [
    { "from": "roster", "club": 3, "players": [0, 4, 9] },
    { "skin": 3, "hair": 1, "kit": "cream", "legs": 9, "torso": 8 }
  ],
  "variants": ["front", "frontBall", "back", "flip", "flipBall"],
  "effects": ["puff"],
  "zoom": [1, 4],
  "background": ["#56767a", "court", "street"],
  "labels": true
}
```

- `poses`: nomes de `POSES`; `"all"` lê a lista diretamente das chaves de `POSES` (resolve o `POSE_NAMES` escrito à mão).
- `frames`: para uma animação com tempo, a sequência de poses com a duração em ticks, por exemplo `[["gather", 2], ["shoot", 3], ["shoot", 5]]`, tirada da tabela de tempos; a folha mostra um frame por tick (ou por frame de 30 fps) com o número e o nome.
- `looks`: aparências do plantel (como hoje) ou definidas à mão (pele 0–3, cabelo 0–5, equipamento de `KITS` ou `custom`), para cobrir os extremos: pele mais clara e mais escura, cabelo da cor da camisola, equipamento claro e escuro, o mais alto e o mais baixo (`legs`, `torso`, `build`).
- `variants`: frente, frente com bola, costas, virado (`flip`), virado com bola.
- `effects`: pó, rasto, rede, confetes, rótulos; cada um em todos os seus frames (o pó tem `PUFF_TICKS = 14`).
- `zoom`: sempre 1× e uma ampliação inteira.
- `background`: o cinzento neutro de hoje, o chão do pavilhão e o da rua (o contraste muda).

**Cena de teste:**

```json
{
  "kind": "scene",
  "name": "afundanco-2-defesas",
  "venue": { "division": 3, "owner": null, "week": 1, "attendance": 0.9 },
  "attackers": [{ "look": { "from": "roster", "club": 3, "players": [4] }, "moves": ["powerDunk"], "attributes": { "jumping": 90 } }],
  "defenders": 2,
  "force": { "event": "move", "move": "powerDunk", "by": "attacker0" },
  "seed": "search",
  "fps": 30,
  "before": 0.5,
  "after": 2.5,
  "camera": "actor",
  "crop": [120, 96],
  "reducedMotion": false,
  "speed": 1
}
```

- `venue`: os mesmos parâmetros que o `venueView` já usa.
- `attackers` e `defenders`: quem está em campo. Hoje a simulação põe sempre cinco por equipa (`onCourt = index < 5` em `createMatch` [Repo]). Para «um jogador com N defesas», duas opções: (a) os outros ficam em campo mas **a vista não os desenha** (filtro só na vista, a simulação fica igual); (b) encenar o estado com os outros afastados para o canto. A (a) é a mais simples e não toca em `src/sim/`.
- `force`: o evento que tem de acontecer (movimento especial, lançamento, desconto de tempo, substituição, lance livre, falta).
- `seed`: um número, ou `"search"` para procurar como o `seedFor` (e gravar o número encontrado em `cena.json`, para a repetição ser imediata).
- `before`, `after`: segundos antes e depois do evento.
- `camera`: `"actor"` segue quem faz o movimento, `"game"` usa a câmara do jogo.
- `crop`: recorte à volta do ator, em píxeis de arte.
- `speed`: 1, 2 ou 4, para ver o que acontece a 2× e 4× (o tremor do afundanço conta em ticks e vira «zumbido» a 4×, problema conhecido).

**Componente de interface:**

```json
{ "kind": "ui", "name": "botao-desconto", "component": "coachBar", "states": ["normal", "focus", "pressed", "disabled"], "viewports": [[360, 640], [844, 390]], "fontScale": [1, 1.5], "highContrast": [false, true] }
```

**Fluxo:**

```json
{ "kind": "flow", "name": "desconto-de-tempo", "url": "?semente=7&divisao=2", "steps": [["waitTick", 200], ["command", "requestTimeout"], ["until", "phase", "timeout"], ["record", 4.0], ["command", "resumeMatch"], ["record", 2.0]], "fps": 30 }
```

Os passos usam os comandos do treinador (`requestTimeout`, `resumeMatch`, …), que ficam em `commands`, por isso o fluxo também se repete.

### 7.3 Forçar um movimento ou um fluxo de forma determinista

Por ordem de preferência:

1. **Equipas condicionadas mais procura de semente.** `withMoves(team, [move])` só no atacante, atributos altos, e procurar a primeira semente em que o evento acontece (como `seedFor`, mas mais rápido porque o evento passa a ser frequente). Guardar `{seed, tick}` em `cena.json`. O estado é 100 % produzido pela simulação.
2. **Estado encenado.** `createMatch(...)`, avançar até uma posse calma, mexer nas posições e no dono da bola, e passar o estado ao `MatchView` (`state` no construtor). Útil para «lançamento do canto direito com um defesa à frente». Risco: estados que o jogo nunca cria; marcar no relatório como «encenado».
3. **Pose forçada só na vista.** Para ver a animação sem depender da decisão da simulação: `view.override = { pose, until }` já existe para os lançamentos [Repo, linha 457]. Serve para folhas «em contexto» (o boneco no chão do pavilhão, com sombra e reflexo), não para validar o momento em que o movimento acontece.
4. **Momentos de humor e efeitos raros:** como hoje, pelos campos públicos (`view.humor`).

Em todos os casos, **nada muda em `src/sim/`**. O que é procura de semente corre no browser (como hoje) ou no Node (mais rápido, porque a simulação não depende do DOM).

### 7.4 Captura a 30 fps com relógio fixo

A cena não usa o ciclo do `main.ts` nem o relógio do browser: o próprio `anim-page.ts` chama `stepSim()` e `render()`.

- Cada frame dura `1/30 s`; a simulação anda a 20 passos/s, ou seja **2 passos em cada 3 frames**.
- Para o frame `n` (a começar em 0): o tempo é `t = n/30`; os passos já dados devem ser `floor(t·20)`; dá-se `stepSim()` até lá; `alpha = t·20 − floor(t·20)` (0, 2/3, 1/3, 0, …); `render(alpha, 1/30)`. Para a velocidade 2× ou 4×, multiplica-se o tempo de jogo (`t·20·speed`) e `simSeconds = speed/30`.
- Ler o canvas com `toDataURL` (PNG exato) logo a seguir ao `render`.
- Para tirar a única aleatoriedade da imagem (flashes): ou `reducedMotion: true`, ou — melhor, e para propor a quem faz arte — trocar o `Math.random` dos flashes por um hash do `animTick` e do índice, como o resto da arte já faz.
- Para os **fluxos** pela aplicação inteira: `page.clock.install()` **antes** do `goto`, `pauseAt`, e depois `runFor(1000/30)` e `screenshot()` por frame. O `requestAnimationFrame` do jogo dispara com o relógio falso; a interface HTML e as transições CSS aparecem na captura.
- Comprovar a determinação: gravar a cena duas vezes e comparar os PNG byte a byte (ou por *hash*); se diferirem, a cena não é determinista e o revisor diz isso antes de tudo.

Não é preciso `HeadlessExperimental.beginFrame` nem timesnap: o canvas é síncrono e o nosso código já separa simulação e desenho.

### 7.5 Números dos frames e folhas de contacto

- Nomes: `frame-0001.png` em diante, quatro algarismos, a começar em 1 (o número da folha e o do ficheiro são o mesmo).
- **Folha de contacto** feita no browser:
  - colunas por segundo: 10 por linha a 30 fps (3 linhas = 1 s) ou 15;
  - cada célula: o frame (ou o recorte) ampliado por um inteiro com `imageSmoothingEnabled = false`, uma margem de 2 px e uma faixa por baixo com o **número** (`text()` da fonte do jogo, ouro sobre tinta), o **tick** da simulação, a **pose** de cada corpo de interesse e o **evento** se começar ali (por exemplo `0042 · t312 · shoot · LANÇA`);
  - uma linha mais grossa a cada 30 frames (1 s) e uma cor diferente no frame do evento;
  - limite de tamanho por imagem que o modelo vê bem: preferir várias folhas de 1 s com recorte ampliado a uma folha enorme.
- **Folhas de sprites** (secção 7.7) com o mesmo estilo de rótulo: número e nome por célula.
- **Imagens auxiliares para o modelo:** a versão com grelha de 8 px; a de silhuetas; a de trajetórias (pontos coloridos da âncora, da cabeça e da bola em todos os frames, numerados de 5 em 5); a de diferenças entre antes e depois.

### 7.6 Medidas automáticas

Corridas no browser com `getImageData` (sem dependências), e gravadas em `medidas.json`. Sabemos o que é o boneco porque o desenhamos: na folha de sprites o boneco está sozinho sobre um fundo liso; na cena, a vista sabe onde está cada corpo (`camera.project(body.x, body.y)`), e pode desenhar-se uma segunda vez **só o ator sobre fundo transparente** (máscara) com os mesmos parâmetros.

| Medida | Como | Quando é problema |
|---|---|---|
| **Paleta** | contar as cores da máscara do boneco; comparar com a união de `KITS`, `SKINS`, `HAIRS`, `INK` e as cores derivadas (`shadeOf`) | qualquer cor fora, num sprite opaco; nos efeitos com `globalAlpha`, listar as cores de mistura à parte, como aviso |
| **Alfa** | valores de alfa na máscara | alfa entre 1 e 254 num sprite (sinal de anti-aliasing, escala fracionária ou `rotate`) |
| **Contorno** | para cada píxel opaco com um vizinho transparente (4-conexo), ver se é `INK`; contar falhas no anel e píxeis de contorno «dobrados» (2 px de espessura) | falhas onde a regra pede contorno; exceções declaradas (brilho, bola) |
| **Âncora e tremor** | a âncora é o ponto dos pés (`x` arredondado do corpo projetado, `y` da linha mais baixa da máscara); série por frame | oscilação de ±1 px com o corpo parado na simulação; passos não monotónicos num movimento lento |
| **Pés a deslizar** | na sequência de contacto (poses de apoio), a posição do pé mais baixo em coordenadas do mundo (somar o deslocamento da câmara) | variação > 1 px enquanto devia estar plantado |
| **Caixa** | largura, altura e centro da máscara por frame | salto de altura ou largura > 3 px entre frames seguidos sem mudança de pose esperada (*pop*); boneco cortado pela borda |
| **Diferença entre frames** | número de píxeis diferentes entre frames seguidos, só na máscara | 0 por mais frames do que a pose devia durar (congelado); muito alto num frame isolado (salto) |
| **Tempo das poses** | a pose de cada corpo por frame (a vista sabe: `carrierPose()`, `views`) e a duração em ticks | fora da tabela de tempos de `animacao.md` §10; trocas frente/costas em menos de `TURN_LOCK_TICKS` (o `backChangeStats()` já mede isto [Repo]) |
| **Arco** | a altura da bola e do topo da cabeça por frame; ajustar uma parábola (com somas, sem bibliotecas) | resíduo grande, ou ápice fora do sítio |
| **Silhueta** | máscara a uma cor; comparar as silhuetas das poses-chave entre si (píxeis diferentes) | duas poses-chave quase iguais em silhueta (não se distinguem) |
| **Contraste** | claridade OKLCH média do boneco contra o fundo (o código está em `cor.md` §11) e entre as duas equipas | ΔL < 0,25 entre equipas; boneco que desaparece num pavilhão |
| **Bordas** | máscara ou texto a tocar a borda do canvas ou do recorte | sempre, salvo de propósito |
| **Determinismo** | duas gravações iguais byte a byte | qualquer diferença |
| **Antes/depois** | diferença exata entre o mesmo frame no `main` e no ramo | mudanças fora da zona que o pedido devia mexer (efeito colateral) |
| **Interface** | as do `browser-check`: `scrollWidth`, caixas de texto contra o contentor, alvos de toque, contraste, `a11yProblems` | como hoje |

Os limiares (1 px, 3 px, ΔL 0,25) são pontos de partida a afinar com casos reais, não regras fixas.

### 7.7 Folhas de sprites sem correr o jogo

Pedido do dono: o revisor tem de poder **exportar folhas de sprites** de uma animação e olhar para elas sem o jogo.

**O que a folha mostra:**

- **As poses ou os frames lado a lado**, numa linha por variante, em duas versões: **a 1×** (como o jogador vê) e **ampliada a um inteiro** (4× ou 6×, vizinho mais próximo), na mesma imagem ou em duas.
- **Cada célula com o número e o nome**: `03 shoot`, ou, numa animação com tempo, `07 · shoot · tick 3/5`.
- **Variantes:**
  - aparências: as peles extremas, cabelos, equipamentos (`blue`, `cream`, um `custom` claro e um escuro, e um com a cor do cabelo), alturas e corpos (`legs`, `torso`, `build`);
  - orientações: de frente, de costas, virado (`flip`), com e sem bola;
  - fundos: neutro, chão do pavilhão, rua.
- **Os efeitos frame a frame:** pó (os 14 ticks), rasto da bola, rede a abanar, confetes, rótulos flutuantes, sinais do árbitro. Hoje vivem dentro de `render()`; para a folha, extraem-se para funções puras (a propor a quem faz arte) ou capturam-se da cena com a máscara.
- **Guias por cima, numa cópia:** a linha do chão, a âncora, a caixa de cada célula, a grelha de 1 px na versão ampliada.
- **Uma linha de silhuetas** por baixo das poses-chave.

**Relação com o que existe:**

- O `poseSheet()` do `anim-page.ts` **já é a base**: as 24 poses × 4 variantes × 3 jogadores. Falta: rótulos com número e nome, a versão ampliada, as aparências escolhidas (extremos), o virado sem bola e as costas com bola, os fundos, a lista de poses lida de `POSES` em vez de escrita à mão, e os efeitos.
- O `moveStrip()` já é uma tira de **frames de jogo** à volta do ator (um por passo de simulação). Passa a ser um caso da cena de teste (secção 7.4), a 30 fps e com rótulos.
- O `anim-check` continua a ser a verificação de sempre (corre tudo e grava em `dist-check/`); o revisor usa o mesmo mecanismo com uma descrição escolhida, e as medidas.

**Medidas que correm nas folhas** (mais fáceis do que na cena, porque cada boneco está sozinho sobre fundo liso): paleta e alfa; contorno contínuo; âncora (os pés na mesma linha em todas as células de uma pose de apoio); caixa por pose (alturas coerentes entre variantes, a cabeça com o mesmo tamanho em todos os jogadores); simetria entre `flip` e o original (o virado é o espelho exato, salvo o que é de propósito); silhuetas distintas entre poses-chave; contraste do boneco contra cada fundo; diferença antes/depois por célula.

**Quando chega a folha e quando é precisa a cena:**

| Chega a folha de sprites | É precisa a cena de teste |
|---|---|
| pose nova ou mudada (forma, contorno, cores, silhueta) | **tempo e espaçamento** reais: quanto tempo cada pose dura, a interpolação (`alpha`), a câmara |
| aparências e equipamentos novos (pele, cabelo, kit, padrões) | **trajetórias**: a bola, o salto, a parábola, o deslocamento no campo |
| frente, costas e virado | **pés a deslizar** e tremor da âncora com o corpo a andar |
| um efeito isolado (pó, confete), frame a frame | **ordem de desenho** e oclusões: quem fica à frente, a rede da rua, o público |
| ícones, emblemas, retratos, letra | **contexto**: legibilidade no chão do pavilhão, com sombra, reflexo e luz do tempo |
| comparação rápida antes/depois de uma correção de píxeis | **quando acontece**: o movimento é escolhido pela simulação? aparece o nome por cima? os outros reagem? |
| | trocas de pose e de orientação (`TURN_LOCK_TICKS`), velocidades 2× e 4×, movimento reduzido |
| | fluxos de interface (desconto de tempo, substituição) |

Regra prática: **começa-se sempre pela folha** (é barata e mostra a forma); a cena entra quando o pedido mexe em tempo, movimento, efeitos ligados ao jogo ou interface, e é **obrigatória para movimentos especiais**.

### 7.8 O relatório do revisor

Em Markdown, curto, com as imagens ao lado. Estrutura:

```markdown
# Revisão: afundanço com 2 defesas — v2

**Pedido:** pose `dunk` nova e paragem no aro (ramo `arte/afundanco`, commit abc123)
**Veredicto:** NÃO PASSA — 1 bloqueante, 2 a corrigir, 1 sugestão
**Cenas:** `cena.json` (semente 41, tick 312, 90 frames a 30 fps), `folha-dunk.json`
**Determinismo:** OK (duas gravações iguais)
**Medidas:** paleta OK · alfa OK · contorno 2 falhas · tremor máx. 1 px (frames 14–16) · caixa: salto de 4 px no frame 23

## Problemas

### B1 — Bloqueante — Pop do corpo ao agarrar o aro
- **Frames:** 22 → 23 (`folha-recorte.png`, linha 3)
- **Onde:** corpo inteiro, caixa (x 142–158, y 60–84) → (x 142–158, y 56–84)
- **Sintoma:** a cabeça sobe 4 px de um frame para o outro sem pose intermédia.
- **Regra:** animação, «pops» (`animacao.md` §10); tabela de tempos do afundanço.
- **Medida:** altura da caixa 24 → 28 px; diferença na máscara 61 px (média 12).
- **Proposta:** um frame de transição de 1 tick com o braço a meio, ou começar a paragem no aro 1 tick mais tarde.

### C1 — A corrigir — Falha no contorno do braço virado
- **Folha:** `folha-dunk.png`, célula 05 `dunk` variante `flip`
- **Onde:** (x 9, y 4) em coordenadas da célula
- **Medida:** píxel de contorno em falta (vizinho transparente, cor `#2b5fd9` em vez de tinta)
- **Proposta:** …

### S1 — Sugestão — só visual
- **Frames:** 30–40 · O afundanço lê-se pouco em silhueta contra o público (`silhuetas.png`); sem medida.

## Visto e sem problemas
- paleta e alfa em todas as variantes; frente/costas/virado; 4× e movimento reduzido; nome por cima do jogador.

## Não verificado
- velocidade 4× (não gravada); pavilhão da divisão 0.
```

Regras do relatório:

- cada problema com **frame (ou célula), coordenadas, regra, gravidade, proposta** e **medida** ou «só visual»;
- os achados que a medida contradiz **retiram-se**;
- uma secção «visto e sem problemas» e outra «não verificado», para quem corrige saber o que já está coberto;
- o veredicto é binário: passa só sem bloqueantes nem «a corrigir» por fechar;
- na versão seguinte, o revisor começa por confirmar, nota a nota, que cada problema anterior foi fechado (contra as notas repetidas das *dailies*).

---

## 8. Protocolo de revisão e lista de verificação

### 8.1 Protocolo

1. **Quem fez o asset** termina, corre `npm run check` (e `anim-check`/`browser-check` se for o caso) e lança o revisor com o Agent tool, passando **só**: o que mudou (ficheiros, poses, componentes, ramo e commit), o pedido original do dono, e a lista de verificação do tema. **Não** passa a sua conclusão nem a sua descrição do resultado.
2. **O revisor escolhe as cenas:** sempre uma folha de sprites com as variantes; uma cena de teste se mexe em tempo, movimento, efeitos ou interface; um fluxo se mexe no `main.ts` ou no painel. Escreve as descrições em JSON.
3. **Grava:** frames a 30 fps numerados, folhas de contacto com números e nomes, recortes ampliados, silhuetas, trajetórias; e o **antes** a partir do `main` num `git worktree`, se o asset já existia.
4. **Confirma o determinismo** (duas gravações iguais). Se falhar, isso é o primeiro problema.
5. **Corre as medidas** (secção 7.6) e lê o `medidas.json`.
6. **Olha para as folhas**, uma pergunta da lista de cada vez, com o que devia ver escrito ao lado; compara com o antes e com a referência (um frame bom, a tabela de tempos).
7. **Cruza:** cada achado visual procura uma medida que o confirme; o que a medida contradiz sai; o que não tem medida fica «só visual».
8. **Escreve o relatório** (secção 7.8), com as imagens, e devolve-o a quem fez.
9. **Quem fez** corrige e pede nova revisão. O revisor fecha nota a nota. Repete-se até passar.
10. No fim, quem fez envia ao dono as folhas e o GIF da versão aprovada.

Para manter o revisor honesto (ideia da EA): de vez em quando, dar-lhe uma versão com um erro plantado (um píxel de contorno a menos, uma cor fora da paleta, um pé que desliza 2 px) e ver se o apanha.

### 8.2 Lista de verificação

**Antes de olhar**
- [ ] A cena é determinista (duas gravações iguais).
- [ ] A folha tem 1× e ampliação inteira, números e nomes em cada célula.
- [ ] Há antes e depois, se o asset já existia.
- [ ] As variantes estão todas: aparências extremas, frente, costas, virado, com e sem bola, fundos.

**Pixel art (folha)**
- [ ] Só cores da paleta; alfa só 0 ou 255 nos sprites.
- [ ] Contorno de 1 px de tinta contínuo; sem cantos em L nem píxeis soltos não intencionais.
- [ ] Linhas com declives inteiros e segmentos iguais.
- [ ] Luz de cima, 3 a 4 tons por material, sem *pillow shading*.
- [ ] A cabeça igual em todos os jogadores; altura no tronco e nas pernas.
- [ ] Lê-se a 1×; a silhueta reconhece-se; lê-se em cinzentos.
- [ ] O virado é o espelho certo; as costas não mostram a cara.
- [ ] Contraste contra o chão do pavilhão e da rua; as duas equipas distinguem-se (ΔL ≥ 0,25).

**Animação (cena)**
- [ ] Duração de cada pose dentro da tabela de tempos.
- [ ] Antecipação, ação e recuperação; *ease* onde há peso.
- [ ] Arcos limpos na bola, nos saltos e nas mãos.
- [ ] Sem pops (caixa estável entre frames seguidos).
- [ ] Sem tremor da âncora com o corpo parado; movimento lento de píxel em píxel.
- [ ] Pé de apoio plantado; sem deslizar.
- [ ] Sem trocas de pose ou de orientação em menos de 0,5 s.
- [ ] O ciclo liga o último frame ao primeiro.
- [ ] Ordem de desenho e oclusões certas.
- [ ] O movimento acontece no jogo e o nome aparece por cima.
- [ ] A 2× e 4× não vira zumbido; com movimento reduzido a informação está lá.
- [ ] Nenhum clarão no ecrã inteiro; tremor do ecrã de 1 a 2 px só em momentos raros.

**Efeitos**
- [ ] Todos os frames vistos; desaparece no tempo previsto.
- [ ] Cores de mistura (`globalAlpha`) aceitáveis e listadas.
- [ ] Coerente com o «sumo» calmo do jogo.

**Interface**
- [ ] Cabe em 360×640, 844×390, 1280×720 e 1920×1080, com letra grande e alto contraste.
- [ ] Sem scroll horizontal nem texto cortado; acentos com espaço.
- [ ] Contraste 4,5:1 no texto e 3:1 em ícones, controlos e foco.
- [ ] Todos os estados vistos: normal, foco, premido, selecionado, desligado.
- [ ] Alvos de toque ≥ 44 px (listas 34), 8 px entre alvos.
- [ ] Escala inteira, nada desfocado.
- [ ] `aria-label`, foco ao entrar, `#live`.

**Originalidade**
- [ ] Nada parecido com recursos de outros jogos nem com marcas ou clubes reais.

**Relatório**
- [ ] Cada problema com frame, coordenadas, regra, gravidade, proposta e medida (ou «só visual»).
- [ ] Achados contraditos pela medida retirados.
- [ ] Secções «visto e sem problemas» e «não verificado».
- [ ] As notas da versão anterior confirmadas uma a uma.

---

## 9. Fontes

Revisão humana
- Blogue CGWire, *Animation Dailies Best Practices*: https://blog.cg-wire.com/manage-dailies [NV]
- Kitsu, cultura de feedback (Tetsuo Animation): https://blog.cg-wire.com/build-a-better-feedback-culture-with-kitsu-tetsuo-animation [NV]
- SIGGRAPH, *The People Behind the Pixels*: https://www.postmagazine.com/Press-Center/Daily-News/2010/SIGGRAPH-THE-PEOPLE-BEHIND-THE-PIXELS.aspx [NV]
- Anim.works, como pedir feedback: https://community.anim.works/t/how-to-get-the-best-feedback-on-your-work-a-guide/35 [NV]
- Pixel Joint, fórum WIP: https://pixeljoint.com/forum/forum_posts.asp?TID=9551 e FAQ: https://pixeljoint.com/pixels/faqs.asp
- Braintrust e franqueza: https://www.atlassian.com/blog/innovation/braintrusts-build-a-candid-think-tank-culture-at-work ; «plussing»: https://www.creativehuddle.co.uk/post/criticism-candour [NV]
- QA de animação de jogos: https://mocaponline.com/blogs/mocap-news/game-animation-qa-testing-guide [NV]; https://cursa.app/en/page/polish-workflow-evaluation-playblasts-and-targeted-fixes [NV]
- Sub-píxel e tremor: https://3dbrendang.blogspot.com/2013/11/pixel-art-terms-linguo-techniques-part-2.html [NV]

Testes visuais e tempo
- Playwright Clock: https://playwright.dev/docs/clock
- Playwright `toHaveScreenshot`: https://playwright.dev/docs/api/class-pageassertions
- pixelmatch: https://github.com/mapbox/pixelmatch
- ꟻLIP: https://research.nvidia.com/publication/flip
- Chromatic, animações: https://www.chromatic.com/docs/animations (consultado num espelho)
- CDP HeadlessExperimental: https://chromedevtools.github.io/devtools-protocol/tot/HeadlessExperimental ; https://hyperframes.heygen.com/concepts/determinism [NV]
- timesnap / timecut: https://github.com/tungs/timesnap ; https://github.com/tungs/timecut ; overcrank: https://github.com/upspawn/overcrank [NV]

Motores
- Unity Graphics Test Framework: https://docs.unity3d.com/Packages/com.unity.testframework.graphics@9.0/manual/test-authoring/writing-graphics-tests.html
- Unreal Screenshot Comparison: https://dev.epicgames.com/documentation/en-us/unreal-engine/screenshot-comparison-tool-in-unreal-engine ; Automation Test Framework: https://dev.epicgames.com/documentation/unreal-engine/automation-test-framework-in-unreal-engine
- GdUnit4: https://github.com/godot-gdunit-labs/gdUnit4 ; GdSnap: https://godotassetlibrary.com/asset/DNVaro/gdsnap [NV]
- Phaser, cenas: https://docs.phaser.io/phaser/concepts/scenes ; Storybook para jogos: https://dev.to/foxhoundn/storybook-as-a-game-development-tool-with-demo-5203 [NV]

IA e agentes
- GlitchBench: https://glitchbench.github.io ; https://arxiv.org/abs/2312.05291
- VideoGameBunny: https://arxiv.org/abs/2407.15295
- VideoGameQA-Bench: https://arxiv.org/abs/2505.15952
- TempGlitch: https://arxiv.org/abs/2605.21443 [NV]
- VLMs em canvas HTML5: https://arxiv.org/abs/2501.09236
- Vision language models are blind: https://arxiv.org/abs/2407.06581
- EA SEED, falhas de render com CNN: https://ojs.aaai.org/index.php/AIIDE/article/view/7409 ; https://www.ea.com/seed/news/graphical-glitch-detection-convolutional-neural-networks
- Ubisoft Commit Assistant: https://overclock3d.net/news/software/ubisoft-reveals-commit-assistant-ai-driven-bug-fixing/ [NV]
- modl.ai: https://modl.ai/ [NV]
- MLLM-as-a-Judge: https://arxiv.org/abs/2402.04788
- Set-of-Mark: https://arxiv.org/abs/2310.11441
- GUIPilot: https://arxiv.org/abs/2506.07385 ; VLM-Fuzz: https://arxiv.org/abs/2504.11675

Repositórios
- three.js, injeção determinista: https://github.com/mrdoob/three.js/blob/dev/test/e2e/deterministic-injection.js
- PixiJS, testes visuais: https://github.com/pixijs/pixijs/tree/dev/tests/visual
- Excalibur, `toEqualImage`: https://github.com/excaliburjs/Excalibur/blob/main/src/spec/__matchers__/expect.visual.ts
- ui-review-agent: https://github.com/MartinCastroAlvarez/ui-review-agent
- agentic-visual-QA: https://github.com/RomanQuintero/agentic-visual-QA
- design-review-skill: https://github.com/AslanMazhidov/design-review-skill
- claude-code-workflows (OneRedOak): https://github.com/OneRedOak/claude-code-workflows [NV]
- anthropics/skills: https://github.com/anthropics/skills
- Jogos com `toHaveScreenshot` (encontrados, não lidos): `westpole/mathdefendergame`, `NanoForge-dev/Engine`, `kursjan/dorfromantik`, `rivendale/ridge-city`, `joshmu/typer`
- reg-suit: https://github.com/reg-viz/reg-suit ; BackstopJS: https://github.com/garris/BackstopJS ; Loki: https://github.com/oblador/loki (conhecidos, não lidos nesta pesquisa)
