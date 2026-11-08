# Revisão: animações do jogo em movimento (`src/ui/match-view.ts`)

**Pedido:** rever as animações do jogo em movimento (poses de `poseOf`, arcos `shotLift`/`dunkLift`/`reboundLift`/`tipLift`, voo da bola, pó, rasto, rótulos flutuantes e tremor do afundanço). Ramo atual, commit `fd8abd6`.
**Veredicto:** NÃO PASSA. 3 bloqueantes, 9 a corrigir e 5 sugestões.
**Cenas:** 20 cenas em `dist-check/revisao/anim-*/`, a 30 fps. As descrições estão em `/tmp/claude-0/-home-user-Pocket-Basketball/32f7ae8f-cf51-5b25-8081-569df0733c98/scratchpad/review/specs-anim/`:

| Cena | Evento | Atacantes / defesas | Semente · tick |
|---|---|---|---|
| anim-crossover | `move crossover` | 1/1 | 3 · 2237 |
| anim-stepback | `move stepBack` | 2/1 | 1 · 4557 |
| anim-alleyoop | `move alleyOop` | 3/2 | 63 · 5288 |
| anim-powerdunk | `move powerDunk` | 1/2 | 3 · 3757 |
| anim-pickpocket | `move pickpocket` | 2/1 | 7 · 7048 |
| anim-triplo | `made` de 3 (campo inteiro) | 1/1 | 1 · 492 |
| anim-dois | `made` de 2 (campo inteiro) | 2/2 | 1 · 361 |
| anim-bandeja | `shot layup` | 1/1 | 1 · 2159 |
| anim-afundanco | `shot dunk` | 1/1 | 1 · 245 |
| anim-afundanco-x4 | igual, a `speed` 4 | 1/1 | 1 · 245 |
| anim-afundanco-reduzido | igual, com `reducedMotion` | 1/1 | 1 · 245 |
| anim-desarme-bloqueio | `block` | 1/1 | 1 · 4917 |
| anim-ressalto | `rebound` | 1/2 | 1 · 292 |
| anim-roubo | `steal` | 1/2 | 1 · 1163 |
| anim-passe | `pass` | 2/2 | 1 · 159 |
| anim-passe-balao | `pass lob` (acaba em alley-oop) | 3/1 | 41 · 4730 |
| anim-falta | `foul` | 2/2 | 1 · 1450 |
| anim-queda | `knockdown` | 1/1 | 1 · 4945 |
| anim-desconto | `timeout` | todos | 2 · 4758 |
| anim-fim-periodo | `periodEnd` | todos | 1 · 2808 |

**Determinismo:** OK. Nenhuma das 20 cenas tem o aviso «não é determinista».

**Medidas:**
- `medidas.json` mais uma sonda minha (`tools/probe.ts` no scratchpad). A sonda repete a cena e grava, por frame, o seguinte:
  - de cada corpo visível: pose, `flip`, `back`, posição no ecrã interpolada e `lift`;
  - a câmara;
  - a bola, no mundo e no ecrã;
  - o `style.transform` do tremor;
  - os rótulos flutuantes e o número de nuvens de pó.
- Confirmei a sonda contra o `medidas.json`: tick e pose iguais em todos os 90 frames de `anim-triplo`.
- As posições estão em píxeis de arte relativos à câmara (`project(14,0)`). A altura dos pés é `lift` mais o `jump` da pose, lido de `sprites.ts`.
- Os scripts estão em `/tmp/claude-0/-home-user-Pocket-Basketball/32f7ae8f-cf51-5b25-8081-569df0733c98/scratchpad/review/tools/` e as tiras ampliadas em `/tmp/claude-0/-home-user-Pocket-Basketball/32f7ae8f-cf51-5b25-8081-569df0733c98/scratchpad/review/strips/`.

## Problemas

### B1 — Bloqueante — O rótulo do movimento especial tapa quem o faz
- **Cenas e frames:**
  - `anim-crossover`, frames 16–30;
  - `anim-stepback`, frames 16–62;
  - `anim-powerdunk`, frames 16–54;
  - `anim-pickpocket`, frames 16–29;
  - `anim-alleyoop`, frames 16–49;
  - `anim-passe-balao`, frames 19–40.
