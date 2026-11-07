# R7 — Revisão de código, arquitetura e desempenho

Revisão só de leitura do commit `e359347`. Não alterei nada no repositório. As medições foram feitas neste contentor (4 CPUs), que estava a ser usado ao mesmo tempo por outros agentes. Os tempos absolutos servem de ordem de grandeza; as proporções entre eles são fiáveis.

## Medições

| O quê | Resultado |
|---|---|
| `npm run check` (tsc + vitest) | **passa**: 13 ficheiros, 265 testes, **864 s (14 min 26 s)**; tsc sozinho demora 0,8 s |
| Só `src/ui` + `league.test.ts` (104 testes) | **317 s**: os testes "de interface" também simulam épocas inteiras |
| `npm run build-page` | 0,8 s → `dist/pocket-basketball.html` com 393 KB (132 KB em gzip) |
| Bundle do `vite build` | JS 349 KB + CSS 53 KB (131 KB transferidos) |
| Um jogo simulado (Node) | ~100 ms, ~10 900 ticks, 9 µs/tick; **29 % do CPU vai para o garbage collector** |
| Hotspots da simulação | `step` 16 %, `updateTargets` 12,5 %, `resolveContacts` 6,7 %, `movePlayers` 5,8 % |
| Arranque até à cidade (Chromium, CPU 4×, 390×844@3) | 1,26 s (DCL 0,41 s); portátil 1×: 0,35 s |
| Render por imagem, telemóvel CPU 4× | cidade 9,5 ms, **jogo 20,8 ms** (p95 do intervalo entre imagens 33 ms, ou seja, perde imagens); jogo ×8: 24 ms, p50 33 ms |
| Render por imagem, portátil 1440×900@2 | cidade 2,7 ms, jogo 3,2 ms (60 fps estáveis) |
| Perfil de um jogo no browser | `floorSample` 16 % + `drawScene` 11 % ≈ **64 % do tempo ocupado** (raycaster em software do chão e das bancadas) |
| Perfil da cidade | `fillPolygon`, `fillRect` e "program" ≈ 30 %: os edifícios rasterizam-se em linhas de varrimento a **cada imagem** |
| Heap JS | 6 MB na cidade, 25–30 MB num jogo |

## Achados por gravidade

### Alta

1. **"Criar clube" apaga o clube guardado sem pedir confirmação.** Em `src/ui/main.ts:516-523` o botão faz logo `club = newClub(...)` e `saveClub()`. No título, com um clube, o botão aparece ao lado de "Continuar" (`main.ts:504-505`), por isso basta um toque ao lado para perder a carreira; só os troféus passam (`careerOf`). Ao importar há `confirm` (`main.ts:378-381`), mas aqui não. O mesmo acontece com um save ilegível: o aviso diz "só é substituído se criares um novo", e ele é logo substituído, sem guardar uma cópia de segurança. **Correção:** usar o mesmo `confirm` da importação. Antes de escrever por cima, copiar o texto antigo para `pocket-basketball-clube.bak`, sobretudo quando `saveUnreadable` é verdadeiro (é o caso de um save de uma versão mais nova aberto por um código antigo em cache).

2. **Basta uma exceção para o jogo congelar de vez.** `frame()` (`main.ts:1023-1129`) só volta a pedir `requestAnimationFrame` na última linha, e não há `try/finally` nem `window.onerror`/`unhandledrejection`. Um erro em `render`, `refreshContent` ou `drawTown` (um save estranho, uma pose que falta) para o ciclo sem aviso: o ecrã fica parado e o jogo não guarda mais nada. **Correção:** pedir o rAF no início de `frame`, ou envolver o corpo em `try { … } finally { requestAnimationFrame(frame) }`. Juntar um `addEventListener('error')` que mostre um aviso com "Exportar clube".

3. **O CI publica sem testar.** `.github/workflows/pages.yml` corre só `npm ci` e `npm run build`. Nem `tsc` corre, e o Vite não verifica tipos. Um push para `main` com tipos partidos ou com o determinismo estragado vai direto para os jogadores. **Correção:** um passo `npx tsc && npx vitest run <testes rápidos>` antes do build (ver o ponto 4).

