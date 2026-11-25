# Acústica e física dos sons do basquetebol — receitas para síntese por código

Pesquisa para o Pocket Basketball: todos os sons são gerados no browser com `Float32Array` (síntese modal, ruído filtrado, vozes por formantes), sem amostras gravadas.

## Como ler este documento

- Cada secção tem: **física** (porque soa assim), **receita** (números), **variação**, **força/velocidade**, **erros que soam a falso**.
- Grau de confiança de cada número:
  - **[M]** medido e publicado (artigo ou norma);
  - **[C]** calculado por mim a partir de física clássica com dimensões reais (o script está descrito no anexo A);
  - **[E]** estimativa de design sonoro ou valor de fonte fraca (vendedor, blogue, patente). É um ponto de partida para afinar de ouvido.
- **Limitação desta pesquisa:** o `WebFetch` falhou em todos os anfitriões (arxiv.org, ar5iv, psu.edu, phys.org, windytan.com, wikipedia.org, etc.) por restrições de rede da sessão. Todos os factos de fontes vêm de excertos de pesquisa, não do texto completo. Os números de Katz e Russell foram confirmados por vários excertos independentes e pelo meu próprio cálculo. Os outros estão marcados.
- Convenções: `T60` é o tempo para a amplitude cair 60 dB. Para um modo com decaimento exponencial `exp(-t/τ)` vale `T60 ≈ 6.91·τ`. Com fator de perda `η`: `T60 ≈ 2.2 / (f·η)`. Com fator de qualidade `Q`: `T60 ≈ 2.2·Q / (π·f)`.

---

## 0. Princípios gerais (valem para todos os sons)

1. **A duração do contacto define o brilho.** Um impacto com tempo de contacto `T` comporta-se como um meio-seno de força. O espectro é quase plano até `≈ 1/T` e cai depois (primeiro nulo em `≈ 1.5/T`). Bola de basquetebol: `T ≈ 10–14 ms`, logo excita quase só abaixo de ~100–150 Hz **por contacto direto**. O brilho de uma bola vem da cavidade de ar, não do choque. [C]
2. **Modos inarmónicos + decaimento dependente da frequência = "material".** Modos altos têm de decair mais depressa do que os baixos. Na prática: `T60(f) = T60_base · (f_base / f)^k`, com `k ≈ 0.5–1`. Como `Math.pow` é proibido em `src/sim/` (no áudio da UI não é, mas convém tabelar), pré-calcula a tabela por modo. [E, prática corrente da síntese modal: van den Doel & Pai]
3. **Nada de dois disparos iguais.** Cada instância muda frequências ±1–3 %, amplitudes ±2–4 dB e decaimentos ±10–20 %. A repetição exata é o defeito nº 1 do som sintetizado ("efeito metralhadora").
4. **Ataque.** Impactos: 0–2 ms (um ataque de 5 ms já soa a "almofada"). Vozes e sopros: 20–80 ms.
5. **Sala.** Num pavilhão, a cauda de reverberação é metade do realismo. Um som seco num ginásio soa a "som de menu". Ver secção 12.
6. **Nível relativo** (para a mistura, [E]): apito > buzina > multidão em festa > aro > tabela > drible > ténis > rede.

---

## 1. Bola a bater no chão (madeira e asfalto)

### 1.1 Física

**Katz, "Thump, ring: the sound of a bouncing ball" (arXiv:0808.3278; Eur. J. Phys. 2010)** separa dois componentes [M]:

- **"Thump" (baque):** emissão **monopolar**. Durante o contacto, a bola achata e o volume exterior muda. A variação de volume radia como um monopolo. Acaba quando acaba o contacto, porque depois o volume fica constante.
- **"Ring" (zumbido):** emissão **dipolar** do modo de cavidade de ar mais baixo (ℓ = 1, todo o ar a oscilar na mesma direção). Ouve-se depois do baque como um toque agudo.
- Katz modela o contacto como um oscilador harmónico: **a bola fica em contacto meio ciclo, independentemente da velocidade** [M]. Um resumo indica um baque com ~**82 Hz** numa bola de tamanho oficial [M, excerto secundário].

**Russell, "Basketballs as spherical acoustic cavities" (Am. J. Phys. 78, 549, 2010)** [M]:

- Num espectro de bola percutida, picos **altos e estreitos acima de 900 Hz** vêm das ondas estacionárias na cavidade: **970 Hz e 1580 Hz** medidos, contra 979 e 1572 Hz calculados por elementos finitos.
- O primeiro modo estrutural da casca de borracha está em **≈ 410 Hz** e é **fortemente amortecido** pela borracha.
- Há **mais de 50 parciais entre 0 e 12 kHz**.

**Frequências da cavidade.** Os modos de uma esfera rígida de raio interior `a` são `f = x·c/(2πa)`, onde `x` são os zeros de `j_ℓ'(x)`. Katz: `ω1 = 2.082·c/a` → 997 Hz a 20 °C [M]. O meu cálculo, com `a = 0.115 m` (raio exterior de 0.119 m menos ~4 mm de casca) e `c = 343 m/s` [C]:

| Modo | x | f (Hz) | razão a f1 |
|---|---|---|---|
| ℓ=1 (dipolo, o "ring") | 2.0816 | **985** | 1.000 |
| ℓ=2 | 3.3421 | **1581** | 1.606 |
| ℓ=0 radial | 4.4934 | 2126 | 2.159 |
| ℓ=3 | 4.5141 | 2135 | 2.169 |
| ℓ=4 | 5.6467 | 2671 | 2.713 |
| ℓ=1 (2ª ordem) | 5.9404 | 2810 | 2.854 |
| ℓ=5 | 6.7565 | 3196 | 3.246 |
| ℓ=2 (2ª ordem) | 7.2899 | 3448 | 3.502 |

Os dois primeiros coincidem com os 970/1580 Hz medidos por Russell. **Consequência importante:** a frequência da cavidade depende da **velocidade do som (temperatura)** e do raio, **não da pressão de enchimento**. Uma bola vazia ou cheia "toca" na mesma nota. A pressão muda o baque (contacto) e o ressalto. [C, coerente com a fórmula de Katz]

**Tempo de contacto** [C]. A força de contacto de uma bola pressurizada é `F ≈ p·(área de contacto) ≈ 2πR·p·δ`, ou seja, uma mola com `k = 2πRp`. Massa 0.62 kg, R = 0.119 m:

| Pressão (manométrica) | k (N/m) | T contacto |
|---|---|---|
| 41 kPa (bola meio vazia) | 30 700 | 14 ms |
| 55 kPa (NBA: 51.7–58.6 kPa [M]) | 41 100 | 12 ms |
| 62 kPa (muito cheia) | 46 400 | 11.5 ms |

A rigidez da casca reduz isto um pouco: conta com **T ≈ 8–13 ms**. Um meio-seno de 10–12 ms tem a energia centrada em ~40–120 Hz, o que bate certo com o "82 Hz" do baque. [C]

**Chão de madeira vs asfalto** [E, sem medições publicadas encontradas]:

- **Madeira (soalho flutuante, "sprung floor"):** o soalho é uma placa grande sobre ripas e borrachas. Radia ele próprio um "bum" grave, ressoa 60–250 Hz e propaga-se como vibração estrutural. As frequências naturais da estrutura do soalho estão acima de ~8–9 Hz [M, Aalto/BioResources], mas o que se ouve são os painéis entre apoios. Num pavilhão, o drible ouve-se como um **"bóm" cheio + "ping" curto + cauda de sala longa**.
- **Asfalto/betão:** chão rígido e maciço, que praticamente não radia. Resultado: baque **mais seco e curto**, com menos grave próprio do chão. A **textura áspera** acrescenta um "chhk" granulado de alta frequência (grão a raspar a borracha) e a bola de exterior (borracha mais dura, gomos mais fundos) dá um ataque mais "estalado". Sem sala, o "ring" da cavidade fica relativamente **mais audível** (não é tapado pela reverberação) e há eco de paredes/prédios próximos.

### 1.2 Receita: ressalto no pavilhão (madeira)

| Camada | Síntese | Números |
|---|---|---|
| Baque da bola (monopolo) | meio-seno de pressão ou derivada de um meio-seno gaussiano; ou ruído passa-baixo muito curto | duração = T contacto **8–13 ms**; espectro com pico em **60–120 Hz**; passa-baixo de 2ª ordem em ~250 Hz |
| "Bum" do soalho | 3–5 modos amortecidos | **70, 110, 160, 230 Hz** (±15 %), T60 **60–150 ms**, amplitude −6 a −12 dB face ao baque |
| "Ring" da cavidade | 2–4 ressonadores (biquad de 2 polos ou seno amortecido) | **985 Hz** (0 dB), **1581 Hz** (−6 dB), **2130 Hz** (−12 dB), **2670 Hz** (−15 dB); T60 **40–120 ms** no 1º modo [E], mais curto nos de cima (×0.6, ×0.4…) |
| Estalo da superfície | ruído branco, passa-alto 2 kHz | **2–5 ms**, −18 dB; dá a "definição" do contacto pele/verniz |
| Casca (opcional) | 1 modo muito amortecido | **≈ 410 Hz** [M], T60 ≤ 20 ms, −12 dB |

- **Ataque:** 0–1 ms no estalo; o baque sobe em meio período (~5 ms).
- **Ordem temporal:** o ring começa a meio do contacto e ganha força no fim (quando a bola descola, o monopolo desaparece e fica o dipolo). Atrasa o pico do ring **4–8 ms** em relação ao início do baque.
- **Duração total do evento seco:** ~120–200 ms; depois entra a sala.