- **Onde:** em `anim-crossover`, frame 17, a palavra «CROSSOVER» (72×11 px) fica sobre a cabeça e o tronco do ator, à volta de (x 150–170, y 30–40) do recorte. Em `anim-stepback`, «STEP-BACK» fica por cima do lançador durante todo o fadeaway. Em `anim-powerdunk`, frames 16–17, «AFUNDANÇO» passa pelo peito de quem afunda.
- **Sintoma:** em 5 de 5 movimentos especiais, o momento que devia mostrar o movimento mostra a palavra.
- **Causa:**
  - `drawFloaters` (linhas 1606–1625) põe a palavra a `z = 2.6 m` projetado. A altura do boneco é fixa em píxeis e não segue a câmara, por isso 2,6 m projetados ficam abaixo do topo da cabeça.
  - Perto do topo do ecrã, `below` (linha 1618) põe a palavra por baixo, por cima das pernas.
  - O rótulo fica no sítio do evento durante 30 ticks.
- **Regra:**
  - «Nada a tapar a ação». Os efeitos e textos não podem esconder a pose-chave (`revisao.md` §8.2, «ordem de desenho e oclusões»).
  - A pose-chave tem de se ler pela silhueta (`animacao.md` §11).
- **Medida:** caixa do texto contra a caixa do ator (14×32 px). A sobreposição chega a 34 % da caixa, ou seja, a faixa de 11 px do texto cobre a cabeça ou o tronco:
  - 47 frames em `anim-stepback`;
  - 41 em `anim-powerdunk`;
  - 34 em `anim-alleyoop`;
  - 15 em `anim-crossover`;
  - 14 em `anim-pickpocket`.
- **Proposta:**
  - Ancorar o topo da palavra a `sy - lift - spriteHeight(look) - 6`, em píxeis de boneco e não em metros, e seguir o corpo, não o ponto do evento.
  - Quando não houver espaço em cima, encostar a palavra ao lado do boneco, nunca por cima dele.
  - Só aparecer depois do pico da pose, ao fim de 4 a 6 ticks.

### B2 — Bloqueante — Afundanço sem antecipação, sem paragem no aro e com festejo no ar
- **Cenas e frames:**
  - `anim-afundanco`, frames 30 → 31 e 44 → 45;
  - `anim-powerdunk`, 15 → 16 e 29 → 30;
  - `anim-passe-balao`, 39 → 40.
- **Sintoma:**
  - **Descolagem instantânea:** a pose passa de `dribRun0` a `dunk` e os pés sobem de 1 para 10 px num frame, e para 14 px no seguinte, sem agachar.
  - **Sem paragem no aro:** o `dunkLift` sobe até ao frame 44 (13,7 px) e logo a seguir o evento `made` troca a pose para `cheer1` (linha 474) no ápice. Os pés descem de 24 para 17 px num frame, e o boneco festeja enquanto cai do aro.
  - **Queda linear:** 1,5 px por frame (linha 701), sem aterragem nem compressão.
- **Regra:** tabela §10 de `animacao.md`: afundanço com 6 poses, 150 / 50 / 150 / **50–83 de paragem** / 150 / 100 ms. §6.3: agachar 150 ms e pausa no aro de 3 a 5 imagens.
- **Medida:**
  - pose `dunk` com 12 frames (anim-afundanco, 31–44), uma só pose em vez de 6;
  - paragem no aro de 0 ms;
  - salto dos pés de +9 px (frame 31) e −7 px (frame 45);
  - `cheer1` com lift de 13,2 → 0,8 px nos frames 45–53.
- **Proposta:**
  - Na linha 458, começar com 3 ticks de `gather` ou `defend` (agachar, com `lift` 0) antes de `dunk`, e passar o `dunkJump.start` para depois desse tempo.
  - Na linha 474, se a pose em curso for `dunk`, não a substituir. Prolongar o `override` até `dunkJump.start + up + 2`, segurando 1 a 2 ticks no aro, e só depois pôr `cheer1`.
  - Trocar a queda linear por `DUNK_LIFT * (1 - down*down)` e acabar com 1 tick de `gather`, como compressão.

