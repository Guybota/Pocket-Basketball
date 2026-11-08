# O motor de som do Pocket Basketball

Retrato do código em novembro de 2026, depois da revisão dos sons (limitador, 24 vozes no máximo, o mesmo som no máximo uma vez em cada 45 ms, e a 4× calam-se a bola, o passe e o encontrão e encurtam as reações). Confirma as linhas antes de mexer, porque o código muda.

## Ficheiros

- `src/ui/synth.ts`: funções puras que calculam cada som num `Float32Array`. Não usa Web Audio, por isso os testes correm em Node.
- `src/ui/audio.ts`: a classe `GameAudio`. Tem o grafo Web Audio, a cache de buffers, o `play()` de cada evento e o ambiente de cada pavilhão.
- `src/ui/music.ts`: as músicas, que pedem notas ao `MusicKit` (`note(instrumento, midi)`).
- `src/ui/audio.test.ts`: testes com um `AudioContext` falso e testes diretos às funções do `synth.ts`.
- O tipo `Sound`, com os nomes dos eventos, está em `src/ui/match-view.ts`. A lista de todos os sons, que serve para os testar, está em `playAllSounds`, em `src/ui/main.ts`.

## Peças do `synth.ts`

- **`SR = 32000`:** a frequência de amostragem de todos os sons; o browser converte. Os tipos são `Mono = Float32Array` e `Stereo = [Float32Array, Float32Array]`.
- **`makeRng(seed)`:** gerador mulberry32. Toda a aleatoriedade de um som vem do `r()` que recebe.
- **`addModes(out, [[freq, amp, tau]...], r, start)`:** soma ressonadores amortecidos. A fase de cada modo é aleatória e cada modo para a cerca de −80 dB. É a base de todos os impactos.
- **`addBurst(out, r, amp, tau, filtro, start)`:** uma rajada de ruído com decaimento exponencial, opcionalmente filtrada. Serve para o contacto, o clique e o grão.
- **`Biquad(kind, f, q)`:** filtro RBJ passa-baixo, passa-alto ou passa-banda. O passa-banda tem 0 dB no pico. Muda-se com `set()` e corre-se com `run(x)`.
- **`normalize(s, pico = 0.9)`:** iguala o pico e apaga os últimos 8 ms para não haver estalo no fim. Todo o gerador acaba com ele.
- **Auxiliares privados:**
  - `between(r, a, b)`, `white(r)`, `samples(seg)` e `midiHz(m)`;
  - `fadeOut`;
  - `panGains` e `addPanned`, para o estéreo;
  - `vox(...)`, a voz por formantes (fonte em dente de serra mais sopro, e quatro ressoadores de Klatt);
  - `person(r)`, que escolhe homem, mulher ou criança;
  - `VOWELS`, a tabela das vogais.
- **Geradores:**
  - `slap(force)`: a bola nas mãos e também no chão; `rim`, `backboard(kind)`, `swish` e `chains`;
  - `whistle`, `horn`, `squeak`, `thud`, `chime` e `clapBeat`;
  - `shout(kind)`, com `crowd`, `babble` e `applause`;
  - `snare`, `brass`, `glock` e `timpani`, para a música;
  - `roomImpulse(room, sr, r)`, a resposta ao impulso de cada sala (`ROOMS`, com rt60, brilho, amortecimento, pré-atraso e primeiras reflexões).

## Como os sons chegam ao altifalante (`audio.ts`)

- **Desbloqueio:** nada é calculado antes de `unlock()`, que corre num gesto do jogador. Depois, `warm()` calcula as bolsas uma a uma em `requestIdleCallback`. O que ainda não estiver pronto calcula-se na primeira vez que toca.
- **Cache:** `set(chave, n, make)` guarda `n` variantes por chave. A semente é o hash da chave mais `i·7919`, por isso a mesma chave dá sempre os mesmos sons. As bolsas atuais são:

  | Bolsa | Variantes |
  |---|---|
  | `slap:0` (passe e bola no chão), `slap:0.5`, `slap:1` | 3 |
  | `rim` | 3 |
  | `board` | 2 |
  | `swish` | 3 |
  | `voice:*` | 4 |
  | `crowd:*` | 2 |
  | `claps:*` | 2 |
  | `babble:*` | 2 |

  Os instrumentos da música guardam uma amostra por meio tom ou por oitava e tocam-se com outro `playbackRate`.
