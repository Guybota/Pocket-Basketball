# Plano: o cenário na placa gráfica

**Estado:** feito.

- **Fase 1, feita:** o chão e as linhas.
- **Fase 2, feita:** o interior dos quatro pavilhões fechados (Escolar, Municipal, Grande Arena e o pavilhão fechado).
- **Fase 3, feita:** o campo de rua, com a rede numa passagem à parte.
- **Fase 4, feita:** os momentos, as escalas e um iPhone verdadeiro.
- **Fase 5, feita:** a limpeza.

## Porquê

Antes desta mudança, o cenário de cada pavilhão saía de um traçador de raios em JavaScript (`Camera.drawScene`, em `src/ui/art/court.ts`): o chão, as paredes e as bancadas. Desenhava a 360×216 e o jogo ampliava a imagem até 6×. Daí vinham três problemas:

1. **Linhas e arestas em blocos** de 4 a 6 píxeis do ecrã, que tremiam com a câmara (G2).
2. **Remendos que se esbatem:** quando se suavizava o tremor a 360×216, a imagem ampliada ficava desfocada.
3. **Custo:** o mesmo traçador à resolução do ecrã custa 33 a 63 ms por frame. Num jogo a 30 fps, cada frame tem 33 ms ao todo.

A placa gráfica desenha este cenário a qualquer resolução em menos de 1 ms.

## A escolha: o traçador num shader, com peças 3D por cima, e os bonecos em pixel art

O resultado pretendido é o cenário fino, à resolução do ecrã, com os bonecos em pixel art. É o que o Calciobit faz, e é o estilo «HD-2D».

| Opção | Resultado | Para o futuro | Veredicto |
|---|---|---|---|
| **A. O traçador de raios num shader (um triângulo que cobre o ecrã), que escreve a profundidade** | Igual ao jogo nos quatro pavilhões, a qualquer resolução | Bom: peças 3D novas (teto, placar, luzes, adereços) entram como malhas three.js e cruzam-se bem com as bancadas, graças à profundidade | **Escolhida pelo dono** (fase 2) |
| B. Cada pavilhão refeito como geometria 3D | Cenário fino, mas difícil de pôr igual ao jogo (o protótipo nunca ficou) | Bom, com mais trabalho por pavilhão | Plano inicial; trocado pela A |
| C. Os bonecos também em three.js | Igual, se bem feito | Risco de o cesto e a mesa cortarem os bonecos e de píxeis desiguais | Mais tarde, só se for preciso |

**Os bonecos ficam na tela 2D.** No Chrome, no Edge e no Safari, a tela 2D já é desenhada pela placa gráfica, por isso os bonecos não pesam: são umas dezenas de `drawImage` por frame. A ordem do pintor, o cesto em duas metades e o arredondamento da escala já funcionam.

**Motor:** `three` 0.187, com o `WebGLRenderer` (WebGL 2). É o que funciona em mais telemóveis. O `WebGPURenderer` fica para depois.

**A reserva:** sem WebGL 2, com o contexto perdido, com um shader que não compila, ou com WebGL por software (SwiftShader, llvmpipe, onde o traçador é muito mais rápido), o jogo desenha com o `drawScene` de sempre. As ferramentas sem janela podem forçar a placa gráfica com `useCourtGpu('force')`.

## Como fica o desenho de um frame

```
three.js (uma tela WebGL partilhada, à resolução da tela do jogo)
  chão          malha com a textura do jogo: texels nítidos de perto, média dos mipmaps ao longe
  bancadas      triângulo que cobre o ecrã: o shader lança um raio por píxel (venue-shader.ts), como o drawScene,
                deixa o chão à malha e escreve a profundidade
  linhas        faixas contínuas com borda suavizada, largura real e um mínimo em píxeis
→ copiada para a tela 2D do jogo, por baixo de tudo o resto: o público, os bancos, os cestos, os bonecos, os efeitos
```

- **Uma só câmara.** A `Camera` de `court.ts` continua a mandar e dá a pose (`pose()`). A câmara three.js copia-a, com a aproximação feita por `setViewOffset`.
- **Os flashes** desenham-se na tela 2D, um píxel da arte cada um, por cima da imagem da placa.
- **O fundo das margens** copia a imagem da placa gráfica, sem passar pela memória.

## O que existe

- **`src/ui/gpu/loader.ts`:** quem desenha pede a placa aqui. Carrega o three.js à parte e devolve `null` até chegar.
- **`src/ui/gpu/court-gpu.ts`:**
  - a placa gráfica partilhada, as malhas do chão e das linhas, e a cache dos três últimos pavilhões;
  - a perda e a recuperação do contexto;
  - a reserva e o `prepare`, que envia as texturas e compila os shaders antes do primeiro frame.
- **`src/ui/gpu/venue-shader.ts`:** os shaders das bancadas e das paredes e do campo de rua, e as texturas e os números de cada pavilhão.
- **`npm run gpu-check`:** compara o shader com o traçador, píxel a píxel a 360×216, em 44 casos (quatro pavilhões, vários enquadramentos, duas imagens do público e outra câmara).
  - **Corre-o sempre que mudares um dos dois.** São as mesmas contas escritas em TypeScript e em GLSL.
  - **Nota:** o `gpu-check` desenha a rede sem as diferenças do jogo (a borda suavizada e o véu gradual), com `exactFence`.

## Fases

Cada fase acaba com `npm run check`, `npm run browser-check`, `npm run gpu-check`, as capturas comparadas com o jogo atual e a revisão por agentes que o skill de arte exige.

1. **Feita: o chão e as linhas.**
   - O tremor do chão desceu 4 a 19×.
