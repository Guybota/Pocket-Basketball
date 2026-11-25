# Animação em pixel art e sensação de jogo — normas para o Pocket Basketball

> Pesquisa feita em novembro de 2026 para orientar a animação gerada por código (poses por articulações, desenhadas em píxeis a cada imagem) em bonecos de 16–32 px, a 60 fps, com velocidades de jogo 1×, 2× e 4×.
>
> **Nota sobre as fontes.** O acesso direto às páginas (WebFetch) estava bloqueado nesta sessão para saint11.art, slynyrd.com e gamedeveloper.com. Tudo o que vem abaixo assenta em resultados de pesquisa, excertos e conhecimento consolidado da área. Onde um número vem de fonte secundária, ou é inferência minha, digo-o com **[não verificado]** ou **[inferência]**. As fontes estão no fim.

---

## 0. Contexto do projeto (o que já existe)

Li só o necessário para tornar as recomendações concretas:

- A simulação corre a **20 ticks por segundo** (`src/sim/court.ts`, `TICKS_PER_SECOND = 20`). Cada tick dura 50 ms, o que equivale a 3 imagens a 60 fps.
- `src/ui/match-view.ts` desenha com interpolação (`alpha`) entre ticks, já tem `reducedMotion()` ligado a `prefers-reduced-motion` (`src/ui/settings.ts`) e tem um abanão de ecrã no afundanço de **8 ticks** (400 ms a 1×) com **±2 px em CSS** e alternância de x a cada tick.
- O público já usa fase por espectador (`(s.tick >> 2) + o.phase`), que é exatamente a técnica recomendada na secção 6.5.

**Consequência importante:** como o abanão conta em ticks, a 4× dura só 100 ms de tempo real e oscila a 40 Hz. Ver a secção 5.6.

---

## 1. Os 12 princípios da animação aplicados a pixel art pequena

