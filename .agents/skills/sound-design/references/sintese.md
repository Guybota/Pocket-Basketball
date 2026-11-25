# Síntese procedimental de efeitos sonoros para o Pocket Basketball

Estudo de técnicas de áudio procedimental e de síntese por código, pensado para um jogo de browser que **pré-calcula** cada som num `Float32Array` com DSP escrito à mão em TypeScript, com gerador aleatório próprio e determinista, e que depois toca os resultados como `AudioBuffer` pela Web Audio.

> **Nota sobre as fontes.** Esta pesquisa foi feita com pesquisa na web. A rede desta sessão não deixou abrir `www.w3.org` nem `webaudio.github.io`, por isso as fórmulas do *Audio EQ Cookbook*, as tabelas de modos clássicas e outros valores de referência vêm das cópias que a pesquisa encontrou e do conhecimento corrente da área. Os valores marcados com **(verificar)** não foram confirmados numa fonte primária durante esta pesquisa. Os tempos de cálculo da secção 15 foram medidos nesta máquina.

Contexto do repositório: `src/ui/synth.ts` já trabalha a 32 kHz (`SR = 32000`) e tem modos amortecidos (`addModes`), rajadas de ruído filtrado, vogais por formantes, multidões, aplausos e uma resposta ao impulso de sala (`roomImpulse`). Este documento serve para rever e afinar esse código, não o substitui.

---

## Índice

1. Síntese modal
2. Excitação: rajadas de ruído e o contacto de Hertz
3. Ruído filtrado e subtrativo (biquads RBJ, ruído rosa e castanho)
4. Fricção e *stick-slip* (chiadeiras)
5. Karplus-Strong e guias de onda
6. FM para metais e sinos (e como fugir do sino)
7. Síntese de vozes por formantes
8. Texturas granulares e estocásticas (aplausos, murmúrio, chuva)
9. Envolventes e inícios e fins sem estalidos
10. Reverberação por convolução com respostas ao impulso sintéticas
11. Largura estéreo e descorrelação
12. Normalização e intensidade (LUFS)
13. *Aliasing* e sobreamostragem
14. Variação e anti-repetição
15. Desempenho do pré-cálculo em telemóveis lentos
16. Referências principais e o que cada uma ensina
17. Bibliotecas e repositórios de referência, com licenças
18. Receitas para os sons do basquetebol
19. Fontes

---

## 1. Síntese modal

### Como funciona

Um objeto sólido que vibra comporta-se, em boa aproximação, como uma soma de osciladores independentes, os **modos**. Cada modo *k* tem uma frequência *f_k*, um amortecimento (tempo de decaimento τ_k ou T60_k) e um ganho *a_k* que depende do ponto onde se bate e do ponto onde se ouve. A resposta a uma pancada ideal (impulso) é:

```
y(t) = Σ_k a_k · e^(−t/τ_k) · sin(2π f_k t + φ_k)
T60_k = τ_k · ln(1000) ≈ 6,91 · τ_k
```

O Sound Design Toolkit descreve os seus ressoadores sólidos exatamente assim: um conjunto de osciladores massa-mola-amortecedor em paralelo ([SDT, ressoadores](https://sdt.lim.di.unimi.it/docs/API/v2.2-078/group__resonators.html)). As bibliotecas do Faust fazem o mesmo, com um banco de filtros passa-banda ressonantes, cada um definido por `mode(f, t60, gain)` ([Michon, physmodels.lib](https://core.ac.uk/download/217712637.pdf)).

### Duas formas de calcular

**a) Senos explícitos.** Simples, mas paga um `Math.sin` por amostra e por modo.

**b) Ressoador recursivo de 2 polos** (um oscilador amortecido digital). É cerca de 4 vezes mais rápido nesta máquina (secção 15) e aceita qualquer excitação, não apenas um impulso:

```ts
// Um modo como filtro de 2 polos: y[n] = c·y[n-1] − r²·y[n-2] + g·x[n]
function addMode(out: Float32Array, x: Float32Array, f: number, t60: number, gain: number, sr: number) {
  const r = Math.exp(-6.91 / (t60 * sr));      // raio do polo
  const w = 2 * Math.PI * f / sr;
  const c = 2 * r * Math.cos(w), r2 = r * r;
  const g = gain * Math.sin(w);                // normaliza aproximadamente o pico
  let y1 = 0, y2 = 0;
  for (let n = 0; n < out.length; n++) {
    const y = c * y1 - r2 * y2 + g * (x[n] ?? 0);
    y2 = y1; y1 = y;
    out[n] += y;
  }
}
```

Para parar cedo, quando `|y1|+|y2|` fica abaixo de, por exemplo, 1e-5 e a excitação já acabou, sai do ciclo. Assim o custo acompanha a duração real do som.

### Razões dos modos

Valores para um objeto ideal (a frequência do primeiro modo é 1):