2. **Feita: o interior dos pavilhões fechados.**
   - Igual ao traçador em 44 casos.
   - O tremor da imagem inteira desceu 2 a 6×.
   - A mediana por frame passou de 4,6–7,1 ms para 2,4–4,2 ms numa RTX 4070.
3. **Feita: o campo de rua.**
   - O `drawOpenScene` num shader (`OPEN_FRAGMENT`), e a rede numa segunda passagem (`drawFence`), por cima dos adeptos de fora.
   - Igual ao traçador no `gpu-check` (com a rede exata).
   - No jogo, os fios da rede têm a borda suavizada num píxel e, onde a malha se aperta (vista de lado), passam aos poucos a véu.
   - O tremor desceu de 5127 para 2091 píxeis por frame.
4. **Momentos e telemóvel:**
   - **Verificado:** a aproximação (desconto, bola ao alto, cerimónia: a câmara three.js com `setViewOffset`), a 1×, 2×, 3×, 4× e 6× e com a tela larga do ecrã inicial, nos pavilhões e no campo de rua. Tudo alinhado com os bonecos (`dist-check/gpu-fase4.ts`).
   - **Sem nada a fazer:** o alto contraste só muda a interface; o movimento reduzido fixa a imagem do público e tira os flashes, como antes.
   - **Para medir num telemóvel:** abrir o jogo com `?fps` no endereço mostra as imagens por segundo, o tempo de desenho e a placa gráfica; `?cpu` desliga a placa, para comparar.
   - **Medido num iPhone (12 de novembro de 2026), num jogo a correr:**

     | Desenho | Placa | Imagens por segundo | Tempo de desenho (pior) |
     |---|---|---|---|
     | Com a placa gráfica | «Apple GPU» | 60 (o máximo do ecrã) | 1,2 ms (2,0 ms) |
     | Com o traçador de raios (`?cpu`) | — | 60 | 1,2 ms (2,0 ms) |

     Os dois sobram muito na imagem de 16,7 ms. O ganho da placa gráfica neste aparelho é a imagem: o cenário à resolução do ecrã e o tremor 2 a 19× menor. A rapidez do jogo fica igual.
5. **Feita: limpeza.**
   - O protótipo (`src/prototype/`, `prototipo-3d.html`) saiu.
   - O three.js chega à parte (`src/ui/gpu/loader.ts`): o arranque voltou a ~179 KB comprimidos e a placa gráfica (~139 KB) vem a seguir, com o traçador a desenhar entretanto. A página única (`build-page`) leva tudo num só ficheiro.

6. **Bonecos no mundo 3D (em curso, opção C escolhida pelo dono a 13 de novembro).**
   - **Feito: o público dos pavilhões fechados.** Cada adepto é um retângulo no mesmo sítio e tamanho da tela 2D (`spriteQuad`), desenhado pela placa (`src/ui/gpu/sprite-layer.ts`) com a profundidade dos pés no mundo: em baixo a dos pés, em cima a de um ponto 1,8 m acima, 0,6 m mais perto da câmara. Fica à frente ou atrás das peças 3D do cenário como no mundo. Os bonecos entram na chave do cache, por isso a câmara parada continua a não refazer nada.
   - **Feito: o tamanho noutras câmaras.** `Camera.depthScale` multiplica pela lente e pela distância da câmara a que olha, em relação à do jogo (na do jogo, 1). `npm run campos` mostra o pavilhão inteiro com toda a gente em proporção.
   - **Feito: tudo o que está no mundo (13 de novembro).**
     - **Bonecos:** jogadores, árbitro, bancos, treinadores, saídas, público (também o do bairro e o de fora da rede) e o dono do cão vão para a placa como os adeptos. Quem está no chão é um cartão plano à profundidade dos pés, como a ordem da tela 2D; os adeptos das bancadas, um cartão em pé.
     - **Sombras:** uma imagem guardada por tamanho.
     - **Bola, rasto, pó, cão, pombo, árvores, bandeiras, «Z» e flashes:** pintados na tela 2D, que serve de rascunho, e copiados para uma imagem do mundo à profundidade certa (`capture`).
     - **Reflexos:** o boneco virado, meio transparente.
   - **Modelos 3D (src/ui/gpu/fixtures.ts):**
     - os cestos: base, poste, braço, tabela com moldura e quadrado, aro e rede que abre com a bola;
     - a mesa de oficiais, os bancos das equipas e os bancos de pedra do bairro, com faces de lado.
   - **A rede do campo de rua:** desenhada na placa por cima de tudo, com a profundidade de cada fio.
   - **Na tela 2D, por cima:** só a interface (balões, letreiros, nomes, a seta de quem tem a bola, a faixa da falta, o marcador).
   - **Por fazer:**
     - com a câmara parada, as cópias impedem a placa de reaproveitar a imagem (5–7 ms por imagem numa RTX 4070, contra 2–3 ms antes);
     - os flashes quase não se veem no Pavilhão Municipal.

## Riscos

- **Telemóveis fracos:**
  - **O que já há:** a reserva, e o desligar automático com WebGL por software.
  - **Por medir:** ainda falta um telemóvel verdadeiro.
- **Duas cópias das contas das bancadas (TypeScript e GLSL):** o `gpu-check` falha se divergirem.
- **Os bonecos em blocos de píxeis e o cenário fino:** é o estilo pretendido.
- **Repetições e Match ID:** não mudam, porque a simulação (`src/sim/`) não é tocada.

## Por decidir mais tarde

- **Os bonecos no 3D (opção C),** se houver câmaras que rodem.
- **O `WebGPURenderer`,** quando estiver estável em todos os browsers.
- **Luz a sério** (holofotes, reflexo do soalho em tempo real) em vez do `tint` e dos reflexos pintados.
