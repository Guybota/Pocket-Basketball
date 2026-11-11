---
name: sound-design
description: Diretrizes para criar ou mudar sons e música no Pocket Basketball, todos gerados por código em src/ui/synth.ts e tocados por src/ui/audio.ts. Usa sempre que fores escrever um som novo, afinar um que soa mal («parece um sino», «parece um soco»), mexer na mistura, nos volumes, no ambiente dos pavilhões, na bancada, na música, ou avaliar sons sem os poder ouvir.
---

# Criar sons para o Pocket Basketball

O jogo não tem ficheiros de áudio. Cada som é calculado em TypeScript a partir da física e de técnicas de síntese, e é guardado num `AudioBuffer`. Este skill diz como desenhar, escrever, misturar e verificar esses sons.

As referências têm o detalhe, os números e as fontes. Lê só a que precisares:

| Ficheiro | O que tem |
|---|---|
| [references/motor.md](references/motor.md) | **Lê primeiro.** Como o motor atual funciona: as peças de `synth.ts`, as bolsas, o grafo, os eventos, os testes e os passos para acrescentar um som. |
| [references/acustica.md](references/acustica.md) | A física de cada som do basquetebol, com receitas numéricas: bola, drible, aro, tabela, ténis, rede, apito, mãos, buzinas, multidão e salas. A secção 13 é a tabela-resumo. |
| [references/sintese.md](references/sintese.md) | As técnicas: modal, contacto de Hertz, biquads, ruído rosa, fricção, Karplus-Strong, FM, formantes, granular, envolventes, convolução, estéreo, LUFS, aliasing e desempenho. A secção 18 tem receitas. |
| [references/mistura.md](references/mistura.md) | Mistura e implementação: hierarquia, ducking, limite de vozes, alvos de sonoridade, EQ, anti-repetição, bancada adaptativa, 2× e 4×, pausa, iOS, acessibilidade e testes sem ouvidos. A secção 19 tem os números para copiar. |
| [references/design.md](references/design.md) | O ofício: camadas, legibilidade, exagero, famílias de sons, casos de quem fez bom som por código, música adaptativa, interface, recompensas, erros comuns e medidas de qualidade. A secção 9.3 é a lista de verificação. |

Os relatórios marcam o grau de confiança de cada número, de [M]/[F] (medido ou de fonte primária) a [E]/[P] (estimativa ou proposta). Trata [E] e [P] como ponto de partida.

## Regras do projeto

- **Só síntese.** Não há amostras gravadas, nem sons descarregados, nem gerados por IA, nem copiados de outros jogos. Mudar isto exige que o dono do projeto mude o `AGENTS.md`.
- **Original.** Nada que imite um som reconhecível de outro jogo, como uma moeda famosa ou um jingle conhecido. Podes estudar a abordagem, mas não o resultado.
- **Determinista no cálculo.** Um gerador recebe um `Rng` e tira toda a aleatoriedade de `r()`, por isso a mesma semente dá o mesmo som. A escolha da variante no momento de tocar pode usar `Math.random`, porque isto é `src/ui/` e não `src/sim/`.
- **Pré-calculado.** Calcula o som uma vez, guarda-o numa bolsa de variantes e toca-o com `shot()`. Os osciladores ao vivo são legado, a substituir.
- **Texto em português de Portugal, identificadores em inglês.** Cada gerador leva um comentário de uma linha que diz o som físico.

## O ciclo de trabalho

1. **Descreve o som numa frase**, com onomatopeia e matéria. Por exemplo: «clank curto de aço grosso, com um segundo toque mais fraco».
2. **Vê a física** em `acustica.md`: frequências, decaimento, ataque, ruído e como muda com a força.
3. **Escolhe a técnica** em `sintese.md`. Na maior parte dos casos:
   - impactos com modos e uma rajada de ruído;
   - texturas com ruído filtrado e envolvente;
   - vozes com `vox`;
   - chiar com um trem de pulsos.
