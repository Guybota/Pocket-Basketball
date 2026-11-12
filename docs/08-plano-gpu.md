# Plano: o cenário na placa gráfica

**Estado:** em curso.

- **Fase 1, feita:** o chão e as linhas.
- **Fase 2, feita:** o interior dos quatro pavilhões fechados (Escolar, Municipal, Grande Arena e o pavilhão fechado).
- **Próxima:** o campo de rua.

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

- **`src/ui/gpu/court-gpu.ts`:**
  - a placa gráfica partilhada, as malhas do chão e das linhas, e a cache dos três últimos pavilhões;
  - a perda e a recuperação do contexto;
  - a reserva e o `prepare`, que envia as texturas e compila os shaders antes do primeiro frame.
- **`src/ui/gpu/venue-shader.ts`:** o shader das bancadas e das paredes, e as texturas e os números de cada pavilhão.
- **`npm run gpu-check`:** compara o shader com o traçador, píxel a píxel a 360×216, em 44 casos (quatro pavilhões, vários enquadramentos, duas imagens do público e outra câmara).
  - **Corre-o sempre que mudares um dos dois.** São as mesmas contas escritas em TypeScript e em GLSL.

## Fases

Cada fase acaba com `npm run check`, `npm run browser-check`, `npm run gpu-check`, as capturas comparadas com o jogo atual e a revisão por agentes que o skill de arte exige.

1. **Feita: o chão e as linhas.**
   - O tremor do chão desceu 4 a 19×.
2. **Feita: o interior dos pavilhões fechados.**
   - Igual ao traçador em 44 casos.
   - O tremor da imagem inteira desceu 2 a 6×.
   - A mediana por frame passou de 4,6–7,1 ms para 2,4–4,2 ms numa RTX 4070.
3. **O campo de rua:** o `drawOpenScene` no shader, com a rede numa camada própria (os adeptos de fora ficam atrás dela), o pano de fundo, o céu e a relva.
4. **Momentos:**
   - a aproximação no banco, a cerimónia e as repetições;
   - o movimento reduzido, o alto contraste e o 640×360;
   - a medição num telemóvel verdadeiro.
5. **Limpeza:**
   - tirar o protótipo (`src/prototype/`, `prototipo-3d.html`);
   - carregar o three.js à parte, depois do primeiro desenho. O pacote cresceu 128 KB em gzip.

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