### B3 — Bloqueante — Quem afunda desaparece do aro quando é substituído no mesmo tick
- **Cena e frames:** `anim-passe-balao`, frames 39 → 40 (`strips/anim-passe-balao-38-45.png`).
- **Sintoma:**
  - O recetor do alley-oop (Cruz) está agarrado ao aro (pés a 23 px) e no frame seguinte aparece no chão, de costas, a correr para o banco.
  - O evento `substitution` do Cruz cai no mesmo tick do `made` (4746).
  - O `addExits` (linhas 1146–1158) parte de `view.prev` com o `lift` a 0 e a pose `RUN_FRAMES` com `back = true`.
  - Na sonda, o corpo `cheer1` ainda interpola de x 241 para 96 e depois 28 px (o `prev` contra o lugar do banco), num frame que não se vê porque o corpo já saiu de `s.court`.
- **Regra:** sem *pops* (`revisao.md` §8.2); o fecho do afundanço é a recompensa de nível 3 (`animacao.md` §8.2).
- **Medida:** pés a 23 → 0 px acima do chão num frame, com mudança de pose (`dunk`/`cheer1` → `run`, de costas).
- **Proposta:** num `exit`, começar com o `lift` e a pose em curso (guardar `override` e `dunkJump` no `exit`) e só arrancar para o banco quando `dunkJump` acabar. Em alternativa, atrasar `start` do `exit` até o `override` expirar.

### C1 — A corrigir — Salto da bola ao sair da mão em todos os lançamentos
- **Cenas e frames:**
  - `anim-triplo`, 20 → 22;
  - `anim-dois`, 16 → 18;
  - `anim-stepback`, 17 → 20;
  - `anim-afundanco`, 33 → 35;
  - `anim-desarme-bloqueio`, 26 → 29;
  - `anim-ressalto`, 8 → 11;
  - `anim-queda`, 19 → 21;
  - `anim-passe-balao`, 17 → 20 (também no balão).
- **Sintoma:** a bola fica 1 tick à altura do drible (`z` = 1,0 m) e depois sobe 1,1 m num só tick (`anim-triplo`: z 1,57 → 2,71). A seguir sobe 0,3 m por tick. No ecrã sobe −7,6 px, depois −15,7 px, depois −3,2 px.
- **Regra:** arcos: a bola faz uma parábola limpa (`animacao.md` §6.4 e §11, «Arco»).
- **Medida:** segunda diferença da altura no ecrã, que devia ser constante e pequena numa parábola:
  - `anim-triplo`: −8,1 / −8,1 / +12,7 px;
  - `anim-dois`: −15,5 / +6,4;
  - `anim-stepback`: −9,9 / +16,1;
  - `anim-desarme-bloqueio`: −10,2 / +16,1.
- **Proposta:** em `render` (linhas 1316–1330), nos primeiros 2 ticks de um `ShotFlight`, partir da mão da pose do lançador (`drawSprite` já conhece `ball` em `dunk`; em `shoot`, por cima da cabeça, `sy - lift - 26`) e misturar até à posição da simulação com `t*t`. Em alternativa, pôr `ballPrevious = ball` no primeiro tick do voo, para não interpolar desde o drible.

### C2 — A corrigir — Poses paradas a deslizar no chão (patinar)
- **Cenas e frames:**
  - `cheer1`: `anim-dois` 32–51 (2,5–4,6 px/frame), `anim-afundanco` 54–65 (≈2 px/frame), `anim-stepback` 48–68 (≈2 px/frame);
  - `crossover`: `anim-crossover` 16–27 (3,0 px/frame);
  - `snatch`: `anim-pickpocket` 16–27 (até 3,3 px/frame), `anim-roubo` 31–42;
  - `handsHead`: `anim-falta` 31–36 (até 2,4);
  - `brace`: `anim-roubo` 34–44 (3,5);
  - `drib0`/`drib1`: `anim-triplo` 2–18 e `anim-passe-balao` 3–15 (4,6 → 0,8);
  - `layupStep`/`layupRise`: `anim-bandeja` 31–40 (3 px/frame).
- **Sintoma:** o corpo anda na simulação e o boneco fica numa pose fixa, com os pés parados, a escorregar.
- **Causa:**
  - os `override` (linhas 474, 507, 521, 541, 582–583) ignoram `moving`;
  - o drible parado (linha 1010) usa a histerese `m.speed > 0.4`, que deixa um portador a abrandar com pose parada;
  - na bandeja, o voo leva o corpo sem passos.
