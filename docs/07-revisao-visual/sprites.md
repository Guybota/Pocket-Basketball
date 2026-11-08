# Revisão: bonecos dos jogadores e as 68 poses — v1

**Pedido:** revisão dos bonecos gerados em `src/ui/art/sprites.ts` (`buildSprite`, `POSES`, `drawSprite`, `lookOf`) e `body.ts`, todas as poses, aspetos extremos e variantes.
**Veredicto:** PASSA COM CORREÇÕES — 0 bloqueantes, 7 a corrigir, 5 sugestões
**Folhas:** `dist-check/revisao/spr-todas-claro`, `spr-todas-escuro`, `spr-alturas`, `spr-corpos`, `spr-cabelos`, `spr-kits` (descrições em `scratchpad/review/specs-sprites/a.json` a `f.json`; medidas próprias em `scratchpad/review/py/`)
**Cobertura:** 68 poses × 6 variantes (front, ball, back, backBall, flip, flipBall) em pele 0 e pele 3; alturas `legs/torso` 4/4 e 9/9; corpos slim, muscular e heavy (com `street`); os 5 estilos e os 6 cabelos; kits blue, cream, referee, coach, suit, blouse e 3 `custom` (gold e green de `DEFAULT_KITS`, e um escuro `#3a2a4a` com faixa). No total, 2239 células.
**Medidas:** alfa 0 fora das quedas · espelho exato em todas as células (`mirrorDiff` 0) · contorno: 3 poses com falhas (`ftDip` sempre; `getup2` e `slump` nos baixos) · pés: 2 poses fora da linha (`ftDip` −1 px, `gather` +1 px) · cantos em L: 0 nos equipamentos sem tinta, 20 vindos de peças cor de tinta · órfãos: 4 a 5 por célula (limite 3) · cabeça 8×8 constante.

Coordenadas: as de célula (40×56, pés em y 52, âncora x 20); a célula do sprite está deslocada (+3, +7) face à grelha 34×46 de `buildSprite`.

## Problemas

### C1 — A corrigir — `ftDip`: os pés afundam 1 px e perdem o contorno de baixo
- **Folha:** todas, célula 32 `ftDip`, todas as variantes (por exemplo `spr-todas-claro`, linha 1)
- **Onde:** os sapatos estão nas linhas 51–52 da célula, em vez de 50–51 como no `idle`. A linha 52 é a última da grelha do sprite (y 45 em 34×46), por isso não há onde pôr a tinta por baixo.
- **Medida:** 8 píxeis de borda sem tinta, que são os dois sapatos de 4 px (6 no slim, 10 no muscular e no heavy, a mesma causa); o `idle` tem a linha 52 toda a `########`, e o `ftDip` não.
- **Regra:** contorno de 1 px contínuo (pixel-art §2.4, §12); os pés na mesma linha nas poses de apoio (revisao §7.7).
- **Causa:** `sprites.ts:80` usa `jump: -2` com os pés em `L - 1`. As outras poses agachadas compensam: `post0` usa `jump -2` com `L - 2`, e `defend` usa `jump -1` com `L - 1`.
- **Proposta:** em `sprites.ts:80`, `f: [-3, L - 2], g: [3, L - 2]`.

### C2 — A corrigir — `gather` flutua 1 px acima do chão
- **Folha:** todas, célula 33 `gather`, front e ball
- **Medida:** pés em y 51 contra 52 no `idle`. É a única pose sem salto (`jump` 0) fora da linha, e acontece em todos os aspetos medidos (6 de 6).
- **Regra:** pés na linha do chão nas poses de apoio. A pose é a antecipação do lançamento e do lance livre (`match-view.ts:520`, `:1046`), por isso devia fletir em vez de levantar.
- **Proposta:** em `sprites.ts:81`, juntar `jump: -1`. Os pés em `L - 1` com `jump -1` ficam no chão, como o `defend`, e a cabeça desce 1 px: a antecipação certa antes do `shoot`.

### C3 — A corrigir — `clap0` e `clap1` são o mesmo boneco
- **Folha:** `spr-todas-claro`, células 58 e 59, todas as variantes
- **Medida:** silhueta igual (0 px de diferença entre as máscaras) e só 4 píxeis de cor diferentes. Para comparar: `cheer0`/`cheer1` diferem muito mais.
- **Regra:** cada pose reconhece-se pela silhueta (pixel-art §3.2), e um ciclo de 2 frames tem de mudar alguma coisa visível (animacao §10).
- **Causa:** `sprites.ts:118-119`. O comentário diz «mãos afastadas e mãos juntas», mas as duas poses levam as mãos para dentro: `a` positivo e `b` negativo, ambos a cruzar o peito. Ficam sempre dentro do tronco, e as mãos «afastadas» de `clap1` só apagam 2 píxeis do queixo, que ficam órfãos em (17,36) e (22,36).
- **Proposta:** `clap0: a: [-4, -3], b: [4, -3]` (afastadas, fora da silhueta) e `clap1: a: [2, -2], b: [-2, -2]` (juntas). Usado pelos adeptos (`match-view.ts:1574`) e pelo banco (`:1440`).