| Objeto | Razões dos primeiros modos | Notas |
|---|---|---|
| Barra livre-livre (marimba sem afinação, barra de metal) | 1 · 2,756 · 5,404 · 8,933 · 13,344 · 19,87 | Tabelas do Csound e de Cook dão 2,756/5,404/8,933 ([Csound, Apêndice E](https://csound.com/manual/MiscModalFreq.html); [Cook, CCRMA](https://ccrma.stanford.edu/workshops/dsp2008/prc/modal.pdf)) |
| Barra presa-livre (régua em consola) | 1 · 6,267 · 17,55 · 34,39 | Teoria de Euler-Bernoulli |
| Membrana circular ideal (pele de tambor) | 1 · 1,594 · 2,136 · 2,296 · 2,653 · 2,918 · 3,156 · 3,501 | Razões dos zeros das funções de Bessel (j₀₁ = 2,405, j₁₁ = 3,832, j₂₁ = 5,136…) |
| Placa circular encastrada | 1 · 2,081 · 3,414 · 3,893 · 4,997 · 5,954 | Modos de Bessel modificados **(verificar)** |
| Anel fino, flexão no plano (aro do cesto) | 1 · 2,83 · 5,42 · 8,77 · 12,9 | f_n ∝ n(n²−1)/√(n²+1), para n = 2, 3, 4…; cálculo próprio |
| Tubo aberto nos dois lados | 1 · 2 · 3 · 4 | Harmónico |
| Tubo fechado num lado | 1 · 3 · 5 · 7 | Só harmónicos ímpares |
| Corda rígida | n·√(1 + B·n²) | B é a inarmonicidade; B ≈ 0 numa corda ideal |
| Cavidade de ar esférica (bola cheia de ar) | ka = 2,082 (l = 1), 3,342 (l = 2), 4,493 (modo radial) | f = ka·c/(2πa). Para a = 0,12 m: cerca de 950, 1520 e 2040 Hz; cálculo próprio |

O Csound tem a tabela mais completa e fácil de copiar (sinos, copos, panelas, tigelas tibetanas, uma barra de alumínio medida com 1 · 2,756 · 5,423 · 8,988…) ([Csound, Apêndice E](https://csound.com/manual/MiscModalFreq.html)). As pequenas diferenças entre fontes vêm do material e das condições de fronteira. **Os modos de um objeto real afastam-se sempre um pouco das razões ideais**, e é isso que lhe dá carácter.

### Como fazer uma pancada soar física

1. **Amortecimento proporcional à frequência.** Num material, a taxa de decaimento cresce com a frequência. O modelo usado por van den Doel, Klatzky e outros é `1/τ_k = π · f_k · tan φ`, em que *tan φ* é o atrito interno do material. Valores aproximados **(verificar)**: metal 10⁻⁴ a 10⁻³, vidro cerca de 10⁻³, madeira 10⁻² a 5·10⁻², borracha e plástico mole acima de 10⁻¹. É este parâmetro, mais do que a afinação, que nos diz "madeira" ou "metal". Na prática, junta-se um termo constante: `1/τ_k = α + β·f_k`, que dá o amortecimento de Rayleigh.
2. **Ganhos dependentes do ponto de impacto.** Numa barra, bater no centro silencia os modos pares. Sortear os ganhos em torno de um perfil (por exemplo `a_k ≈ 1/k^0,5` com ±30 %) dá variedade sem perder identidade.
3. **Dureza = brilho do ataque.** Uma pancada mais dura tem um contacto mais curto e excita mais os modos altos (secção 2). A força do golpe deve mudar **o volume e também o brilho**. Se só mudar o ganho, soa falso.
4. **Modos acima de 0,45·SR saem.** A 32 kHz, nada acima de cerca de 14 kHz.
5. **Fases aleatórias** quando se usam senos. Com todas as fases a zero, a soma começa com um pico agudo e o ataque soa a "clique digital".
6. **Desafinação ligeira por instância** (±0,5 a 2 %) e pares de modos quase iguais (um modo dividido em dois, a 1 a 3 Hz de distância). Isto cria batimentos, que os objetos reais têm sempre.
7. **Um pouco de ruído no ataque** (1 a 5 ms, filtrado), para o "estalo" do contacto que os modos sozinhos não fazem.
8. **Radiação.** Uma placa grande irradia mal os graves. Um passa-altas suave no fim imita isso.

### Erros comuns

- Pôr demasiados modos com a mesma amplitude: soa a sino ou a acorde.
- Esquecer que o T60 de cada modo é diferente: soa a "eletrónico".
- Tempos de decaimento demasiado longos para um objeto pequeno: uma bola de basquete no chão de madeira dura dezenas de milissegundos, não segundos.

---

## 2. Excitação: rajadas de ruído e contacto de Hertz

### Rajada de ruído

A forma mais barata: ruído branco com envolvente exponencial curta (0,5 a 10 ms), passado por um filtro cuja frequência de corte representa a dureza. Excitar o banco modal com isto dá logo um som credível. É o que o `addBurst` do repositório faz.

### Contacto de Hertz e Hunt-Crossley

O modelo físico usado no SDT e no projeto Sounding Object é uma mola não linear entre o martelo e o ressoador:

```
F(x) = k · x^α                      (Hertz; α = 3/2 para duas esferas)
F(x, v) = k · x^α · (1 + μ·v)       (Hunt-Crossley, com perdas)
F = 0 quando x ≤ 0 (não há contacto)
```

*x* é a compressão e *v* a sua velocidade. Papetti, Avanzini e Rocchesso escrevem a força de Hunt-Crossley exatamente assim e notam que o modelo generaliza o de Hertz com um expoente variável ligado à forma do contacto ([Papetti et al., DAFx 2009](https://avanzini.di.unimi.it/downloads/publications/papetti_dafx09.pdf); [Papetti et al., TASLP 2011](https://avanzini.di.unimi.it/downloads/publications/papetti_taslp11.pdf)). Avanzini e Rocchesso mostram que o expoente depende da geometria local (1,5 entre duas esferas) e relacionam analiticamente o **tempo de contacto** com o **centróide espectral** do ataque, que é o que nos faz ouvir "duro" ou "mole" ([Avanzini e Rocchesso, SMC 2004](https://air.unimi.it/retrieve/dfa8b99e-f744-748b-e053-3a05fe0a3a96/avanzini_smc04_finalsub.pdf)).

Para o contacto de Hertz puro (sem perdas), entre um corpo de massa *m* a velocidade *v₀* e uma superfície rígida, a compressão máxima e a duração do contacto são (resultado clássico de mecânica, **verificar** a constante):

```
x_max = (5·m·v₀² / (4·k))^(2/5)
T_contacto ≈ 2,94 · x_max / v₀
```

Consequência útil: `T ∝ v₀^(−1/5)`. **Uma pancada mais forte é ligeiramente mais curta e por isso mais brilhante.**

### Duas formas de usar isto num pré-cálculo

**a) Simulação acoplada** (como o SDT). Integra-se o martelo como uma massa e o ressoador como modos, e a força de contacto liga-os, amostra a amostra:

```ts
// martelo: massa m, posição xh, velocidade vh; ressoador: soma de modos com deslocamento q_k
for (let n = 0; n < N; n++) {
  const xr = sumModeDisplacements();            // deslocamento do ressoador no ponto de contacto
  const comp = xh - xr;                         // compressão
  const F = comp > 0 ? k * comp * Math.sqrt(comp) * (1 + mu * vComp) : 0;   // α = 3/2 sem Math.pow
  vh -= (F / m) * dt; xh += vh * dt;            // o martelo é travado
  pushModes(F);                                 // a força entra em cada modo
}
```

Atenção à estabilidade numérica. Papetti et al. estudam esquemas que conservam a energia, porque o integrador simples pode ganhar energia no contacto e "explodir".

**b) Pulso de força pré-desenhado** (chega para efeitos de jogo). Usa-se uma janela de duração *T* com a forma aproximada da força de Hertz. Uma meia-sinusoide elevada a 3/2 serve bem: `F(t) = A · sin(π t / T)^1,5`, para 0 ≤ t ≤ T. O espetro desta janela é um passa-baixo com corte perto de 1/T:

| Contacto | T típico | Brilho |
|---|---|---|
| Borracha macia, bola pouco cheia | 5 a 10 ms | abafado |
| Bola de basquete bem cheia em madeira | 3 a 6 ms **(verificar)** | médio |
| Madeira contra madeira | cerca de 1 ms | seco |
| Metal contra metal | 0,1 a 0,3 ms | metálico, cheio de agudos |

Uma patente sobre sons e respostas hápticas usa precisamente o perfil de força de Hertz como sinal de excitação de um banco modal ([US 11416065](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11416065)).

**Quando usar:** sempre que o som é uma pancada entre sólidos (bola no chão, bola no aro, bola na tabela, passos). A rajada de ruído chega quando há sujidade e incerteza no contacto. O pulso de Hertz é melhor quando se quer que a força do golpe mude o timbre de modo coerente.

---

## 3. Ruído filtrado e síntese subtrativa

### Biquads segundo o *Audio EQ Cookbook* (RBJ)

O *cookbook* de Robert Bristow-Johnson está publicado como nota do W3C, adaptada com autorização para servir a Web Audio ([W3C, Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook); [cópia de 2011](https://w3.org/2011/audio/audio-eq-cookbook.html)). Definições comuns:

```
w0 = 2π·f0/Fs      cw = cos(w0)      sw = sin(w0)
α  = sw / (2Q)                                    (por Q)
α  = sw · sinh( ln(2)/2 · BW · w0/sw )            (por largura de banda em oitavas)
A  = 10^(dBgain/40)                               (só para picos e prateleiras)
y[n] = (b0·x[n] + b1·x[n−1] + b2·x[n−2] − a1·y[n−1] − a2·y[n−2]) / a0
```

| Tipo | b0 | b1 | b2 | a0 | a1 | a2 |
|---|---|---|---|---|---|---|
| Passa-baixo | (1−cw)/2 | 1−cw | (1−cw)/2 | 1+α | −2cw | 1−α |
| Passa-alto | (1+cw)/2 | −(1+cw) | (1+cw)/2 | 1+α | −2cw | 1−α |
| Passa-banda (pico de 0 dB) | α | 0 | −α | 1+α | −2cw | 1−α |
| Rejeita-banda | 1 | −2cw | 1 | 1+α | −2cw | 1−α |
| Passa-tudo | 1−α | −2cw | 1+α | 1+α | −2cw | 1−α |
| Pico (EQ) | 1+αA | −2cw | 1−αA | 1+α/A | −2cw | 1−α/A |

Prateleiras (com `s = 2·√A·α`):

```
Prateleira de graves:
  b0 =  A·((A+1) − (A−1)cw + s)    b1 = 2A·((A−1) − (A+1)cw)    b2 = A·((A+1) − (A−1)cw − s)
  a0 =    (A+1) + (A−1)cw + s      a1 = −2·((A−1) + (A+1)cw)    a2 =    (A+1) + (A−1)cw − s
Prateleira de agudos:
  b0 =  A·((A+1) + (A−1)cw + s)    b1 = −2A·((A−1) + (A+1)cw)   b2 = A·((A+1) + (A−1)cw − s)
  a0 =    (A+1) − (A−1)cw + s      a1 =  2·((A−1) − (A+1)cw)    a2 =    (A+1) − (A−1)cw − s
```

**Cuidados:**

- Normalizar dividindo tudo por `a0` uma única vez.
- Para **coeficientes que mudam no tempo** (varrimentos de filtro, como no "swish" da rede), a forma direta I com coeficientes recalculados a cada amostra pode dar estalidos. Prefere-se a forma direta II transposta, ou um *state-variable filter* (SVF, por exemplo o de Andrew Simper/Cytomic), que se modula bem. Recalcular a cada 16 a 32 amostras também resolve.
- A transformação bilinear comprime as frequências perto de Nyquist. A 32 kHz, um passa-banda a 12 kHz já fica deformado.
- Q muito alto mais ruído é um ressoador modal. As duas técnicas são a mesma coisa vista de lados diferentes.
- Os `BiquadFilterNode` da Web Audio usam estas mesmas fórmulas, mas cada browser tem a sua implementação. Fazer o filtro em TypeScript garante o mesmo resultado em todo o lado.

### Ruído rosa (−3 dB por oitava)

O filtro de Paul Kellet, publicado na lista music-dsp, é uma soma ponderada de filtros de primeira ordem. É exato a ±0,05 dB acima de 9,2 Hz, a 44,1 kHz ([musicdsp.org](https://www.musicdsp.org/en/latest/Filters/76-pink-noise-filter.html); [cópia no fórum JUCE](https://forum.juce.com/t/pink-noise-generator/40013/2)). O opcode `pinkish` do Csound usa o mesmo banco ([Csound](https://csound.com/manual/pinkish.html)).

```ts
// Kellet, versão "refinada" (coeficientes para 44,1 kHz; a 32 kHz a curva desvia-se um pouco)
let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
function pink(white: number): number {
  b0 = 0.99886*b0 + white*0.0555179;
  b1 = 0.99332*b1 + white*0.0750759;
  b2 = 0.96900*b2 + white*0.1538520;
  b3 = 0.86650*b3 + white*0.3104856;
  b4 = 0.55000*b4 + white*0.5329522;
  b5 = -0.7616*b5 - white*0.0168980;
  const p = b0+b1+b2+b3+b4+b5+b6 + white*0.5362;
  b6 = white*0.115926;
  return p * 0.11;   // ganho aproximado para ficar perto de ±1
}
```

Há uma versão "económica" com três polos e ±0,5 dB de erro. Outra opção é o algoritmo de Voss-McCartney, que soma geradores atualizados a ritmos que se dividem por dois. Um comentário no musicdsp avisa que os coeficientes de 44,1 kHz degradam-se a taxas de amostragem mais altas. A 32 kHz convém confirmar a curva com uma FFT.

### Ruído castanho (−6 dB por oitava)

É um integrador com fuga:

```ts
brown = (brown + 0.02 * white) / 1.02;   // ganho de saída ≈ ×3,5
```

### Para que serve cada cor

- **Branco:** ataques, estalos, "s" e "f".
- **Rosa:** vento, chuva distante, murmúrio de multidão, cauda de reverberação natural.
- **Castanho:** ronco, trovão, ar condicionado do pavilhão, ruído de fundo de uma rua.

O ruído filtrado é a base de quase tudo o que não tem altura definida: a rede ("swish"), a fricção da bola na mão, o ar, a multidão de longe.

---

## 4. Fricção e *stick-slip* (chiadeiras)

### Física

Uma chiadeira (sola de ténis em madeira encerada, porta, travão) nasce da **instabilidade do atrito**. O atrito estático é maior do que o cinético e diminui com a velocidade de deslizamento (efeito de Stribeck). O sistema prende (*stick*), acumula força elástica, solta-se (*slip*), volta a prender, e assim por diante. A frequência dos ciclos tende a fixar-se num modo do corpo que vibra: a sola, o soalho, a dobradiça.

Avanzini, Serafin e Rocchesso juntam um modelo de atrito **elastoplástico** a ressoadores modais. Conseguem esfregar, travar e portas a chiar, e o modelo reproduz o *stick-slip* e o pré-deslizamento a baixa velocidade. O modelo elastoplástico corrige um defeito do modelo LuGre, que não permite um regime puramente elástico e "deriva" ([Avanzini, Serafin e Rocchesso, IEEE 2005](https://search.isc.ac/inventory/49/1135648.htm); [Serafin et al., arco elastoplástico](https://www.academia.edu/749820/Bowed_string_simulation_using_an_elasto_plastic_friction_model)). O SDT inclui este interator de impacto e fricção ([SDT, interator](https://sdt.lim.di.unimi.it/docs/API/v2.2-078/group__interactor.html)).

### Modelo mínimo que chega para um jogo

Um oscilador de 1 grau de liberdade (o modo principal da sola), arrastado por uma superfície à velocidade `vb`, com uma curva de atrito de Stribeck:

```ts
// μ(v) = μk + (μs − μk)·e^(−(v/vs)²)  — sem Math.exp na simulação, mas na UI é permitido
function squeak(seconds: number, sr: number, vbTrack: (t: number) => number, f0 = 1800, r: Rng): Float32Array {
  const out = new Float32Array(Math.round(seconds * sr));
  const w0 = 2 * Math.PI * f0, zeta = 0.02;      // modo da sola
  const m = 1, k = m * w0 * w0, c = 2 * zeta * m * w0;
  const N = 1.0;                                  // força normal (controla o volume e a aspereza)
  const mus = 0.9, muk = 0.5, vs = 0.05;
  let x = 0, v = 0; const dt = 1 / sr;
  for (let n = 0; n < out.length; n++) {
    const vb = vbTrack(n * dt);
    const vrel = v - vb;
    const mu = muk + (mus - muk) * Math.exp(-(vrel / vs) ** 2);
    const Ff = -Math.sign(vrel) * mu * N * k * 1e-3;   // escala empírica
    const a = (Ff - c * v - k * x) / m;
    v += a * dt; x += v * dt;                     // Euler semi-implícito
    out[n] = v * (1 + 0.05 * (r() - 0.5));        // pequena irregularidade
  }
  return out;
}
```

Isto já dá um tom com harmónicos ricos (a forma de onda do *stick-slip* é quase dente de serra). Depois passa-se por 2 ou 3 ressoadores (sola, piso) e por um passa-alto.

**Atalho sem física** (muitas vezes suficiente): um trem de impulsos ou dente de serra com período *T(t)* que varia depressa e de modo irregular (jitter de 2 a 8 %), com *glissando* curto de 1,5 a 4 kHz para cima ou para baixo, uma envolvente de 60 a 200 ms e dois passa-bandas (Q de 4 a 10). O *stick-slip* real tem saltos entre regimes (modo 1, modo 2, silêncio), que se imitam trocando a frequência de forma brusca 1 ou 2 vezes por chiadeira.

**Cuidados:** o integrador de Euler explícito puro instabiliza. Usa-se o semi-implícito, como acima, ou sobreamostragem ×2. Os harmónicos do dente de serra podem dobrar acima de Nyquist (secção 13).

---

## 5. Karplus-Strong e guias de onda

### Karplus-Strong

Uma linha de atraso de comprimento *N* cheia de ruído, com uma média de duas amostras na realimentação:

```
y[n] = x[n] + g · ½·(y[n−N] + y[n−N−1])
f0 ≈ Fs / (N + ½)
```

Extensões de Jaffe e Smith, de 1983 ([Computer Music Journal 7(2)](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis); [Smith, CCRMA](https://ccrma.stanford.edu/~jos/smith-nam/Karplus_Strong_Algorithms.html)):

- **Afinação fina** com um passa-tudo de primeira ordem na malha: `C = (1−Δ)/(1+Δ)`, em que Δ é a parte fracionária do atraso.
- **Esticar o decaimento:** trocar ½,½ por (1−S), S.
- **Controlar o brilho** com um passa-baixo na excitação, que dá uma "dinâmica".
- **Variante de tambor:** inverter o sinal da realimentação com probabilidade *b*. Com b = 0,5 soa a caixa ou a ruído com corpo.

```ts
function pluck(f0: number, seconds: number, sr: number, r: Rng, decay = 0.996): Float32Array {
  const N = Math.max(2, Math.round(sr / f0 - 0.5));
  const buf = new Float32Array(N).map(() => r() * 2 - 1);
  const out = new Float32Array(Math.round(seconds * sr));
  let i = 0, prev = 0;
  for (let n = 0; n < out.length; n++) {
    const cur = buf[i];
    buf[i] = decay * 0.5 * (cur + prev);
    prev = cur; out[n] = cur; i = (i + 1) % N;
  }
  return out;
}
```

### Guias de onda digitais

Generalização de Smith: duas linhas de atraso (ondas a ir e a voltar) com filtros nas extremidades e **junções de dispersão** onde se ligam várias secções. Daqui saem cordas, tubos, membranas (malhas 2D) e a **síntese comutada**, em que a resposta do corpo é posta na excitação. Tudo isto está no livro *Physical Audio Signal Processing* ([Smith, PASP](https://ccrma.stanford.edu/~jos/pasp)).

**Quando usar no jogo:** a rede de corrente de um cesto de rua (cada elo é uma "corda" curta e muito amortecida, que é mais barato com Karplus-Strong do que com modos), molas da tabela, vibração de um poste metálico, apito com tubo. Para pancadas em sólidos, a síntese modal é mais simples e controlável.

**Cuidados:** a afinação por arredondamento de N desafina bastante as notas agudas (a 32 kHz, 2 kHz corresponde a N ≈ 16, e um erro de meia amostra é cerca de meio tom). O som decai mais depressa nas notas agudas: compensa-se com *g*.

---

## 6. FM para metais e sinos

### Fórmula

```
y(t) = A(t) · sin(2π·fc·t + I(t)·sin(2π·fm·t))
bandas laterais em fc ± k·fm, com amplitudes J_k(I) (funções de Bessel)
largura de banda de Carson ≈ 2·(I·fm + fm)
```

O espetro é **harmónico** quando fc:fm é uma razão de inteiros pequenos (1:1, 1:2, 2:1, 3:2) e **inarmónico** quando não é. A grande ideia de Chowning foi **ligar o índice I à envolvente**: quando a intensidade cai, o índice cai também, e o som passa de um timbre complexo e inarmónico a quase uma sinusoide amortecida ([entrevista com Chowning](https://homepages.abdn.ac.uk/d.j.benson/pages/html/Chowning.html); [Cycling '74, tutorial de FM](https://docs.cycling74.com/legacy/max5/tutorials/msp-tut/mspchapter11.html)).

### O sino clássico

Razão fc:fm não inteira, índice alto no início (cerca de 10) a descer exponencialmente, e envolvente de amplitude longa e exponencial. A receita citada com mais frequência para o artigo de Chowning de 1973 é **fc:fm = 1:1,4** (por exemplo 200:280 Hz) com decaimento de vários segundos **(verificar)**. Uma página da Georgia Tech, que cita o mesmo artigo, lista um sino com portadora de 110 Hz e modulante de 210 Hz ([Georgia Tech](https://dspfirst.gatech.edu/chapters/03spect/demosLV/fmsynth/index.html)). O princípio é o mesmo: razão inarmónica, índice a cair, decaimento longo.

### Como **não** soar a sino (para o aro, a tabela, um cacifo, um poste)

O "sino" vem de três coisas juntas: **parciais inarmónicos estáveis, decaimento longo e poucos parciais claros**. Para um "clang" curto de metal:

1. **O índice cai muito mais depressa do que a amplitude.** Por exemplo, I de 6 a 0 em 5 a 30 ms, e a amplitude em 150 a 400 ms. O ruído metálico fica no ataque e depois sobra um tom quase puro e curto.
2. **Decaimento curto e amortecimento forte** dos parciais altos.
3. **Várias portadoras ligeiramente desafinadas** (ou dois pares de FM em paralelo com razões diferentes, como 1:1,41 e 1:2,73), para dissolver a sensação de "nota".
4. **Ruído no ataque** e um passa-banda largo por cima.
5. Se se quer um metal **com nota mas sem sino**, usam-se razões inteiras (harmónico) com índice moderado.
6. Muitas vezes é melhor **trocar FM por síntese modal** (razões de anel ou de tubo, secção 1) com amortecimento de metal. Fica mais controlável e mais "físico". A FM ganha quando é preciso muito timbre a custo muito baixo, ou quando se quer um carácter mais "eletrónico" (como num marcador de pavilhão).
7. Alternativa clássica para pratos e chimbaus: somar seis ondas quadradas a frequências sem relação entre si e passar por um passa-banda alto. É a técnica das caixas de ritmos analógicas **(verificar as frequências exatas)**.

**Aliasing:** se `fc + (I+1)·fm` passar de Nyquist, as bandas dobram. A 32 kHz, com fm = 2 kHz e I = 8, já se chega perto de 18 kHz. Limita-se I em função de fm, ou faz-se a FM a 2× e reduz-se depois.

---

## 7. Síntese de vozes por formantes

### Fonte e filtro

1. **Fonte glotal:** um trem de impulsos (ou dente de serra) à frequência F0 com inclinação espectral de −12 dB por oitava. Uma forma melhor é o pulso de Rosenberg:

```
g(t) = ½·(1 − cos(π·t/T1))            para 0 ≤ t < T1         (abertura; T1 ≈ 0,40·T0)
g(t) = cos(π·(t − T1)/(2·T2))          para T1 ≤ t < T1 + T2   (fecho;   T2 ≈ 0,16·T0)
g(t) = 0                                no resto do período
```

   Depois deriva-se o pulso (a radiação dos lábios é como um diferenciador). O modelo LF é a referência mais realista. O Klatt original usava impulsos passados por um ressoador e um anti-ressoador glotais ([Klatt 1980](https://www.fon.hum.uva.nl/david/ba_shs/2009/klatt-1980.pdf); [modelos glotais, JASA 2021](https://hal.archives-ouvertes.fr/hal-03322875/file/JASA-GF-models-2021-1273_1.pdf)).
2. **Ruído de aspiração** (5 a 15 % para uma voz normal, mais num grito rouco ou num sussurro), modulado pelo período glotal.
3. **Trato vocal:** 3 a 5 ressoadores de 2 polos, em **cascata** (mais fiel para vogais) ou em **paralelo** (dá controlo direto das amplitudes, melhor para multidões e consoantes). O Klatt explica as duas formas.

```ts
// Ressoador de formante (2 polos) com frequência F e largura de banda B, em Hz
function formantCoefs(F: number, B: number, sr: number) {
  const r = Math.exp(-Math.PI * B / sr);
  return { a1: -2 * r * Math.cos(2 * Math.PI * F / sr), a2: r * r, g: 1 - r };   // y = g·x − a1·y1 − a2·y2
}
```

### Tabela de formantes (Peterson e Barney, 1952, inglês americano)

Valores médios em Hz ([CCRMA, formantes](https://ccrma.stanford.edu/~kglee/m220c/formant.html); [Princeton](https://www.cs.princeton.edu/courses/archive/spr99/cs325/formants.html); [Praat](https://www.fon.hum.uva.nl/praat/manual/Create_formant_table__Peterson___Barney_1952_.html)):

| Vogal (exemplo) | Homem F1/F2/F3 | Mulher F1/F2/F3 | Criança F1/F2/F3 |
|---|---|---|---|
| i (*beet*) | 270 / 2290 / 3010 | 310 / 2790 / 3310 | 370 / 3200 / 3730 |
| ɪ (*bit*) | 390 / 1990 / 2550 | 430 / 2480 / 3070 | 530 / 2730 / 3600 |
| ɛ (*bet*) | 530 / 1840 / 2480 | 610 / 2330 / 2990 | 690 / 2610 / 3570 |
| æ (*bat*) | 660 / 1720 / 2410 | 860 / 2050 / 2850 | 1010 / 2320 / 3320 |
| ɑ (*father*, "á") | 730 / 1090 / 2440 | 850 / 1220 / 2810 | 1030 / 1370 / 3170 |
| ɔ (*bought*) | 570 / 840 / 2410 | 590 / 920 / 2710 | 680 / 1060 / 3180 |
| ʊ (*book*) | 440 / 1020 / 2240 | 470 / 1160 / 2680 | 560 / 1410 / 3310 |
| u (*boot*) | 300 / 870 / 2240 | 370 / 950 / 2670 | 430 / 1170 / 3260 |
| ʌ (*but*) | 640 / 1190 / 2390 | 760 / 1400 / 2780 | 850 / 1590 / 3360 |

As linhas de /ɪ ɛ æ ɔ ʊ ʌ/ e a coluna das crianças vêm da tabela clássica, e a pesquisa só confirmou diretamente /i/, /u/ e "ah" **(verificar)**. Watrous (1991) publicou correções a estes dados. Para o português, as vogais equivalentes chegam bem: "á" ≈ ɑ, "é" ≈ ɛ, "ê" ≈ e (entre ɪ e ɛ), "i", "ó" ≈ ɔ, "u".

**Larguras de banda típicas:** F1 de 60 a 100 Hz, F2 de 90 a 150 Hz, F3 de 120 a 250 Hz. Num grito, ou numa multidão longe, alargam-se.

**Escalar vozes:** mulheres têm formantes cerca de 15 a 20 % acima dos homens e crianças cerca de 30 %. Multiplicar todos os F por um fator de "comprimento do trato" de 0,9 a 1,3 dá pessoas diferentes a partir da mesma tabela.

### Gritos e vozes de multidão

- **Um grito não é só uma voz mais alta.** F0 sobe (muitas vezes 1 oitava ou mais: 200 a 400 Hz num homem, 300 a 600 Hz numa mulher), F1 sobe (a boca abre-se mais), a inclinação espectral fica mais plana (mais harmónicos agudos) e há mais ruído e irregularidade **(verificar os valores)**.
- **Prosódia:** "Hey!" é um ataque rápido com F0 a subir e a cair. "Ooh" é /u/ a passar a /ɔ/, com F0 que sobe e desce lentamente. "Aah" é ɑ. "Defesa!" é ritmo e várias vogais.
- **Microvariação:** *jitter* de F0 de 0,5 a 2 %, *shimmer* de amplitude de 3 a 10 %, vibrato lento de 4 a 6 Hz e 10 a 30 cents. Sem isto soa a sintetizador.
- **Multidão:** N vozes (8 a 40 chegam), cada uma com F0, trato, atraso de início (0 a 150 ms), duração e posição estéreo diferentes, somadas e passadas pela sala. Acima de uma ou duas dezenas, junta-se uma "cama" de ruído rosa com a forma do espetro de voz e com a envolvente do grupo.

Paul Weir falou na GDC 2017 de um *plugin* de síntese do trato vocal feito para as criaturas de *No Man's Sky* ([GDC Vault](https://gdcvault.com/play/1024067/The-Sound-of-No-Man)), o que mostra que a síntese de vozes por formantes é usada em jogos comerciais.

---

## 8. Texturas granulares e estocásticas

A ideia comum: **um evento curto bem feito, repetido por um processo aleatório com densidade, ritmo e espaço controlados.** O PhISEM de Perry Cook reduz o comportamento de um chocalho a estatísticas: eventos aleatórios com envolventes exponenciais a excitar ressoadores. Generaliza-se a qualquer sistema com muitos objetos semi-aleatórios: maracas, pandeiretas, guizos, cascalho e neve debaixo dos pés ([Cook, PhISEM](https://soundlab.cs.princeton.edu/research/phism); [NIME 2018](https://www.nime.org/proceedings/2018/nime2018_paper0080.pdf)).

### Aplausos como soma de palmas

Peltola, Erkut, Cook e Välimäki propõem dois sistemas que **separam a síntese de cada palma da geração dos eventos**: um eficiente para grandes plateias e outro com mais controlo do estilo de bater palmas ([IEEE TASLP 15(3), 2007](https://manuscript.isc.ac/Inventory/49/1118256.htm)). Cada configuração das mãos (palmas abertas, em concha, desencontradas) dá um ressoador com frequência e Q diferentes.

```ts
// Uma palma: rajada de ruído + ressoador da configuração das mãos
function clap(out: Float32Array, at: number, r: Rng, sr: number, gain: number) {
  const fc = 900 + r() * 1600;          // 0,9 a 2,5 kHz (verificar com gravações)
  const q  = 1.5 + r() * 3;
  const tau = (0.004 + r() * 0.010) * sr;   // 4 a 14 ms
  // ruído com ataque de ~0,5 ms e decaimento exponencial, passado por passa-banda (fc, q)
}

// Um espetador: ritmo próprio (2,5 a 5 palmas/s), jitter de 5 a 10 % e energia que muda
function clapper(out: Float32Array, seconds: number, r: Rng, sr: number) {
  const rate = 2.5 + r() * 2.5, jitter = 0.05 + r() * 0.05;
  for (let t = r() / rate; t < seconds; t += (1 / rate) * (1 + jitter * (r() * 2 - 1))) {
    clap(out, Math.round(t * sr), r, sr, envelopeOfCrowd(t) * (0.6 + 0.4 * r()));
  }
}
```

- **Envolvente da multidão:** subida em 0,3 a 1 s, sustentação e queda lenta em 1 a 3 s, com espetadores que param em momentos diferentes. O fim é o que denuncia aplausos falsos.
- **Distância:** espetadores mais longe ficam mais baixos, com menos agudos (passa-baixo) e mais reverberação.
- **Muita gente:** acima de umas centenas de palmas por segundo o ouvido já não separa os eventos. Faz-se então um modelo híbrido, com 20 a 60 espetadores "perto" sintetizados um a um e uma "cama" de ruído filtrado (1 a 3 kHz) com modulação de amplitude aleatória por cima. É o compromisso que Peltola et al. fazem para grandes plateias.
- **Aplauso sincronizado** (bater ao ritmo): todos os espetadores com o mesmo período e uma fase com dispersão pequena (20 a 60 ms).

### Murmúrio de multidão (*babble*)

- **Com vozes:** M vozes de formantes a "falar" sílabas falsas: 4 a 6 sílabas por segundo, uma vogal sorteada por sílaba, uma consoante como rajada de ruído entre sílabas, F0 com entoação a cair no fim das frases e pausas. Com 6 a 8 vozes deixa de se perceber o que dizem. A partir de 20 a 30 fica quase ruído.
- **Barato:** ruído rosa com a forma do espetro médio da voz (pico perto de 500 Hz e queda de cerca de −6 dB por oitava acima de 1 kHz), com modulação de amplitude entre 2 e 8 Hz (o ritmo das sílabas), mais 3 a 5 vozes de primeiro plano. É quase impossível distinguir de uma gravação ao fundo de um jogo.
- **Reação a acontecimentos:** a mesma multidão com uma envolvente global ("ooh" ao falhar, explosão ao marcar) é o que dá vida.

### Chuva

Cada gota é um evento com dois componentes: **o impacto** (clique curto, de banda larga) e, em água, **a bolha** que ressoa à frequência de Minnaert, `f ≈ 3,26 / a` Hz (com *a* o raio em metros; a = 1 mm dá cerca de 3,3 kHz), muitas vezes com um *chirp* a subir. Este modelo vem de van den Doel, "Physically based models for liquid sounds" **(verificar)**. A densidade (gotas por segundo) e a distribuição dos tamanhos controlam se é chuvisco ou temporal. Ao longe, junta-se ruído rosa filtrado. A oficina de Pure Data de Farnell trata fogo, água a correr, bolhas, vento e chuva ([goto10, oficina de Pd](https://goto10.org/pure-data-and-sound-design-workshop/)).

### Cuidados

- O processo de Poisson (intervalos exponenciais) soa natural para eventos independentes. Para pessoas a bater palmas, cada uma tem o seu próprio período quase regular.
- O pico de muitos eventos que coincidem por acaso pode saturar. Normaliza-se a soma (secção 12).
- O gerador tem de ser um só e determinista: uma semente por espetador, derivada da semente do som.

---

## 9. Envolventes, inícios e fins sem estalidos

### Formas

- **Exponencial** (`a *= d` por amostra, com `d = e^(−1/(τ·SR))`): é a forma natural do decaimento de qualquer ressoador e soa "certa" ao ouvido, porque a perceção de volume é logarítmica.
- **Linear:** soa a ser cortado. Serve para *fades* curtos e cruzamentos.
- **Ataque em potência ou em coseno elevado** (`½·(1−cos(π·t/Ta))`): é suave e não tem descontinuidade na derivada.
- **ADSR:** para sons sustentados (buzina, apito, vozes). As fases de decaimento e de libertação devem ser exponenciais.
- **Envolvente multi-segmento** (pontos e curvas): é o que o `reader(track)` do repositório faz. É a forma mais geral.

### Estalidos

Um estalido é uma **descontinuidade no valor ou na derivada** do sinal. Regras:

1. **Ataque mínimo de 1 a 5 ms** em sons sem ataque percussivo. Um impacto pode ter ataque "instantâneo" se a forma de onda começar em zero (seno com fase zero, ou excitação por pulso).
2. **Fade final de 5 a 20 ms**, sempre. Cortar uma cauda em −40 dB ouve-se. Corta-se em −60 a −80 dB e faz-se o fade nesse ponto.
3. **Retirar o DC.** Ruído assimétrico, pulsos glotais e fricção deixam um desvio que dá um "tump" no início e no fim. Usa-se um passa-alto de um polo: `y = x − x1 + R·y1`, com R ≈ 0,995 (cerca de 25 Hz a 32 kHz).
4. **Ao tocar:** na Web Audio, para parar uma fonte a meio, faz-se uma rampa no `GainNode` de 5 a 15 ms antes do `stop()`. Rampas exponenciais (`exponentialRampToValueAtTime`) não podem chegar a 0: usa-se `setTargetAtTime` ou uma rampa linear até 0.
5. **Em ciclos** (murmúrio, ar condicionado), o fim tem de encaixar no início. Faz-se um cruzamento de potência constante de 50 a 200 ms entre o fim e o início do *buffer*.

---

## 10. Reverberação por convolução com respostas ao impulso sintéticas

### Modelo

A cauda de uma sala é, em boa aproximação, **ruído gaussiano com decaimento exponencial**:

```
h(t) = n(t) · e^(−6,91 · t / T60)
```

O que a torna credível:

1. **Decaimento por banda.** Os agudos morrem mais depressa (absorção do ar e das superfícies). Gera-se ruído independente em 4 a 8 bandas (filtros passa-banda ou um banco de *crossovers*), cada uma com o seu T60, e soma-se. Uma alternativa barata é um passa-baixo variável no tempo, cuja frequência de corte desce durante a cauda. Jot e Chaigne aplicaram a mesma ideia às redes de atraso com realimentação: cada linha tem um filtro de amortecimento para que todas decaiam ao mesmo ritmo em cada frequência ([Valhalla DSP, artigos fundamentais](https://valhalladsp.com/2021/09/22/getting-started-with-reverb-design-part-2-the-foundations/)).
2. **Pré-atraso** (*predelay*): 5 a 40 ms entre o som direto e a cauda. Diz-nos o tamanho da sala.
3. **Primeiras reflexões:** 4 a 12 impulsos esparsos entre 5 e 80 ms, com amplitudes de cerca de 1/distância e um pouco de filtragem. Para uma sala em forma de caixa, usa-se o método das imagens (*image source*). Moorer já modelava as primeiras reflexões com um FIR esparso, isto é, uma linha de atraso com derivações ([Moorer, "About this reverberation business"](https://freeverb3-vst.sourceforge.io/doc/aboutThisReverberationBusiness.pdf)).
4. **Densidade crescente:** no início a cauda é esparsa e depois enche-se. O ruído *velvet* (impulsos ±1 esparsos) imita bem isto e é barato de convolver.
5. **Canais independentes:** ruído diferente em L e R dá uma cauda larga e descorrelacionada (secção 11).

```ts
function synthIR(sr: number, t60: number[], bandsHz: number[], pre: number, r: Rng): Stereo {
  const len = Math.round(sr * (pre + Math.max(...t60) * 1.1));
  const L = new Float32Array(len), R = new Float32Array(len);
  for (const ch of [L, R]) for (let b = 0; b < bandsHz.length; b++) {
    const noise = bandpass(whiteNoise(len, r), bandsHz[b], 1.0, sr);   // biquad RBJ
    const d = Math.exp(-6.91 / (t60[b] * sr));
    let g = 1;
    for (let n = Math.round(pre * sr); n < len; n++) { ch[n] += noise[n] * g; g *= d; }
  }
  addEarlyReflections(L, R, sr, r);
  return normalizeEnergy([L, R]);
}
```

### Valores típicos (aproximados)

| Espaço | T60 a médias frequências | Pré-atraso | Notas |
|---|---|---|---|
| Rua ou recinto ao ar livre | sem cauda | — | 1 a 3 ecos de prédios a 20–120 ms e mais nada |
| Ginásio de escola | 1,5 a 2,5 s | 10–20 ms | muito brilhante, paredes duras |
| Pavilhão médio | 1,5 a 2,5 s | 20–30 ms | |
| Arena grande | 2 a 3,5 s **(verificar)** | 30–50 ms | muito tratada, mas enorme; cauda escura |
| Balneário ou corredor | 0,8 a 1,2 s | 3–8 ms | ressonâncias fortes |

### Aplicar: cozinhar ou tocar

- **No `ConvolverNode` ao tocar:** a convolução faz-se em código nativo com FFT por partições e é barata. Atenção: `normalize` vem `true` por omissão e aplica uma normalização de potência quando se atribui o `buffer`. Para controlar o nível, põe-se `normalize = false` **antes** de atribuir o *buffer* ([MDN, ConvolverNode.normalize](https://backiee.wasmer.app/https_developer_mozilla_org/en-US/docs/Web/API/ConvolverNode/normalize)). O Tone.js faz a sua `Reverb` precisamente assim: gera uma resposta ao impulso de ruído com decaimento numa renderização offline e entrega-a a um `ConvolverNode` ([Tone.js, Reverb](https://tonejs.github.io/docs/r13/Reverb)).
- **Cozinhar no buffer, em TypeScript:** a convolução direta custa O(N·M). Nesta máquina, um som de 0,1 s com uma resposta de 2 s a 48 kHz levou cerca de **0,65 s** (secção 15). Isto é demasiado num telemóvel. Se tiver de ser à mão, faz-se FFT com sobreposição e soma (*overlap-add*), ou usa-se uma rede de atrasos com realimentação (FDN) ou um Freeverb (8 pentes com passa-baixo em paralelo e 4 passa-tudos em série ([DSPRelated, Freeverb](https://dsprelated.com/freebooks/pasp/Freeverb.html))), que custa poucos milissegundos por segundo.
- **Recomendação prática:** guarda-se o som seco e aplica-se a sala num envio partilhado (um `ConvolverNode` por sala, com envio por som). Poupa memória e tempo de cálculo e deixa trocar de sala sem refazer nada.

---

## 11. Largura estéreo e descorrelação

- **Pan de potência constante:** `θ = (p+1)·π/4`, `gL = cos θ`, `gR = sin θ`, com p de −1 a 1. Mantém o volume percebido ao mover o som.
- **Mid/Side:** `M = (L+R)/2`, `S = (L−R)/2`. Multiplicar S por um fator alarga ou estreita. Útil para ajustar a cauda da sala.
- **Fontes independentes:** a forma mais limpa de ter largura num som estocástico (multidão, aplausos, chuva, cauda de reverberação) é **gerar L e R com sementes diferentes**, ou espalhar as fontes individuais pelo estéreo.
- **Descorrelação por passa-tudos:** dois filtros que só mudam a fase, com respostas de fase aleatórias e pouco correlacionadas. O trabalho de referência é Kendall (1995, *Computer Music Journal* 19(4)). Kermit-Canfield e Abel propõem passa-tudos informados pela perceção ([DAFx 2016](https://dafx.de/paper-archive/details/BwaPcK1lWIQN_fnzx_EL3g); [CCRMA](https://ccrma.stanford.edu/~kermit/website/decorrelation.html)). Um alargador do DAFx 2024 usa convolução com ruído *velvet* ou cascatas de passa-tudos ([DAFx 2024](https://dafx.de/paper-archive/2024/papers/DAFx24_paper_92.pdf)). Funciona bem em caudas e texturas. Em ataques secos espalha os transientes.
- **Efeito de Haas** (atrasar um canal 1 a 30 ms): alarga muito, mas, **somado em mono, faz filtro de pente.**

**A compatibilidade mono importa muito aqui.** Muitos telemóveis, sobretudo na vertical, têm um só altifalante ou um par muito desequilibrado. Regras:

1. Os sons de jogo importantes (bola, aro, apito, buzina) ficam **mono e ao centro**, ou com pan pequeno pela posição no campo.
2. Só os ambientes e a reverberação são largos.
3. Testa-se a soma `L+R`: se perder mais de 3 dB em relação ao estéreo, a largura é falsa.
4. Um coeficiente de correlação entre 0,3 e 0,7 nas texturas é um bom alvo.

---

## 12. Normalização e intensidade (LUFS)

### Pico, RMS e intensidade percebida

- **Normalizar pelo pico** (por exemplo a 0,9, ou −1 dBFS) evita saturação mas não iguala volumes. Uma palma e um ronco com o mesmo pico soam muito diferentes. O `normalize(s, 0.9)` do repositório faz isto.
- **RMS:** mais perto da perceção, mas ignora que o ouvido é mais sensível entre 1 e 5 kHz.
- **LUFS (ITU-R BS.1770):** filtro K (uma prateleira de agudos de cerca de +4 dB acima de 1,5 kHz, que modela a cabeça, e um passa-alto perto de 38 Hz), média quadrática, soma dos canais e:

```
L_K = −0,691 + 10·log10( Σ_canais G_i · média(z_i²) )        [LUFS]
```

Coeficientes a 48 kHz ([ITU-R BS.1770-5](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!MSW-E.docx); [BS.1770-3](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-3-201208-S!!MSW-E.docx)):

```
Fase 1 (prateleira): b = [1,53512485958697, −2,69169618940638, 1,19839281085285]
                     a = [1, −1,69065929318241, 0,73248077421585]
Fase 2 (passa-alto): b = [1, −2, 1]
                     a = [1, −1,99004745483398, 0,99007225036621]
```

Para outras taxas (por exemplo 32 kHz) recalcula-se com uma prateleira RBJ (cerca de +4 dB, 1681 Hz, Q ≈ 0,71) e um passa-alto RBJ (cerca de 38 Hz, Q ≈ 0,5) **(verificar com a resposta de referência)**.

- **Integrado com *gating*:** blocos de 400 ms sobrepostos 75 %. Ignoram-se os blocos abaixo de −70 LUFS (limiar absoluto) e depois os que ficam mais de 10 LU abaixo da média (limiar relativo). Estes limiares não foram confirmados nesta pesquisa **(verificar)**.
- **Sons curtos (menos de 400 ms):** o integrado não faz sentido. Usa-se a intensidade *momentânea* máxima (janela de 400 ms) ou o RMS ponderado K da parte principal do som. Igualam-se as categorias assim e depois ajusta-se de ouvido.

### Alvos

- Consolas: cerca de −23 a −24 LUFS. Portáteis: cerca de −18 LUFS. Verdadeiro pico máximo −1 dBTP. Gama de intensidade (*loudness range*) até 20 LU. São as recomendações da Sony e do ASWG, citadas em segunda mão ([Designing Sound, Garry Taylor](https://designingsound.org/2013/02/different-loudness-ranges-for-console-and-mobile-games/); [ITU-R BS.2434](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf)).
- Para um jogo de browser em telemóvel: a **mistura completa** perto de −16 a −18 LUFS.

### Na prática, para o pré-cálculo

1. Normaliza-se cada som a uma **intensidade de referência** (K-ponderada), não ao pico.
2. Guarda-se uma tabela de ganhos por categoria (bola, aro, apito, multidão, música) num único sítio.
3. Na saída, um `DynamicsCompressorNode` com limiar alto, como limitador de segurança, porque dez sons em simultâneo saturam.
4. Atenção aos sons graves: em altifalantes de telemóvel abaixo de 200 a 300 Hz quase não se ouve nada. Um impacto "gordo" tem de ter também conteúdo em 500 Hz a 2 kHz para existir no telemóvel.

---

## 13. *Aliasing* e sobreamostragem

A 32 kHz, Nyquist é 16 kHz. **Qualquer componente acima dobra para baixo** e aparece como um tom inarmónico que não devia estar lá.

| Origem | Risco | Solução |
|---|---|---|
| Dente de serra, quadrada ou pulso "ingénuos" | alto (buzina, alarmes) | Síntese aditiva até Nyquist, BLIT ou **PolyBLEP** ([Välimäki e Huovilainen, 2007](https://paulbatchelor.github.io/sndkit/blep)) |
| FM com índice alto | médio | Limitar `fc + (I+1)·fm < 0,45·SR` |
| Saturação, *clipping*, *waveshaping* | alto | Sobreamostrar 2 a 8×, passa-baixo, reduzir. Ou ADAA/BLAMP ([Esqueda et al.](https://core.ac.uk/download/77046162.pdf)) |
| Modos acima de Nyquist | evitável | Não os gerar |
| Ruído | nenhum | — |
| Filtros perto de Nyquist | deformação da curva, não *aliasing* | Pré-distorcer a frequência, ou usar uma taxa mais alta |
| Mudar `playbackRate` ao tocar | baixo a médio | ±10 % está bem. Mais do que isso, renderiza-se uma variante |

```ts
// PolyBLEP: corrige o salto do dente de serra perto da descontinuidade (t = fase em [0,1), dt = f/SR)
function polyBlep(t: number, dt: number): number {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
// saw = 2·fase − 1 − polyBlep(fase, dt)
```

**Quando sobreamostrar:** só nos sons com não-linearidades fortes (distorção de uma buzina, saturação de um grito no altifalante do pavilhão, a fricção da chiadeira) ou com FM de índice alto. Com 2× e um bom passa-baixo de meia banda já se resolve quase tudo. O resto (modos, ruído filtrado, formantes com fonte filtrada) não precisa.

---

## 14. Variação e anti-repetição

O ouvido apanha depressa um som que se repete igual: é o "efeito metralhadora". Fournel apresenta o áudio procedimental como resposta à explosão de conteúdos e à necessidade de efeitos que não se repetem ([GDC 2010, Fournel](https://www.gdcvault.com/play/1012645/ProceduralAudio-for-Video-Games)). A indústria usa variações aleatórias de amostras, modulação de altura e de volume e sistemas *round-robin* ([IRPR Sound](https://sounddesign.irpr.agency/solutions/game-audio-repetitive/)).

### No pré-cálculo

1. **Grupos de variantes:** para cada tipo de som, renderizam-se K variantes (4 a 8 para sons muito frequentes, como os ressaltos da bola; 2 ou 3 para os raros), cada uma com a semente `hash(idDoSom, índice)`. Com sementes fixas, o resultado é sempre igual e pode guardar-se em *cache*.
2. **O que variar dentro de cada variante:** frequências dos modos ±1 a 2 %, decaimentos ±10 a 20 %, ganhos dos modos ±30 %, dureza do contacto (T ±20 %), cor do ruído, início do ruído, *jitter* de vozes.

### Ao tocar

3. **Escolha sem repetição:** um "saco baralhado" (tira-se ao calhas até esvaziar e depois volta a encher), ou uma escolha aleatória que exclui as últimas 1 ou 2 variantes tocadas.
4. **Microvariação barata:** `playbackRate` de ±2 a 4 % (cerca de ±35 a 70 cents) e ganho de ±1,5 dB. Não se exagera: a bola tem uma identidade.
5. **Ligar ao estado do jogo:** a velocidade da bola escolhe o nível e a variante "dura" ou "mole" (lembra: mais força dá mais brilho). Se o jogo usar a mesma semente para uma repetição, os sons também se repetem iguais, o que está certo.
6. **Limitar as vozes:** no máximo N instâncias do mesmo som ao mesmo tempo (por exemplo 3 ressaltos). A mais antiga é cortada com uma rampa curta.
7. **Ritmo natural:** em sequências (passos, dribles), uma pequena variação de tempo (5 a 15 ms) já tira o ar mecânico.

---

## 15. Desempenho do pré-cálculo em telemóveis lentos

### Medições nesta máquina

Node 22, x86 com 4 núcleos, 48 kHz, 10 segundos de áudio, resultado por segundo de áudio:

| Operação | ms por segundo de áudio |
|---|---|
| 20 modos com `Math.sin` por amostra | ~15,6 |
| 20 modos com ressoador recursivo de 2 polos | ~3,8 (≈ 0,19 ms por modo) |
| 1 biquad sobre ruído (com gerador congruencial) | ~0,9 |
| Convolução direta, 0,1 s de som × 2 s de resposta (total) | ~650 ms para o som inteiro |

Um telemóvel Android de gama baixa costuma ser **3 a 10 vezes mais lento** do que um portátil num ciclo destes **(estimativa; medir no aparelho)**. Ou seja, mesmo com 60 s de áudio, 30 modos e alguns filtros por som, o total fica na ordem de 0,3 a 0,5 s no portátil e de 1 a 4 s num telemóvel fraco. Isto é aceitável se não bloquear a interface. A convolução direta é a exceção: deve ir para o `ConvolverNode` ou ser feita por FFT.

### Estratégias

1. **Taxa de amostragem mais baixa:** 32 kHz (a do repositório) já poupa um terço em relação a 48 kHz. Para multidões e caudas, 22,05 ou 24 kHz chegam. O `AudioContext` reamostra ao tocar. A especificação só garante taxas entre 8 e 96 kHz em `createBuffer`, e fora disso o comportamento não está definido ([issue #2649 da Web Audio](https://github.com/WebAudio/web-audio-api/issues/2649)).
2. **Ordem de prioridade:** renderizar primeiro o que se ouve logo (bola, aro, apito, buzina) e só depois multidões, ambientes e variantes extra.
3. **Fatias de tempo no fio principal:** dividir em blocos de 8 a 16 ms (por som, ou por pedaço de *buffer*) e ceder o controlo entre eles (`setTimeout(0)`, `scheduler.yield()` onde existir, ou `requestIdleCallback`). Funciona em qualquer browser e não exige ficheiros extra.
4. **Worker:** o DSP em TypeScript puro corre bem num `Worker`. Devolve-se o `Float32Array` com `postMessage(buf, [buf.buffer])` (transferência sem cópia) e, no fio principal, `ctx.createBuffer(...)` e `copyToChannel(...)`, que é uma cópia rápida em código nativo. O `AudioContext` e o `OfflineAudioContext` **não** existem dentro de Workers (há um pedido aberto na especificação), por isso os nós nativos ficam no fio principal ([issue #2423](https://github.com/WebAudio/web-audio-api/issues/2423)). Num jogo que tem de caber numa só página (`build-page`), o Worker pode criar-se a partir de um `Blob` com o código em texto.
5. **`OfflineAudioContext` em vez de DSP manual:**
   - **A favor:** nós nativos rápidos (FFT da convolução, biquads, osciladores sem *aliasing*). Renderiza tão depressa quanto pode.
   - **Contra:** cada browser implementa os nós à sua maneira, por isso **o resultado não é igual em todo o lado**. Criar milhares de nós tem um custo próprio. É assíncrono. O Safari teve limites (por exemplo, não aceitar menos de 44,1 kHz num `OfflineAudioContext`, segundo uma biblioteca de compatibilidade ([standardized-audio-context](https://socket.dev/npm/package/standardized-audio-context/overview/^25.3.57))).
   - **Conclusão:** DSP manual para os sons (determinista, testável em Node, já é o caminho do repositório). `ConvolverNode` ao vivo para a sala. Se for preciso cozinhar uma sala num som, um `OfflineAudioContext` só com `BufferSource` → `Convolver` é a forma mais rápida.
6. **Cache:** com sementes fixas, os *buffers* são sempre iguais. Pode guardar-se o resultado em IndexedDB (com `try/catch`) para não recalcular na visita seguinte. Mas medir antes: se o cálculo demora menos de 1 s, não vale a complexidade.
7. **Memória:** 1 s mono em float32 a 32 kHz são 128 KB. 60 s de som estéreo são cerca de 15 MB. Telemóveis com pouca RAM sentem-no. Os ambientes longos fazem-se em ciclo (5 a 10 s com cruzamento) e não com um minuto inteiro.
8. **Política de *autoplay*:** os `AudioBuffer` podem criar-se antes do primeiro toque do jogador. Só o `ctx.resume()` precisa do gesto.

### Micro-otimizações que contam em JavaScript

- Variáveis de estado em locais (`let y1, y2`), não em objetos nem em *arrays*. O JIT põe-nas em registos.
- Nada de `Math.sin` ou `Math.exp` no ciclo interno: ressoadores recursivos, ou um oscilador por rotação complexa (`c, s → c·cw − s·sw, …`).
- Os acumuladores em `number` (64 bits) e só a escrita final em `Float32Array`.
- Números subnormais: caudas muito longas de filtros recursivos podem cair em subnormais e abrandar o CPU. Corta-se a cauda abaixo de 1e-6, ou junta-se um ruído de 1e-18.
- **Determinismo:** `Math.sin` e `Math.exp` podem diferir no último bit entre motores de JavaScript. Em áudio é inaudível, mas um teste que compare *hashes* de *buffers* entre browsers pode falhar. As regras de `src/sim/` não se aplicam a `src/ui/`, mas convém sabê-lo.

---

## 16. Referências principais e o que cada uma ensina

| Referência | O que ensina |
|---|---|
| **Andy Farnell, *Designing Sound* (MIT Press, 2010)** e os modelos em Pure Data | O método: **analisar a física do som, construir um modelo e só depois implementar**. Tem dezenas de "práticas" (fogo, água, chuva, vento, motores, passos, armas, animais) em Pd, com código descarregável no site da MIT Press ([MIT OCW, slides](https://ocw.mit.edu/ans7870/21m/21m.380/s16/MIT21M_380S16_lec_slides.pdf); [livraria MIT](https://mitpressbookstore.mit.edu/book/9780262014410)). O artigo de 2007 no Audio Mostly dá a definição de áudio procedimental mais citada: som não linear, muitas vezes sintético, criado em tempo real por regras e entradas ao vivo ([entrevista](https://designingsound.org/2012/01/18/procedural-audio-interview-with-andy-farnell/)). É o melhor ponto de partida para receitas de efeitos. **Não encontrei uma licença explícita para os patches** (ver secção 17). |
| **Sound Design Toolkit (SDT)**, Univ. de Milão (LIM), herdeiro dos projetos Sounding Object, CLOSED e SkAT-VG | Biblioteca em C, com objetos para Pd e Max, de modelos **ecológicos**: impacto, fricção, rolar, raspar, amarrotar, líquidos, ar. Ressoadores modais ligados a interatores não lineares (Hunt-Crossley, elastoplástico) ([GitHub SkAT-VG/SDT](https://github.com/SkAT-VG/SDT); [API](https://sdt.lim.di.unimi.it/docs/API/v2.2-078); [Zenodo](https://zenodo.org/records/6628035)). É a melhor fonte de **modelos de interação física prontos**. A tese de Tiraboschi (2024) descreve a reengenharia recente ([AIR UniMi](https://air.unimi.it/handle/2434/1084008)). |
| **Perry Cook, *Real Sound Synthesis for Interactive Applications* (A K Peters, 2002)** | Livro **pensado para jogos e realidade virtual**: síntese modal, PhISEM (chocalhos e partículas), guias de onda, formantes e voz, análise e ressíntese, com código num CD ([página do livro](https://www.cs.princeton.edu/~prc/AKPetersBook.htm)). É o mais direto para o nosso caso. Ver também a palestra de 2014 na GameSoundCon ([PDF](https://www.cs.princeton.edu/~prc/ChucKU/PerryCookPhysicalModelingGameSoundCon2014.pdf)). |
| **Livros online de Julius O. Smith (CCRMA)** | Quatro livros grátis: *Mathematics of the DFT*, *Introduction to Digital Filters* (biquads, fase, passa-tudos, ressoadores), *Physical Audio Signal Processing* e *Spectral Audio Signal Processing* ([lista](https://ccrma.stanford.edu/~jos/EE201/Related_Online_Books_CCRMA.html)). É a **referência matemática**: sempre que uma fórmula de filtro ou de oscilador levanta dúvidas, a resposta está aqui. |
| ***Physical Audio Signal Processing*** (Smith) | Guias de onda digitais, Karplus-Strong e extensões, síntese comutada, modelos de corda, tubo e membrana, reverberação artificial (Schroeder, Moorer, Freeverb, FDN) ([PASP](https://ccrma.stanford.edu/~jos/pasp); [Freeverb](https://dsprelated.com/freebooks/pasp/Freeverb.html)). |
| **Projeto Sounding Object (UE, IST-2000-25287, 2001–2003)** e o livro *The Sounding Object* (Rocchesso e Fontana, Mondo Estremo, 2003) | **Modelos "cartoon"**: sons físicos simplificados que se percebem melhor do que os realistas. Impacto, rolar, partir e amarrotar, e perceção de material e de forma ([CORDIS](https://cordis.europa.eu/project/id/IST-2000-25287); [livro](https://www.academia.edu/1926068/The_Sounding_Object); [IEEE Multimedia 2003](https://dblp.uni-trier.de/rec/journals/ieeemm/RocchessoBF03.html)). Encaixa na estética "pocket" do jogo: **exagerar as pistas que interessam e deitar fora o resto**. |
| **O'Brien, Cook e Essl, "Synthesizing Sounds from Physically Based Motion" (SIGGRAPH 2001)** | O som sai **da própria simulação de elementos finitos** que anima o objeto: as vibrações da superfície são convertidas em pressão. Mostra o ideal "físico até ao fim" e porque é caro ([história SIGGRAPH](https://history.siggraph.org/?p=116950); [PDF](https://escholarship.org/content/qt41k3f19n/qt41k3f19n.pdf)). O artigo seguinte, O'Brien, Shen e Gatchalian (SCA 2002), pré-calcula os modos e torna a ideia viável ([Princeton PIXL](https://pixl.cs.princeton.edu/pubs/OBrien_2001_SSF/index.php)). No mesmo SIGGRAPH 2001, van den Doel, Kry e Pai apresentaram o **FoleyAutomatic**: modos medidos, excitados pela simulação de corpos rígidos em tempo real ([bibtex](https://www.cs.mcgill.ca/~kry/pubs/foleyautomatic/vandenDoelKryPai01bibtex.htm)). É a abordagem mais próxima do nosso caso. |
| **Nicolas Fournel**, GDC 2010 "Procedural Audio for Video Games: Are we there yet?" e GDC 2011 "Procedural Audio: Challenges and Opportunities" | A **visão da produção**: quando o procedimental compensa, que modelos de jogo são típicos, que ferramentas e motor são precisos e como fazer o controlo de qualidade ([GDC Vault 2010](https://www.gdcvault.com/play/1012645/ProceduralAudio-for-Video-Games); [slides](https://www.sambuz.com/doc/procedural-audio-for-video-games-are-we-there-yet-ppt-presentation-694942); [entrevista](https://designingsound.org/2012/06/04/procedural-audio-an-interview-with-nicolas-fournel/)). Mantém o site procedural-audio.com. |
| **Outras palestras da GDC** | Paul Weir, "The Sound of No Man's Sky" (2017): síntese do trato vocal e música generativa num jogo grande ([GDC Vault](https://gdcvault.com/play/1024067/The-Sound-of-No-Man)). Rob Hamilton (2014): música procedimental a partir de dados do jogo ([GDC Vault](https://gdcvault.com/play/1020752/Procedural-Music-Virtual-Choreographies-and)). Ensinam que **o procedimental funciona melhor ligado aos parâmetros do jogo**, não como substituto de amostras. |
| **Especificação da Web Audio API** (W3C) | O que o browser garante: `AudioBuffer` e `createBuffer` (taxas de 8 a 96 kHz garantidas), `OfflineAudioContext.startRendering`, `ConvolverNode` (com `normalize`), `BiquadFilterNode` (fórmulas do *cookbook*), `AudioParam` e as suas rampas, `DynamicsCompressorNode`, `AudioWorklet` ([MDN, OfflineAudioContext](https://developer.mozilla.org/docs/Web/API/OfflineAudioContext/OfflineAudioContext)). Lê-se para saber **o que não reimplementar** e onde os browsers diferem. |
| **Peltola, Erkut, Cook e Välimäki (2007)**, síntese de palmas | Modelo de cada palma e de plateias, com geração de eventos separada da síntese ([IEEE TASLP](https://manuscript.isc.ac/Inventory/49/1118256.htm)). |
| **Avanzini, Rocchesso, Papetti, Serafin** | Contacto de Hunt-Crossley, tempo de contacto e brilho, fricção elastoplástica e estabilidade numérica (secções 2 e 4). |
| **Klatt (1980)** | Sintetizador de formantes em cascata e em paralelo, fonte glotal ([PDF](https://www.fon.hum.uva.nl/david/ba_shs/2009/klatt-1980.pdf); [Praat KlattGrid](https://www.fon.hum.uva.nl/praat/manual/KlattGrid.html)). |
| **Moorer (1979), Schroeder, Jot** | Reverberação algorítmica: pentes com passa-baixo, primeiras reflexões, FDN com decaimento por frequência ([Valhalla DSP](https://valhalladsp.com/2021/09/22/getting-started-with-reverb-design-part-2-the-foundations/)). |

---

## 17. Bibliotecas e repositórios de referência, com licenças

**Regra para este projeto:** o código é nosso e original. Bibliotecas permissivas (MIT, ISC, Unlicense, BSD) podem servir de inspiração e até ser adaptadas, com atribuição quando a licença o pede. Código GPL lê-se para aprender, **não se copia** para um projeto que não seja GPL. Nenhuma destas bibliotecas precisa de entrar como dependência: o que queremos são as ideias.

| Projeto | O que é | Útil para | Licença |
|---|---|---|---|
| **ZzFX** (Frank Force) | Gerador de efeitos minúsculo (menos de 1 KB), cerca de 20 parâmetros num *array*, gera um *buffer* | Ver como poucos parâmetros (envolvente, deslize de altura, ruído, *bit-crush*, tremolo) cobrem muitos efeitos "retro" | MIT ([GitHub](https://github.com/KilledByAPixel/ZzFX); [npm](https://npmjs.com/package/zzfx)) |
| **jsfxr** | Porta para HTML5 do sfxr de DrPetter (presets: moeda, salto, explosão, tiro) | Gerador de parâmetros aleatórios por categoria. É exatamente a ideia dos "grupos de variantes" | Fork de chr15m: Unlicense (segundo índices) ([GitHub](https://github.com/chr15m/jsfxr); [ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fchr15m%2Fjsfxr)). Original de grumdrig: domínio público em segunda mão ([GitHub](https://github.com/grumdrig/jsfxr)). Fork de mneubrand: Apache 2.0 ([GitHub](https://github.com/mneubrand/jsfxr)). **Verificar o ficheiro LICENSE do fork que se usar.** |
| **jfxr** (Thomas ten Cate) | Sucessor do sfxr no browser, com mais controlo | Interface de afinação e ideias de parâmetros | Não confirmada nesta pesquisa ([GitHub](https://github.com/ttencate/jfxr)) **(verificar)** |
| **wafxr / wasgen** (Andy Hall, "fenomas") | Gerador ao estilo sfxr que toca pela Web Audio em vez de gerar ficheiros. O wasgen é o motor por baixo | Ver como se monta um grafo Web Audio a partir de parâmetros | wafxr: ISC ([GitHub](https://github.com/fenomas/wafxr); [npm](https://www.npmjs.com/package/wafxr)). wasgen: provavelmente ISC **(verificar)** |
| **Tone.js** | *Framework* Web Audio completo: sintetizadores, efeitos, agendamento, `Tone.Offline` | Ver a `Reverb` (resposta de ruído com renderização offline), as envolventes e o `Offline` | MIT ([npm/depscope](https://depscope.dev/pkg/npm/tone)) |
| **Faust** (GRAME) | Linguagem funcional de DSP que compila para C++, WebAssembly e outros. Bibliotecas `physmodels.lib`, `filters.lib`, `reverbs.lib`, `noises.lib` | **Ler as bibliotecas** como referência de fórmulas: modos, guias de onda, SVF, FDN, ruído rosa. `mesh2faust` e `IR2dsp` geram modelos modais a partir de malhas 3D e de respostas ao impulso ([Michon](https://core.ac.uk/download/217712637.pdf); [ICMC17](https://ccrma.stanford.edu/~rmichon/publications/doc/ICMC17-mtf.pdf)) | Compilador GPL. Bibliotecas com licença **por função**: muitas MIT ou STK-4.3, outras LGPL com exceção para o código gerado, algumas GPL ([fórum HISE](https://forum.hise.audio/post/115505)) **(verificar)** |
| **Pure Data** (Miller Puckette) e os patches de Farnell | Ambiente visual de DSP. Os modelos de *Designing Sound* | Seguir os modelos de Farnell passo a passo | Pd vanilla: BSD de 3 cláusulas **(verificar)**. Patches de Farnell: sem licença explícita encontrada; tratar como "todos os direitos reservados" e usar só como estudo |
| **SuperCollider** | Linguagem e servidor de síntese. `Klank` e `DynKlank` são bancos modais. Muitos exemplos de efeitos na comunidade (sccode) | Experimentar depressa um modelo antes de o escrever em TypeScript | GPL (v3) **(verificar)**. Exemplos na comunidade com licenças variadas |
| **Csound** | Linguagem clássica de síntese. Opcodes `mode`, `barmodel`, `pinkish`, PhISEM (`crunch`, `cabasa`, `sleighbells`…), `wguide`, `pluck` | **Apêndice de razões modais** e implementações de referência dos modelos de Cook ([Csound, razões modais](https://csound.com/manual/MiscModalFreq.html); [crunch](https://csound.com/manual/crunch.html)) | LGPL 2.1 **(verificar)** |
| **STK** (Synthesis ToolKit, Cook e Scavone) | Classes em C++ dos modelos de Cook: `Modal`, `Shakers`, `Plucked`, `BlowBotl`, `Voicer`/`FormSwep` | O código mais direto para portar os modelos do livro de Cook | Licença própria do tipo MIT (a "STK-4.3" referida no Faust) **(verificar)** |
| **SDT** | Ver secção 16 | Modelos de interação física | GPL: v3 segundo o GitHub, "v2 ou posterior" segundo a documentação da API ([GitHub](https://github.com/SkAT-VG/SDT); [API](https://sdt.lim.di.unimi.it/docs/API/v2.2-078)). Usar só como estudo |
| **musicdsp.org** | Arquivo da lista music-dsp: filtros, ruído rosa, osciladores | Fórmulas curtas e prontas | Variada; a maioria dos excertos foi publicada para uso livre ([musicdsp](https://www.musicdsp.org/en/latest/Filters/76-pink-noise-filter.html)) |

---

## 18. Receitas para os sons do basquetebol

Sugestões de partida, todas em DSP manual a 32 kHz. Os números são para afinar de ouvido.

| Som | Técnica | Parâmetros iniciais |
|---|---|---|
| **Ressalto da bola em madeira** | Pulso de Hertz (T de 3 a 6 ms, mais curto quando cai de mais alto) + 3 a 5 modos da cavidade de ar da bola (cerca de 950, 1500, 2000 Hz, Q médio, 20 a 60 ms) + 4 a 8 modos do soalho (80 a 400 Hz, tan φ de madeira, 30 a 120 ms) + clique de ruído de 1 ms | Força → nível **e** T. 6 a 8 variantes |
| **Ressalto em asfalto** | Igual, mas sem modos do soalho, com mais ruído no ataque (textura áspera) e cauda mais seca | |
| **Aro (clang)** | Modal com razões de anel (1 · 2,83 · 5,42 · 8,77) e de tubo, de 300 Hz a 4 kHz, amortecimento de metal mas cauda curta (150 a 600 ms: o aro está preso), pulso de Hertz curto (0,3 a 1 ms) e pares de modos desafinados para dar batimentos | Ou FM com o índice a cair em 10 a 20 ms (secção 6) |
| **Tabela** | Placa: muitos modos densos de 150 Hz a 2 kHz, amortecimento médio, "thud" grave + chocalhar da estrutura (eventos estocásticos curtos durante 50 a 150 ms) | |
| **Rede (swish)** | Ruído rosa ou branco num passa-banda de 2 a 6 kHz com varrimento para baixo, envolvente de 150 a 300 ms + 10 a 40 micro-eventos de fricção (grãos de 2 a 5 ms) | Rede de corrente na rua: Karplus-Strong curto e muito amortecido (vários elos) |
| **Ténis a chiar** | *Stick-slip* (secção 4) a 1,5 a 4 kHz, 60 a 200 ms, com saltos de regime | Mais em pavilhão, quase nada em asfalto |
| **Apito do árbitro** | Tom de 2 a 4 kHz com modulação de amplitude ou de frequência rápida e irregular (a "ervilha", cerca de 20 a 50 Hz) + ruído de sopro **(verificar)** | Ataque de 10 ms, rampa final de 20 ms |
| **Buzina do marcador** | Dente de serra ou quadrada com PolyBLEP a 200 a 500 Hz, 2 ou 3 osciladores ligeiramente desafinados, um pouco de saturação (com sobreamostragem 2×), 0,8 a 1,5 s | Aqui o *aliasing* ouve-se |
| **Multidão e aplausos** | Secções 7 e 8 | Uma "cama" em ciclo + reações por evento |
| **Sala** | Resposta sintética por bandas (secção 10), aplicada num `ConvolverNode` partilhado | Uma por ambiente: rua, escola, pavilhão, arena |

---

## 19. Fontes

Fontes consultadas pela pesquisa (por ordem de aparecimento no texto):

- [Sound Design Toolkit, documentação da API (ressoadores)](https://sdt.lim.di.unimi.it/docs/API/v2.2-078/group__resonators.html)
- [Sound Design Toolkit, documentação da API (interator)](https://sdt.lim.di.unimi.it/docs/API/v2.2-078/group__interactor.html)
- [SDT no GitHub (SkAT-VG)](https://github.com/SkAT-VG/SDT) · [Zenodo](https://zenodo.org/records/6628035) · [Tese de Tiraboschi, UniMi](https://air.unimi.it/handle/2434/1084008)
- [Michon, Faust physmodels.lib](https://core.ac.uk/download/217712637.pdf) · [mesh2faust, ICMC17](https://ccrma.stanford.edu/~rmichon/publications/doc/ICMC17-mtf.pdf)
- [Csound, Apêndice E: razões modais](https://csound.com/manual/MiscModalFreq.html) · [Csound pinkish](https://csound.com/manual/pinkish.html) · [Csound crunch](https://csound.com/manual/crunch.html)
- [Perry Cook, síntese modal (CCRMA DSP 2008)](https://ccrma.stanford.edu/workshops/dsp2008/prc/modal.pdf)
- [Papetti, Avanzini e Rocchesso, DAFx 2009](https://avanzini.di.unimi.it/downloads/publications/papetti_dafx09.pdf) · [TASLP 2011](https://avanzini.di.unimi.it/downloads/publications/papetti_taslp11.pdf)
- [Avanzini e Rocchesso, SMC 2004](https://air.unimi.it/retrieve/dfa8b99e-f744-748b-e053-3a05fe0a3a96/avanzini_smc04_finalsub.pdf)
- [Patente US 11416065 (excitação de Hertz)](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11416065)
- [W3C, Audio EQ Cookbook](https://www.w3.org/TR/audio-eq-cookbook) · [cópia W3C de 2011](https://w3.org/2011/audio/audio-eq-cookbook.html)
- [musicdsp.org, filtro de ruído rosa](https://www.musicdsp.org/en/latest/Filters/76-pink-noise-filter.html) · [fórum JUCE](https://forum.juce.com/t/pink-noise-generator/40013/2)
- [Avanzini, Serafin e Rocchesso, fricção (IEEE)](https://search.isc.ac/inventory/49/1135648.htm) · [Serafin et al., arco elastoplástico](https://www.academia.edu/749820/Bowed_string_simulation_using_an_elasto_plastic_friction_model)
- [Karplus-Strong, Wikipédia (Jaffe e Smith 1983)](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis) · [Smith, Karplus-Strong](https://ccrma.stanford.edu/~jos/smith-nam/Karplus_Strong_Algorithms.html)
- [Smith, Physical Audio Signal Processing](https://ccrma.stanford.edu/~jos/pasp) · [Livros online de Smith](https://ccrma.stanford.edu/~jos/EE201/Related_Online_Books_CCRMA.html) · [Freeverb](https://dsprelated.com/freebooks/pasp/Freeverb.html)
- [Entrevista com Chowning](https://homepages.abdn.ac.uk/d.j.benson/pages/html/Chowning.html) · [Cycling '74, tutorial de FM](https://docs.cycling74.com/legacy/max5/tutorials/msp-tut/mspchapter11.html) · [Georgia Tech, FM](https://dspfirst.gatech.edu/chapters/03spect/demosLV/fmsynth/index.html)
- [Klatt 1980](https://www.fon.hum.uva.nl/david/ba_shs/2009/klatt-1980.pdf) · [Praat KlattGrid](https://www.fon.hum.uva.nl/praat/manual/KlattGrid.html) · [Modelos glotais, JASA 2021](https://hal.archives-ouvertes.fr/hal-03322875/file/JASA-GF-models-2021-1273_1.pdf)
- [CCRMA, formantes](https://ccrma.stanford.edu/~kglee/m220c/formant.html) · [Princeton, formantes](https://www.cs.princeton.edu/courses/archive/spr99/cs325/formants.html) · [Praat, Peterson e Barney](https://www.fon.hum.uva.nl/praat/manual/Create_formant_table__Peterson___Barney_1952_.html)
- [Paul Weir, The Sound of No Man's Sky (GDC 2017)](https://gdcvault.com/play/1024067/The-Sound-of-No-Man) · [Rob Hamilton (GDC 2014)](https://gdcvault.com/play/1020752/Procedural-Music-Virtual-Choreographies-and)
- [Cook, PhISEM](https://soundlab.cs.princeton.edu/research/phism) · [NIME 2018](https://www.nime.org/proceedings/2018/nime2018_paper0080.pdf) · [Cook, GameSoundCon 2014](https://www.cs.princeton.edu/~prc/ChucKU/PerryCookPhysicalModelingGameSoundCon2014.pdf) · [Livro de Cook](https://www.cs.princeton.edu/~prc/AKPetersBook.htm)
- [Peltola et al., síntese de palmas (IEEE TASLP 2007)](https://manuscript.isc.ac/Inventory/49/1118256.htm)
- [Oficina de Pure Data de Farnell (goto10)](https://goto10.org/pure-data-and-sound-design-workshop/) · [Entrevista com Farnell](https://designingsound.org/2012/01/18/procedural-audio-interview-with-andy-farnell/) · [Slides MIT OCW](https://ocw.mit.edu/ans7870/21m/21m.380/s16/MIT21M_380S16_lec_slides.pdf) · [Livraria MIT](https://mitpressbookstore.mit.edu/book/9780262014410)
- [Valhalla DSP, artigos fundamentais de reverberação](https://valhalladsp.com/2021/09/22/getting-started-with-reverb-design-part-2-the-foundations/) · [Moorer, About this reverberation business](https://freeverb3-vst.sourceforge.io/doc/aboutThisReverberationBusiness.pdf)
- [Tone.js Reverb](https://tonejs.github.io/docs/r13/Reverb) · [MDN, ConvolverNode.normalize](https://backiee.wasmer.app/https_developer_mozilla_org/en-US/docs/Web/API/ConvolverNode/normalize)
- [Kermit-Canfield, descorrelação](https://ccrma.stanford.edu/~kermit/website/decorrelation.html) · [DAFx 2016](https://dafx.de/paper-archive/details/BwaPcK1lWIQN_fnzx_EL3g) · [DAFx 2024](https://dafx.de/paper-archive/2024/papers/DAFx24_paper_92.pdf)
- [ITU-R BS.1770-5](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!MSW-E.docx) · [BS.1770-3](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-3-201208-S!!MSW-E.docx) · [ITU-R BS.2434](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf) · [Designing Sound, intensidade em consolas e portáteis](https://designingsound.org/2013/02/different-loudness-ranges-for-console-and-mobile-games/)
- [PolyBLEP (sndkit)](https://paulbatchelor.github.io/sndkit/blep) · [Esqueda et al., aliasing em não-linearidades](https://core.ac.uk/download/77046162.pdf)
- [Fournel, GDC 2010](https://www.gdcvault.com/play/1012645/ProceduralAudio-for-Video-Games) · [slides](https://www.sambuz.com/doc/procedural-audio-for-video-games-are-we-there-yet-ppt-presentation-694942) · [Entrevista com Fournel](https://designingsound.org/2012/06/04/procedural-audio-an-interview-with-nicolas-fournel/) · [IRPR Sound, repetição](https://sounddesign.irpr.agency/solutions/game-audio-repetitive/)
- [Web Audio, issue #2649 (taxas de amostragem)](https://github.com/WebAudio/web-audio-api/issues/2649) · [issue #2423 (Workers)](https://github.com/WebAudio/web-audio-api/issues/2423) · [MDN, OfflineAudioContext](https://developer.mozilla.org/docs/Web/API/OfflineAudioContext/OfflineAudioContext) · [standardized-audio-context](https://socket.dev/npm/package/standardized-audio-context/overview/^25.3.57)
- [O'Brien, Cook e Essl, SIGGRAPH 2001](https://history.siggraph.org/?p=116950) · [PDF](https://escholarship.org/content/qt41k3f19n/qt41k3f19n.pdf) · [O'Brien et al., Princeton PIXL](https://pixl.cs.princeton.edu/pubs/OBrien_2001_SSF/index.php) · [FoleyAutomatic, bibtex](https://www.cs.mcgill.ca/~kry/pubs/foleyautomatic/vandenDoelKryPai01bibtex.htm)
- [Sounding Object, CORDIS](https://cordis.europa.eu/project/id/IST-2000-25287) · [Livro The Sounding Object](https://www.academia.edu/1926068/The_Sounding_Object) · [IEEE Multimedia 2003](https://dblp.uni-trier.de/rec/journals/ieeemm/RocchessoBF03.html)
- [ZzFX](https://github.com/KilledByAPixel/ZzFX) · [npm zzfx](https://npmjs.com/package/zzfx) · [jsfxr (chr15m)](https://github.com/chr15m/jsfxr) · [jsfxr (grumdrig)](https://github.com/grumdrig/jsfxr) · [jsfxr (mneubrand)](https://github.com/mneubrand/jsfxr) · [jfxr](https://github.com/ttencate/jfxr) · [wafxr](https://github.com/fenomas/wafxr) · [npm wafxr](https://www.npmjs.com/package/wafxr) · [Tone.js (depscope)](https://depscope.dev/pkg/npm/tone) · [Fórum HISE sobre licenças do Faust](https://forum.hise.audio/post/115505)