### Média

4. **O `npm run check` demora 14 minutos.** O AGENTS.md pede para o correr antes de cada entrega, por isso cada iteração de um agente custa um quarto de hora. A culpa é dos testes estatísticos (`sim-balance`: `summarize(…, 500)`, `attributeWinRate` 7×600, `betterTeamWinRate(55, 600)`, `movesWinRate`, `styleWinRate`…), com milhares de jogos. Também conta o `club.test.ts`, que joga épocas inteiras com jogos verdadeiros (`club.test.ts:250, 399, 528`). **Proposta:** dividir em `npm run check` (tsc, regras, determinismo, formato dos saves, UI: alvo < 60 s) e `npm run balance` (as taxas de vitória), para correr quando se muda `balance.ts` e numa tarefa noturna do CI. Para a lógica de época no `club.test.ts`, gerar resultados uma vez (fixture) ou usar menos jornadas.

5. **A simulação passa 29 % do tempo no GC.** Em `src/sim/match.ts` há 42 sítios com `[...a, ...b]`, `.filter`, `.map` e `.sort` por tick. Muitos são `sort(...)[0]` só para achar o mais próximo (`match.ts:581, 838, 1603, 1612, 1675, 1684, 1695, 1828, 2394`) ou `[...s.court[0], ...s.court[1]].every(...)` (`match.ts:2317`). **Proposta:** uma função `closest(list, key)` em `court.ts`, com um ciclo e sem alocar, substitui uns 10 `sort()[0]`, e um `bothCourts` pré-alocado no estado. Ganho esperado: 20–30 % na simulação, o que se nota nos testes, no `npm run sim` e no arranque de cada jogo (ponto 6). É determinista: a ordem dos empates mantém-se se `closest` escolher o primeiro mínimo, tal como faz o `sort` estável.

6. **Os outros jogos da jornada simulam-se duas vezes, e na thread principal.** `liveOtherGames` (`club.ts:528-537`) simula os 4 jogos ao apito inicial (`main.ts:441`), para os mostrar ao vivo. No fim, `playRound` (`club.ts:964-973`) simula outra vez os mesmos jogos com as mesmas sementes. Pelo contador do próprio jogo (`__pocket.timeOtherGames`) e pela medição acima, são ~0,4 s bloqueados no portátil e mais de 1 s num telemóvel, ao carregar em "Começar". **Proposta:** guardar os `MatchState` finais (ou só o resultado) de `liveOtherGames` e reaproveitá-los em `playRound`. A fórmula da semente `(weekSeed(club) + (i + 1) * 257) & 0x7fffffff` está copiada em `club.ts:535, 754, 797, 971`: passa para uma função `otherSeed(club, i)`. Isto apaga uma das simulações e uma fonte de divergência.

7. **No telemóvel o jogo não chega aos 60 fps, por causa do raycaster do chão.** `Camera.drawScene` (`src/ui/art/court.ts:671+`) calcula cada píxel em software, com até 6 amostras de textura (`court.ts:699`), a cada imagem e mesmo quando a câmara está parada (descontos, intervalo, pausa). Com o CPU a 4×: 21 ms por imagem, p95 de 33 ms. **Proposta, por ordem de custo:** (a) não refazer o chão quando a câmara não mudou de píxel (comparar `cx, cy, cz, lookX, lookY` arredondados) e o frame da multidão é o mesmo, e nesse caso só copiar `this.image`; (b) limitar `samples` a 2–3; (c) a meio prazo, desenhar o chão uma vez numa textura e projetá-lo com `setTransform` por faixas de linhas, ou em WebGL.