- **Regra:** pé de apoio plantado, sem deslizar (`revisao.md` §8.2; `animacao.md` §4.2.5).
- **Medida:** velocidade no ecrã, relativa à câmara, em pose sem locomoção e com `lift` 0: mais de 0,6 px por frame nos frames listados (máximo 4,6).
- **Proposta:**
  - Com `moving`, os festejos e o `handsHead` passam a versões em corrida (pernas de `RUN_FRAMES` com os braços da pose) ou só começam quando o corpo para.
  - No drible, usar `DRIBBLE_RUN_FRAMES` enquanto `m.speed > 0.4` (mesmo limite para parar e arrancar).

### C3 — A corrigir — Ciclo de corrida por tempo, desigual, abaixo de 33 ms a 4×
- **Cenas e frames:** todas. Por exemplo, `anim-triplo` (outro jogador) com `run2[36-39] run1[40-42] run0[43-45]`, e `anim-afundanco-x4`, frames 18–90 (cada pose de corrida com 1 frame).
- **Sintoma:**
  - A linha 938 (`frame = floor(tick / 2.5)` ou `/ 1.6` a sprintar) dá poses alternadamente de 2 e 3 ticks (100/150 ms), e de 1 e 2 ticks a sprintar (50/100 ms). Os passos ficam assimétricos e o boneco coxeia.
  - A cadência não depende da velocidade. Nas 4656 amostras de corrida, a velocidade vai de 0,17 px/tick (p5) a 5,85 px/tick (p95) com o mesmo ritmo: quem trota marca passo no sítio e quem sprinta patina.
  - A 4×, cada pose dura 31 ms (20 ms a sprintar).
  - O review deu 35 avisos de «pose com menos de um tick», todos em `run`/`dribRun`.
- **Regra:**
  - corrida de 80–100 ms por pose com passos simétricos (`animacao.md` §10);
  - fase pela distância (§4.2.5 e §5.6);
  - nenhuma pose abaixo de 2 imagens (33 ms) a 4× (§11).
- **Medida:**
  - durações em `anim-triplo`: 2/3/2/3 ticks;
  - p5 0,17 e p95 5,85 px/tick;
  - a 4×, 1 frame a 30 fps por pose, em 62 de 73 frames de corrida.
- **Proposta:**
  - Guardar em `BodyView` uma fase `stride += distância_em_px / PASSO_PX` e escolher `RUN_FRAMES[floor(stride) % 4]`.
  - Limitar a troca a no máximo uma pose a cada 2 imagens reais.

### C4 — A corrigir — Trocas de frente e costas em menos de 0,5 s, contornando o `TURN_LOCK_TICKS`
- **Cenas e frames:**
  - `anim-passe`, frames 16 → 18 (1 tick);
  - `anim-bandeja`, 46 → 48 (1 tick);
  - `anim-ressalto`, Almeida 51/54/57 (2 e 2 ticks) e Costa 39 → 45 (4 ticks);
  - `anim-alleyoop`, Lobo 16 → 21 (3 ticks) e Embaló (4 ticks).
- **Sintoma:** o `back` desenhado é `motion.back && pose.startsWith('run')` (linha 1264). Ao passar de `dribRun`, `leap` ou `idle` para `run`, o boneco vira-se de costas no mesmo frame, e volta, sem passar pelo bloqueio de 12 ticks.
- **Regra:** sem trocas de orientação em menos de 0,5 s (`SKILL.md`, Animação; `animacao.md` §11).
- **Medida:** intervalos de 1, 1, 2, 2, 3 e 4 ticks entre mudanças do `back` efetivo. O `backChangeStats()` não os vê, porque só conta o `motion.back`.
- **Proposta:** aplicar o bloqueio ao valor efetivo (guardar `drawnBack` e `drawnBackLock` em `Motion`) ou desenhar as variantes de costas também para `dribRun`. Contar estas trocas no `backChangeStats`.