### C4 — A corrigir — cabelo 1 em pele 3: o cabelo desaparece
- **Folha:** `spr-cabelos`, linhas 3 e 4 (pele 3, cabelo 1, estilo 1) e `spr-alturas`
- **Medida:** `HAIRS[1]` `#5a3a22` (L 0,380) contra `SKINS[3]` `#5c3a24` (L 0,383): ΔL 0,003, com 2 unidades de RGB de diferença. A cabeça lê-se como um bloco castanho só com olhos, e o estilo de cabelo não se distingue.
- **Regra:** o cabelo distingue as pessoas a esta escala (pixel-art §3.3); ler em cinzentos (§3.2).
- **Proposta:** em `lookOf` (`sprites.ts:170`), afastar o cabelo da pele. Por exemplo, `const hair = (hash >>> 3) % HAIRS.length;`, e depois `hair: look.skin >= 2 && (hair === 1 || hair === 5) ? 0 : hair`, ou a regra geral |ΔL(cabelo, pele)| ≥ 0,08. Atenção: muda a cara de alguns jogadores existentes.

### C5 — A corrigir — cabelos 0 e 4 da cor da tinta
- **Folha:** `spr-cabelos`, linha 9 (cabelo 4, estilo 4), célula 01: linhas 28–30 todas a `#`; `spr-todas-escuro` (cabelo 4, estilo 2)
- **Medida:** `HAIRS[4]` é exatamente `#1b2230` = `INK`; `HAIRS[0]` `#2a2230` tem L 0,267 contra 0,252 da tinta (ΔL 0,015). O cabelo funde-se com o contorno, a cabeça perde o topo, e no estilo 4 a fita branca fica a flutuar. Também gera os 8 cantos em L medidos em `spr-cabelos` (por exemplo (15,30) e (24,30)).
- **Regra:** o contorno é o ponto de máximo contraste e não se partilha com o preenchimento (pixel-art §2.3).
- **Proposta:** em `sprites.ts:11`, trocar `HAIRS[4]` por um preto-azulado com ΔL ≥ 0,06 da tinta (por exemplo `#363c52` [NV]) e subir `HAIRS[0]` para um tom semelhante (`#3a2f40` [NV]); depois confirmar em `spr-cabelos`.

### C6 — A corrigir — peças do equipamento cor de tinta fundem-se com o contorno
- **Folha:** `spr-kits`, linha 13 (`suit`), célula 01 `idle` front: (14,42) e linhas 39–42 com 2 a 3 px de tinta seguidos (a manga de trás desaparece). Linha 19 (custom `gold`): calções e debruns a tinta, e as pernas parecem soltas do tronco.
- **Medida:** 12 cantos em L, todos no `suit`. `KITS.suit.shade`, os `shorts` de `referee`, `coach` e `blouse`, e os `shorts`/`trim` de `DEFAULT_KITS.gold` (`kit.ts:20`) são `#1b2230`. O equipamento escuro `#3a2a4a` tem ΔL 0,07 da tinta, e a sombra calculada por `shadeOf` (×0,72) chega a ΔL 0,01.
- **Regra:** contorno escuro e único (pixel-art §2.3 e §2.4); cantos em L (§1.3).
- **Proposta:** em `buildSprite`, logo a seguir a `sprites.ts:226`, trocar qualquer cor de preenchimento igual a `INK` por `#2c3345` (a cor do fato), por exemplo `const fill = (c: string) => (c === INK ? '#2c3345' : c)` aplicado a `kit.shorts`, `kit.trim` e `kit.shade`. Nos `custom`, fazer o mesmo em `kitColors` (`:183`). As riscas do árbitro (`:270`) podem ficar a tinta, porque são de propósito.

### C7 — A corrigir — `getup2` e `slump` nos jogadores baixos
- **Folha:** `spr-alturas`, linha 1 (`legs` 4, `torso` 4), células 25 e 64
- **Medida:** `getup2` tem 8 px de borda sem tinta: os joelhos ficam 1 px abaixo da linha do chão e são cortados na linha 52. `slump` tem 4 px sem tinta: as mãos (linhas 50–52) passam abaixo dos sapatos e são cortadas.
- **Causa:** `sprites.ts:71`: `jump: Math.min(0, 5 - L)` não deixa subir quando `L` < 5. `sprites.ts:125`: o braço tem sempre 8 px, mas o tronco tem só 4.
- **Proposta:** `getup2`: `jump: 5 - L`. `slump`: passar `T` às poses (`POSES[pose](L, T)` em `:224`) e usar `a: [-1, Math.min(8, T + 3)]` (e o mesmo para `b`). Só afeta alturas até cerca de 158 cm (`pixelsForHeight`), por isso é de prioridade baixa.