8. **A cidade e os menus redesenham tudo a 60 fps.** `drawTown` (`art/town.ts:486-564`) guarda o chão em cache, mas os edifícios e as árvores (`town.objects`) rasterizam-se de novo a cada imagem com `fillPolygon` (`court.ts:767-781`). Essa função aloca um array e ordena-o por cada linha de varrimento. `menuFrame` (`menus.ts:1304`) faz `getElementById` 4× e redesenha as cenas a cada imagem, mesmo com `reducedMotion`. `main.ts:1090-1092` cria 6 `Look` novos por imagem. Os bonecos só mudam de frame a cada 170 ms (`WALK_FRAME_MS`). **Proposta:** em `buildTown`, pintar cada objeto num canvas pequeno (ou numa só camada, com a sua profundidade) e fazer `drawImage` por imagem. Na cidade e nos menus, baixar para ~20–30 fps, ou desenhar só quando o relógio de animação muda de frame. Isto poupa bateria no ecrã onde o jogador passa mais tempo.

9. **O service worker vai sempre primeiro à rede, sem prazo, e a cache nunca é limpa.** `public/sw.js:12-24` pede tudo à rede antes da cache, incluindo os assets com hash, que nunca mudam. Com uma rede má mas "ligada" (lie-fi), o arranque fica à espera do timeout do browser. A cache tem um só nome, por isso cada deploy acrescenta ~400 KB para sempre (o `shortcut:` já o admite). As navegações com `?semente=` ficam também guardadas, cada uma numa entrada. **Proposta:** cache primeiro para `/assets/*` (o nome já leva o hash); rede primeiro com um prazo de ~3 s para a página; no `activate`, apagar as entradas de `assets/` que o `index.html` atual não usa.

10. **Não há manifest, por isso não se instala no Android ou no desktop.** Só existem as metas da Apple (`index.html:9-14`). O Chrome e o Edge não oferecem "Instalar" sem `manifest.webmanifest` (nome, ícones de 192 e 512, `display: standalone`, `theme_color`). O ícone já se gera com `build-icon`. Acresce que a folha de estilos do Google Fonts (`index.html:17-18`, `build-page.ts:18-19`) bloqueia o render: na primeira visita sem rede, ou com o domínio bloqueado, o primeiro desenho espera pelo timeout. **Proposta:** pôr as fontes Jersey dentro do projeto (são OFL) ou carregá-las com `media="print" onload`, e acrescentar o manifest.

11. **As migrações dos saves funcionam, mas têm duas cadeias e os tipos mentem.** Cada `migrateVn` chama a seguinte (`club.ts:1085-1150`), e `parseClub` volta a correr a escada de `if (parsed.version === n)` (`club.ts:1227-1237`). Os `if` que vêm a seguir nunca fazem nada, e quem lê o código fica sem saber qual das cadeias manda. Todas as funções dizem receber `ClubState`, mas recebem formas antigas: `(old.trainedThisWeek as unknown) === true` (`club.ts:1191`), `as ClubState['cups']` (`club.ts:1164`). E `migrateV1` sai mais cedo (`club.ts:1222-1226`), sem passar por `validExtras`, `validCups` nem `validRounds`. **Proposta:** uma tabela `const MIGRATIONS: Record<number, (old: any-like Record) => Record>`, em que cada uma faz só um passo, e um ciclo `while (v < SAVE_VERSION) data = MIGRATIONS[v++](data)` seguido de uma só validação no fim. Apaga a recursão e os 11 `if`. Falta também um teste de fixture por versão (um JSON real v1…v13 em `src/ui/fixtures/`). Hoje só se pode confirmar que cada migração continua a funcionar se o `club.test.ts` construir à mão saves antigos.

### Baixa

12. **As caches de sprites e de dataURLs crescem sem limite.** `sprites.ts:197` (`cache`), `:429`, `:432`, `portrait.ts:20`, `wardrobe.ts:42`, `kit.ts:167-168` e `court.ts:303` nunca são limpas. A chave do sprite junta pose, equipamento, pele, cabelo, estilo, corpo, costas e bola, e cada adversário traz equipamentos novos. Numa sessão longa (dezenas de jogos) acumulam-se milhares de canvas de 34×46. Só `club.ts:334` tem um limite. **Proposta:** o mesmo `if (cache.size > N) cache.clear()` nas caches de sprites e de texturas, que são as maiores.

