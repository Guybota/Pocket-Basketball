# Plano: o cenário na placa gráfica

**Estado:** aprovado. Fase 1 feita (o chão e as linhas na placa gráfica, com o resto no traçador de raios por cima); próxima: fase 2.

## Porquê

Hoje, o chão, as paredes e as bancadas de cada pavilhão saem de um traçador de raios em JavaScript (`Camera.drawScene`, em `src/ui/art/court.ts`). Desenha a 360×216 e o jogo amplia a imagem até 6×. Daí vêm os três problemas que temos andado a remendar:

1. **Linhas e arestas em blocos** de 4 a 6 píxeis do ecrã, que tremem com a câmara (G2).
2. **Remendos que se esbatem:** quando se suaviza o tremor a 360×216, a imagem ampliada fica desfocada.
3. **Custo:** o mesmo traçador à resolução do ecrã custa 33 a 63 ms por frame. Num jogo a 30 fps cada frame tem 33 ms ao todo.

Uma placa gráfica desenha este cenário a qualquer resolução em menos de 1 ms. Além disso, um pavilhão feito de geometria 3D a sério (caixas, rampas, degraus) é muito mais fácil de mudar e de alargar do que um traçador de raios. Um pavilhão novo, uma bancada diferente, um teto, luzes, ou um ângulo de câmara novo para as repetições passam a ser modelos, e já não contas de raios escritas à mão.

## A escolha: three.js para o cenário, com os bonecos em pixel art por cima

O teste de ontem (`dist-check/linhas-b/real/tudo-*.jpg`) mostrou o resultado pretendido: o cenário fino, à resolução do ecrã, e os bonecos em pixel art. É o que o Calciobit faz, e é o estilo «HD-2D».

| Opção | Resultado | Para o futuro | Veredicto |
|---|---|---|---|
| A. Passar o traçador de raios atual para um shader (um só quadrilátero no ecrã) | Igual ao jogo, a qualquer resolução | Fraco: cada peça nova continua a ser uma conta de raios, agora em GLSL, mais difícil de testar | Não |
| **B. three.js com geometria a sério para o cenário, e os bonecos numa tela 2D por cima, como hoje** | Cenário fino, bonecos iguais aos de hoje | Bom: pavilhões, luzes, câmaras e efeitos novos fazem-se como num motor 3D | **Recomendado** |
| C. Como B, mas os bonecos também em three.js, como quadriláteros virados para a câmara | Igual a B, se bem feito | Igual a B, mais o risco de o cesto e a mesa cortarem os bonecos (crítica A3) e de píxeis desiguais (M5) | Mais tarde, só se for preciso |

**Porque não pomos já os bonecos na placa gráfica (C):** no Chrome, no Edge e no Safari, a tela 2D já é desenhada pela placa gráfica. Os bonecos não são o que pesa: são umas dezenas de `drawImage` por frame. O que pesa é o traçador de raios. A ordem do pintor (`drawables`, ordenados por y), o cesto em duas metades e o arredondamento da escala dos bonecos já resolvem a ordem e a nitidez, e funcionam. Passá-los para 3D obrigava a resolver isso tudo outra vez sem ganhar nada à vista.

O código fica arrumado para os bonecos poderem passar para o 3D mais tarde (C), se um dia houver câmaras que rodam ou luzes que lhes toquem.

**Motor:** `three` 0.187, que já está nas dependências de desenvolvimento por causa do protótipo, com o `WebGLRenderer` (WebGL 2):

- **É o que funciona em mais telemóveis.**
- **O `WebGPURenderer` fica para depois.** Ainda tem limitações no Firefox e em telemóveis antigos, e obriga a escrever os shaders em TSL.
- **A troca é simples.** Os materiais ficam simples e num só ficheiro, por isso trocar de renderizador mais tarde é uma mudança pequena.
- **Tamanho do pacote:** importa-se só o necessário. A crítica mediu cerca de 130 KB em gzip.

**O caminho antigo continua como reserva:** se o browser não tiver WebGL 2, ou se o contexto se perder e não voltar, o jogo usa o `drawScene` de hoje. A página única (`build-page`), os testes e as cenas de revisão também o podem usar.

## Como fica o desenho de um frame

```
<canvas webgl>   o cenário: chão, linhas, paredes, bancadas, escadas, túnel, rede, céu (three.js, resolução do ecrã)
<canvas 2d>      por cima, transparente: o público, os bancos, a mesa, os cestos, os bonecos, a bola, os efeitos, os balões
<html>           a interface, como hoje
```

- **Uma só câmara.** A `Camera` de `court.ts` continua a mandar e passa a dar a matriz de projeção. A câmara three.js copia-a todos os frames. Projeção, `depthScale` e `aim` ficam num só sítio, e tudo o que o 2D desenha bate certo com o 3D.
- **Duas telas sobrepostas.** A tela 2D de hoje fica por cima, com o fundo transparente. Na cena do Bairro, a rede tem uma camada própria, para os adeptos de fora poderem ficar atrás dela. Desenha-se numa segunda passagem do three.js, por cima da camada dos de fora.
- **A aproximação (zoom)** passa a ser só uma mudança na câmara three.js, com o mesmo `zoomShift`, sem esticar a imagem.