### C5 — A corrigir — Lançamento numa só pose de 500 ms, sem recolha e sem pescoço de ganso até ao aro
- **Cenas e frames:** `anim-triplo`, frames 19–33; `anim-dois`, 15–29.
- **Sintoma:**
  - `shoot` dura exatamente `SHOT_JUMP_TICKS` (10 ticks).
  - Não há `gather` antes: a pose passa de `drib0` diretamente a `shoot`.
  - A bola só chega ao aro no frame 45 (cerca de 0,9 s depois), mas o lançador já está em `idle` e `run` desde o frame 34.
  - Em `anim-dois`, há um `idle` de 1 frame (frame 30) entre `shoot` e `cheer1`.
- **Regra:** lançamento com 5 poses (150 / 100 / **150** / **250** / 100 ms) e pulso mantido até a bola chegar perto do aro (`animacao.md` §6.2 e §10).
- **Medida:** 1 pose em vez de 5; o pulso fica 500 ms em vez de cerca de 900 ms; a pose `idle` em `anim-dois` dura 33 ms.
- **Proposta:** na linha 458, pôr antes 2–3 ticks de `gather` e manter `shoot` até `flight.ticks / flight.total > 0.75` (seguir o voo como no lay-up, linha 962). Na linha 474, não deixar 1 tick de `idle` antes do festejo.

### C6 — A corrigir — Saltos que começam e acabam num frame (pops)
- **Cenas e frames:**
  - `block`: `anim-desarme-bloqueio` frame 25 (pés −1 → 6 px) e `anim-powerdunk` 16 (1 → 6);
  - `reach`: `anim-passe-balao` frame 24 (0 → 8);
  - `layupTop` → `run1`: `anim-bandeja` frame 46 (8 → 0);
  - `swat` → `leap`: `anim-desarme-bloqueio` frame 49 (21 → 13);
  - `cheer1` → `run1`: `anim-afundanco` frame 66 (4 → 0).
- **Sintoma:** as poses com `jump` fixo em `sprites.ts` (block 6, swat 9, layupTop 8, reach 8, cheer1 4) ligam-se e desligam-se num frame, sem subida nem queda.
- **Regra:** sem pops (caixa estável); arco nos saltos (`SKILL.md`, «Arcos»; `revisao.md` §8.2).
- **Medida:** altura dos pés (`lift + jump`) com saltos de 4 a 9 px entre frames seguidos, nos frames listados.
- **Proposta:** dar a estas poses um `lift` com parábola (como `reboundLift`), em vez de `jump` fixo, ou pôr 1 tick de transição (`leap`, com `jump` 1) à entrada e à saída. Na bandeja, acabar com 1 tick de `gather` (compressão).

### C7 — A corrigir — Desarme demasiado longo e parado no ar; lay-up desarmado sem pose de lançamento
- **Cena e frames:** `anim-desarme-bloqueio`, frames 25–48 (`strips/anim-desarme-bloqueio-22-51.png`).
- **Sintoma:**
  - O defensor fica 16 ticks (800 ms) no ar, em `block` (4 ticks) e depois `swat` (12 ticks), com os pés fixos a 6 e 9 px, sem subir nem descer.
  - Quem lança (Couto, num lay-up) fica em `run1`/`run2` todo o voo (frames 25–38), porque a linha 962 exige `!flight.blockedBy` e a linha 458 salta o `override` nos lay-ups.
- **Regra:** bloqueio de 450 ms (100 / 50 / **150** / 150) (`animacao.md` §10); antecipação, ação e recuperação.
- **Medida:** `swat` com 18 frames e 12 ticks, e altura constante de 9 px; o atirador sem nenhuma pose de lançamento em 14 frames.
- **Proposta:**
  - `swat` com `until: s.tick + 4` (linha 507) e queda com `leap` e um arco.
  - Na linha 962, aceitar também o lay-up desarmado até ao tick do `block`.

### C8 — A corrigir — O passe a correr não tem pose de passe
- **Cena e frames:** `anim-passe`, frames 14–20.
- **Sintoma:** quem passa (Pacheco) vai de `dribRun2` diretamente para `run1` no frame 16, e a bola sai da cintura sem gesto. A linha 974 só mostra `pass` com `!moving`.
- **Regra:** passe direto em 3 poses (preparar, soltar, continuação: 50 / 50 / 150 ms) (`animacao.md` §10).
- **Medida:** 0 frames de `pass`, `bouncePass` ou `lob` para o ator em 60 frames. O recetor também não tem pose de receção: `drib0` no frame 33.
- **Proposta:** a correr, desenhar 2 ticks da pose `pass` (braços) com as pernas da corrida, ou aceitar `pass` também em movimento durante 2 ticks. Isto é coerente com o comentário da linha 55.