13. **O áudio continua com a página escondida.** `audio.ts` não ouve `visibilitychange`: os `setTimeout` da música (`audio.ts:74-76`) continuam, mais espaçados, e o `AudioContext` não é suspenso. **Proposta:** `context.suspend()` quando a página fica escondida e `resume()` quando volta. O rAF já para sozinho.

14. **Escala não inteira em janelas muito pequenas.** `main.ts:266-268`: quando `available * dpr < 1`, `finalScale = available` deixa de ser um múltiplo inteiro (com `image-rendering: pixelated` ficam píxeis de tamanhos diferentes). Isto contraria a regra do AGENTS.md, mas só acontece com janelas abaixo de 360 px de CSS a dpr 1. Também não há ouvinte para mudanças de `devicePixelRatio` (arrastar a janela para outro monitor) quando a mudança não dispara `resize`.

15. **`Math.random` no ecrã do jogo.** Os flashes das bancadas usam `Math.random` (`match-view.ts:1090-1091`). Está fora de `src/sim`, por isso a regra deixa, mas significa que uma repetição não reproduz a imagem. Não afeta o Match ID.

16. **A lógica de época está em `src/ui/club.ts` (1253 linhas) e escapa às regras da simulação.** Tem calendário, taças, mercado, salários e saves, não usa DOM, e é determinista na prática. O teste de proibições (`sim-rules.test.ts:36-49`) só lê `src/sim/`, por isso um `Math.pow` ou um `Date` em `club.ts` passava. Além disso, importa de `ui/art/kit.ts`, `ui/art/identity.ts` e `ui/setup.ts`, o que liga a lógica à arte. **Proposta:** mudar para `src/career/` (ou `src/sim/career/`) a lógica sem arte (`club.ts` sem as partes de `kit`/`identity`, mais `setup.ts`) e alargar o teste de regras a essa pasta. A validação de `Emblem` e `ClubKit` passa para lá; a arte só os desenha.

## Determinismo: o que está bem

- `rng.ts` (Mulberry32 com `Math.imul`) é exato entre motores. A simulação só usa `Math.sqrt`, `min`, `max`, `abs`, `round`, `floor` e `ceil`, que são exatos em IEEE-754. O teste de regras faz cumprir as proibições e as importações.
- Os `sort` de `src/sim` têm comparadores puros e o `Array.prototype.sort` é estável desde o ES2019, por isso os empates resolvem-se da mesma maneira em todos os browsers. `Object.keys`/`values` só se aplicam a constantes literais (`league.ts:41,53`, `playoff.ts:36`, `training.ts:40`), com uma ordem definida pela especificação.
- O `browser-check` compara o `matchHash` do Node com o do browser (`browser-check.ts:113-114`), mas num só browser de cada vez. **Falta:** um hash fixo no código (golden) num teste rápido, p.ex. `expect(matchHash(simulateMatch(home, away, 123))).toBe('…')`. Hoje uma mudança que altere todos os jogos passa nos testes sem ninguém reparar (a regra "mudar o contrato exige dizê-lo" não tem quem a faça cumprir). Atualizar esse hash obriga a tomar uma decisão consciente.
- `matchHash` (`hash.ts`) só cobre `score`, `tick` e `events`. As posições não entram, o que basta para o Match ID.

## Arquitetura e acoplamento

Ficheiros maiores: `sim/match.ts` 2532, `ui/match-view.ts` 1466, `ui/main.ts` 1358, `ui/menus.ts` 1318, `ui/club.ts` 1253, `ui/club.test.ts` 900, `ui/art/court.ts` 856.