- **Grafo:**

  ```
  efeitos → room ──────────────────────────→ effectsBus ─┐
              └→ Convolver(sala) → wet ──────┘           │
  música → musicGain → musicBus → duck ──────────────────┴→ master → compressor(−14 dB, 4:1) → limitador(−3 dB, 20:1) → saída
  ```

  O `wet` de cada pavilhão está em `CROWDS`. O `duckMusic()` baixa a música para 0.45 durante cerca de meio segundo e só é chamado pela rede, pelo apito e pelo `bigCheer`.
- **Tocar:** `shot(bolsa, ganho, {seconds, pan})` escolhe uma variante, varia o `playbackRate` ±3 % e liga ao `room`.
  - `react()` toca as reações do público; `clap()` toca os aplausos.
  - As duas escalam com `crowdLevel`, o nível do pavilhão.
- **Ambiente:** `ambience(now)` corre em cada frame e sorteia um acontecimento por pavilhão: vento, trânsito, gritos soltos, chiar, palmas ritmadas e murmúrio.

## Eventos (`play()`)

| Evento | Como soa hoje |
|---|---|
| Todos os eventos de `play()` | amostras calculadas de antemão |
| `swell` (vento e trânsito da rua) e o sino da rua | **ainda são** ruído ao vivo e osciladores |

O ruído partilhado (`noiseBuffer`) e as escolhas no momento de tocar usam `Math.random`. Isto é permitido na interface, mas não é reproduzível.

## Velocidade, pausa, separador e silêncio

- **A 4×:** o `bounce`, o `catch` e o `bump` calam-se (`QUIET_AT_SPEED` em `main.ts`). O `card` só toca até 2×. A música e o ambiente não mudam com a velocidade.
- **Em pausa:** não há eventos nem ambiente, mas a música continua.
- **Separador escondido:** o contexto é suspenso (`setHidden`).
- **Silêncio:** o master vai a 0 e `play()` e `ambience()` saem logo.
- **Volumes:** master, efeitos e música, em `settings.ts`, entre 0 e 1.

## O que os testes já verificam

- O caminho de cada fonte acaba em master, compressor e saída.
- Os volumes ficam entre 0 e 1 e o silêncio funciona.
- A cache não cria buffers novos depois de aquecida.
- Há um só convolver ligado de cada vez.
- Para cada gerador do `synth.ts`:
  - o comprimento é exato;
  - todos os valores são finitos;
  - o pico fica entre 0.3 e 1;
  - a energia dos impactos decai (os últimos 20 % têm menos de 1/50 dos primeiros 20 %);
  - o estéreo difere entre canais;
  - a mesma semente dá o mesmo som.
- O `browser-check` exige que o apito, a buzina e o «horn» se ouçam num jogo, e o `playAllSounds` toca tudo.

## Para acrescentar um evento novo

1. Junta o nome ao tipo `Sound` em `match-view.ts`.
2. Escreve o gerador em `synth.ts`, com um comentário de uma linha em português que diga o som físico.
3. Cria a bolsa em `audio.ts`, com chave, número de variantes e um `warm` se tocar cedo.
4. Junta o `case` em `play()`.
5. Junta o nome a `playAllSounds` em `main.ts`.
6. Junta o som às listas de `audio.test.ts`: a lista de durações do bloco «synth» e a lista da cache.

## Lacunas conhecidas

- **A bancada não reage ao marcador**, como num final apertado.
- **Sem volume próprio para a bancada.**
- **O `addBurst` usa sempre `SR`**, ao contrário de `addModes` e `Biquad`, que aceitam outra frequência.
- **A lista de sons em `playAllSounds` é escrita à mão** e pode ficar desatualizada em relação ao tipo `Sound`.
