# Plano da equipa

Montado a 25 nov 2026 a partir da [comparação com o Calciobit](docs/referencias/pocket-basketball/comparacao-calciobit.md) (gravação de 14 nov) e dos commits seguintes (base `59e0b13`). O plano longo e o histórico das fases estão em [docs/02-plano-desenvolvimento.md](docs/02-plano-desenvolvimento.md); este ficheiro diz só o que vem a seguir.

Como se usa:
- Cada tarefa tem um código, é de **um só chat** e diz de que depende. O Manager lança os chats de uma onda e junta os ramos (ver «Trabalho em equipa» no `AGENTS.md`).
- Quando uma tarefa acaba, o Manager risca-a aqui (~~assim~~) no mesmo commit em que junta o ramo. As tarefas acabadas saem do ficheiro na onda seguinte.
- Uma tarefa visual começa sempre por um mockup aprovado pelo utilizador.
- O utilizador decide a ordem das ondas; o Manager propõe.

Chats: **Sim** (`src/sim/`), **UI** (menus e ecrãs), **Arte** (campo, bonecos, pavilhões, câmara), **Som**, **QA** (grava, mede e escreve testes; não muda o jogo).

## Onda 1: os defeitos que se veem em todos os jogos

| # | Chat | Tarefa | Depende de |
|---|---|---|---|
| Q1 | QA | Gravar de novo (`npm run sequences`) e atualizar a comparação: confirmar o que os últimos commits fecharam (N8, N9, N10) e gravar o que falta (lacunas 4, 7 e 19). | |
| A1 | Arte | Textos empilhados (N3, N7, N19): uma ordem de prioridade com uma só zona de faixas; o momento grande esconde as palavras do mundo; «+2» e «FALTA» juntam-se em «2+1». | |
| A2 | Arte | Grandes planos a entrar e sair em 0,4–0,6 s, sem corte (N5, defeito 3 da falta). | |
| A3 | Arte | O aviso do movimento acaba com a jogada, no máximo ~2 s (N6), e um só aviso por jogada (defeito 3). | |
| A4 | Arte | A barra do marcador deixa de tapar os balões da bancada (defeito 1). | |
| S1 | Sim | Momentos grandes com peso no jogo: último período, diferença curta ou reviravolta, e um limite por jogo (N4). | |
| U1 | UI | A cena desenha-se antes do painel ao abrir o mapa, o escritório e o balneário (defeito 2), e as transições ganham ritmo (lacuna 15). | |
| U2 | UI | Os pequenos de interface: N11, N14, N15, N16, N17 e N18. | |

## Onda 2: o dia de jogo

| # | Chat | Tarefa | Depende de |
|---|---|---|---|
| U3 | UI | Semana de jogo como no Calciobit: bandeiras no Pavilhão e o adjunto a perguntar «Vamos para o pavilhão?» (cidade 1, lacuna 17). | |
| U4 | UI | Data em destaque com ▶, o cartão do próximo jogo com o lugar na liga e o ressalto, a secretária mais leve (cidade 2–4, lacuna 19). | |
| A5 | Arte | Lance livre apertado com a câmara atrás do lançador, nome, percentagem e círculos (lacuna 12). | |
| A6 | Arte | As mini-cartas do combo ao lado do aviso do movimento especial (lacuna 7). | Q1 |
| A7 | Arte | Fim de um jogo normal: grande plano no apito e o resultado final em grande (lacuna 8). | A2 |
| U5 | UI | Toque com resposta à vista: um frame de destaque em qualquer botão (lacuna 4). Confirmar com o dedo, num telemóvel. | Q1 |
| U6 | UI | O resultado não volta a contar depois da repetição (defeito 4); o intervalo mostra a contagem (lacuna 16). | |

## Onda 3: o que dá charme

| # | Chat | Tarefa | Depende de |
|---|---|---|---|
| A8 | Arte | O título completo: clarão, suplentes a saltar, vencidos de cabeça baixa, o retrato na ficha de quem marcou (lacunas 2 e 11). | A1 |
| A9 | Arte | Uma ilustração própria para cada carta e cada combo, com revisão do skill `visual-design`. | |
| A10 | Arte | Repetição mais curta, com fundido, e «Rever» depois de um momento grande (lacunas 9 e 21). | A2 |
| U7 | UI | «Filme do jogo» com os três a cinco lances que mudaram o jogo (lacuna 10). | A10 |
| U8 | UI | Contratar com retorno: a secretária confirma e o dinheiro conta para baixo (lacuna 13). | |
| A11 | Arte | Estações no mapa da cidade (cidade 5). | |
| O1 | Som | Gravar e medir o som de um jogo inteiro (nunca foi gravado) e tratar o que a medida mostrar. | |

## Arrumação (quando houver folga)

| # | Chat | Tarefa |
|---|---|---|
| Q2 | QA | Ver o commit de `origin/claude/game-halftime-freeze-boyo3j` que não está no `fase-1` (o único ramo remoto antigo com trabalho por juntar; os outros já estão todos no `fase-1`). |
| Q3 | QA | Lacunas conhecidas do som em `sound-design/references/motor.md`: `addBurst` com `SR` fixo, a lista de `playAllSounds` escrita à mão. |