4. **Desenha em camadas:** ataque (0 a 30 ms, é o que faz o som ler-se), corpo e cauda. Reserva uma faixa de frequências por papel (ver a tabela abaixo).
5. **Escreve o gerador** com os auxiliares que já existem (`addModes`, `addBurst`, `Biquad`, `normalize`, `between`, `white`, `samples`). Não inventes outra infraestrutura.
6. **Liga-o:** bolsa, `play()`, `playAllSounds`, `QUIET_AT_SPEED`, testes e `browser-check` (passos em `motor.md`).
   - **Iguala o volume.** O som novo vem normalizado ao pico, por isso o ganho com que toca no jogo muda. Mede o RMS do antigo e do novo e põe ganho novo = ganho antigo × RMS antigo ÷ RMS novo. Sem isto, um som trocado fica o dobro ou metade do que era.
   - **Mede quanto custa calcular.** Cada bolsa calcula-se num momento livre do browser. No computador, um som não deve passar de cerca de 15 ms (a buzina grave, o mais pesado, leva 12 ms). Num telemóvel lento é 3 a 10 vezes mais, por isso um som mais caro parte-se ou simplifica-se.
7. **Mede** (secção «Verificar sem ouvir»), grava os WAVs com `npm run sound-wavs -- <som>`, envia-os ao utilizador e pede-lhe que ouça. Diz sempre que não ouviste o som.
8. **Afina com as palavras do utilizador.** Traduz a queixa num parâmetro (tabela abaixo) e muda uma coisa de cada vez.

## Princípios de desenho

- **Ler em 100 ms num altifalante de telemóvel.** O envelope e o contorno de altura distinguem os sons, não o timbre fino. Dá a cada som importante uma silhueta diferente.
- **Os graves desaparecem no telemóvel.** Abaixo de cerca de 200 Hz não se ouve, por isso um peso feito só de um seno a 60 Hz perde-se. Junta-lhe harmónicos ou um transiente.
- **Os modos altos morrem mais depressa do que os baixos.** Se não for assim, soa a sintetizador. Usa modos inarmónicos onde o material os pede, como o aço e a madeira.
- **Junta sempre algum ruído.** Um som feito só de senos soa a «8 bits».
- **Nada de duas instâncias iguais.** Varia a frequência ±1 a 3 %, a amplitude ±2 a 4 dB e o decaimento ±10 a 20 %. Faz 3 a 8 variantes por bolsa. Nos sons que dão informação, como o apito e a buzina, varia quase nada; nos sons da interface, não varies.
- **Exagero com medida.** Um jogo de bolso pede sons curtos, limpos e com carácter. A realidade é o ponto de partida, não o destino.
- **O contorno tem significado.** Um som que sobe soa bom, ganho, confirmação; um que desce soa mau, perda, cancelamento. Os sons tonais de interface e de recompensa ficam na escala da música.
- **A sala faz metade do realismo.** Os efeitos saem secos do `synth.ts`, e a sala de cada pavilhão entra pelo convolver. Não cozinhes reverberação dentro do som.

### Faixas por papel (para não se taparem)

| Papel | Faixa |
|---|---|
| Bola e corpo no chão | 80–700 Hz, com a cavidade de ar perto de 1 kHz |
| Aro | 250–3000 Hz, inarmónico e curto |
| Rede | ruído de 2,5 a 7 kHz, nada abaixo de 300 Hz |
| Apito | tonal, 2,9 a 3,6 kHz |
| Chiar dos ténis | 2,5 a 5,5 kHz, em pulsos |
| Bancada | larga, com os médios baixos durante o jogo |
| Interface | tonal, 600 Hz a 3 kHz, sempre o mesmo timbre |

## Lições já aprendidas neste jogo

- **O aro soava a sino.** As notas eram agudas (470–560 Hz) e decaíam até 0,32 s. A correção foi:
  - modos graves (260–330 Hz), inarmónicos, com tau de 12 a 60 ms;
  - o baque da bola por baixo;
  - um segundo toque mais fraco 40 a 70 ms depois.

  A física (`acustica.md`) mostra um aro real a soar até cerca de 1 s. **Num jogo, isso lê-se como sino.** Mantém o aro curto.