### S1 — Sugestão — píxel de sombra solto no ombro
- **Medida:** `#1d43a3` (e equivalentes) órfão em (22,38) em 392 de 390+ células. `sprites.ts:327` pinta a sombra por cima do braço direito, que com `overlap = 1` (`:252`) tapa a coluna de sombra do tronco (`:268`).
- **Proposta:** apagar `:327`, ou pintá-la só quando `body.arm === 1`.

### S2 — Sugestão — órfãos acima do limite (3 por boneco)
- **Medida:** 4 a 5 órfãos por célula (máximo de 7 em `spr-alturas`): os dois píxeis da cor da camisola nos sapatos (`:242`), o de S1, e no estilo 4 os dois píxeis de cabelo nas têmporas debaixo da fita (`:299-302`, 376 ocorrências com o cabelo 2).
- **Proposta:** o detalhe do sapato passa a 2 px (`rect(x1 - 1, y1 + 3, 2, 1, kit.jersey)`) ou sai; no estilo 4, não pôr os píxeis das têmporas (`if (look.style !== 4)` em `:299-300`).

### S3 — Sugestão — contraste de valor contra o chão
- **Medida (OKLab L, luz ambiente a ambiente+spot, sem a tinta do tempo):** chão do Bairro 0,45–0,49, do Escolar 0,64–0,88, do Municipal 0,56–0,83 e da Arena 0,43–0,77; tinta 0,25. A camisola `blue` (0,53) e o `coach` (0,55) caem dentro do intervalo do chão no Municipal e na Arena (Δ 0,00–0,03); o equipamento escuro custom (0,32) é igual ao garrafão da Arena (0,33). A bola (0,66) fica **dentro** do intervalo do soalho no Escolar e no Municipal, contra a regra «a bola é o objeto com mais contraste».
- **Leitura:** a silhueta aguenta-se pelo contorno de tinta (ΔL ≥ 0,18 contra todos os chões), e no `blue` também pelos calções brancos.
- **Proposta:** validar os `custom` no guarda-roupa com ΔL ≥ 0,1 contra a tinta e contra o chão, e dar à bola um brilho maior ou um anel claro. Fica fora de `sprites.ts`; a decidir com quem faz o campo.

### S4 — Sugestão — olhos de 1×2
- `sprites.ts:306-307` desenha olhos de 1×2, e o SKILL pede «olhos de 1 píxel» a 24 px. Lê-se bem como está; fica à decisão do autor.

### S5 — Sugestão — `fallA` com 6 píxeis meio transparentes
- Esperado (rotação de 30° em `leaned`, `:370`), e sem outros defeitos. Fica registado só para comparar no futuro.

## Visto e sem problemas
- Alfa 0 em todas as células fora das quedas, e nenhum boneco toca a borda da célula, incluindo o alto (9/9) a afundar e com o cabelo do estilo 2.
- Virado = espelho exato (`mirrorDiff` 0) em todas as variantes, incluindo os padrões `stripes` e `sash` dos `custom`.
- A cabeça é sempre 8×8. Só o cabelo dá volume (estilos 1 e 2: +2 de altura, +2 de largura no 2), e o queixo largo do `heavy`, que os jogadores não usam (`lookOf` força `athletic`).
- Pés na linha do chão em todas as poses de apoio, menos C1 e C2. As poses com salto variam, como devem.
- Silhuetas distintas entre as poses-chave. Os pares mais parecidos (`drib0`/`drib1` 7 px, `hold`/`holdSpin` 8 px, os pares dos ciclos de corrida) diferem pela bola ou pelo braço, como é próprio de um ciclo. O único problema é C3.
- Nenhum canto em L no contorno exterior dos equipamentos sem peças cor de tinta (0 em 1300 células).
- `fallB` e `fallen`: só a rotação esperada.

## Não verificado
- O contraste com a luz do tempo (noite, chuva, tarde) e o reflexo no chão (`drawReflection`, com `globalAlpha`).
- Os padrões `hoops`, `pin` e `sides` dos `custom`.
- Os tempos e a troca entre poses em jogo: não gravei nenhum cenário, só folhas.
- As poses na cidade e nas cenas (`street`, só no corpo heavy).