Os 12 princípios vêm de Frank Thomas e Ollie Johnston (*The Illusion of Life*, 1981). Richard Williams (*The Animator's Survival Kit*) é a referência prática para os aplicar. Em 16–32 px cada princípio tem de caber em **1–3 píxeis**, por isso a regra geral é: **exagerar a pose e poupar no número de imagens**.

| Princípio | Em 16–32 px | Exemplo no basquetebol |
|---|---|---|
| **Comprimir e esticar** | Mudar 1 px de altura e/ou largura, mantendo o volume (se perde 1 px de altura, ganha 1 px de largura). Num boneco de 24 px, 1 px corresponde a cerca de 4 % da altura, o que já se nota. Nunca uses mais de 2 px num corpo humano. A bola (4–6 px) pode achatar 1 px no ressalto. | Agachamento antes do salto: −1 px de altura e +1 px de largura nos ombros. Bola no chão no drible: 1 imagem com 1 px a menos de altura. |
| **Antecipação** | Uma pose clara no sentido contrário à ação, mantida mais tempo do que as intermédias. Em jogos é uma tensão: o design quer menos imagens, a animação quer mais (Cooper). Num jogo de gestão o jogador não controla o boneco, por isso pode haver mais antecipação do que num jogo de ação. | O lançador baixa o centro de massa 1–2 px antes de saltar. O passe de cima começa com a bola atrás da cabeça. |
| **Continuação e sobreposição** | As partes param em momentos diferentes: o braço continua depois da bola sair e o cabelo ou a camisola atrasam-se 1 tick. Cooper avisa que uma continuação longa dá sensação de pouca resposta. Aqui a resposta não importa, por isso pode ser generosa. | O pulso fica em "pescoço de ganso" depois do lançamento. O braço de passe fica estendido. |
| **Arcos** | As mãos, a cabeça e a bola seguem curvas, nunca retas. Em pixel art um arco desenhado em poucas imagens tem de ter as posições espaçadas ao longo da curva. Nada de pontos em linha reta. | O braço que dribla descreve meia elipse. A trajetória da bola é uma parábola. |
| **Entrada e saída lentas** | Em pixel art controla-se mais pelo **tempo** (segurar as poses-chave) do que pelo espaçamento, porque não há espaço para espaçar (Sprite-AI). Em código pode-se usar *easing* nas articulações e depois arredondar. | O salto abranda no ápice, que é onde o lançamento acontece. A corrida arranca devagar. |
| **Ação secundária** | Pequenos movimentos que apoiam a ação principal, a 1 px. | A cabeça acompanha a bola, o braço livre protege o drible, o treinador bate palmas. |
| **Tempo** | É o princípio mais importante em pixel art. O mesmo desenho, com tempos diferentes, lê-se como peso diferente. | Um afundanço segura o ápice e o momento no aro, e o resto passa depressa. |
| **Exagero** | A 16 px uma pose realista lê-se como parada. Braços mais abertos, saltos mais altos (em proporção ao corpo) e silhuetas mais claras. | Um afundanço em que o boneco sobe 1,5× a sua altura. Na festa, os braços ficam acima da cabeça. |
| **Desenho sólido e silhueta** | Cada pose-chave tem de se ler a preto (só a silhueta). Separar braços e tronco por pelo menos 1 px de espaço ou de contorno. | O lançamento com o braço vertical e o corpo esticado. O bloqueio com os dois braços no ar. |
| **Pose a pose ou direto** | Em código é sempre pose a pose: poses-chave e interpolação, como no pipeline do Dead Cells. | — |
| **Atratividade** | Cabeça grande (1/3 a 1/4 da altura), olhos de 1 px, cores de equipa saturadas. O Medeiros (Celeste) diz que a cara da Madeline "são só quatro píxeis". | — |

---

## 2. Número de imagens e tempos

### 2.1 Conversões básicas a 60 fps

- 1 imagem dura 16,7 ms. "Em 2s" significa 2 imagens, 33 ms, 30 desenhos por segundo. "Em 3s" significa 50 ms, 20 desenhos por segundo, e coincide com o tick da simulação. "Em 4s" significa 67 ms, 15 desenhos por segundo. "Em 6s" significa 100 ms, 10 desenhos por segundo.
- O Aseprite trabalha com durações em ms (1000/fps). Os 100 ms que usa por omissão correspondem a 10 desenhos por segundo, ou seja, a 6 imagens do jogo. A documentação do Aseprite cita **12 fps (83 ms)** como o habitual em pixel art ("em 2s" à moda do cinema) e 10 fps para jogos retro.
- **Recomendação [inferência]:** como o tick é 50 ms, a unidade natural de uma pose é **1 tick (50 ms, 3 imagens)**. Os ciclos devem usar múltiplos de tick: 2 ticks (100 ms) para corrida, 3 ticks (150 ms) para marcha e 8–10 ticks (400–500 ms) para respiração. Assim cada pose dura um número inteiro de imagens e não há batimento entre o desenho e a simulação.

### 2.2 Porque é que os bonecos pequenos "vivem" com poucas imagens

Slynyrd (Pixelblog 8): mais imagens tornam a animação mais suave, **mas não necessariamente com mais energia**. O que importa num ciclo de corrida é a energia. Ele usa a corrida do Mega Man como modelo. Num boneco de 16–32 px, uma imagem intermédia que move um membro menos de 1 px é desperdício ou produz vibração. A regra é **acrescentar imagens só quando há píxeis novos para mostrar**.

### 2.3 Ciclos habituais

- **Respiração em repouso: 2–4 imagens.** A versão de 2 imagens em ida e volta, com cerca de 400–500 ms por imagem e o tronco ou a cabeça a descer 1 px, é a mais citada. Também há variantes de 150–250 ms com 3–4 imagens. Num basquetebolista em espera, a variante que funciona é segurar a pose "em cima" mais tempo do que a pose "em baixo" (por exemplo 600 ms e 400 ms).
- **Marcha: 4 imagens** (contacto, passagem, contacto, passagem) no mínimo legível. 6–8 imagens se o boneco tiver 32 px. O método de contacto de Williams desenha primeiro as duas poses de contacto, depois a de passagem exatamente a meio, e depois as de descida e impulso. Num ciclo clássico de 24 imagens em cinema, os contactos ficam nas imagens 1 e 13 e as descidas nas 4 e 16 **[fonte secundária]**. Reduzir a 4 imagens significa ficar só com o contacto e a passagem. Dica: na passagem o corpo sobe 1 px, e esse sobe-e-desce de 1 px é o que dá vida à marcha.
- **Corrida: 6–8 imagens** é o habitual. **8 imagens** é o "ciclo completo", com contacto, descida, passagem, subida e fase aérea para cada perna (Pixel Joint: "oito é geralmente um bom número"). **4 imagens** também funciona em bonecos pequenos: a corrida da Madeline no Celeste tem 4 imagens **[fonte secundária]**. A corrida tem fase aérea (nenhum pé no chão) e a marcha não. O alerta mais repetido é que **os dois passos têm de ser simétricos, senão o boneco parece coxear**.
- **Salto:** 4–6 poses (agachar, impulso, subida, ápice, queda, aterragem). A subida e a queda usam a mesma pose, deslocada pelo código.
- **Ataque (equivalente: lançamento, passe, bloqueio):** antecipação de 1–2 poses, 1 pose de ação ("ativa") e 1–2 de recuperação. A Skullgirls (Mariel Cartwright, GDC 2014) mostra como fazer um soco legível em **6 imagens**.

### 2.4 Tempo variável ("segurar as poses-chave")

Os pixel artistas costumam segurar as poses-chave 3–4 imagens para dar peso, e as transições ficam com 1–2. Em código isto é uma tabela de durações por pose, não um passo fixo. Exemplo para um lançamento:

```
agachar 150 ms → subir 50 ms → ápice/lançamento 150 ms → pulso dobrado 250 ms → descer 100 ms
```

O total é 700 ms, e 400 ms desse tempo estão nas duas poses que contam a história.

---

## 3. Imagens de borrão, de impacto, paragem no golpe, congelamento e abanão do ecrã

### 3.1 Imagens de borrão (smear)

- Servem para que um objeto rápido não pareça teletransportar-se de A para B. Mais do que um indicador de velocidade, é uma ponte. Em pixel art desenha-se o arco do caminho, ou estica-se o membro, em vez de uma posição.
- **Em 16–32 px:** 1 imagem (16–50 ms), nunca mais. Bons candidatos: o braço no afundanço (esticar a mão 1–2 px ao longo do arco), o passe rápido (a bola desenhada como uma cápsula de 2× o comprimento, numa imagem) e o bloqueio (a mão em leque).
- Em código: na imagem em que um membro se move mais de cerca de 3 px, desenhar também o segmento entre a posição anterior e a atual com a cor de sombra. É barato e coerente.

### 3.2 Paragem no golpe (hitstop) e congelamento

- **Paragem no golpe:** congelar o atacante e o alvo durante algumas imagens no impacto. Nos jogos de luta a 60 fps a duração cresce com a força do golpe, e nalguns jogos o defensor recebe imagens extra. Valores de referência citados: **golpe leve 2 imagens (33 ms), forte 8–10 imagens (130–170 ms)**, ou "4–8 imagens" num golpe de espada **[fontes secundárias]**. O Sakurai (Smash) escreveu sobre isto na Famitsu.
- **Celeste:** as explosões congelam o jogo **0,1 s** (registo de alterações oficial, v1.4). No *dash* há uma pausa de cerca de 4 imagens e um "abanão microscópico" **[segundo o GMTK, não verificado na fonte]**.
- **Dead Cells:** os golpes críticos congelam **1 imagem**, seguida de abrandamento durante algumas décimas de segundo, com sangue e som (entrevista à 80.lv).
- **Para o Pocket Basketball [inferência]:** a paragem no golpe não deve parar a simulação (o determinismo não é afetado, porque é só no desenho), mas pode **segurar a pose** do boneco. Bom uso: **afundanço no aro, 3–5 imagens (50–83 ms)**, e **bloqueio, 2–3 imagens**. Não uses em cestos normais nem em passes: banaliza-se depressa num jogo que tem dezenas de cestos por partida.

### 3.3 Imagens de impacto

Uma imagem com as cores invertidas, um clarão branco ou uma silhueta, no momento do contacto. São comuns em animação japonesa e nos jogos de luta. Num jogo calmo usa-se **1 imagem de clarão do boneco ou da bola** (não do ecrã inteiro) no afundanço ou no bloqueio. Um clarão de ecrã inteiro está **proibido** (ver a secção 5.5 sobre a WCAG).

### 3.4 Abanão do ecrã

- **Nijman (Vlambeer, *The Art of Screenshake*, INDIGO 2013):** começa com um jogo de tiros monótono e mostra **30 pequenos ajustes** que juntos o transformam. Entre eles estão o abanão, o clarão do disparo e o recuo da câmara (a lista exata não foi verificada; o vídeo está no YouTube). A lição central é que **a permanência e o peso vêm da soma de muitas pequenas reações**, não de uma só.
- **Eiserloh (GDC 2016, *Juicing Your Cameras With Math*):** é o modelo mais sólido. Há um valor de **trauma entre 0 e 1** que o jogo aumenta a cada evento e que decai linearmente (por exemplo −1 por segundo). O abanão é **trauma² ou trauma³ × amplitude máxima**, por isso os eventos pequenos quase não se notam. Usa ruído contínuo (Perlin) em vez de aleatório, porque o aleatório imagem a imagem parece estática de televisão. A translação e a rotação são separadas. Em 2D com píxeis, **só translação**, porque rodar destrói a grelha de píxeis.
- **Números práticos em pixel art [inferência a partir de várias fontes]:** amplitude de **1–2 px de arte** (não de ecrã), duração de **100–300 ms**, frequência máxima de cerca de 15–20 Hz (mudar de posição a cada 3–4 imagens, não a cada imagem). A deslocação tem de ser **um número inteiro de píxeis de arte**, para não partir a grelha.
- **Quando ajuda:** eventos raros e importantes (afundanço, o cesto da vitória, buzina final). **Quando irrita:** em eventos frequentes, quando é longo, quando atrapalha a leitura do placar ou quando o jogador está a ler texto. Kidscancode e outros avisam que pode **enjoar** e recomendam sempre uma opção para o desligar.

---

## 4. Animação abaixo do píxel e arredondamentos

### 4.1 Animação abaixo do píxel (sub-pixel)

Não se pode mover meio píxel, por isso simula-se movimento menor do que 1 px **mudando cores** em vez de posições. Um píxel de contorno passa para um tom intermédio e o olho lê-o como "a meio caminho". É a técnica mais difícil de pixel art (junta teoria da cor, animação e anti-serrilhado seletivo). Em 16 px permite **respiração, piscar de olhos e mudança de peso só com cor**.

**Em código [inferência]:** a respiração pode ser 3 estados (0, ½ e 1 px), em que ½ px desenha a linha do ombro com a cor intermédia da rampa da paleta. Isto exige paletas com rampas de pelo menos 3 tons. Não uses anti-serrilhado automático do canvas (`imageSmoothingEnabled = false` sempre).

### 4.2 Vibração, oscilação e "rastejar de píxeis"

- **Causa:** posições fracionárias arredondadas em sítios diferentes. A câmara arredonda num momento e o boneco noutro, ou duas camadas arredondam de forma diferente, e a imagem vibra 1 px. Escalas não inteiras (por exemplo 2,7×) também partem a grelha.
- **Regras:**
  1. A simulação guarda posições reais (float). **Arredonda-se só ao desenhar**, uma vez.
  2. **Arredonda-se a posição-âncora do boneco** (os pés), e as articulações são desenhadas em relação a essa âncora já arredondada. Arredondar cada articulação em separado faz o boneco "derreter": as mãos e a cabeça saltam em momentos diferentes. Esta é a principal causa de oscilação em esqueletos desenhados em píxeis.
  3. Câmara e bonecos: a câmara arredonda primeiro, e o boneco é desenhado em `round(x) − round(camera)`, nunca em `round(x − camera)`. Escolhe uma convenção e aplica-a a todas as camadas.
  4. Usa sempre o mesmo modo: `Math.floor(x + 0.5)` (o `Math.round` do JS arredonda −0,5 para 0, o que dá assimetria à volta do zero; com coordenadas sempre positivas não importa).
  5. **Velocidades fracionárias** (por exemplo 0,7 px por imagem) produzem um ritmo irregular de passos de 1 px (1, 1, 0, 1, 1, 0…), o "rastejar". Atenua-se fazendo o ciclo de marcha avançar pela distância percorrida (fase = distância / comprimento do passo) e não pelo tempo, para que os pés não deslizem. Também ajuda deixar o corpo subir e descer de forma sincronizada com os passos.
  6. Escala inteira do ecrã (o projeto já o faz).
- **Interpolação a 60 fps de uma simulação a 20 Hz** (Fiedler, *Fix Your Timestep*): o estado desenhado é `anterior × (1 − alpha) + atual × alpha`. A ordem dos argumentos é um erro comum. Para pixel art isto dá posições suaves, **mas** as poses (índices de imagem) não se interpolam: escolhe-se a pose pelo tick, ou pelo tick com o alpha, e só a posição do corpo é interpolada.

---

## 5. Animar em código

### 5.1 Procedimental e esqueleto desenhado em píxeis

- **Pipeline do Dead Cells (Thomas Vasseur, Motion Twin, 2018):** modelos 3D em 3ds Max, animados com **lógica de 2D, por poses-chave**. **As imagens intermédias só se acrescentam quando o movimento já convence e o tempo está certo.** Cada imagem é exportada em PNG com mapa de normais e pintada com um *toon shader* simples. O objetivo era ter boa pixel art sem desenhar à mão cada retoque. Vasseur era novo em pixel art e diz que isso o libertou das convenções. **Lição para nós:** um esqueleto gerado por código é o mesmo pipeline sem o 3D. Funciona se respeitarmos (a) as poses-chave definidas à mão, (b) poucas imagens intermédias e (c) a limpeza de píxeis depois de desenhar.
- **Celeste:** a Madeline é desenhada **sem cabelo**. O cabelo é acrescentado em tempo real por código (Noel Berry, no Reddit). É uma cadeia de alguns círculos que seguem a cabeça com atraso. É o exemplo perfeito de **ação secundária procedimental** sobre arte fixa. Para nós equivale a uma fita de cabelo, à camisola ou à rede do cesto.
- **Limpeza depois do desenho [inferência, prática corrente]:** depois de desenhar os segmentos (linhas de Bresenham entre articulações), aplicar regras simples: eliminar "doubles" (cantos em L de 2 px numa linha de 1 px), não deixar píxeis órfãos e garantir que o contorno é contínuo. Isto é o que separa "esqueleto pixelizado" de "pixel art".

### 5.2 Cinemática inversa (IK) em bonecos pequenos

- A IK de dois ossos em 2D (anca, joelho e pé; ombro, cotovelo e mão) tem **solução fechada pela lei dos cossenos**, sem iterações. O alcance mínimo é |L1 − L2| e o máximo é L1 + L2, e fora disso **limita-se o alvo**. Há duas soluções (o joelho dobra para a frente ou para trás), por isso **escolhe-se sempre o lado** (Ryan Juckett, Simon Yeung).
- **Versão sem trigonometria [inferência]:** o joelho é a interseção de dois círculos (centro na anca com raio L1, centro no pé com raio L2). Calcula-se só com `Math.sqrt`, o que respeita as regras de `src/sim/` caso isto alguma vez tenha de ser determinista. Na interface (`src/ui/`) a trigonometria é permitida, mas o `sqrt` dá o mesmo resultado em todos os browsers.
- **Em 16–32 px os ossos têm 3–6 px**, por isso a IK serve sobretudo para: (a) pés presos ao chão durante a marcha (sem deslizar), (b) a mão a seguir a bola no drible e (c) as mãos no aro no afundanço. Para tudo o resto, poses diretas são mais legíveis.

### 5.3 Funções de suavização (easing)

- As equações de Robert Penner (2001–2003, licença BSD) são a base de quase todas as bibliotecas. As úteis aqui:
  - `easeOutQuad` e `easeOutCubic`: chegadas (o jogador a parar, a câmara).
  - `easeInOutSine` (ou o seu polinómio, `t*t*(3-2t)`, o *smoothstep*): respirações e oscilações do público. É grátis e sem trigonometria.
  - `easeOutBack` (ultrapassa e volta, constante 1,70158): textos do placar e cartões a aparecer. Usa com cuidado em personagens.
  - `easeOutElastic`/`easeOutBounce`: só na interface (medalhas, troféus). Num boneco de 24 px um elástico vê-se como vibração.
- **Atenção:** com movimentos de 1–4 px, o *easing* desaparece no arredondamento. Em pixel art a suavização vem de **segurar as poses**, e o *easing* só se nota em deslocações de mais de cerca de 8 px (saltos, bola, câmara).

### 5.4 Interpolação entre poses

- Uma pose é um conjunto de articulações (x, y) relativas aos pés. Interpolar duas poses de forma linear e arredondar **só a pose final** funciona para transições curtas (≤ 3 ticks).
- **Interpolar ângulos em vez de posições** mantém o comprimento dos ossos. Interpolar posições encolhe o braço a meio caminho. Num boneco de 24 px um braço que encolhe 1 px já se vê. Em alternativa, interpolar posições e repor o comprimento do osso com `sqrt`.
- **Não interpoles tudo.** Uma animação com interpolação contínua parece "flutuar". Esta é a sensação de "Flash" que os pixel artistas criticam. O melhor resultado é **poses mantidas e saltos entre elas**, com interpolação só em 1 imagem intermédia quando o salto é maior do que cerca de 3 px. Isto imita o "em 2s" e "em 3s" do desenho à mão.

### 5.5 Animação determinista presa aos ticks

- Tudo o que se repete no jogo (repetições, Match ID) depende da simulação. A animação deve ser uma **função pura** de `(estado da simulação, tick, alpha)`. Nada de relógio de parede nem de `Math.random` na escolha de poses que dependam de eventos.
- Efeitos decorativos (público, confetes) podem usar um gerador próprio com semente no tick ou no evento, para que uma repetição mostre os mesmos confetes. Não é obrigatório, mas é barato e coerente.
- **Fase por entidade:** `fase = hash(id) mod período`, e não aleatório. É reprodutível e evita que todos se mexam em sincronia.

### 5.6 Animação a 2× e 4×

Há duas opções:

1. **Acelerar** (o tempo da animação é o tempo da simulação). Os ciclos ficam 2× ou 4× mais rápidos. Uma corrida de 8 imagens a 100 ms passa a 25 ms por pose a 4×, menos de 2 imagens do ecrã: lê-se como cintilação.
2. **Saltar imagens** (mostrar menos poses por segundo). Mantém a legibilidade de cada pose, mas a 4× um ciclo de 8 poses vê-se a saltos.

**Recomendação [inferência]:**
- **Ciclos de locomoção (marcha, corrida, drible):** a fase avança pela **distância percorrida**, que já escala com a velocidade. Limita a duração mínima de uma pose a cerca de **2 imagens do ecrã (33 ms)**: a 4×, se a pose duraria menos, salta-se para a pose seguinte, mantendo a legibilidade.
- **Ações únicas (lançamento, afundanço, bloqueio):** aceleram com o jogo (a ação tem de terminar no tick certo), mas o **pico** (lançamento, aro) mantém pelo menos 2–3 imagens.
- **Efeitos de sensação (abanão, paragem no golpe, clarão):** contam em **tempo real, não em ticks**. A 4× ou se reduzem para metade ou se desligam. Hoje o abanão do afundanço (`shakeUntil = tick + 8`) dura 400 ms a 1× e 100 ms a 4×, e a alternância de ±2 px a cada tick passa a 40 Hz, o que é um zumbido. Convém medir o abanão em ms reais ou desligá-lo acima de 2×.
- **Respiração e público:** em tempo real, independentes da velocidade. Um público que pula 4× mais rápido parece um bug.

### 5.7 Movimento reduzido (`prefers-reduced-motion`)

- **WCAG 2.3.1 (nível A):** nada pisca mais de 3 vezes por segundo, salvo se estiver abaixo dos limiares de área e luminosidade. **2.3.3 (AAA):** a animação provocada por interação tem de se poder desligar, a não ser que seja essencial à informação.
- A recomendação geral é **substituir o movimento por alternativas mais simples (desvanecer, mudança instantânea), não eliminar o retorno visual**. Os vestibulares sofrem com o movimento grande do ecrã (abanão, paralaxe, zoom), não com bonecos pequenos a mexer-se.
- **O que cortar:** abanão do ecrã, clarões, zoom e recuo da câmara, paragem no golpe longa, confetes em quantidade (reduzir a 10–20 %), público a pular (o projeto já o congela) e paralaxe.
- **O que manter:** o movimento dos jogadores e da bola (**é a informação do jogo**), os ciclos de marcha e a respiração (pequenos), indicadores de estado (quem tem a bola) e o retorno de cesto, por exemplo com uma mudança de cor ou um número fixo em vez de estrelas a explodir.
- O CSS só dá o sinal do sistema. Convém haver **também uma opção no jogo** (o projeto já tem `settings.ts`).

---

## 6. Referência de movimento no basquetebol

### 6.1 O ritmo do drible

- Não encontrei um número medido de ressaltos por segundo. Um estudo de 2025 com seguimento 3D (arXiv 2506.22503) mede a "frequência de toques" e ignora contactos a menos de 0,25 s do anterior. Isto sugere que **4 Hz é o teto prático**, e uma frequência mais alta indica um estilo mais técnico.
- **Física [inferência]:** uma bola largada da cintura (cerca de 1 m) até ao chão, com impulso da mão, faz o ciclo completo em **0,4–0,6 s** (1,7–2,5 ressaltos por segundo) em drible de proteção ou de passeio. Em drible de velocidade e cruzados baixos o ciclo cai para **0,25–0,35 s**.
- **Para o jogo:** drible parado de **8–12 imagens por ciclo** (500 ms a 60 fps, ou 10 ticks), em corrida de **6–8 imagens** (cerca de 300–400 ms), **sincronizado com os passos**: 1 ressalto a cada 2 passos em corrida (como na vida real). Poses: mão em cima (a segurar), mão a empurrar e bola no chão (1 imagem achatada). A bola acelera para baixo (empurrão mais gravidade) e abranda a subir: *easeIn* a descer e *easeOut* a subir.
- Som e imagem: o som do ressalto tem de cair **na imagem em que a bola toca o chão** (ver o skill sound-design).

### 6.2 Lançamento em suspensão (jump shot)

Sequência:
1. **Recolha (gather):** a bola vem à "bolsa" do lançamento, na anca ou no peito. Joelhos dobrados e o boneco 1–2 px mais baixo. Dura **100–150 ms (2–3 ticks)**. É a antecipação.
2. **Subida:** a bola sobe à frente da cara e os braços formam um "L" (cotovelo debaixo da bola). Dura **100–150 ms**.
3. **Lançamento no ápice (ou um pouco antes):** é a pose-chave, mantida **100–150 ms**. O braço fica estendido e a bola sai das pontas dos dedos. Os bons lançadores soltam perto do topo do salto, porque o corpo está quase parado. O salto num lançamento é modesto (20–40 cm na realidade), o que corresponde a **2–4 px** num boneco de 24 px (exagerado).
4. **Continuação: "pescoço de ganso".** O pulso dobra para baixo e os dedos apontam ao cesto. O braço **fica no ar até a bola chegar perto do aro** (200–400 ms). É a pose mais reconhecível do basquetebol e a mais barata: 1 px de pulso dobrado no fim do braço.
5. **Aterragem:** 1 imagem de compressão (−1 px) e volta à pose base.

**Ângulos medidos:** lançamentos convertidos saem a **cerca de 48°** e os falhados a cerca de 53° (Cabarkapa et al. 2022). O ângulo de entrada no cesto é de cerca de 45°. Outras fontes dão 44–52°, com mais ângulo perto do cesto. **Para o jogo:** lançamento a 45–55°, mais alto nos triplos (o arco é mais visível). Os bons lançadores podem ter um arco ligeiramente mais alto: é um sinal visual barato de habilidade.

### 6.3 Bandeja e afundanço

- **Bandeja:** o último passo é longo, salta com a perna do lado contrário à mão e sobe de lado. A bola sai **perto do ápice**, da mão estendida, num arco curto e alto (sobe 1–2 alturas do aro e cai com tabela ou direto). O salto é mais horizontal do que vertical: o corpo desloca-se em parábola **ao longo** do campo.
- **Afundanço:** 1 m de salto real dá **cerca de 0,9 s de tempo no ar** (t = 2·√(2h/g)). Uma impulsão de 0,6 m dá cerca de 0,7 s. **Para o jogo:** a parábola do corpo dura 500–800 ms a 1×, com o **ápice no aro**. A sequência é antecipação (agachar 150 ms), impulso (50 ms, com esticar de 1 px), subida (bola atrás da cabeça), **pausa no aro (3–5 imagens de paragem no golpe, mãos no aro)**, aterragem com compressão e pó. O exagero é bem-vindo: num boneco de 24 px a cabeça pode subir ao nível do aro.
- O "tempo suspenso" (*hang time*) é uma ilusão real: o corpo passa cerca de metade do tempo de voo no quarto superior da altura. Animar com uma parábola verdadeira (`y = v·t − g·t²/2`) já dá isso de graça. Não é preciso truque.

### 6.4 Trajetórias da bola (lançamentos e passes)

- **Parábola:** com a gravidade constante g e a duração T, a altura extra do ápice acima da linha reta é **h = g·T²/8**. Por isso, com a gravidade fixa, **o ápice cresce com o quadrado da duração**. Para desenhar, é mais simples definir **a altura do ápice em função da distância** e derivar a duração.
- **Regras práticas [inferência a partir da geometria de 45–55°]:**
  - Lançamento a 50° de ângulo: o ápice fica cerca de **0,3 × a distância** acima do ponto médio da reta entre a mão e o aro. Um triplo (6,75 m) tem cerca de 2 m de ápice acima da reta, o que é realista (sobe cerca de 4,5–5 m do chão).
  - Duração do lançamento: **0,9–1,3 s** (um triplo cerca de 1,2 s, um lançamento curto cerca de 0,8 s).
  - **Passe direto (de peito):** quase reto, com o ápice a ≤ 0,05 × a distância (o peso só se nota numa queda de 1–2 px). É o passe mais rápido. Duração de **0,3–0,6 s** num passe de 5–8 m.
  - **Passe picado:** o ressalto fica **a cerca de 2/3 da distância** (há quem diga a meio). Duas parábolas baixas, com 1 imagem de compressão no chão e um som. É mais lento do que o passe direto.
  - **Passe em balão (lob):** ápice de 0,25–0,4 × a distância e duração de 0,8–1,2 s. Deve ver-se a sombra da bola no chão, que é a pista de profundidade mais importante numa vista de cima ou de 3/4.
- **Sombra:** num campo visto de cima ou de lado, desenha-se a sombra no chão (posição x e y no campo), e a bola sobe em `y − altura`. A sombra **encolhe 1 px** quando a bola está alta. É a pista mais barata e eficaz.
- **Rasto da bola:** 2–3 cópias anteriores em tons mais escuros, ou 1 px de cor, **só em bolas rápidas** (passes fortes, afundanço). Nos lançamentos o arco lê-se sozinho e não precisa de rasto.

### 6.5 Ressaltos

- A bola sai do aro de forma imprevisível: o ângulo de saída depende do sítio onde bate. Visualmente: **1 imagem de "batida" no aro** (o aro desce 1 px e a rede abana), depois uma parábola curta e baixa com a velocidade reduzida a 50–70 %.
- Os jogadores: antecipação (agachar), salto com os **dois braços estendidos** e a bola **agarrada no ápice**. Ao aterrar, trazem a bola ao peito (a pose de "proteger o ressalto", com os cotovelos para fora). Disputas: dois bonecos com o mesmo salto, com uma diferença de 1 tick no tempo, contam a história de quem chegou primeiro.

### 6.6 Público

- **Variação barata:** um ciclo curto (2–4 imagens: sentado, a balançar, de pé e de braços no ar), **fase por espectador**, 2–4 paletas e espelhamento horizontal. As ferramentas 3D de multidões fazem exatamente isto: deslocamentos de tempo por instância e poucas animações de base agrupadas por **níveis de excitação**.
- **Três estados**, como nas ferramentas de estádio: calmo (balanço de 1 px, lento, de 1–2 s), animado (de pé, mais rápido, de 300–500 ms) e explosão (braços no ar e saltos de 1–2 px, durante 1–2 s depois de um cesto importante). A transição entre estados deve **propagar-se** a partir do lado da equipa que marcou (um atraso de 1–3 ticks por coluna), numa espécie de "onda" barata.
- **Nunca em sincronia total:** se todos se mexerem no mesmo tick, lê-se como um padrão mecânico. O projeto já usa fase por espectador.

---

## 7. Efeitos visuais (VFX) em pixel art

| Efeito | Imagens | Duração | Notas |
|---|---|---|---|
| **Pó (aterragem, travagem)** | 3–5 | 150–300 ms | Dois puffs simétricos aos pés que se afastam 2–4 px e encolhem. Tons claros do chão, não branco puro. Os pacotes de recursos têm 7–9 imagens, mas em 16–32 px chegam 4. Mantém o mesmo centro e peso visual em todas as imagens. Variar a posição e o momento de aparição evita a repetição. |
| **Estrelas de impacto** | 2–4 | 100–200 ms | Uma cruz de 3×3 ou 5×5 que aparece já grande (sem crescer), pisca 1 imagem a branco e encolhe. No aro (afundanço) ou na mão (bloqueio). |
| **Anel de impacto** | 3–4 | 120–200 ms | Círculo de Bresenham com o raio a crescer 2→4→6 px, a linha a passar de 2 px a 1 px e a cor a escurecer. Desaparece **antes** de chegar ao tamanho máximo. |
| **Brilhos (sparkles)** | 3–4 | 200–400 ms | Ponto → cruz de 3 px → cruz de 5 px → ponto. Ciclos com fase aleatória para troféus e cartas raras. |
| **Rasto da bola** | contínuo | 2–3 posições | Posições anteriores com cores da rampa (não alfa: o alfa não respeita a paleta). |
| **Confetes** | contínuo | 2–4 s | Partículas de 1×1 ou 1×2 px. Queda com velocidade terminal baixa (0,3–0,6 px por imagem) e oscilação lateral. A "rotação" faz-se trocando entre 1×2, 1×1 e 2×1, com a face clara e a escura (2 cores por confete). 40–120 partículas no máximo. Com movimento reduzido, 10–20 % delas ou nenhuma. |
| **Clarão no boneco** | 1 | 16–33 ms | O boneco todo a branco ou à cor da equipa durante 1 imagem. É o que substitui o clarão de ecrã. |

**Ciclo de cores e animação da paleta:** é a técnica de Mark Ferrari (LucasArts: *Loom*, *Monkey Island*). Uma única imagem de 256 cores em que se rodam entradas da paleta para dar água, fogo, chuva e neve sem redesenhar. O que importa é o **índice** e não a cor visível. **Uso aqui [inferência]:** luzes do pavilhão a "correr" no placar, o brilho do troféu, a rede a "brilhar" no cesto, o público ao longe (rodar 3–4 cores das camisolas dá a ilusão de movimento sem desenhar bonecos) e o fogo de um "jogador em chamas". Para isto, as cores animadas devem estar em índices reservados.

---

## 8. Sensação de jogo e "sumo" (juice)

### 8.1 O que dizem os autores

- **Steve Swink, *Game Feel* (2008/2009):** a sensação de jogo é "controlo em tempo real de objetos virtuais num espaço simulado, com as interações realçadas por polimento". O polimento é a camada que, se removida, **não muda a funcionalidade, mas torna a experiência menos convincente**. Num jogo de gestão **não há controlo em tempo real** dos jogadores, por isso falta o pilar principal. Sobram o espaço simulado e o polimento. Ou seja, o "sumo" aqui serve para **ler** e **celebrar**, não para dar resposta ao controlo.
- **Jonasson e Purho, *Juice It or Lose It* (GDC Europe 2012):** pegam num *Breakout* sem graça e "levam-no ao 11" ao vivo. Interpolação e *easing*, cor, piscar, partículas, som e coisas que "abanam, esguicham, saltitam e fazem barulhinhos fofos". **Contraponto:** Folmer Kelly respondeu que demasiado polimento pode **fazer perder imersão**.
- **Nijman, *The Art of Screenshake* (2013):** são 30 pequenos ajustes cumulativos (ver 3.4). A lição: **o impacto é a soma de muitos sinais coordenados no mesmo instante** (som, imagem, câmara, partícula). Nenhum funciona sozinho.
- **Eiserloh (2016):** trauma, ruído contínuo e decaimento (ver 3.4).
- **Celeste (Maddy Thorson):** ela diz que não inventou nenhuma das técnicas. Congelamento de 0,1 s nas explosões, abanão "microscópico" no *dash*, cabelo procedimental com a cor a indicar o estado (o *dash* está disponível ou não). **Lição para nós:** o retorno visual **dá informação de estado**. Por exemplo, um brilho subtil no jogador em boa forma.
- **Dead Cells:** congelamento de 1 imagem e abanão nos críticos. O GDC 2019 (Sébastien Bénard, *What the F\*n?!*) falou de controlos, retorno e partículas. A lição é que **escalar o retorno conforme o evento é raro ou comum**.

### 8.2 O que é adequado a um jogo de gestão calmo

O jogador **vê e decide**; não controla. O jogo tem dezenas de cestos por partida, e partidas a 2× e 4×. Por isso:

| Adequado | Com moderação | Demais |
|---|---|---|
| Comprimir e esticar de 1 px, antecipação, continuação | Paragem no golpe de 3–5 imagens **só no afundanço e no bloqueio** | Paragem no golpe em todos os cestos |
| Pó nas aterragens, rede a abanar, aro a vibrar 1 px | Abanão de 1–2 px de arte, cerca de 150–250 ms reais, **só** no afundanço, na buzina final e no cesto da vitória | Abanão em cestos normais, ressaltos ou faltas |
| Sombra da bola, arco claro, pescoço de ganso | Estrelas de impacto e anel no afundanço | Clarão de ecrã inteiro (WCAG) |
| Público com fase e níveis de excitação | Confetes no fim do jogo (vitória) | Confetes a cada cesto |
| Números e textos com `easeOutBack` | Rasto em passes fortes | Zoom e rotação de câmara (partem a grelha) |
| Clarão de 1 imagem no boneco | Câmara lenta curta no último cesto decisivo | Câmara lenta frequente (atrasa o jogo) |

**Escala de retorno [inferência]:** define 3 níveis e liga cada evento a um deles.
- **Nível 1 (frequente):** passe, drible, ressalto e cesto de 2. Só animação, pó e som.
- **Nível 2 (notável):** triplo, desarme, bloqueio e cesto com falta. Mais estrelas, público animado e paragem no golpe de 2 imagens.
- **Nível 3 (raro):** afundanço, buzina, cesto da vitória e recorde. Mais abanão de 1–2 px, paragem no golpe de 3–5 imagens e público em explosão.

A 4×, desce-se um nível.

---

## 9. Artistas e recursos de referência, e o que ensinam

- **saint11 (Pedro Medeiros, diretor de arte do Celeste e TowerFall):** tutoriais curtos de uma imagem (no Patreon, em saint11.org/saint11.art), entre eles os ciclos de corrida, os 12 princípios em pixel art, o pó, as explosões, os borrões e o impacto. Ensina a resolver **cada problema numa só imagem animada, com poucas cores e poucas imagens**. Defende que as restrições (por exemplo NES) são um desafio e não um limite. *(Não consegui abrir o site; o conteúdo específico de cada tutorial não está verificado.)*
- **Slynyrd (Raymond Schlitter), Pixelblog:** o n.º 8 (*Intro to Animation*) é sobre corrida e energia ("mais imagens dão suavidade, não energia"). O n.º 50 (*Human Walk Cycle*, 2024) trata a marcha humana. Ensina **partir de silhuetas e poucas imagens, usar a corrida do Mega Man como modelo e manter as paletas limitadas**.
- **AdamCYounis (YouTube):** processos completos no Aseprite. Os alunos citam a técnica de **animar primeiro só a mão (ou o ponto que lidera o movimento) e construir o corpo à volta**. É ideal para o nosso caso: anima-se o caminho da mão e da bola e depois resolve-se o braço com IK.
- **Brandon James Greer (Bit Bear Studio, YouTube):** tutoriais sobre bonecos pequenos, ciclos de marcha e cor. *(Os resultados de pesquisa não trouxeram material dele; fica por verificar.)*
- **Richard Williams, *The Animator's Survival Kit*:** o método de contacto na marcha (contactos, passagem a meio e depois descida e impulso), "em 1s" e "em 2s", o espaçamento e os arcos. É a base de tudo. A parte do peso e do tempo é a mais útil para pixel art.
- **Pixel Joint, normas de crítica:** a crítica é **ao trabalho, não à pessoa**, mesmo dura. Quem pede deve ser específico sobre onde ficou preso e publicar uma peça de cada vez. A crítica faz-se muitas vezes com uma **edição** (a pessoa redesenha a peça para mostrar a correção). As velhas regras de "píxeis limpos" (sem "doubles", sem "jaggies" não intencionais, sem "banding", sem píxeis órfãos e contornos coerentes) são o vocabulário comum. *Surviving a Pixel Art Forum – The 9-step program* é o texto de boas-vindas.
- **GDC:**
  - *Juice It or Lose It* (Jonasson e Purho, 2012).
  - *Math for Game Programmers: Juicing Your Cameras With Math* (Eiserloh, 2016).
  - *Animation Bootcamp* (vários anos): Jonathan Cooper sobre resposta e fidelidade e antecipação; Mariel Cartwright, *Skullgirls* (2014), sobre poses-chave fortes e "só tens 6 imagens para o soco".
  - *Dead Cells: What the F\*n?!* (Bénard, 2019).
  - O pipeline 3D→2D do Dead Cells está num artigo escrito (Vasseur, *Art Design Deep Dive*, Gamasutra, 2018), não numa palestra da GDC.
- **Jonathan Cooper, *Game Anim* (livro e gameanim.com):** os 12 princípios em jogos. A antecipação é uma tensão entre design e animação. A antecipação dos adversários (telegrafar) deve ser mais longa. A continuação pode ser cortada devolvendo o controlo numa imagem fixa.
- **Glenn Fiedler, *Fix Your Timestep*:** acumulador e interpolação com `alpha` entre estados.

---

## 10. Tabela de imagens e tempos recomendados

*Tempos a 1×, a 60 fps; 1 tick = 50 ms = 3 imagens. "Poses" são desenhos distintos e "imagens" são de 60 fps.*

| Animação | Poses | Duração por pose | Ciclo / total | Notas |
|---|---|---|---|---|
| Respiração (espera) | 2 (ida e volta) ou 3 com ½ px de cor | 400–600 ms (8–12 ticks) | 0,8–1,2 s | 1 px de tronco ou cabeça. Fase por jogador. |
| Defesa (posição baixa) | 2 | 200–300 ms | 0,4–0,6 s | Balanço lateral de 1 px. |
| Marcha | 4 (6 em 32 px) | 150 ms (3 ticks) | 0,6 s | Fase pela distância. Sobe 1 px na passagem. |
| Corrida | 6–8 (4 em 16 px) | 80–100 ms (≈ 5–6 imagens / 2 ticks) | 0,5–0,8 s | Fase aérea. Passos simétricos. |
| Drible parado | 3–4 | 100–200 ms | 0,5 s | Bola achatada 1 imagem no chão. |
| Drible em corrida | 3–4 | 75–100 ms | 0,3–0,4 s | 1 ressalto a cada 2 passos. |
| Passe direto | 3 (preparar, soltar, continuação) | 50 / 50 / 150 ms | 250 ms | Bola em 0,3–0,6 s. |
| Passe picado | 3 | 50 / 50 / 150 ms | 250 ms | Ressalto a 2/3 da distância. |
| Passe em balão | 3–4 | 100 / 50 / 200 ms | 350 ms | Ápice de 0,25–0,4 × a distância. Sombra visível. |
| Lançamento em suspensão | 5 | 150 / 100 / **150** / **250** / 100 ms | 750 ms | Pescoço de ganso mantido até a bola chegar perto do aro. |
| Bandeja | 4–5 | 100–150 ms | 600 ms | Salto horizontal, solta no ápice. |
| Afundanço | 6 | 150 / 50 / 150 / **50–83 de paragem** / 150 / 100 ms | 700–900 ms | Mais pó, estrelas e abanão (nível 3). |
| Salto ao ressalto | 4 | 100 / 50 / 200 / 150 ms | 500 ms | Dois braços no alto. Bola ao peito ao aterrar. |
| Bloqueio | 3–4 | 100 / 50 / **150** / 150 ms | 450 ms | Paragem de 2–3 imagens no contacto. |
| Festejo | 2–4 em ciclo | 150–250 ms | 1–2 s | Braços no ar e salto de 1–2 px. |
| Ida para o banco | marcha | 150 ms | — | Cabeça 1 px em baixo se for substituído por cansaço. |
| Gesto do treinador | 2–3 | 200–400 ms | 1–2 s | Apontar, bater palmas, braços cruzados. |
| Público calmo / animado / explosão | 2 / 2–3 / 3–4 | 1–2 s / 300–500 ms / 150–200 ms | — | Fase por espectador, 3 níveis, propagação 1–3 ticks. |
| Pó | 3–5 | 50–70 ms | 150–300 ms | Dois puffs simétricos. |
| Estrelas de impacto | 2–4 | 33–50 ms | 100–200 ms | Aparecem logo grandes. |
| Anel de impacto | 3–4 | 40–50 ms | 120–200 ms | Raio 2→6 px. |
| Brilho | 3–4 | 50–100 ms | 200–400 ms | Fase aleatória. |
| Borrão (smear) | 1 | 16–50 ms | — | Só em movimentos de mais de 3 px por imagem. |
| Clarão no boneco | 1 | 16–33 ms | — | Nunca no ecrã inteiro. |
| Paragem no golpe | — | 33–83 ms (2–5 imagens) | — | Só nos níveis 2–3. Em tempo real, não em ticks. |
| Abanão do ecrã | — | 150–250 ms reais | — | 1–2 px de **arte**, ≤ 15–20 Hz, trauma². Desligado com movimento reduzido. |
| Confetes | contínuo | — | 2–4 s | 40–120 partículas. 10–20 % com movimento reduzido. |

---

## 11. Lista de verificação

**Poses e desenho**
- [ ] Cada pose-chave lê-se só pela silhueta (testar a preto).
- [ ] Antecipação em todas as ações (agachar 1–2 px antes de saltar, bola para trás antes do passe).
- [ ] Comprimir e esticar ≤ 1 px no corpo (2 px no máximo), conservando o volume.
- [ ] As mãos e a bola seguem arcos, não retas.
- [ ] Pescoço de ganso visível no fim do lançamento e mantido até a bola chegar perto do aro.
- [ ] Limpeza depois de desenhar: sem doubles, sem píxeis órfãos e com o contorno contínuo.
- [ ] Os ossos mantêm o comprimento ao interpolar (ângulos, ou repor o comprimento com `sqrt`).

**Tempo**
- [ ] As poses duram múltiplos de tick (50 ms). As poses-chave duram mais do que as intermédias.
- [ ] Ciclos de marcha e corrida simétricos e com a fase pela distância (pés sem deslizar).
- [ ] Nenhuma pose dura menos de 2 imagens do ecrã (33 ms) a 4×; se duraria, salta-se.
- [ ] Os efeitos de sensação (abanão, paragem, clarão) contam em tempo real e baixam um nível a 2×/4×.
- [ ] Respiração e público em tempo real, independentes da velocidade do jogo.

**Píxeis e câmara**
- [ ] Posições em float na simulação, arredondadas uma só vez ao desenhar.
- [ ] Arredonda-se a âncora (os pés) e as articulações vêm relativas a ela.
- [ ] Câmara e todas as camadas arredondadas pela mesma convenção.
- [ ] Escala inteira, `imageSmoothingEnabled = false`, abanão em píxeis de arte inteiros.
- [ ] Só a posição se interpola com `alpha`. As poses escolhem-se, não se misturam.

**Bola**
- [ ] Parábola verdadeira, com o ápice definido pela distância (lançamento ≈ 0,3 × d, balão 0,25–0,4 × d, direto ≤ 0,05 × d).
- [ ] Sombra no chão, que encolhe com a altura.
- [ ] Imagem achatada no ressalto e o som na mesma imagem.
- [ ] Passe picado com o ressalto a cerca de 2/3 da distância.

**Sumo e escala**
- [ ] Todos os eventos estão associados a um nível 1/2/3.
- [ ] Abanão e paragem no golpe só no nível 3 (e paragem curta no 2).
- [ ] Sem clarões de ecrã inteiro e nada que pisque mais de 3 vezes por segundo.
- [ ] Confetes só em eventos raros.

**Acessibilidade e determinismo**
- [ ] `prefers-reduced-motion` e a opção no jogo cortam o abanão, os clarões, o zoom, a paragem longa, os saltos do público e a maior parte dos confetes.
- [ ] Os jogadores e a bola continuam a mexer-se com movimento reduzido (é informação).
- [ ] A animação é uma função pura de (estado, tick, alpha). As fases vêm de `hash(id)` e não de `Math.random`.
- [ ] Uma repetição com o mesmo Match ID mostra exatamente as mesmas poses e efeitos.

---

## 12. Fontes

**Sensação de jogo e sumo**
- Nijman, *The Art of Screenshake* (INDIGO 2013) — resumo: <https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games>; vídeo: <https://youtu.be/AJdEqssNZ-U>; recriação: <https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog>
- Jonasson e Purho, *Juice It or Lose It* — <https://gdcvault.com/play/1016487/Juice-It-or-Lose>; contraponto: <https://gamedeveloper.com/design/video-indies-resist-the-urge-to-juice-it-or-lose-it->
- Swink, *Game Feel* — <https://en.wikipedia.org/wiki/Game_feel>; <https://lizengland.com/blog/review-game-feel-by-steve-swink/>
- Eiserloh, *Juicing Your Cameras With Math* (implementação de referência): <https://bevy.org/examples/camera/2d-screen-shake/>; <https://kidscancode.org/godot_recipes/3.x/2d/screen_shake/>; <https://bugnet.io/blog/fix-gamemaker-camera-shake-noise-pattern-repeats>
- Thorson, *Celeste & Forgiveness* — <https://maddymakesgames.com/articles/celeste_and_forgiveness/>; registo de alterações v1.4 (congelamento de 0,1 s): <https://maddymakesgamesinc.itch.io/celeste/devlog/237097/v1400-changelog>; GMTK (transcrição): <https://huggingface.co/datasets/taesiri/GMTK-Transcripts/viewer/default/train?p=335>
- Cabelo da Madeline (Noel Berry): <https://axebps-redlib.hf.space/r/gamedev/comments/9a0cfr/how_is_the_hair_in_celeste_made>
- Dead Cells: <https://www.jikguard.com/news/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-dead-cells>; <https://80.lv/articles/interview-with-the-developers-of-dead-cells>; <https://gdconf.com/news/get-game-design-tips-and-tricks-dead-cells-dev-gdc-2019>
- Paragem no golpe: <https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/>; <https://dustloop.com/w/BBCF/Esoterica>; <https://www.ssbwiki.com/Hitlag>; <https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/>; <https://gamejuice.pages.dev/articles/hit-stop-frame-trick> (secundária)

**Animação e pixel art**
- Slynyrd, Pixelblog 8 e 50: <https://slynyrd.com/blog/2018/8/19/pixelblog-8-intro-to-animation>; <https://slynyrd.com/blog/2024/5/24/pixelblog-50-human-walk-cycle> (não abertas; excertos)
- saint11 / Pedro Medeiros: <https://saint11.art/blog/pixel-art-tutorials/> (não aberta); podcast: <https://www.awn.com/tag/final-aip-now>
- Corrida da Madeline com 4 imagens: <https://www.sprite-ai.art/fr/blog/pixel-art-animation> (secundária)
- Tempos de respiração e poses mantidas: <https://smithery.ai/skills/willibrandon/pixel-art-animator>; <https://www.sprite-ai.art/guides/animation-principles> (secundárias)
- Aseprite e durações: <https://mintlify.com/aseprite/aseprite/concepts/animation>; <https://community.aseprite.org/t/what-frame-duration-equals-60fps/1224>
- Método de contacto (Williams): <https://animation.monmouth.edu/instruct/?p=351>; <https://learn.toonboom.com/modules/walk-cycle-animation/topic/walk-analysis1>
- Pixel Joint: <https://pixeljoint.com/forum/forum_posts.asp?TID=9551>; <https://pixeljoint.com/pixels/faqs.asp>; <https://pixeljoint.com/forum/printer_friendly_posts.asp?TID=18650>
- Cooper, 12 princípios em jogos: <https://www.jikguard.com/news/the-12-principles-of-animation-in-video-games>; Animation Bootcamp: <https://wolfire-blog.appspot.com/2013/04/GDC13-Summary-Animation-Bootcamp-Part-4-6>
- AdamCYounis (testemunhos): <https://itch.io/post/12536366>
- Abaixo do píxel: <https://someanimatorwannabe.substack.com/p/animator-techniques-sub-pixel-animation>; <https://tinywarriorgames.com/?p=434>
- Vibração e arredondamento: <https://forum.godotengine.org/t/pixel-art-jittering/75305>; <https://discussions.unity.com/t/2d-sprite-jitters/696940>; <https://bugnet.io/blog/fix-unity-pixel-perfect-camera-jitter-on-movement>
- Fiedler, *Fix Your Timestep*: <https://gafferongames.com/post/fix_your_timestep/>
- IK em 2D: <https://ryanjuckett.com/analytic-two-bone-ik-in-2d>; <https://simonstechblog.blogspot.com/2012/01>
- Penner: <http://www.robertpenner.com/easing/>; <https://github.com/bameyrick/js-easing-functions>
- Ciclo de cores (Ferrari): <https://80.lv/articles/color-cycling-from-the-90s-returns-with-html5>; <https://dcmpx.remotevs.com/com/effectgames/www/PL/effect/article-Q_A_with_Mark_J_Ferrari.html>
- Pó e efeitos: <https://weentermakesgames.itch.io/dust-cloud-pixel-art-particles>; <https://discussions.unity.com/t/puff-of-dust-effects/816268>
- Multidões: <https://forum.itoosoft.com/index.php?msg=9410>; <https://www.fab.com/listings/89eb40ac-4e34-4b84-8346-810bc8d5f31d>

**Basquetebol**
- Drible (frequência de toques): <https://arxiv.org/pdf/2506.22503>
- Ângulos de lançamento: <https://mdpi.com/2673-7078/2/3/28>; <https://casopisi.junis.ni.ac.rs/index.php/FUPhysEdSport/article/download/3908/3222>
- Passe picado: <https://www.basketballforcoaches.com/chest-pass/>; <https://hoopstudent.com/basketball-chest-pass/>
- Tempo no ar: <https://www.topendsports.com/testing/vertical-jump-physics.htm>; <https://www.thehoopsgeek.com/the-physics-of-the-vertical-jump>

**Acessibilidade**
- WCAG 2.3.1 / 2.3.3: <https://www.getstark.co/wcag-explained/operable/seizures-and-physical-reactions/>; <https://wcag.dock.codes/documentation/wcag233/>
- Movimento reduzido: <https://primer.style/accessibility/design-guidance/motion-and-animation>; <https://usability.yale.edu/digital-accessibility/accessibility-resources/accessibility-articles/animated-content-and-timing>

**Por verificar** (sem acesso direto às fontes): o conteúdo exato dos tutoriais do saint11 e do Brandon James Greer; a lista dos 30 ajustes do Nijman; os 4 frames de pausa no *dash* do Celeste; os números de paragem no golpe em fontes secundárias; o ritmo de drible em Hz (inferido da física, não medido).