- **A rede soava a soco.** O ataque era de 18 ms e havia cliques e um tremor forte. A correção foi uma subida suave de 30 a 45 ms, ruído agudo sem graves, nenhum clique e um pico de 0,7.
- **A bola no chão soa igual à bola nas mãos.** Uma versão com o soalho e o «ping» do ar dentro da bola, diferente para madeira e alcatrão, soava mal. Agora a bola no chão e o passe recebido usam a mesma palmada seca (`slap(0)`), e o que muda de campo para campo é a sala (`ROOMS` e o `wet` de `CROWDS`). Não mudes o timbre da bola por pavilhão: muda a sala.
- **O desvio DC vem dos modos graves.** Os modos que começam numa fase ao acaso deixam o som desviado do zero. O `normalize` tem um passa-alto a 20 Hz que resolve isto em todos os sons; não o tires.
- **Confirma o contexto antes de propor uma mudança na mistura.** Propus abafar a música na pausa, mas durante o jogo não há música (`audio.music('none')`). Antes de mexer na mistura, vê o que toca de facto nesse ecrã.
- **Ao ouvido do jogador, a física perde para a legibilidade.** Quando a queixa contradiz a receita física, ganha a queixa.
- **A bancada soava a vozes soltas e sem sentido.** Pedaços de burburinho com buracos, gritos isolados e palmas ao acaso não fazem uma multidão. O que resultou (`crowdBabble`, `roar` e `keepMurmur`):
  - um rumor que nunca pára, em pedaços de 4 s com 1,2 s de entrada e saída, em correntes desfasadas;
  - cada voz à sua distância (o seu passa-baixo, de 2,2 a 3,6 kHz, e o seu volume, de 0,3 a 1), ao seu ritmo de sílabas e com sopros de consoante;
  - reações que nascem do rumor (sobe ~40 % e acalma em ~4 s), nunca sons soltos por cima.
- **As reações dizem o que aconteceu pela vogal e pela altura.** Festa: «Éééé» (75 %), a subir para o agudo (~1,7 a 2× a voz de falar). Falha importante: «Ooooh» grave (até ~1,25×), que só desce no fim. Gozo (poster, defensor no chão): «Uuuuh» grave e mais curto (0,7 a 1,6 s). Se o «O» e o «U» sobem como o «E», deixam de se distinguir.
- **Reação sem hold «soa a um carro a passar»;** com hold em cada voz, «soa a coro».
  - O carro: a altura sobe e desce o tempo todo e o volume cai logo a seguir ao pico.
  - O coro: todos na mesma nota, a entrar juntos e a aguentá-la.
  - O que resultou: cada voz chega à nota em 0,15 a 0,45 s e fica lá, mas cada uma na sua nota, com 2 a 3 semitons de diferença entre elas, com tremor (±4 % de altura e volume) e rouquidão. Durações de 1 a 2,6 s, entradas espalhadas por 0,1 a 0,8 s, e perto de metade volta a gritar. O hold é do grupo, não de cada voz.
  - A reação tem de ficar uns 8 dB acima do rumor, ou as vogais não se notam. Mede o RMS das duas janelas.
- **A bancada é cara de calcular.** Uma reação de 14 vozes leva 45 a 90 ms, e o rumor de 8 vozes ~50 ms (o limite é ~15 ms). Calcula cada variante sozinha num momento livre (`warmEach`), toca só as que já estão prontas (`ready`) e, enquanto não há nenhuma, usa os sons antigos e baratos. Nunca as calcules a meio do jogo.

### Traduzir queixas em parâmetros