- `main.ts` tem **56 variáveis `let` ao nível do módulo** (fase, pausa, acumuladores, temporizadores, painéis) e faz de controlador, de ciclo de jogo, de gestor de layout, de gestor de saves e de PWA. `menus.ts` tem mais 38. **Divisão proposta:** `ui/layout.ts` (`fit`, `setCanvasSize`, `windowHeight`: ~120 linhas, `main.ts:190-300`), `ui/save.ts` (`saveClub`, `loadClub`, importar e exportar, mais a cópia de segurança do ponto 1), `ui/pwa.ts` (SW e verificação de atualização, `main.ts:1333-1358`) e `ui/match-loop.ts` (`frame` e os acumuladores). Só mover código, sem lógica nova.
- `match.ts` (2532): as fases (`intro`, `jump`, `timeout`, `break`, `live`), os contactos (`resolveContacts` ~1909), o movimento (`movePlayers` 1849), as decisões (`decide` 1224) e os comandos do treinador estão todos no mesmo ficheiro. Divisão natural: `match-contact.ts`, `match-move.ts`, `match-decide.ts` e `match-commands.ts`, com o `MatchState` em `types.ts`. Continua tudo dentro de `src/sim/`, por isso as regras não mudam.
- `match-view.ts` guarda ~15 `Map<Body, …>` paralelos (`match-view.ts:114-190`: looks, previous, motions, overrides, slides, routines, shotJumps, stepBacks, reboundJumps, dunkJumps, huddlePos, nameTags…). Um só `Map<Body, BodyView>` com esses campos tira ~14 `get` por boneco por imagem e acaba com a limpeza dispersa.
- Duplicação nos testes: `home`, `away` e `flat` estão definidos de novo em 6 ficheiros `sim-*.test.ts`. Passam para `sim/test-fixtures.ts`.
- `render()` cria por imagem closures `{ y, draw: () => … }` para cada boneco, cada cesto e cada nuvem de pó (`match-view.ts:1114-1233`). Com 12 bonecos é pouco, mas um array reutilizado de registos simples (`kind, y, index`) com `switch` evita ~30 closures por imagem.

## Tipos

`strict`, `noUncheckedIndexedAccess` e `erasableSyntaxOnly` estão ligados; não há `any`. Há 7 `as unknown` fora dos testes e ~370 asserções `!` em `ui` + `sim`, quase todas `array[i]!` impostas por `noUncheckedIndexedAccess`, o que é aceitável. O ponto fraco são os saves: `JSON.parse(text) as ClubState` (`club.ts:1211`) e migrações que fingem receber o formato atual (ponto 11).

## Cobertura de testes

Não há uma ferramenta de cobertura instalada. Pelo que se lê no código:

- Bem coberto: as regras e a física da simulação, o equilíbrio, as ligas e taças, a lógica de clube e as migrações (através do `club.test.ts`, com 72 testes), e algumas partes da arte (`body`, `court`, `identity`, `town`).
- Só coberto pelo `browser-check` (Playwright, fora do `check`): `main.ts`, `menus.ts`, `match-view.ts`, `audio.ts` e `awake.ts`, ou seja, ~4 300 linhas. Não há um teste unitário para `fit()`, a escolha de layout de que dependem a escala inteira e a rotação. Em Node é fácil testar a parte de cálculo, se for separada do DOM (ver `ui/layout.ts`).

## O que apagar, juntar e dividir

| Ação | Onde | Efeito |
|---|---|---|
| Apagar | os 11 `if (parsed.version === n)` (`club.ts:1227-1237`) **ou** a recursão das migrações | uma só cadeia |
| Apagar | a segunda simulação dos outros jogos (`playRound` reaproveita `liveOtherGames`) | −4 jogos por jornada, menos espera no apito |
| Juntar | `otherSeed(club, i)` para as 4 cópias da semente | uma só fonte de verdade |
| Juntar | `closest()` para ~10 `sort()[0]` em `match.ts` | menos GC, simulação mais rápida |
| Juntar | os Maps de `MatchView` num `BodyView` | menos procuras por imagem |
| Juntar | `home`/`away`/`flat` dos testes num fixture | −5 cópias |
| Dividir | `main.ts` → layout, save, pwa, loop | um ficheiro com 56 `let` passa a 4 com estado próprio |
| Dividir | `match.ts` → contact, move, decide, commands | ficheiros < 800 linhas |
| Dividir | `npm run check` → rápido + `npm run balance` | ciclo de agente de 14 min → < 1 min |
| Mudar | `club.ts`/`setup.ts` para uma pasta coberta pelas regras da simulação | proibições aplicadas à lógica de carreira |
| Acrescentar | testes no CI, golden hash, fixtures de saves por versão, `manifest.webmanifest` | contratos com quem os faça cumprir |