### C9 — A corrigir — Tremor do afundanço contado em ticks, em píxeis CSS e a 40 Hz a 4×
- **Cenas e frames:**
  - `anim-afundanco`, frames 45–56;
  - `anim-afundanco-x4`, frames 12–14;
  - `anim-passe-balao`, frames 40–51;
  - `anim-afundanco-reduzido`: nenhum frame (certo).
- **Sintoma:**
  - `shakeUntil = s.tick + 8` (linha 756) e `translate(±2px, ±1px)` em CSS (linhas 1363–1365), a trocar a cada tick.
  - A 1×, dura 400 ms e troca a 20 Hz.
  - A 4×, dura 100 ms e troca 80 vezes por segundo, o que a 60 fps vira um zumbido a 30 Hz.
  - O valor está em píxeis CSS, não de arte: a 3× são 0,67 px de arte, o que parte a grelha.
- **Regra:**
  - tremor de 150–250 ms reais, no máximo 15–20 Hz;
  - 1–2 px **de arte**;
  - a 4× desce um nível (`animacao.md` §5.6 e §10; `SKILL.md`, «Efeitos de ecrã contam em tempo real»).
- **Medida (sonda, `style.transform` por frame):**
  - 1×: 12 frames, 8 ticks, 400 ms;
  - 4×: 3 frames, 100 ms, valores −2/+2/+2 com troca por tick;
  - movimento reduzido: 0 frames.
- **Nota:** confirma o problema conhecido. Nota também que o `review` grava com `toDataURL`, que ignora o `transform` CSS, por isso o tremor não aparece nos PNG (ver S5).
- **Proposta:**
  - `shakeUntil` em tempo real (`animTime + 0.2`), com a fase em `floor(animTime * 15)`.
  - Deslocação de `±1 × escala` em píxeis CSS inteiros de arte.
  - Desligar acima de 2×.

### S1 — Sugestão — Os festejos são uma só pose fixa e ficam a flutuar
- **Cenas e frames:** `anim-dois` 31–51, `anim-triplo` 46–66, `anim-crossover` 63–83.
- **Sintoma:** `cheer1` dura 14 ticks (700 ms) parado, com os pés 4 px acima do chão o tempo todo.
- **Regra:** festejo de 2 a 4 poses em ciclo, de 150–250 ms (`animacao.md` §10).
- **Medida:** 21 frames iguais de pose, com a altura constante de 4 px.
- **Proposta:** na linha 474, alternar `cheer0` e `cheer1` com `(animTick >> 2) % 2` e pôr o salto num arco de 1–2 px.

### S2 — Sugestão — No alley-oop, a bola mergulha e espera por quem afunda
- **Cena e frames:** `anim-passe-balao`, frames 24–38.
- **Sintoma:** o recetor está em `reach` com `lift` 0 quando a bola chega (z = 3,26 m). A bola desce até 2,48 m (frame 31) e volta a subir até 3,13 m enquanto ele sobe do chão.
- **Regra:** arco limpo; o alley-oop é apanhado no ar.
- **Medida:** z 3,26 → 2,48 → 3,13; segunda diferença no ecrã de −9,0 px (frame 32).
- **Proposta:** começar o `dunkJump` do recetor quando `flight.ticks / total > 0.5` (onde já se põe `reach`, linha 980), para chegar ao aro com a bola.

### S3 — Sugestão — A seta do portador tapa a bola nas poses de braços no ar
- **Cena e frames:** `anim-ressalto`, frames 46–57 (`strips/anim-ressalto-38-63.png`).
- **Sintoma:** em `grab`, a bola está na mão, acima da cabeça, e a seta (linha 1635, `y - spriteHeight - 3`) fica em cima dela, porque ignora o `lift` e a mão levantada.
- **Medida:** só visual. A seta e a bola estão no mesmo sítio (±2 px) em 12 frames.
- **Proposta:** subtrair o `lift` e, nas poses com `ball` acima da cabeça, mais 6 px.