| Queixa | O que mexer |
|---|---|
| «Parece um sino» | Decaimentos mais curtos, sobretudo dos modos altos; menos modos; frequências mais inarmónicas; mais ruído no ataque. |
| «Parece um soco» ou «bate demais» | Ataque mais lento (15 a 40 ms); tirar os graves e os cliques. |
| «Soa a 8 bits» ou «a brinquedo» | Juntar ruído; uma envolvente que evolui; modos inarmónicos; mais variação. |
| «Abafado» | Subir o filtro ou a energia entre 2 e 5 kHz; ataque mais rápido. |
| «Estridente» ou «cansa» | Baixar acima de 5 kHz; encurtar; reduzir a repetição. |
| «Artificial» ou «sempre igual» | Mais variantes e mais variação entre elas; a sala certa. |
| «Não se ouve» | Ver se outro som tapa a mesma faixa; ducking; dar-lhe uma silhueta própria. |
| «Parece um carro a passar» | Hold: a altura chega à nota e fica; o volume estável até ao fim. |
| «Parece um coro» | Notas diferentes (2 a 3 semitons), tremor, rouquidão, entradas e durações desencontradas. |
| «Vozes soltas e sem sentido» | Mais vozes a distâncias diferentes, abafadas, num fundo contínuo; reações que nascem do fundo. |
| «Não se nota a reação» | Subir o contraste (~8 dB acima do fundo), entrada no primeiro meio segundo, fundo baixo durante a reação. |

## Mistura

Os números estão na secção 19 de `mistura.md`.

- **Hierarquia:**
  1. apito, buzinas, cesto e marcador: nunca cortados;
  2. bola, aro, tabela e reações;
  3. ambiente e música.
- **Alvo:** cerca de −18 LUFS e pico abaixo de −1 dBTP. O compressor do master não é um limitador; falta juntar um.
- **Ducking da música:** −6 a −9 dB, ataque de 10 a 30 ms e recuperação de 300 a 800 ms, nos sons de nível 1.
- **A 2× e 4×:** nunca subas a altura dos sons. Corta os dribles e os encontrões, encurta as reações e junta eventos próximos num só.
- **Pausa e desconto de tempo são estados diferentes.** A pausa pede som abafado; o desconto, ambiente de pavilhão.
- **Mono no centro para os eventos.** Muitos telemóveis têm um só altifalante. Abre o estéreo só no ambiente e na sala.

## Verificar sem ouvir

Um agente não ouve. Mede tudo e diz que não ouviu.

- **Testes em `audio.test.ts`**, para cada gerador novo:
  - comprimento exato;
  - todos os valores finitos;
  - pico entre 0,3 e 0,9;
  - decaimento nos impactos;
  - mesma semente, mesmo som.
- **Medidas que valem a pena** (limites na secção 17.1 de `mistura.md`):
  - DC com |média| < 0,001;
  - primeira e última amostra < 0,001;
  - salto entre amostras < 0,3 fora do ataque;
  - fator de crista entre 6 e 20 dB nos impactos;
  - variantes diferentes (correlação < 0,98) mas da mesma família (RMS a ±3 dB);
  - o centróide espectral na faixa do papel.
- **WAVs para o utilizador:** `npm run sound-wavs` lista os sons; `npm run sound-wavs -- apito rede` (ou `todos`) grava em `dist-sounds/` cada som seco, com as variantes seguidas, e dentro das cinco salas (`-rua`, `-escola`, `-pavilhao`, `-arena`, `-vazio`), com o nível de sala de `CROWDS`. Um som novo entra no catálogo `SOUNDS` de `src/tools/sound-wavs.ts`. Envia os WAVs com `SendUserFile` e pede uma reação concreta.
- **Nos testes de `audio.test.ts`:**
  - o `AudioContext` falso acaba cada som logo no `start()`, para o limite de vozes não encher;
  - o mesmo som só toca uma vez em cada 45 ms, por isso avança `ctx.currentTime` entre repetições.
- **Antes de entregar:**
  - `npm run check`;
  - `npm run browser-check` (é `src/ui/`; no Linux, com `BROWSER_PATH=/opt/pw-browsers/chromium`);
  - a lista de verificação da secção 9.3 de `design.md`.