### 1.3 Receita: ressalto no asfalto

Igual, com as seguintes mudanças:

- sem "bum" do soalho (ou um só modo a 120 Hz, −18 dB, T60 30 ms);
- baque 20 % mais curto (bola de exterior mais dura e chão rígido): **7–10 ms**;
- estalo de superfície mais forte e mais longo: ruído passa-banda **3–9 kHz**, **6–15 ms**, −10 dB, com granulação (multiplica por um trem aleatório de impulsos, 2–4 kHz de densidade);
- ring da cavidade igual em frequência, nível +3 dB relativo;
- sala: eco discreto em vez de reverberação (secção 12.3).

### 1.4 Variação entre instâncias

- Frequências da cavidade: **±1 %** (são estáveis, é a mesma bola!). Muda só se a bola mudar. Uma bola "nova" de outra equipa pode ir ±3 %.
- Amplitude do ring relativa ao baque: **±4 dB**. Depende de onde a bola bate (gomos/ranhuras) e da rotação.
- Duração do contacto: **±10 %**.
- Ponto no campo: perto da tabela/bancada, mais grave; no meio do soalho, menos ("pontos mortos").

### 1.5 Força e velocidade

- **Amplitude ∝ velocidade de impacto** (o volume deformado ∝ v). Em dB: **+6 dB por cada duplicação de v**.
- **Tempo de contacto independente de v** (Katz) → **o timbre do baque quase não muda com a força**. Isto é contraintuitivo e é a chave para não soar a falso: **não abras o filtro do baque com a força**. Abre só um pouco o estalo de superfície (+2–4 dB acima de 2 kHz num drible forte).
- O ring cresce com v um pouco mais depressa do que o baque (as deformações maiores excitam mais a cavidade): ring **+1–2 dB extra** em batidas fortes [E].
- Velocidades típicas [C]: drible normal ~4–5 m/s; drible baixo rápido ~4–5 m/s (mais empurrado); bola caída de 1 m ~4.4 m/s; ressalto de lançamento falhado a cair da altura do aro ~6–7 m/s.

### 1.6 Erros que soam a falso

- **Ring tonal demasiado longo (>250 ms):** soa a sino ou a "boing" de desenho animado.
- **Ring harmónico** (985, 1970, 2955…): soa a apito/beep. As razões são **1 : 1.606 : 2.16 : 2.71**.
- **Baque com ataque lento ou demasiado grave (<40 Hz):** soa a bombo/kick de música eletrónica.
- **Mudar o pitch com a força:** errado; a cavidade não muda.
- **Baque igual em madeira e asfalto:** o que distingue os chãos é o "bum" do soalho + a sala vs o grão + o eco.

---

## 2. Ritmo do drible

### 2.1 Física [C]

Com a mão a empurrar a bola para baixo à velocidade `v0` a partir da altura `h`, o tempo de descida é `t = (√(v0²+2gh) − v0)/g`. Com um ressalto quase simétrico, o período é ≈ 2t:

| Tipo de drible | h | v0 empurrão | período | cadência |
|---|---|---|---|---|
| Bola largada (sem empurrar) | 1.0 m | 0 | 0.90 s | 1.1 Hz |
| Drible de proteção/andar | 1.0 m | 3 m/s | 0.48 s | **2.1 Hz** |
| Drible em corrida | 0.8–1.0 m | 3–4 m/s | 0.40–0.48 s | 2–2.5 Hz |
| Drible baixo rápido | 0.5 m | 3 m/s | 0.27 s | **3.7 Hz** |
| "Crossover"/bola muito baixa | 0.3 m | 4 m/s | 0.14 s | ~6–7 Hz (rajadas curtas) |

Um estudo de pose 3D (arXiv:2506.22503) mede o drible em toques por segundo e impõe ≥ 0.25 s entre contactos, ou seja, um teto de ~4/s nesse método [M]. Nos exemplos acima, os ~6–7 Hz são só rajadas de 2–4 toques.

### 2.2 Receita

- **Cadência base:** 1.8–2.6 Hz (jogador a avançar); 3–4.5 Hz (pressionado, a driblar baixo).
- **Jitter de tempo:** ±3–6 % por batida (um humano não é metrónomo); mais ±10 % ao mudar de direção.
- **Acentuação:** a batida de mudança de mão (crossover) vem 2–4 dB mais forte e 15–25 % mais cedo.
- **Drible mais baixo → batida mais fraca**, porque a velocidade de impacto quase não muda mas a mão "abafa" a subida. Na prática: −2 dB e ring −3 dB em dribles baixos.
- **Som da mão a receber a bola no topo:** um toque fraco de pele (secção 8, −20 dB face à batida no chão). Quase inaudível no pavilhão, mas ajuda no ritmo.
- **Paragem:** o último ressalto é seguido de um "catch" (secção 8). Nunca cortes o som a meio.

### 2.3 Erros

- Ritmo perfeitamente periódico = máquina.
- Todas as batidas com o mesmo nível = loop.
- Drible demasiado rápido para a animação (respeita a física: se a bola sobe 1 m, não pode bater 4 vezes por segundo).

---

## 3. Bola no aro (tubo/varão de aço, modos inarmónicos)

### 3.1 Física

- Aro oficial: **diâmetro interior 457 mm (18")**, varão de aço maciço de **~16 mm (5/8")**, soldado a uma placa e a um suporte (fixo ou "breakaway" com molas). [especificação geral; diâmetro do varão E]
- Estrutura: as medições de West Point (Winarski et al.) dão modos do conjunto aro+tabela a **~24 Hz**, torção do aro a **~94 Hz** e flexão elástica do aro a **78.7 Hz** (ANSYS) [M]. São modos estruturais de muito baixa frequência: dão o "tremer" grave/abanão da estrutura, não o "clang".
- **Modos de anel** (flexão no plano de um anel fino, livre-livre), `f_n ∝ n(n²−1)/√(n²+1)`, com E = 200 GPa, ρ = 7850 kg/m³, d = 16 mm, R = 0.237 m [C]:

| n | f no plano (Hz) | f fora do plano (Hz) | razão a n=2 |
|---|---|---|---|
| 2 | **154** | 150 | 1.00 |
| 3 | **436** | 429 | 2.83 |
| 4 | **835** | 828 | 5.42 |
| 5 | **1351** | 1343 | 8.77 |
| 6 | **1982** | 1974 | 12.87 |
| 7 | **2728** | 2719 | 17.71 |
| 8 | 3588 | 3580 | 23.3 |
| 9 | 4564 | 4556 | 29.6 |

- Os pares no plano/fora do plano estão separados ~1–3 % → **batimentos** lentos (2–15 Hz) que dão o "vibrato" metálico. Com o suporte, as orelhas da rede e a solda, os modos degenerados também se separam (mais 1–5 %). [C/E]
- **O aro não toca como um sino:** está aparafusado a uma placa com amortecedores, tem 12 ganchos com a rede de nylon a roçar e a bola (borracha, ~0.6 kg) fica em contacto **vários ms**. O contacto longo funciona como passa-baixo, por isso os modos n=2–5 dominam. O amortecimento efetivo é muito maior do que o do aço puro (η_aço ≈ 10⁻⁴; montado, η efetivo estimado em **0.003–0.02**) [E].
- Por isso o "clang" real é: **um baque grave da estrutura + um conjunto de 3–6 parciais metálicos inarmónicos com T60 de 0.2–1 s + chocalhar da rede e do suporte**.

### 3.2 Receita: "clang" (bola bate no aro e sai)

| Camada | Síntese | Números |
|---|---|---|
| Baque da bola | como 1.2 mas mais curto (contacto parcial) | 6–9 ms, −3 dB face a um drible forte |
| Modos do aro | 6–8 ressonadores, pares desafinados | **154/150, 436/429, 835/828, 1351, 1982, 2728 Hz** ±3 %; ganhos 0, −2, −4, −8, −12, −16 dB; **T60: 0.9 s (154 Hz), 0.7 s, 0.5 s, 0.35 s, 0.25 s, 0.15 s** |
| Estrutura | 2 modos graves | **24 e 94 Hz**, T60 0.3–0.6 s, −10 dB (sente-se mais do que se ouve; útil em afundanços) |
| Chocalhar | ruído com impulsos, passa-banda 1.5–6 kHz | 80–200 ms, densidade 40–150 impulsos/s, −18 dB (ganchos/rede/molas) |
| Ring da bola | como 1.2 | −6 dB |

- **Ataque:** 0–1 ms.
- **Excitação:** um impulso de força de **3–8 ms** (meio-seno) passa pelos modos. Isto atenua naturalmente os modos altos. Se usares um impulso de 1 amostra, multiplica os ganhos dos modos acima de 1 kHz por 0.3.
- **Variação:** ganho relativo de cada modo **±6 dB** (depende de onde no aro bate: perto do suporte excita pouco os modos e soa a "toc" morto; na frente do aro dá o clang mais cheio); frequências ±1 %; T60 ±20 %.
- **Sequências:** "rim-out" com 2–3 toques (bola a dançar no aro): toques espaçados de **60–250 ms**, cada um −4 a −8 dB do anterior, com ritmo a acelerar (como uma bola a parar). Cada toque **reexcita** os modos que ainda soam; soma, não reinicies.
- **Variantes:**
  - **toque leve ("lip")**: só baque + modos 1–3, −12 dB, T60 ×0.5;
  - **afundanço**: estrutura (24/94 Hz) +10 dB, chocalhar do suporte breakaway (molas: 2–3 parciais 600–1500 Hz com T60 0.1 s, a ressaltar 2–4 vezes em 150 ms) e uma pancada metálica forte;
  - **aro de exterior**: aro duplo ou de varão mais grosso, sem amortecedores, rede de corrente. T60 ×2 e chocalho de corrente (secção 6.3).

