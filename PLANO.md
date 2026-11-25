# Plano da equipa

Revisto pelo Manager a 25 nov 2026, a partir dos levantamentos de cada chat (base `c5018f6`). A primeira versão vinha das listas de 14 nov e estava atrás do código; os levantamentos mostraram que estas já estão feitas: momentos grandes com peso e limite (N4), textos empilhados (N3, N7), grandes planos a deslizar (N5), aviso do movimento curto (N6), marcador por baixo dos balões (defeito 1), cena com o painel (defeito 2), resultado sem nova contagem (defeito 4), resposta ao toque (lacuna 4), contagem no intervalo (16), filme do jogo (10), retorno ao contratar (13), suplentes a saltar e vencidos de cabeça baixa (parte da 2), N8, N9 e N10. O ramo `claude/game-halftime-freeze-boyo3j` já não faz falta (Q2).

O plano longo e o histórico das fases estão em [docs/02-plano-desenvolvimento.md](docs/02-plano-desenvolvimento.md). Os levantamentos completos de cada chat estão nas notas das sessões; o essencial está aqui.

Como se usa:
- Cada tarefa tem um código, é de **um só chat** e diz de que depende. O Manager lança os chats de uma onda e junta os ramos (ver «Trabalho em equipa» no `AGENTS.md`).
- Quando uma tarefa acaba, o Manager risca-a aqui no mesmo commit em que junta o ramo; as riscadas saem na onda seguinte.
- Uma tarefa visual começa sempre por um mockup aprovado pelo utilizador.
- `match-view.ts` tem 3700 linhas e quase todo o trabalho da Arte passa por lá: nunca duas tarefas nele ao mesmo tempo.

Chats: **Sim**, **UI**, **Arte**, **Som**, **QA**.

## Onda 1: o que está partido ou mal feito

| # | Chat | Tarefa | Onde |
|---|---|---|---|
| U1 | UI | A 640×360, o tamanho mínimo: no escritório os botões redondos tapam a janela (grelha de 3 colunas); na cidade o cartão da secretária tapa «Aeroporto» e «Torre»; no treino a mini-ficha e os botões cortam-se e as etiquetas das gavetas ficam com ~8 px (mínimo 12). | `style.css:1504`, `season-screens.ts:84-97`, treino |
| U2 | UI | Os pequenos: botões do jogo à vista no placar do título (N11); o quadradinho de «Iniciados» e a tabela da federação sem sinal de que rola (N14); legendas coladas no escritório (N15); «Intervalo» duas vezes e a faixa a cortar o título (N16); 3 s de campo vazio antes do fundido do intervalo (N18); «Adversário» e «Estatísticas» com o mesmo ícone; a secretária diz «Semana da Taça» depois de se sair da taça; o ressalto do cartão do próximo jogo perde-se no fundido (lacuna 19). | `main.ts`, `menus.ts`, `season-screens.ts`, `style.css` |
| A1 | Arte | Cesto com falta como «2+1» num só sítio (N19); a faixa da falta encosta-se à zona das faixas em vez de tapar a jogada; «Reviravolta!» não sai num desempate (`lead <= e.points`); o lance livre deixa de filtrar `s.events` a cada imagem. | `match-view.ts:941`, `:1198`, `:1226`, `:2261` |
| O1 | Som | Níveis: o som do jogo está ~12–15 dB abaixo do alvo de −18 LUFS (estimativa); a rede soa mais baixa do que a festa e o encontrão; o encontrão está fora da faixa de corpo (centróide 2,4 kHz); o grito solto (−51 dB) não se ouve; `roomImpulse` e os metais calculam-se no fio do jogo. O utilizador ouve os WAV antes do merge. | `synth.ts`, `audio.ts` |
| Q3 | QA | Testes que teriam apanhado regressões já vistas: um teste de sobreposição a 640×360 (nenhum botão redondo sobre a janela ou as etiquetas); o `browser-check` espera pelo fim do `stage-in` (a `cidade.png` sai azul); coisas a piscar quando um ecrã se reescreve (falas, cartas, nota da secretária); a câmara presa no túnel depois do intervalo; os defeitos do `c0b0899`. | `src/tools/browser-check.ts`, testes |

## Onda 2: o dia de jogo e o fim do jogo

| # | Chat | Tarefa | Depende de |
|---|---|---|---|
| U3 | UI | Data em destaque em cima à esquerda com ▶ (sai o botão do centro), o lugar de cada equipa no cartão do próximo jogo, a secretária só com a dica. | U1 |
| U4 | UI | Transições com escurecer, trocar às escuras e clarear; mais lentas à volta do jogo (lacuna 15). | Q3 (o `browser-check` tem de esperar pelo fundido) |
| A2 | Arte | Fim de um jogo normal: o resultado final em grande a seguir ao grande plano do apito (`drawBigScore`). | A1 |
| A3 | Arte | Lance livre apertado: os círculos dos lances na faixa do grande plano lateral. | A1 |
| U7 | UI | Semana de jogo: o adjunto em retrato grande pergunta «Vamos para o pavilhão?», Sim e Não. | U3, A7 |
| A7 | Arte | As bandeiras das duas equipas no Pavilhão da cidade, na semana de jogo. | |
| A4 | Arte | Estações no mapa: folhagem de outono, inverno sem folhas e com neve, primavera em flor (a estação entra na chave da cache do chão). | |
| U5 | UI | «Rever» depois de um momento grande e repetição mais curta (está em `main.ts`, por isso é da UI). | |

## Onda 3: charme e decisões do utilizador

| # | Chat | Tarefa | Depende de |
|---|---|---|---|
| A5 | Arte | O título: um brilho à volta da taça (o skill proíbe clarões no ecrã inteiro) e o retrato SVG na ficha do momento grande. | A2 |
| A6 | Arte | Uma ilustração em SVG para cada carta (22) e cada combo (33), em lotes revistos; primeiro um mockup com 3 cartas e 1 combo. | |
| U6 | UI | O mercado, a federação e o plantel passam de duas colunas a janelas sobre a cena, e o ecrã de título deixa os dois painéis, como diz o AGENTS.md. Contratar pergunta sim/não. | U1 |

## Decisões do utilizador (25 nov 2026)

- **A pergunta do adjunto volta** na semana de jogo: retrato grande e «Vamos para o pavilhão?», com Sim e Não; com Não fica a cidade. Tarefa U7 (onda 2), com as bandeiras das duas equipas no Pavilhão pela Arte (A7).
- **As mini-cartas do combo não voltam** ao aviso do movimento especial.
- **As ilustrações das cartas e dos combos são em SVG**, como os retratos (A6).
- **O lance livre fica com o grande plano lateral** e ganha só os círculos dos lances (A3); nada de câmara atrás do lançador.

## Arrumação (quando houver folga)

| # | Chat | Tarefa |
|---|---|---|
| M1 | Manager | `visual-design/references/codigo.md` está desatualizado: a chuva e o `crowdColor` já não são código morto. |
| Q4 | QA | O `gpu-check` não cobre o zoom a 2×, a câmara rodada nem os objetos 3D; o `anim-check` podia afirmar a continuidade da bola ao sair da mão. |
| O2 | Som | O critério de «salto entre amostras» da `mistura.md` §17.1 dá falsos alarmes em sons agudos; a lista de `playAllSounds` é escrita à mão; `addBurst` usa sempre `SR`. |
| S1 | Sim | Passar a decisão dos momentos grandes de `match-view.ts` para uma função pura em `src/sim/`, com teste de frequência. Só se houver razão: hoje funciona. |