## O que se constrói

Tudo fica em `src/ui/gpu/`, e o protótipo `src/prototype/arena3d.ts` serve de ponto de partida.

1. **`venue.ts`, a descrição de cada pavilhão em dados:**
   - **De que é feito:** o polígono do campo, o muro, as filas da bancada (altura, recuo, cadeiras ou tábuas), as escadas, o túnel, os topos, a parede, a rede e o pano de fundo.
   - **De onde vêm os números:** do `CourtTheme`, das constantes que já existem (`STAND`, `TUNNEL`, `WALL_*`) e de mais nenhum sítio. O protótipo tinha números copiados à mão (crítica B3), e isso acaba aqui.
2. **`build.ts`, que constrói a geometria a partir dessa descrição**, numa função por peça (bancada, escada, túnel, muro, rede, céu). Junta as peças em poucas malhas, para fazer poucas chamadas de desenho. Os quatro pavilhões são quatro descrições e não quatro programas.
3. **Texturas:** saem do código que já as gera (`courtTextures`), como hoje, e não se desenha nada à mão.
   - **Chão:** um shader que copia o `floorSample` (o nível pela distância e várias amostras ao longo do passo). Assim o soalho não cintila e não aparecem cores novas (crítica M1). O emblema e o garrafão ficam como píxeis de textura limpos.
   - **Paredes e público pintado:** texels nítidos, com os 5 frames do público a alternar (crítica B6) e os flashes.
   - **Luz e tempo:** a cor da hora do dia e do tempo (`tint`) num só uniforme.
4. **Linhas do campo como geometria fina no chão,** com uma largura mínima de 1 píxel do ecrã. Ficam mais grossas perto e mais finas longe, sempre nítidas e sem tremor, e cada troço mantém a sua cor e luz (`hash`, `lightAt`). As linhas das outras modalidades ficam por baixo das do basquetebol.
5. **`renderer.ts`:**
   - **Desenho:** cria o `WebGLRenderer` e desenha só quando a câmara ou o público mudam, como o `drawScene` de hoje.
   - **Segurança:** trata a perda e a recuperação do contexto, que é o ecrã preto ao voltar à aplicação no telemóvel, e volta ao caminho antigo se falhar.
6. **Ligação ao `match-view.ts`:** troca-se o bloco `drawScene` → `putImageData` por `gpu.render(camera)`. A tela 2D passa a limpar-se com transparência. Fica tudo o resto: os `drawables`, os bonecos, os cestos, o público, os efeitos e a interface.

## Fases

Cada fase acaba com `npm run check`, `npm run browser-check`, as capturas comparadas com o jogo atual e a revisão por agentes que o skill de arte exige.

1. **Base:**
   - o `renderer.ts`, as duas telas, a câmara partilhada, a perda de contexto e o caminho de reserva;
   - só o chão e as linhas, com o resto ainda pelo caminho antigo, para provar a câmara;
   - **medir:** o tremor com a mesma conta de sempre, o tempo por frame no PC e num telemóvel verdadeiro, e o tamanho do pacote.
2. **Pavilhão Municipal completo:** parte do protótipo, com as correções da crítica (as dobras, as cadeiras pintadas no espelho, as cores das escadas, o túnel). Comparação píxel a píxel com o jogo atual.
3. **Grande Arena e Escolar:** as tábuas, as linhas de vólei e badminton, os topos sem bancada e o pavilhão vazio.
4. **Bairro:** a céu aberto, com a rede na sua camada, o pano de fundo, o céu e a relva.
5. **Momentos:** a aproximação no banco, a cerimónia, as repetições, os flashes, o movimento reduzido, o alto contraste e o 640×360.
6. **Limpeza:** tirar o código de teste (`floorLines`, a camada fina de linhas, o `hires`) e o protótipo, e deixar o `drawScene` só como reserva, com testes que confirmem que os dois caminhos põem o campo no mesmo sítio.

## Riscos

- **Telemóveis fracos ou sem WebGL 2:** há o caminho de reserva, e a fase 1 mede um telemóvel verdadeiro antes de se continuar.
- **Duas maneiras de desenhar o mesmo pavilhão:** a reserva só tem de estar certa, não igual píxel a píxel. Um teste confirma que as duas põem os cantos do campo e os cestos no mesmo sítio.
- **Os bonecos ficam em blocos de píxeis e o cenário fino:** é o estilo pretendido. Os bonecos já são ampliados primeiro por um inteiro e só depois ajustados, e assim continuam.
- **Repetições e Match ID:** não mudam, porque a simulação (`src/sim/`) não é tocada.

## Por decidir mais tarde, não agora

- Os bonecos no 3D (opção C), se houver câmaras que rodem.
- O `WebGPURenderer`, quando estiver estável em todos os browsers.
- Luz a sério (holofotes, reflexo do soalho em tempo real) em vez do `tint` e dos reflexos pintados.