### 3.3 Força

- Amplitude ∝ v (dB +6 por duplicação).
- Força maior → contacto um pouco mais curto e excitação de modos mais altos: modos >800 Hz **+3 dB por duplicação de v**.

### 3.4 Erros

- **Aro que soa a sino:** parciais harmónicos ou T60 > 1.5 s. Mantém **T60 ≤ 1 s** no modo mais grave e decaimento rápido nos altos.
- **"Ping" agudo puro** (só 2–4 kHz): soa a talher. O peso está em **150–850 Hz**.
- **Sem baque de borracha por baixo:** soa a metal a bater em metal.
- **Mesma nota em todos os toques:** troca os ganhos dos modos em cada impacto.

---

## 4. Tabela (vidro, acrílico, metal/contraplacado de exterior)

### 4.1 Física

Tabela oficial: **1.83 × 1.07 m**, vidro temperado de **12.7 mm**, moldura de alumínio e acolchoado. Modos de placa simplesmente apoiada, `f_mn = (π/2)·√(D/ρh)·((m/a)² + (n/b)²)` [C]:

| Material | espessura | primeiros modos (Hz) | razões | frequência de coincidência |
|---|---|---|---|---|
| Vidro temperado | 12.7 mm | **37, 65, 111, 118, 146, 177, 193, 255** | 1, 1.76, 3.04, 3.24, 4.0, 4.82, 5.27, 6.96 | **≈ 940 Hz** |
| Acrílico (PMMA) | 12.7 mm | 12, 21, 36, 39, 48, 57, 63, 83 | as mesmas | ≈ 2.9 kHz |
| Policarbonato (doméstica 54") | 6 mm | 9, 16, 27, 27, 34, 44, 46, 59 | 1, 1.82, 3.18… | ≈ 6.7 kHz |
| Aço prensado (parque) | 1.5 mm | 7, 13, 22, 22, 28, … (+ nervuras) | — | ≈ 8 kHz |
| Contraplacado | 19 mm, 1.83 × 1.22 m | 39, 75, 121, 136, 157, … | 1, 1.92, 3.08… | ≈ 730 Hz |

- **Fatores de perda típicos (valores de manual: Cremer/Heckl, de memória, não confirmados nesta sessão)** [E]: vidro η ≈ 0.001–0.005; acrílico 0.02–0.05; policarbonato 0.01–0.03; aço 10⁻⁴ (mas a chapa fina com rebites e parafusos chocalha); contraplacado 0.01–0.04. Montada em moldura com acolchoado, a placa de vidro tem η efetivo maior (~0.01–0.03).
- A bola fica em contacto ~8–12 ms, por isso só excita modos **< ~150 Hz** com força. O som da tabela é um **"tum/bonk" grave e cheio**, com o "ring" da bola por cima.
- **Vidro vs acrílico:** o acrílico flete ("resposta morta"; um vendedor diz ~85 % do ressalto do vidro, sem método citado [E]). Soa mais grave, mais abafado e mais curto. O vidro é mais rígido e denso: o tom é mais alto, há mais energia e um "estalo" claro. Acima da coincidência (~940 Hz no vidro), a placa radia eficientemente, o que dá um brilho "vítreo" ligeiro que o acrílico (coincidência a 2.9 kHz) quase não tem.
- **Metal de exterior** (chapa perfurada ou em leque, de parque): "BLANG" de lata. Chapa fina, muitos modos densos, parafusos e rebites a chocalhar, decaimento longo e irregular.
- **Contraplacado/fibra:** "tók" seco de madeira, curto.

### 4.2 Receitas

| Tipo | Componentes | Números |
|---|---|---|
| **Vidro (pavilhão)** | baque da bola (1.2) + 6 modos de placa + "clique" vítreo + ring da bola + chocalho leve da moldura | modos **37, 65, 111, 118, 146, 193 Hz** (±5 %), ganhos 0/−3/−4/−6/−8/−10 dB, **T60 120–300 ms**; clique: ruído passa-banda 1–4 kHz, 3–6 ms, −15 dB; um modo de moldura de alumínio ~700–1200 Hz com T60 60 ms a −20 dB; plus suporte/aro 24 e 94 Hz −12 dB |
| **Acrílico** | igual, sem clique | modos ÷3 em frequência mas a radiar mal; na prática usa um "bonk" de **60–180 Hz**, **T60 60–120 ms**, nível −4 dB face ao vidro; passa-baixo a 1.5 kHz no baque |
| **Metal de exterior** | baque + 10–20 modos densos + chocalho | modos distribuídos ao acaso entre **180 e 3500 Hz** (densidade crescente com f), T60 **0.3–0.8 s** nos graves e 0.1 s nos agudos; chocalho: 3–8 impulsos de 1 kHz–5 kHz espalhados por 50–200 ms; ganho total +3 dB face ao vidro |
| **Contraplacado** | baque + 3–4 modos | **120, 230, 410, 700 Hz**, T60 40–90 ms; um "knock" passa-banda 500–1500 Hz, 10 ms |

- **Ataque:** 0–1 ms.
- **Variação:** ±5 % nas frequências da placa por ponto de impacto (no centro só sobem os modos ímpares; perto da borda, todos fracos e com mais chocalho); ±3 dB no nível.
- **Força:** amplitude ∝ v; o vidro ganha o clique (+3 dB por duplicação de v acima de 1 kHz).
- **Tabela e aro juntos** (bola na tabela e depois no aro): a placa excita o aro por simpatia (+ modos do aro a −15 dB).

### 4.3 Erros

- **Tabela com ressonância aguda e longa** (soa a vidro de janela partido ou copo): o vidro grosso numa moldura dá um "tum" grave, não um "tlim".
- **Tabela a soar a bombo:** falta-lhe o ring da bola e o clique.
- **Usar o mesmo som para a tabela e para o chão:** a tabela tem modos de placa 37–250 Hz com cauda de 0.1–0.3 s; o chão não.

---

## 5. Ténis a chiar (atrito, "stick-slip" e pulsos de descolamento)

### 5.1 Física

- **Djellouli et al., "Squeaking at soft–rigid frictional interfaces", Nature 650, 891–897 (2026)** [M]: o chiar **não é stick-slip aleatório**. São **pulsos de descolamento** que atravessam a interface sola-chão à velocidade das ondas de corte da borracha (descritos como "intersónicos" ou "supersónicos" consoante a fonte; ~80 m/s numa experiência, "quase 300 km/h" noutro resumo). Só uma pequena zona de cada nervura descola de cada vez e desliza até ao fim da sola, onde empurra o ar.
- **A nota é a cadência de repetição dos pulsos** [M]. Numa experiência, os pulsos saíam a intervalos constantes de **0.2 ms → ~5 kHz** (Physics Today), com ténis comerciais a deslizar em vidro a ~1 m/s.
- **As nervuras são essenciais:** com nervuras, os pulsos prendem-se ao **primeiro modo de corte do bloco** e o chiar fica tonal. Uma sola lisa dá pulsos caóticos e um ruído "embrulhado", sem nota [M].
- **A altura/espessura e a rigidez do bloco definem a nota**; a geometria das nervuras quase não a muda [M]. A equipa chegou a tocar o tema de Star Wars com blocos de alturas diferentes.
- Por vezes, os pulsos são disparados por **descargas triboelétricas** [M].
- Na prática: o chão de verniz limpo e o pó da quadra mudam tudo. O pó mata o chiar (por isso os jogadores limpam as solas). [E]

### 5.2 Receita

| Parâmetro | Valor |
|---|---|
| Fonte | trem de impulsos (cada um um pulso de descolamento) a `f0`, filtrado por 1 ressonador de corte em `f0` (Q 8–20) + 2º e 3º harmónicos a −8 e −14 dB |
| `f0` | **2.5–5.5 kHz** (centro ~4 kHz) [M para 5 kHz; o intervalo é E]; há chiares mais graves de 1.2–2.5 kHz com solas grossas ou travagens com o calcanhar [E] |
| Glissando | **±5–20 %** ao longo do chiar (a carga e a velocidade variam no gesto): sobe ao travar, desce ao arrancar. Curva em arco: sobe nos primeiros 30–50 % e desce no fim |
| Jitter de período | 0.5–3 % ao acaso por pulso (dá aspereza); a sola lisa sobe para 20–40 %, o que vira ruído |
| Subharmónicas | em 20–30 % das instâncias, alterna pulsos fortes/fracos (período duplo) durante 20–60 ms → o "guincho rachado" |
| Duração | **60–300 ms** (pivô curto 60–120 ms; travagem/mudança de direção 150–300 ms) |
| Ataque | **2–8 ms** (o chiar arranca quase de repente, já com a nota) |
| Release | 10–40 ms, com a nota a cair 5–10 % |
| Ruído de fundo | ruído passa-banda 2–8 kHz a −18 dB (borracha a roçar) |
| Envolvente | flutuação AM de 10–25 % a 15–40 Hz (o pé a "agarrar e soltar") |

- **Variação entre instâncias:** f0 por jogador (cada ténis tem a sua nota: ±15 % fixo por jogador) e ±5 % por chiar; duração ±40 %; 30–50 % dos movimentos não chiam (quadra com pó, pé a levantar).
- **Força/velocidade:** a velocidade de deslize abaixo de ~0.2 m/s não chia (só roça); 0.5–2 m/s dá o chiar mais limpo. Mais carga (paragem brusca) → mais forte (+6 dB) e um pouco mais grave. [E]
- **Num jogo:** 5–20 chiares por posse, sobrepostos, com níveis −6 a −20 dB (jogadores longe). A densidade de chiares é o que faz um "pavilhão de basquetebol". Às vezes vem em grupos de 2–3 em 0.3 s (passos de defesa).

### 5.3 Erros

- **Seno puro com envolvente:** soa a pássaro ou a alarme. Precisa de trem de pulsos (harmónicos), jitter e glissando.
- **Nota grave (<1 kHz):** soa a porta a ranger.
- **Ruído sem nota:** soa a escorregar em areia. Isso é a sola lisa ou suja; serve só para o jogador escorregar.
- **Ataque lento (>20 ms):** soa a violino.

---

## 6. Rede (nylon vs corrente)

### 6.1 Física [E — não encontrei medições acústicas publicadas]

- **Nylon:** 12 laços entrançados, ~40–45 cm. Quando a bola passa (bola de 0.24 m a ~4–7 m/s → **atravessa em 60–120 ms**), os fios roçam a borracha e entre si (fricção de fibras), a rede estica, e depois **estala de volta** (o "chicote" do fim do swish). Pela física da fricção de fibras, o espectro é **ruído de banda larga** com o peso nos **agudos (1.5–8 kHz)** e pouco grave. Uma rede nova e esticada dá um swish nítido e "fresco"; uma velha e lassa, abafado. (Fontes fracas confirmam a ideia.)
- O swish puro não tem quase nenhum componente tonal. **A bola não bate em nada**, por isso não há baque. É isto que o distingue de um "punch".
- **Corrente (exterior):** 12 tranças de corrente de aço galvanizado. Ouve-se como **centenas de micro-impactos metálicos** (elos uns contra os outros, contra a bola e contra o aro): um chocalhar brilhante "chhh-ching". Ecoa muito em recintos fechados [fonte fraca].

### 6.2 Receita: swish de nylon

| Fase | Síntese | Números |
|---|---|---|
| 1. Entrada | ruído rosa → passa-banda **2–7 kHz** (Q ~0.7); envolvente com subida | ataque **15–30 ms** (a bola "entra" na rede; não é um impacto!) |
| 2. Passagem | o mesmo ruído com o centro do filtro a descer **6 kHz → 2.5 kHz** (a rede abre e a bola passa ao fundo) | **60–120 ms** |
| 3. Estalo de volta | 2º pico do ruído, mais curto e agudo: passa-banda **3–9 kHz** | 20–50 ms de duração, começa 80–150 ms após o início, −3 a −6 dB do pico 1 |
| 4. Assentar | cauda de ruído, passa-alto 1.5 kHz | 50–150 ms, decaimento exponencial |
| Opcional | micro-crepitar: impulsos de 0.2 ms a 200–600/s modulam o ruído | dá a textura de "fios" |
| Grave | **nada abaixo de ~300 Hz**; passa-alto de 2ª ordem a 400 Hz |  |

- **Duração total:** **180–350 ms**.
- **Nível:** baixo. É um som "íntimo"; no pavilhão cheio quase só se ouve perto. Mistura −10 a −14 dB abaixo do clang do aro.
- **Variação:** duração ±25 %, centro do filtro ±15 %, nível do estalo ±4 dB.
- **Swish com toque no aro ("roll-in"):** 1–2 toques fracos do aro (secção 3, −12 dB) antes do swish.
- **Força:** uma bola mais rápida encurta a fase 2 (60 ms) e reforça o estalo (+3 dB).

### 6.3 Receita: rede de corrente

- **Grãos metálicos:** cada grão é um impulso que excita 2–3 ressonadores com frequências ao acaso em **2.5–9 kHz** (Q 30–80, T60 **15–60 ms**).
- **Densidade:** começa em ~100 grãos/s, sobe a **300–600/s** no pico (≈ 60–120 ms) e cai exponencialmente.
- **Duração:** **350–700 ms** (a corrente balança e continua a tilintar).
- **Balanço:** 2–3 rajadas mais fracas a 3–5 Hz no fim (a rede a oscilar), cada uma −6 dB.
- **"Clank" de corrente contra o aro:** 1–2 impactos com modos do aro (secção 3) a −10 dB.
- **Grave:** um "chhk" de 400–1200 Hz (o peso da corrente) a −12 dB nos primeiros 40 ms.

### 6.4 Erros

- **Rede a soar a soco ("punch"):** tem baque grave ou ataque instantâneo. A rede não tem impacto: o ataque é de **≥15 ms** e não há energia abaixo de 300 Hz.
- **Ruído branco constante cortado:** soa a rádio. Precisa do perfil de 2 picos (entrar e estalar).
- **Corrente que soa a sinos:** grãos demasiado longos (T60 > 100 ms) ou demasiado tonais. Cada elo é minúsculo: T60 curto e frequências altas.
- **Swish demasiado alto:** na TV, o "swish" é captado por microfones na tabela. No jogo, mantém-no discreto mas nítido (agudos limpos fazem-no sobressair sem volume).

---

## 7. Apito do árbitro (com ervilha, ~2–4 kHz)

### 7.1 Física

- O jato de ar bate numa aresta (biselado) e excita a **cavidade cilíndrica** (de tipo Helmholtz/câmara), que fixa a nota. **Uma câmara maior dá uma nota mais grave** [M, patentes].
- **Frequência:** uma patente aponta **~4 kHz** para uma câmara de ~15 mm de diâmetro [M, patente]; outra, **3.3–3.5 kHz** de ressonância fundamental para apitos de ervilha [M, patente]. Na deteção robótica de apitos, o pico mede-se em **2.3–2.9 kHz** [M, tese]. Blogues apontam 3–4 kHz, 3.5–4.5 kHz e "3–5 kHz" [E]. A norma ISO 12402-8 (apitos de salvamento) pede **(2 ± 1) kHz, multitonal** [M, citado pela Fox 40]. Conclusão: **2.5–4 kHz, centro ~3.2 kHz**.
- **A ervilha:** a bola (cortiça/plástico) gira e salta na câmara, interrompe o jato e muda o volume efetivo. O resultado é **modulação de amplitude** (sobretudo) e alguma de frequência. Um fabricante cita **25–100 ciclos/s, conforme a pressão do sopro e a geometria** [E]. Windytan (Acme Thunderer 60.5) descreve "início deslizante, longa fase estável com mudanças de frequência, fim deslizante curto"; a FM vê-se melhor no **2º e 3º harmónicos**; há uma AM ligeira [M, blogue com espectrograma]. Uma patente de apito de treino de cães dá um trilo de média ~3400 Hz a variar entre **2700 e 3500 Hz** [M, patente; outro tipo de apito].
- **Apito sem ervilha (Fox 40):** 3 câmaras com notas ligeiramente diferentes → **batimento** (um "vibrato" mais rápido e mais regular). Patentes falam de ~300 Hz de diferença; um modelo "estilo Fox" amador cita câmaras de 3.9–5.1 kHz [E]. Níveis: Classic **115 dB**, Sonik Blast 120 dB, Pearl ~90 dB [vendedor].

### 7.2 Receita: apito de ervilha

| Parâmetro | Valor |
|---|---|
| Portadora | oscilador a **f0 = 2.9–3.6 kHz** (por árbitro, fixo ±2 %) |
| Harmónicos | 2·f0 a **−15 a −22 dB**, 3·f0 a −25 a −30 dB (o 2º dá a "agressividade") |
| AM da ervilha | profundidade **30–70 %**, frequência **30–60 Hz** (centro 40) a variar ao acaso ±30 % (a ervilha não é periódica: usa ruído filtrado a 20–80 Hz como modulador, não um seno) |
| FM da ervilha | **±1–3 %** de f0 (±30–100 Hz), com o mesmo modulador da AM (correlacionado); aplica ×2 e ×3 a FM nos harmónicos (sai automaticamente se gerares a fase de f0) |
| Ruído de sopro | ruído passa-banda centrado em f0 (Q 3–5) a **−18 a −24 dB** + ruído largo 4–10 kHz a −30 dB |
| Ataque | **20–40 ms**, com a nota a **subir 3–8 %** até f0 (o início deslizante) |
| Release | **25–60 ms**, com a nota a cair 3–6 % |
| Pressão → nota | mais sopro = **+2–5 %** de f0 e AM mais rápida (a ervilha gira mais depressa) e +4–8 dB |

- **Durações e padrões** (linguagem da arbitragem, [E]):
  - falta/paragem: **1 apito de 0.4–0.9 s**;
  - apito curto de atenção: **0.12–0.25 s**;
  - "tweet-tweet" de violação: 2 apitos de 0.15–0.25 s separados por 80–150 ms;
  - fim de jogo/apito longo: 1.0–1.6 s.
- **Variação:** f0 ±2 % entre apitos do mesmo árbitro; duração ±20 %; padrão de AM sempre diferente.
- **Na sala:** o apito é o som mais forte e mais agudo do pavilhão, por isso a reverberação dá-lhe uma cauda brilhante de 1–2 s. Nos agudos, reduz o T60 da sala para 60 % (absorção do ar e do público).

### 7.3 Receita: apito sem ervilha (estilo 3 câmaras, para variar)

- 3 osciladores a **f0, f0+Δ1, f0+Δ2**, com Δ entre **40 e 300 Hz** (batimento rápido e "áspero");
- sem AM aleatória; ataque 15–25 ms; o resto igual.

### 7.4 Erros

- **Seno puro a 3 kHz:** soa a beep de micro-ondas ou de teste de audição.
- **Trilo periódico (seno a 40 Hz):** soa a sirene de brinquedo ou a "tremolo" de guitarra. O modulador tem de ser irregular.
- **Sem início deslizante:** soa a eletrónico.
- **Demasiado agudo (>4.5 kHz):** soa a apito de cão; fura os ouvidos em altifalantes pequenos. Atenção aos telemóveis.

---

## 8. Bola agarrada nas mãos (passe recebido)

### 8.1 Física [C/E]

- As mãos "cedem" para amortecer: o contacto é longo, **15–40 ms**, mais longo do que no chão. Logo, o baque é **mais grave e mais suave**.
- A pele das palmas no couro/compósito dá um **"slap"**: estalo curto de banda média-alta (parecido com o de um bater de palmas, mas sem a cavidade entre as mãos). O som de palmas tem ressonância **bem abaixo de 2 kHz**, conforme a forma das mãos (Repp 1987; Peltola et al.) [M].
- **As mãos abafam a casca e mexem nas condições de fronteira**, por isso o ring da cavidade é **fraco e curtíssimo**.

### 8.2 Receita

| Camada | Números |
|---|---|
| Slap da pele | ruído passa-banda centrado em **900–1800 Hz** (Q 1.5–3), ataque 0–1 ms, **T60 20–40 ms** |
| Baque | meio-seno de **15–30 ms**, pico ~40–80 Hz, −6 dB do slap |
| Ring da bola | 985 Hz a **−15 dB**, T60 15–25 ms (quase nada) |
| Estalo agudo | ruído >3 kHz, 2–3 ms, −20 dB (dedos) |
| Duração total | **40–80 ms** |

- **Variação:** centro do slap ±25 %; 20 % dos passes têm dois toques (a bola bate numa mão e depois na outra, com 10–25 ms de intervalo).
- **Força:** passe forte (peito, ~8–12 m/s) → slap +6 dB, centro +20 %, contacto mais curto (12–18 ms); passe picado (de ressalto) → ressalto no chão (secção 1) e depois o catch; passe lobado → catch suave −8 dB.
- **Erros:** soar a palmas (cavidade a ~1 kHz muito tonal, ou slap demasiado longo); usar o mesmo som do drible (o catch não tem o "ping" da cavidade).

---

## 9. Buzinas e sirenes (fim de período e relógio de lançamento)

### 9.1 Física

- **As regras exigem tons diferentes** para a buzina do jogo e a do relógio de 24 s (a Daktronics refere-o) [M, base de conhecimento do fabricante]. Um relógio Colorado Time tem **8 tons ajustáveis, 125 dB** [vendedor]; outro, um besouro de 12–24 V DC a **99 dB a 3 m** [vendedor].
- **Tipos físicos:**
  - **buzina eletromecânica/besouro:** diafragma metálico batido por um eletroíman (por vibrador de contacto ou pela rede elétrica). Dá uma **onda rica (quase quadrada/dente de serra)**. Os besouros de rede vibram a **2 × 50/60 Hz = 100/120 Hz**, uma "rasca" grave. As buzinas de contacto vibram a 200–500 Hz. As buzinas de carro têm fundamentais de **300–500 Hz** com harmónicos até ×10, e muitas vezes 2–3 notas em acorde [M, patente e análise da Univ. Maryland, ~400 Hz e 2 notas].
  - **buzina pneumática/de pavilhão:** um diafragma excita uma corneta. A NBA usa um som grave, muito forte e "gordo". [E]
- Não encontrei frequências publicadas para buzinas de marcador. **Todos os números abaixo são [E].**

### 9.2 Receita: buzina de fim de período ("o grande BUZZ")

| Parâmetro | Valor |
|---|---|
| Notas | 2 notas em acorde: **~220 Hz + ~277 Hz** (terceira maior) ou 233 + 349 Hz (quarta); uma só nota rasca também serve |
| Forma de onda | dente de serra ou quadrada com largura 30–40 %, com passa-baixo de 2ª ordem a 2.5–4 kHz (corneta) |
| Formante da corneta | passa-banda largo em **600–1200 Hz** (+6 dB) |
| Aspereza | AM **10–20 %** a 25–60 Hz ou FM ±0.5 % (diafragma irregular) |
| Ataque | **15–40 ms** (o diafragma demora a arrancar) |
| Release | **60–150 ms** com a nota a cair 2–5 % (o diafragma perde força) |
| Duração | **1.2–2.0 s** (fim de período); fim de jogo pode ir a 2.5 s |

### 9.3 Receita: relógio de lançamento (24 s)

- Tom diferente e mais agudo: **1 nota a ~420–520 Hz** (ou um besouro de 120 Hz com harmónicos fortes até 3 kHz, se quiseres o "rasca" de besouro de rede);
- duração **0.8–1.2 s**;
- ataque 5–15 ms;
- sem acorde.

### 9.4 Outros sinais

- **Buzina da mesa (substituição/desconto de tempo):** como 9.2, mas **0.4–0.7 s**.
- **Bip eletrónico do relógio** (contagem regressiva ou aviso) [E]: quadrada a 1–2 kHz, 80–150 ms.

### 9.5 Erros

- **Seno puro:** soa a telefone. Um besouro é rico em harmónicos.
- **Sem ataque/release:** soa a sintetizador; o diafragma tem inércia.
- **As duas buzinas iguais:** errado pelas regras e confunde o jogador.
- **Demasiado forte na mistura:** a 125 dB real seria insuportável. Na mistura, põe a buzina ao nível do clímax da multidão, não acima.

---

## 10. Multidão

### 10.1 Física e dados

- **Níveis medidos** [M]: o recorde interior é **130.4 dB** (Allen Fieldhouse, 2017; antes, 126.4 dB em Rupp Arena); um estudo universitário mediu picos de **>130 dB** em jogos esgotados de um pavilhão médio; um estádio de futebol com vuvuzelas teve média de **100.5 dB(A)**. Para a NBA há estimativas de **100–120 dB** (fontes fracas). Não há levantamento publicado de um nível "típico" [M, observação de uma fonte].
- **Voz:** f0 médio masculino **120 Hz (80–180)**; em voz alta sobe ~10 Hz (Holmberg 1988) [M]. Gritar sobe f0, intensidade e formantes (estudo de vogais gritadas, alemão 2020) [M]. As vogais e consoantes sonoras vivem em **300–3000 Hz**; para análise de multidões recomenda-se 100–8000 Hz [M].
- **Aplausos:** cada palma é uma ressonância de 2 polos (frequência central, largura de banda -3 dB e ganho medidos por configuração das mãos; Peltola, Erkut, Cook & Välimäki, IEEE TASLP 2007) [M]. As ressonâncias estão **bem abaixo de 2 kHz** [M]; uma cavidade de mãos menor dá uma nota mais alta [M]. Os primeiros ~10 ms dominam (modelo de Helmholtz, Phys. Rev. Research 2025) [M].
- **Aplauso rítmico** (Néda et al., Nature 2000) [M]: dois modos de bater palmas. O modo "excitado"/rápido tem **~dobro da frequência** do natural; para sincronizar, a multidão **duplica o período** (abranda). Na gravação, a sincronização começou aos ~12 s. A sincronização perde-se quando aceleram de novo (o ruído sobe e a dispersão aumenta).

### 10.2 Receita: murmúrio de fundo (público à espera / jogo calmo)

- **Base:** ruído rosa → passa-banda **200–3500 Hz** (pico suave em ~500–800 Hz, −6 dB/oitava acima de 2 kHz).
- **Textura de "vozes":** soma de **8–24 "vozes falsas"**, cada uma ruído filtrado por **2 formantes** que saltam ao acaso entre vogais a cada **80–250 ms** (sílabas): F1 300–800 Hz, F2 900–2300 Hz, Q 4–8. Ganho de cada voz com envolventes silábicas (AM 3–6 Hz). As vozes não precisam de f0: a uma distância grande, a multidão é sussurrada e sem tom.
- **Movimento lento:** AM global de **±2–4 dB a 0.1–0.5 Hz**.
- **Nível:** −24 a −30 dB face ao pico do grito.
- **Fundo exterior:** 4–8 vozes, mais esparsas, **sem reverberação**, + ruído de rua (passa-baixo a 500 Hz, −36 dB).

### 10.3 Receita: grito de festa (cesto, afundanço, vitória)

- **Vozes com tom:** **30–100 vozes** (ou 8–16 vozes "ricas" + ruído para preencher):
  - f0 masculino **140–260 Hz**, feminino/jovem **260–450 Hz** (vozes gritadas sobem; usa 60/40 % H/M);
  - fonte: dente de serra ou trem de impulsos glotais com **jitter 2–5 %** e shimmer de 1–2 dB;
  - **formantes de "AH"/"EY"** gritados: F1 **700–1000 Hz**, F2 **1200–1800 Hz**, F3 **2500–3000 Hz**;
  - cada voz desafinada ao acaso (±1 semitom), começa num tempo aleatório e sobe 1–3 semitons nos primeiros 200–400 ms (entusiasmo).
- **Ruído de grito:** ruído passa-banda **500–4000 Hz** a −6 dB das vozes (sopro e rouquidão).
- **Envolvente:** ataque **150–400 ms** (as pessoas reagem em tempos diferentes: espalha os inícios das vozes em 0–300 ms); pico sustentado **0.8–2.5 s**; decaimento **1–3 s** (as vozes desligam uma a uma; não faças só fade).
- **Força (importância do lance):** número de vozes ×(1–3), f0 +1–3 semitons, nível +3 a +10 dB, duração ×1.5.
- **Vitória/buzzer-beater:** junta assobios (secção 10.6) e aplausos e prolonga 4–8 s.

### 10.4 Receita: assobios de desagrado ("buuu")

- **Vogal "U"** (fechada): F1 **280–350 Hz**, F2 **700–900 Hz**, F3 ~2300 Hz a −12 dB (o "U" tem pouca energia acima de 1 kHz; é por isso que o "buu" soa escuro). A subida de formantes ao gritar (estudos de vogais gritadas) pode levar F1 a ~400 Hz [M, tendência; números E].
- **f0:** masculino **100–180 Hz**, mais grave do que no grito de festa (o "buu" é "de peito"); feminino 200–300 Hz.
- **20–60 vozes**, desafinadas ±2 semitons (um "buu" de multidão é um cluster).
- **Contorno:** cada voz desce **1–3 semitons** ao longo de **1–3 s**; início espalhado em 0–500 ms.
- **AM** lenta em cada voz (0.5–2 Hz, ±3 dB): cada um respira em tempos diferentes.
- **Passa-baixo** global a **1.5–2 kHz**.
- **Duração:** 1.5–5 s.

### 10.5 Receita: aplausos

| Parâmetro | Valor |
|---|---|
| Palma individual | impulso de ruído (0.5–2 ms) → ressonador de 2 polos, **fc = 800–2000 Hz** (centro ~1.2 kHz; por pessoa fixo ±10 %), largura de banda 200–800 Hz (Q 2–5); envolvente total **10–30 ms**; + ruído >3 kHz de 2–4 ms a −10 dB (estalo). Os valores exatos de Peltola/Repp não foram verificados (tabelas inacessíveis) [E] |
| Tipos de mão | dar 2–4 "tipos" de palma (cava → fc 700–1000 Hz; plana → 1500–2200 Hz; dedos na palma → mais agudo e curto) |
| Cadência individual | aplauso normal **~3–5 palmas/s**; entusiasmado 5–7/s; jitter ±8–15 % por palma |
| Número de pessoas | 10–40 "palmeiros" simulados chegam (um pavilhão é ruído denso; acima de ~30 eventos/10 ms o ouvido já não separa) |
| Densidade total | 50–400 palmas/s |
| Envolvente | ataque 0.3–0.8 s (as pessoas juntam-se), sustentação, decaimento 1–2 s com a densidade a cair |
| Rítmico (sincronizado) | todas as palmas a **~1.5–2.5 Hz** (período duplicado do natural), dispersão de fase ±20–40 ms, a acelerar 1–2 % por ciclo até perder a sincronização |

### 10.6 Assobios da bancada (com os dedos)

- Seno a **2–3.5 kHz** com vibrato ±2 % a 5–7 Hz, um deslizamento de subida de 200–500 ms e um "flick" final;
- 2–6 em simultâneo nos momentos altos;
- ruído de sopro a −15 dB.

### 10.7 Cânticos ("DE-FENSE!", nome do clube)

- **Ritmo:** "DE-FENSE" = 2 sílabas, a cada ~1 s (padrão "da… DUM, pausa"); cânticos de 3–4 sílabas a 2–2.5 sílabas/s.
- **Vozes:** 30–80 vozes **em uníssono aproximado**: f0 com dispersão ±1–1.5 semitons (as multidões não afinam) e começos com dispersão ±30–60 ms (dá o "coro grosso").
- **Formantes por sílaba:**
  - "DE" → E (F1 500, F2 1800);
  - "FENSE" → E + ruído de "F"/"S" (passa-alto 4 kHz, 60–100 ms).
- **Batidas de pés** em cada tempo forte: baques de 40–80 Hz, 30–60 ms, com a bancada de madeira a vibrar (modos 25–60 Hz, se for bancada antiga). Opcional: tambor de claque.
- **Clímax:** acelera ~5–10 % e sobe ~1 semitom ao fim de 4–8 repetições.
- **Português de Portugal** (como manda o AGENTS.md): "DE-FE-SA!" (3 sílabas: E, E, A) ou o nome da equipa.

### 10.8 Erros

- **Uma só voz copiada e desafinada:** soa a "phaser". Cada voz precisa de modulações próprias (jitter, vibrato, início).
- **Ruído branco filtrado sozinho:** soa a chuva ou cascata. Falta a textura silábica (AM de 3–6 Hz) e os formantes.
- **Aplauso com palmas iguais:** soa a chuva de granizo ou a "pipocas". Precisa de 2–4 tipos de mão e jitter por pessoa.
- **Reação instantânea** (todos no mesmo ms): artificial. Espalha 150–400 ms.
- **"Buu" com vogal aberta:** soa a festa. Usa formantes de "U" e passa-baixo.
- **Multidão seca no pavilhão:** precisa de muita reverberação (ver 12) e de algum pré-atraso; o público está à volta e longe.

---

## 11. Outros sons úteis (curtos)

- **Pés a correr no soalho** [E]: baques de 50–150 Hz com 10–20 ms, + "tic" de borracha a 1–3 kHz, 3 ms. Cadência 2.5–3.5 passos/s por jogador (sprint 4/s). Muito baixos na mistura (−24 dB).
- **Bola a rolar no chão:** ruído passa-banda 150–600 Hz, AM à frequência de rotação (v / (π·0.24 m) ≈ 1.3 Hz por m/s), com batidas suaves dos gomos.
- **Treinador a gritar:** voz formante (secção 10.3) com 1 voz, f0 130–200 Hz, sílabas 4–6/s, ruído rouco a −10 dB.
- **Banco a bater / jogador a cair no chão:** baque largo 40–200 Hz, 40–80 ms, + chiar curto.

---

## 12. Acústica da sala (pavilhões, arenas, exterior)

### 12.1 Dados

| Espaço | RT60 a 500 Hz–1 kHz | Fonte |
|---|---|---|
| Ginásio escolar **não tratado** | **4.1–5.6 s** (Great Salt Bay 4.1 s; Malone Univ. 5.62 s); 4.2 s em Mississauga | [M, estudos de caso Eckel e JCAA] |
| Ginásio **tratado** | **1.6–2.5 s** (1.7 s; 1.63 s; 2–2.5 s) | [M] |
| Recomendação para pavilhões | ≤ 2.0 s vazio, média 500–2000 Hz (Alberta); ≤ 1.5 s (outra compilação de normas); 1.5–2.5 s (fabricantes) | [M/E] |
| Arena grande (2000+ lugares) | alvo de ~2.75 s a 2 kHz, vazia; medição numa arena: 2.3 s | [E, guia de design; M, uma arena] |
| Madison Square Garden (histórico) | 7.6 s antes de tratamento → 3.5 s depois (a 500 Hz) | [M, artigo SMPTE antigo] |
| Ocupação | o público reduz o RT60 (exemplo de uma igreja: 2.4 s vazia → 1.8 s cheia, ~25 %) | [M/E] |
| Ar | absorção ~5 dB/km a 1 kHz, ~160 dB/km a 10 kHz (20 °C, 50 % HR) | [M, demo baseada na ISO 9613-1] |

### 12.2 Receitas de reverberação

Implementação barata em `Float32Array`: **FDN de 4–8 linhas** ou **convolução com uma resposta impulsiva sintética** (ruído com envolvente `exp(−6.91·t/T60)`, filtrado por bandas com T60 diferentes, e um pré-atraso). Para JS, uma resposta impulsiva sintética de 2–3 s a 44.1 kHz convolvida por FFT por blocos está bem; um FDN é mais leve.

| Preset | Pré-atraso | RT60 graves (125 Hz) | RT60 médios (500–1k) | RT60 agudos (4k) | Reflexões iniciais | Nível molhado |
|---|---|---|---|---|---|---|
| **Ginásio de escola (equipa pequena)** | 15–30 ms | 3.5–4.5 s | **3–4 s** | 1.8–2.5 s | 4–8 fortes e distintas a 20–90 ms (paredes paralelas: "flutter echo" a 10–30 ms de período) | −6 a −10 dB (muito molhado) |
| **Pavilhão municipal tratado** | 20–40 ms | 2.2–2.8 s | **1.7–2.2 s** | 1.1–1.5 s | difusas | −10 a −14 dB |
| **Arena cheia (topo da liga)** | 40–80 ms | 2.5–3 s | **1.8–2.5 s** | 1.0–1.5 s | poucas, muito difusas; eco da cobertura de 100–200 ms bem baixo | −12 a −16 dB nos sons do campo; a multidão quase toda "molhada" |
| **Exterior (rua/parque)** | — | sem cauda | sem cauda | — | 1 reflexão do chão (0.5–3 ms, só coloração) + 1–3 ecos de paredes/prédios: atraso = 2d/343 (d = 10 m → 58 ms; 20 m → 117 ms; 40 m → 233 ms), −12 a −24 dB, com passa-baixo a 3–5 kHz | 0 (seco) + ecos |

- **Agudos curtos e graves longos.** Num pavilhão, o T60 nos agudos é ~50–65 % do de 500 Hz (absorção do ar + público). Num ginásio não tratado, os graves "embolam". Faz o FDN com um filtro passa-baixo em cada linha (shelf de −0.5 a −2 dB por passagem acima de 3 kHz).
- **Distância.** Para sons longe da câmara (outra tabela, bancada do outro lado), mais molhado e menos agudos: rácio direto/reverberado −6 dB a cada duplicação de distância acima do raio crítico (num pavilhão, o raio crítico é ~3–6 m) [C, acústica de salas clássica].
- **Os ecos do drible.** Num ginásio vazio, o drible ouve-se a "estalar" nas paredes (flutter echo). É um dos sons mais reconhecíveis de "treino". Usa 2–3 linhas de atraso curtas (10–30 ms) com realimentação 0.4–0.6 só no preset de ginásio.
- **Arena: a multidão é a sala.** Com o público a gritar, o fundo encobre a cauda. Na mistura, abaixa a reverberação de efeitos curtos quando a multidão está alta (−3 a −6 dB), ou pela máscara já não se ouve.

### 12.3 Erros

- **Reverberação de "catedral" com pré-atraso zero:** o som fica "metido" no altifalante. Precisa de 15–80 ms de pré-atraso.
- **Mesma reverberação em tudo:** o apito e a buzina, sendo os mais fortes, deviam acordar a sala mais do que o drible.
- **Exterior com reverberação:** soa a túnel ou a garagem. Ao ar livre é seco, com ecos discretos.
- **Agudos com cauda tão longa como os graves:** soa a metal ou a mola. Corta os agudos.
- **Cauda a acabar abruptamente** (resposta impulsiva cortada): faz fade exponencial até −60 dB.

---

## 13. Tabela-resumo de receitas

| Som | Frequências-chave | Ataque | Decaimento/duração | Variação | Com força |
|---|---|---|---|---|---|
| Drible (madeira) | baque 60–120 Hz (contacto 8–13 ms); soalho 70/110/160/230 Hz; cavidade **985/1581/2130/2670 Hz** | 0–1 ms | ring T60 40–120 ms; total 120–200 ms + sala | f ±1 %, ring ±4 dB, contacto ±10 % | +6 dB/2×v; **timbre fixo** |
| Drible (asfalto) | igual, sem soalho; grão 3–9 kHz 6–15 ms | 0–1 ms | 100–160 ms + ecos | idem | idem |
| Cadência | 1.8–2.6 Hz (normal), 3–4.5 Hz (baixo) | — | — | jitter ±3–6 % | — |
| Aro | **154, 436, 835, 1351, 1982, 2728 Hz** (razões 1:2.83:5.42:8.77:12.9:17.7), pares a ±1–3 %; estrutura 24/94 Hz | 0–1 ms | T60 0.9 s → 0.15 s | ganho por modo ±6 dB | modos altos +3 dB/2×v |
| Tabela de vidro | 37, 65, 111, 118, 146, 193 Hz + clique 1–4 kHz | 0–1 ms | T60 120–300 ms | f ±5 % | clique +3 dB/2×v |
| Tabela acrílica | "bonk" 60–180 Hz, passa-baixo 1.5 kHz | 0–1 ms | 60–120 ms | | |
| Tabela metal | 15 modos 180–3500 Hz + chocalho | 0–1 ms | 0.3–0.8 s | | |
| Chiar | f0 2.5–5.5 kHz (trem de pulsos + harmónicos), glissando ±5–20 % | 2–8 ms | 60–300 ms | f0 fixo por jogador ±15 %, ±5 % por chiar | carga → +6 dB, mais grave |
| Rede nylon | ruído 2–7 kHz a descer até 2.5 kHz; estalo 3–9 kHz; nada <300 Hz | **15–30 ms** | 180–350 ms | ±25 % duração | estalo +3 dB |
| Rede corrente | grãos 2.5–9 kHz, T60 15–60 ms, 300–600/s | 5–10 ms | 350–700 ms | | |
| Apito | f0 2.9–3.6 kHz, H2 −15/−22 dB; AM 30–70 % e FM ±1–3 % a 30–60 Hz irregular | 20–40 ms, subida 3–8 % | 0.12–1.6 s; release 25–60 ms | f0 ±2 % | +2–5 % f0 |
| Catch | slap 900–1800 Hz; baque 15–30 ms | 0–1 ms | 40–80 ms | ±25 % | +6 dB, +20 % fc |
| Buzina de jogo | ~220 + 277 Hz, dente de serra, corneta 600–1200 Hz | 15–40 ms | 1.2–2 s | | |
| Buzina 24 s | ~420–520 Hz (ou besouro 120 Hz) | 5–15 ms | 0.8–1.2 s | | |
| Murmúrio | ruído 200–3500 Hz + 8–24 vozes de formantes, AM 3–6 Hz | — | contínuo | AM lenta ±2–4 dB | |
| Grito de festa | f0 140–450 Hz, F1 700–1000, F2 1200–1800 | 150–400 ms | 1–3 s de pico + 1–3 s de queda | vozes ±1 semitom | ×vozes, +f0 |
| "Buu" | f0 100–180 Hz, F1 280–350, F2 700–900, passa-baixo 1.5–2 kHz | 200–500 ms | 1.5–5 s, a descer 1–3 semitons | ±2 semitons | |
| Aplauso | palma: ressonador fc 800–2000 Hz, 10–30 ms; 3–5 palmas/s por pessoa | 0.3–0.8 s (grupo) | 1–2 s de queda | 2–4 tipos de mão | densidade |
| Ginásio | RT60 3–4 s (até 5.6 s), pré-atraso 15–30 ms, flutter echo | | | | |
| Arena | RT60 1.8–2.5 s, pré-atraso 40–80 ms | | | | |
| Exterior | seco + ecos 2d/343 | | | | |

---

## 14. Notas de implementação (para `src/ui/` ou o módulo de áudio)

- **Ressonador modal barato** (um por modo): `y[n] = 2r·cos(ω)·y[n−1] − r²·y[n−2] + g·x[n]`, com `r = exp(−π·B/fs)` ou, a partir de T60, `r = exp(−6.91/(T60·fs))`. Para evitar `Math.exp`/`Math.cos` no áudio (no áudio da UI são permitidos; no `src/sim/` não), pré-calcula `r` e `cos ω` uma vez por evento. A síntese corre na UI; a regra de determinismo é só da simulação, mas a variação **deve vir de uma semente** (por exemplo, o tempo de jogo + o tipo de evento) se quiseres que as repetições soem iguais.
- **Excitação por meio-seno** de duração `T` em vez de impulso de 1 amostra: dá automaticamente o passa-baixo físico do contacto. É a técnica-chave para bola, aro e tabela.
- **Pares de modos desafinados** para batimentos metálicos (aro, metal de exterior).
- **Ruído rosa:** filtro de Paul Kellet (3 polos) ou soma de 3–5 ruídos de primeira ordem.
- **Vozes da multidão:** fonte glotal = dente de serra com passa-baixo de −12 dB/oitava; formantes = 3 biquads passa-banda em paralelo. Para dezenas de vozes, sintetiza 8–16 e multiplica com desfasamento temporal e mudança de pitch por reamostragem.
- **Mistura dinâmica:** quando a multidão sobe, reduz os efeitos finos (rede, chiares) em 3–6 dB e põe um passa-alto suave no murmúrio. Assim os sons importantes (apito, buzina, aro) continuam a ouvir-se.

---

## Anexo A — Cálculos próprios [C]

Um script Python de rascunho (não guardado no repositório) com:

- **Cavidade da bola:** `f = x·c/(2πa)`, `c = 343 m/s`, `a = 0.115 m`, `x` = zeros de `j_ℓ'` (2.0816, 3.3421, 4.4934, 4.5141, 5.6467, 5.9404, 6.7565, 7.2899). Confirmado contra 970/1580 Hz (Russell) e 997 Hz (Katz, com outro raio).
- **Contacto:** `k = 2πRp`, `T = π√(m/k)`, m = 0.62 kg, R = 0.119 m.
- **Aro:** anel fino em flexão, `ω_n = √(EI/(ρA))/R² · n(n²−1)/√(n²+1)` (no plano); fora do plano com `√(n²+1+ν)`, uma aproximação. d = 16 mm, R = 0.237 m, aço.
- **Placas:** simplesmente apoiadas, `f_mn = (π/2)√(D/ρh)((m/a)²+(n/b)²)`, `D = Eh³/(12(1−ν²))`; coincidência `f_c = c²/(2π)·√(ρh/D)`. Vidro: E = 70 GPa, ρ = 2500, ν = 0.22; acrílico: 3.2 GPa, 1190, 0.37; policarbonato: 2.4 GPa, 1200; aço: 200 GPa, 7850; contraplacado: 12 GPa, 600.
- **Drible:** cinemática simples com empurrão `v0`.

Limites: as condições de fronteira reais (aro soldado num ponto, tabela numa moldura) alteram as frequências. Os modos do aro com n baixo, em particular, podem descer 10–30 % por causa do suporte. Usa estes valores como partida e afina de ouvido.

---

## Fontes

Física da bola
- Katz, J. I. — *Thump, ring: the sound of a bouncing ball*. arXiv:0808.3278 (Eur. J. Phys. 31, 2010). https://arxiv.org/abs/0808.3278 · cópia: https://www.rose-hulman.edu/~moloney/Ph425/ProjectPDFs/0143-0807_31_4_014_ball_bounce_thump_and_ringing.pdf · ADS: https://ui.adsabs.harvard.edu/abs/2008arXiv0808.3278K/abstract *(texto completo não acessível; números via excertos)*
- Russell, D. A. — *Basketballs as spherical acoustic cavities*. Am. J. Phys. 78(6), 549 (2010), doi:10.1119/1.3290176. https://www.acs.psu.edu/drussell/Publications/Basketball.pdf · https://iypt.ru/wp-content/uploads/2021/09/Basketballs-as-spherical-acoustic-cavities.pdf
- Cross, R. — *The bounce of a ball*. https://www.physics.usyd.edu.au/~cross/PUBLICATIONS/BallBounce.pdf
- ASEE — *Applying dynamics to the bouncing of game balls*. https://peer.asee.org/applying-dynamics-to-the-bouncing-of-game-balls-experimental-investigation-of-the-relationship-between-the-duration-of-a-linear-impulse-during-an-impact-and-the-energy-dissipated.pdf
- ASU — coeficiente de restituição; pressão NBA 7.5–8.5 psi. https://www.asu.edu/courses/kin335/documents/Coefficient%20of%20restitution.pdf

Chão
- Aalto — *Vibration of long-span floors in sport facilities*. https://aaltodoc.aalto.fi/items/b3941c4a-a162-43d3-a5b5-f62f7a5afbaf
- Ding et al. — BioResources 15(4), vibração de soalhos de madeira. https://bioresources.cnr.ncsu.edu/wp-content/uploads/2020/09/BioRes_15_4_8212_Ding_ZWGZH_Vibration_Test_Comfort_Analy_Environ_Excitat_Wood_Floor_Modif_17746.pdf

Drible
- *What Makes a Dribble Successful? Insights From 3D Pose Tracking Data*. arXiv:2506.22503. https://arxiv.org/pdf/2506.22503

Aro e tabela
- Winarski et al. — *Modes of Vibration in Basketball Rims and Backboards and the Energy Rebound Testing Device*. https://www.preprints.org/manuscript/202308.0671/v1
- Winarski, Nygren & Winarski — *Finite Element Analysis versus Empirical Modal Analysis of a Basketball Rim and Backboard*. Vibration 7(2), 30 (2024). https://www.mdpi.com/2571-631X/7/2/30
- *Digital-Twin of the NCAA Energy Rebound Testing Device* (ANSYS). https://www.mdpi.com/2571-631X/8/1/9
- Vidro vs acrílico (fontes comerciais): https://firstteaminc.com/articles/glass-vs-acrylic-backboards · https://support.escaladesports.com/support/solutions/articles/33000231200-what-is-the-difference-between-glass-and-acrylic-backboards-
- Anel em flexão (família de fórmulas): https://arxiv.org/pdf/cond-mat/0011222

Ténis
- Djellouli et al. — *Squeaking at soft–rigid frictional interfaces*. Nature 650, 891–897 (2026), doi:10.1038/s41586-026-10132-3. https://www.nature.com/articles/s41586-026-10132-3
- Physics Today — *A peek into the physics of squeaky sneakers*. https://physicstoday.aip.org/quick-study/a-peek-into-the-physics-of-squeaky-sneakers
- Harvard SEAS — *The physics of a squeak*. https://seas.harvard.edu/news/physics-squeak
- Nature News — *The secret of squeaky basketball shoes*. https://www.nature.com/articles/d41586-026-00295-4
- Phys.org: https://phys.org/news/2026-02-physics-sneaker-high-imaging-supersonic.html · Science News: https://www.sciencenews.org/article/basketball-sneakers-squeak-physics · Scientific American: https://www.scientificamerican.com/article/the-surprising-new-physics-of-squeaky-basketball-shoes/ · Physics World: https://physicsworld.com/a/the-physics-of-why-basketball-shoes-are-so-squeaky/ · Techno-Science (5 kHz, 80 m/s, vidro, 1 m/s): https://www.techno-science.net/en/news/redirect-N28536.html

Apito
- Räisänen (windytan) — *Pea whistle steganography* (2015). https://www.windytan.com/2015/10/pea-whistle-steganography.html · Adafruit: https://blog.adafruit.com/2015/10/12/encoding-data-on-a-pea-whistle/ · Hackaday: https://hackaday.com/2015/11/16/pea-whistle-steganography/
- *Whistle sound recognition in a noisy environment* (Univ. Minho). https://rep-dspace.uminho.pt/bitstreams/ab9932ad-efff-416b-bc8b-6900299edc00/download
- Patentes USPTO: 8006634 (Whistle), 6109202 (Combination whistle), 9361871 (non-spherical pea), 7992513, 8028642. https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/8006634 (etc.)
- Fox 40 FAQ (ISO 12402-8, 2±1 kHz). https://www.fox40world.com/faq
- *How Whistles Work* (fabricante, 25–100 ciclos/s). https://thewhistlefactory.com/how-whistles-work
- Níveis de apitos: https://www.ump-attire.com/Blog/Fox-40-and-More-Referee-Whistles-by-Decibel-Level · https://www.dutchreferee.com/the-decibels-of-popular-referee-whistles/

Buzinas
- Daktronics, base de conhecimento (tons distintos, volume): https://www.daktronics.com/en-us/support/kb/DD2093792 · https://daktronics.com/en-us/support/kb/DD2701435
- Colorado Time (8 tons, 125 dB): https://shop.coloradotime.com/products/shot-and-play-clock-clk-2001-s-refurbished
- All American Scoreboards (99 dB a 10 pés): https://allamericanscoreboards.com/wp-content/uploads/2025/03/SHOTBOX-Specification-Sheet.pdf
- Patente de reconhecimento de buzinas (300–500 Hz, harmónicos até ×10): https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9615186
- O'Haver, Univ. Maryland — análise harmónica de uma buzina: https://terpconnect.umd.edu/~toh/spectrum/AppendixF.html

Multidão e aplausos
- Peltola, Erkut, Cook & Välimäki — *Synthesis of Hand Clapping Sounds*. IEEE TASLP 15(3), 2007. https://www.researchgate.net/publication/3457767_Synthesis_of_Hand_Clapping_Sounds · tese: https://research.spa.aalto.fi/publications/theses/lpeltola_mst/peltola_mst.pdf
- Jylhä & Erkut — *Inferring the hand configuration from hand clapping sounds*. DAFx 2008. https://www.dafx.de/paper-archive/2008/papers/dafx08_52.pdf
- Repp, B. H. — *The sound of two hands clapping*. JASA 81, 1100–1109 (1987). https://pubmed.ncbi.nlm.nih.gov/3571727
- Modelo de Helmholtz para palmas — Phys. Rev. Research 7, 013259 (2025). https://journals.aps.org/prresearch/pdf/10.1103/PhysRevResearch.7.013259
- Néda et al. — *The sound of many hands clapping*. Nature 403, 849 (2000). https://arxiv.org/abs/cond-mat/0003001 · *Physics of the rhythmic applause*: https://arxiv.org/pdf/cond-mat/0006423
- *Real-Time Sound Synthesis of Audience Applause* (AES). https://www.researchgate.net/publication/342046390_Real-Time_Sound_Synthesis_of_Audience_Applause
- *Towards a reproducible cross-venue method for quantifying crowd noise in stadiums*. arXiv:2607.18922. https://arxiv.org/pdf/2607.18922
- *Noise Levels Among Spectators at an Intercollegiate Sporting Event*. https://www.researchgate.net/publication/257463656_Noise_Levels_Among_Spectators_at_an_Intercollegiate_Sporting_Event
- Recordes de ruído: https://snapdecibelmeter.com/articles/how-loud-is-a-stadium-crowd · https://bleacherreport.com/articles/1129120-12-most-intimidating-home-courts-in-the-nba
- Vogais gritadas: https://fis.tu-dresden.de/portal/en/publications/acoustic-and-articulatory-analysis-and-synthesis-of-shouted-vowels(91452275-4d3a-4027-96d6-6a6cfff212d6).html · BYU, potência sonora de público: https://physics.byu.edu/docs/publication/8781

Salas
- Gastmeier & Aitken — *Reverberation in gymnasia*. Canadian Acoustics. https://jcaa.caa-aca.ca/index.php/jcaa/article/view/1251
- Eckel — Great Salt Bay School Gym: https://eckelusa.com/wp-content/uploads/2017/07/Great-Salt-Bay-School-Gym-Case-Study_May-2017.pdf · Malone Univ. Gym: https://eckelusa.com/wp-content/uploads/2017/07/Malone-Univ-Gym-Case-Study_May-2017.pdf
- Alberta — diretriz de RT para ginásios: https://www.alberta.ca/system/files/custom_downloaded_images/tr-acoustic-rt-guideline.pdf
- SMPTE — *The Acoustics of Large Auditoriums* (MSG): https://journal.smpte.org/periodicals/Journal%20of%20the%20Society%20of%20Motion%20Picture%20Engineers/18/4/13/
- Commercial Acoustics — alvos de RT60: https://commercial-acoustics.com/guides/reverberation-time-for-different-rooms/ · https://commercial-acoustics.com/guides/target-reverb-times/
- AcousPlan RT60: https://acousplan.com/rt60
- Absorção atmosférica (ISO 9613-1, demo): https://dougjam.github.io/demos/atmospheric-absorption/

Síntese modal
- van den Doel, Kry & Pai — *FoleyAutomatic* (SIGGRAPH 2001). https://www.cs.mcgill.ca/~kry/pubs/foleyautomatic/foleyautomatic.pdf
- van den Doel & Pai — *Modal synthesis for vibrating objects*. https://persianney.com/kvdoelcsubc/publications/modalpaper.pdf
- Zheng & James — *Toward high-quality modal contact sound* (SIGGRAPH 2011). https://www.doi.org/10.1145/2185520.2185599

### Factos não verificados (resumo)

- Os números de rede (nylon e corrente), buzinas, catch, cânticos e passos são **estimativas de design**: não encontrei medições publicadas.
- Os fatores de perda dos materiais (vidro, acrílico, etc.) e o T60 do ring da bola vêm de conhecimento geral, não confirmados nesta sessão.
- Fontes de apitos: patentes e fabricantes; a cadência da ervilha (25–100 Hz) é do fabricante, e os 30–60 Hz da receita são escolha minha.
- Os valores exatos de Peltola/Repp (fc, B de cada palma) e os períodos de palmas de Néda não foram lidos (tabelas inacessíveis).
- Os 5 kHz do chiar vêm de uma única experiência em vidro; o intervalo de 2.5–5.5 kHz é estimativa.