### S4 — Sugestão — Efeitos e rótulos contam em ticks e saem do ecrã com o zoom
- **Rótulos `+N`:** 30 ticks dão 1,5 s a 1×, mas 400 ms a 4× (`anim-afundanco-x4`, frames 12–23). Não há esbatimento: desaparecem de um frame para o outro (linha 1609).
- **Pó:** `PUFF_TICKS = 14` (700 ms), contra 150–300 ms na tabela. Usa `globalAlpha`, que dá cores fora da paleta.
- **Rasto:** `rgba(242,194,48,…)` com alfa, em **todos** os lançamentos (linha 1343). A regra é ter rasto só em bolas rápidas, com cores da rampa (`animacao.md` §6.4 e §7).
- **Balões da bancada:** no desconto, o zoom de 2× (linha 1175) corta o balão contra a margem esquerda. Por exemplo, «…NINGUÉM NOS PARA!?» lê-se «S PARA!» em `anim-desconto`, frames 44–100, e «COM ALMA!» corta-se em `anim-fim-periodo`, frames 51–55. Medida: píxeis claros do balão na coluna x 0 (frames 60 e 80). `speech()` limita a posição à largura sem zoom.
- **Proposta:**
  - idade dos rótulos em tempo real e esbatimento nos últimos 4 ticks;
  - pó com 4 poses de 50–70 ms;
  - rasto só no passe forte e no afundanço;
  - `speech()` limitado à área visível depois do zoom.

### S5 — Sugestão (ferramenta `review`) — Lacunas que esconderam problemas
- `{"type":"made","dunk":true}` e `{"type":"made","layup":true}` não encontram nada: as marcas `dunk` e `layup` estão no evento `shot`. Usei `{"type":"shot",…}`. Convém corrigir a documentação no `SKILL.md` e no pedido, ou copiar as marcas para o `made`.
- O recorte segue `camera.project(actor.x, actor.y)` sem `alpha` (`review.ts`, perto da linha 270), enquanto o boneco é desenhado com `alpha`. Nos recortes, o ator treme até 2–3 px a correr, por causa da ferramenta e não do jogo.
- O tremor CSS não fica nos PNG (C9).
- O aviso «menos de um tick» nunca dispara com `speed` ≥ 2, porque `run*20*speed < fps` é sempre falso.
- O pó e o rasto de jogadores escondidos continuam a desenhar-se (até 36 nuvens em `anim-pickpocket`).
- O `medidas.json` só traz a pose do ator: faltam o recetor, a posição, o `lift` e a bola. A minha sonda faz isso e pode passar para o `review.ts`.

## Visto e sem problemas
- Determinismo das 20 cenas.
- Movimento reduzido: sem tremor (0 frames), com a informação toda presente (`+2`, bola e poses iguais às de 1×).
- Queda (`anim-queda`): `stumble`, `fallA`, `fallB`, `fallen` e `getup1/2` com 2/2/2/20/5/5 ticks, dentro de uma leitura clara. O deslize em `fallA` e `fallB` (1,6 px/frame) lê-se como inércia.
- Arco do salto do lançamento (`shotLift`): parábola simétrica de −6 a 7,9 px e de volta, sem pop ao aterrar, porque a pose compensa os 6 px.
- Arco do salto ao ressalto (`reboundLift`) e da bola no balão (fora da partida e da chegada).
- A bola no ar tem sombra.
- A parábola do triplo, a meio do voo, tem segundas diferenças pequenas (≤ 3 px).
- Não há clarões de ecrã inteiro.

## Não verificado
- Passe picado (nenhuma das cenas o escolheu) e bola ao alto (`tipLift`).
- A 2×; o afundanço e a corrida só a 4×.
- Pavilhões de rua e de outras divisões além de 1 a 3; letra grande.
- Folhas de sprites das poses (forma e contorno). Esta revisão é só de movimento.
- Sons alinhados com as imagens.
- Oclusão do ator pelo defensor no crossover (`anim-crossover`, frames 21–24: o ator fica todo atrás do defensor). Pode ser só a ordem por `y`; está visto, mas não medido.
