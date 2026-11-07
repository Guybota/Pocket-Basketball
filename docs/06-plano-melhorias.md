# Plano de melhorias — novembro de 2026

Feito a partir de oito revisões independentes: mercado, opinião dos jogadores, interface, mecânicas, progressão, cenários e som, código e um teste de jogo de uma época inteira. Os relatórios completos, com fontes e referências `ficheiro:linha`, estão em [06-relatorios/](06-relatorios/).

**Nada disto está feito.** Cada linha tem um código (ex.: `B3`). Para cada um, responde **sim**, **não** ou **muda assim: …**. As linhas marcadas com ❓ precisam de uma escolha tua antes de começar. As marcadas com 📜 mudam o contrato (testes ou formato dos dados) e por isso precisam de aprovação explícita.

Esforço: XS < 1 h · S ≈ meio dia · M ≈ 1–2 dias · L ≈ uma semana ou mais.

Limites das revisões: a rede bloqueou a leitura das páginas web, por isso a pesquisa de mercado e de opinião vem só de excertos de pesquisa; os números de equilíbrio vêm de 400–500 jogos por linha (±2 pontos de ruído); ninguém testou num telemóvel real nem no Edge.

---

## Posicionamento (contexto, não é uma tarefa)

- **Concorrente mais próximo:** Hoop Land (basquetebol retro, ~3,5 M instalações, estimativa). É um simulador para jogar, sem cartas nem cidade.
- **Espaço livre:** não se encontrou nenhum gestor de basquetebol com cartas, jogo visto em pixel art e a história de um clube pequeno, nem nenhum com a pirâmide portuguesa em português de Portugal.
- **O que os jogadores castigam:** repetição a meio prazo, treino lento, simulação opaca ("porque perdi?"), jogos lentos sem acelerar, pay-to-win e saves perdidos.
- **O que elogiam:** acessível sem ser simplista, ver jogadores evoluir e subir de divisão, humor, descobrir combos, jogos curtos, histórias que nascem do jogo.
- **Frase proposta:** «O gestor de basquetebol de bolso: do clube de bairro à Liga, uma semana de cada vez, em sessões de 5 minutos.»

---

## A. Correções de bugs

Mudanças pequenas, sem decisões de desenho. Proponho fazê-las todas primeiro.

| Código | O que corrigir | Onde | Esforço |
|---|---|---|---|
| A1 | «Criar clube» apaga o clube guardado sem confirmação nem cópia. Pedir confirmação e guardar cópia antes. | `main.ts:516` | XS |
| A2 | Um erro dentro de `frame()` congela o jogo de vez: pedir a imagem seguinte num `finally` e mostrar o erro. | `main.ts:1128` | XS |
| A3 | Vitrina: 12 troféus em lugares para 10; o Mundial e o Triplete desenham-se por cima de outros. | `trophies.ts:68` | XS |
| A4 | O título do combo fica tapado pelo painel e o ecrã não diz o que o combo dá. | `menus.ts` | S |
| A5 | «técnica» quase invisível no ecrã do combo e no resultado do treino. | `menus.ts:301` | XS |
| A6 | Os nomes das cartas mudam entre ecrãs («Corrida» / «Corrida Longa», «Pick&Roll» / «Pick & Roll»). | cartas, `menus.ts` | XS |
| A7 | O particular diz «não conta para a liga» e tira 2 % de confiança na mesma linha. | ❓ ver pergunta | XS |
| A8 | O jogo-treino de 2 períodos mostra as colunas dos períodos 3 e 4 vazias. | marcador | XS |
| A9 | Na época 2, a Federação põe o clube em 1.º com tudo a 0–0. | tabela | XS |
| A10 | O presidente diz «Mantenha a equipa a subir» depois de um 7.º lugar; a linha «Direção» aparece cortada. | escritório | XS |
| A11 | O adjunto diz frases que contradizem o resultado («Não está tão mau» a 3–21). | `narrate.ts` | S |
| A12 | Tocar no boneco do adversário no campo não marca o alvo (só a linha da lista). | `match-view.ts` | S |
| A13 | Uma lesão nova aparece sem aviso. | fim de jogo | XS |
| A14 | O troféu «Melhor Marcador» ganha-se sempre na 1.ª época, porque há sempre um melhor marcador. | `trophies.ts:32` | XS |
| A15 | O Escritório anuncia «Confiança e objetivos», mas não há objetivos. Tirar a palavra ou fazer F1. | `menus.ts:867` | XS |

❓ **A7:** o particular deve mexer na confiança? (a) não mexe; (b) mexe, e o texto passa a dizê-lo.

---

## B. Ferramentas, testes e CI

| Código | O que mudar | Porquê | Esforço |
|---|---|---|---|
| B1 | `browser-check` espera o fim da transição (ou desliga as animações) antes de cada captura. | Metade das capturas sai esbatida; `fim.png` mostra 8–8 em vez de 46–47. Engana qualquer revisão visual. | XS |
| B2 | `browser-check` passa a testar também 360×640, a resolução de referência (hoje só 390×844). | `browser-check.ts:101` | XS |
| B3 | Separar um `npm run check` rápido (< 60 s) dos testes de equilíbrio (`npm run balance`). 📜 | O `check` leva **14 min**; os testes da UI jogam épocas inteiras. | S |
| B4 | O CI corre `tsc` e os testes rápidos antes de publicar no GitHub Pages. | Hoje publica sem verificar nada (`.github/workflows/pages.yml`). | XS |
| B5 | Um teste rápido com o hash fixo de um jogo, para apanhar mudanças acidentais à simulação. | Rede de segurança barata para o determinismo. | XS |
| B6 | Saves de exemplo de cada versão antiga nos testes de migração. | As migrações não têm casos de teste reais. | S |
| B7 | `browser-check` e `anim-check` aceitam o Chromium do Playwright sem truques. | Fora do Windows falham por causa do browser. | XS |

❓ **B3:** qual o limite de tempo aceitável para o `check` rápido? Proponho 60 s.

---

## C. Equilíbrio da simulação (números em `balance.ts`)

Todos mudam números e alguns limites de `sim-balance.test.ts`, que são contrato. 📜 Exigem `npm run sim` com milhares de jogos.

| Código | O que mudar | Medido hoje | Esforço |
|---|---|---|---|
| C1 | Baixar a eficácia: 2 pontos para ~53 %, 3 pontos para ~36 %. | 59,5 % e 40,5 %; 1,25 pontos por posse. | S |
| C2 | Dobrar as faltas e os lances livres, e subir as bolas perdidas. | Metade do real; o limite de faltas coletivas e as exclusões quase nunca acontecem. | S |
| C3 | Assistência só conta se o passe levar diretamente ao lançamento (janela mais curta). | 89–93 % dos cestos assistidos; real 55–65 %. | XS |
| C4 | Equilibrar os estilos: o jogo exterior domina (lançador 59,5 %, penetrador 42,5 %). | Deve melhorar com C1+C2. | S |
| C5 | Combo «Mão Quente» deixa de ser dominante. | Dá o maior ganho e o melhor estilo. | XS |
| C6 | Subir a vantagem da melhor equipa para os 70 % que os testes pedem. | 66,5 %. | S |

❓ **C1–C2:** que referência queres seguir? (a) médias FIBA/Liga portuguesa (mais realista, jogos com mais paragens); (b) manter o jogo mais «limpo» e rápido, só corrigir os exageros.

---

## D. Mecânicas (regras do jogo)

### D.1 Corrigir o que hoje não funciona

| Código | O que mudar | Medido hoje | Esforço |
|---|---|---|---|
| D1 | **Táticas armadilha:** ataque de 2 pontos (42 %), ritmo rápido (44 %) e pressão total (43–48 %) perdem para o neutro. Cada tática deve ter um ganho e um custo reais. | Nenhuma tática ganha ao neutro. | M |
| D2 | **Pressão total** passa a contar também nas interceções. | Promete «Rouba mais» e não força uma única bola perdida a mais (`match.ts:1194`, `1236`). | XS |
| D3 | **Descontos (time-outs):** só recuperam a equipa que os pede, e deixam de dar cartas (ou dão no máximo uma por jogo). 📜 | Não ajudam a ganhar, mas pedir os 4 dá ~2,8 cartas: estratégia dominante (`match.ts:683`, `training.ts:205`). | S |
| D4 | **Uma substituição manual desliga a rotação automática sem aviso.** Avisar, ou manter a rotação ligada para os outros lugares. | No teste de jogo, os mesmos 5 jogaram o jogo todo e perdeu-se 10–39 (`match.ts:2218`). | S |
| D5 | **Táticas mudadas a meio do jogo ficam guardadas para sempre.** | O jogador de teste jogou a época inteira em «Campo inteiro» + «3 pontos» sem saber. | S |
| D6 | **A IA adversária muda de tática a meio do jogo** (por exemplo, ao perder) em vez de escolher ao acaso e nunca reagir. | O único contra que existe (zona contra o ataque de 2) não se pode usar. | M |
| D7 | **Fechar a página a meio do jogo deixa repeti-lo até ganhar.** | Exploração fácil. | S |
| D8 | Passar os números do cansaço e das lesões para `balance.ts` e o sorteio das lesões para `src/sim/`; o risco de lesão passa a depender dos minutos. | Hoje estão em `ui/club.ts:16-29`, contra as regras do projeto. | S |

❓ **D4:** (a) a troca manual só desliga a rotação nesse lugar; (b) desliga tudo, mas com aviso claro e botão para voltar a ligar.
❓ **D5:** (a) as mudanças a meio do jogo valem só para esse jogo; (b) ficam, mas com aviso.
❓ **D7:** (a) ao reabrir, o jogo retoma do ponto onde estava; (b) conta como derrota; (c) deixar como está.

### D.2 Mecânicas novas (para escolheres)

Todas respeitam o determinismo. Ficam depois de D.1.

| Código | Proposta | Esforço | Nota |
|---|---|---|---|
| D9 | **Velocidade do jogo** ×1 / ×2 / ×4 visível para o jogador. Hoje só existe como atalho de teste (`main.ts:1251`). | S | A crítica mais repetida ao NPFC. Um jogo da liga leva ~14 min. |
| D10 | **Relatório do adjunto** ao intervalo e nos descontos: a tática do adversário e uma sugestão. | S | Torna as táticas e os contras legíveis. |
| D11 | **Resumo depois do jogo** com 3 razões para o resultado (ex.: «1/9 de 3», «ressaltos 3–16»). | S | Responde a «porque perdi?». |
| D12 | **Embalo (momentum):** parciais grandes mexem na confiança em campo. | M | |
| D13 | **Faltas de propósito no fim do jogo**, pela IA e como opção tática. | M | Precisa de C2. |
| D14 | **Jogadas desenhadas:** uma carta de jogada para usar num desconto. | M | |
| D15 | **Personalidade dos jogadores** (ex.: «Frio no fim», «Líder»). 📜 | M | Muda o formato da equipa. |
| D16 | **Química** entre jogadores que jogam juntos. 📜 | L | Muda o formato. |
| D17 | **Juniores / formação.** 📜 | L | Afasta-se do NPFC, que não tem formação. |

❓ **D9–D17:** quais queres? Proponho D9, D10 e D11 já, e os outros depois de testes com pessoas.

---

## E. Interface e acessibilidade

| Código | O que mudar | Porquê | Esforço |
|---|---|---|---|
| E1 | **Alvos de toque com pelo menos 44 px:** linhas do plantel e do treino (22 px), etiquetas da cidade (18 px), «Passar a semana» (26 px). | Difícil de tocar no telemóvel. | M |
| E2 | Voltar a permitir o zoom com os dedos. | Está bloqueado (`index.html:6`, `main.ts:1301`); falha a WCAG. | XS |
| E3 | **Barra do treinador no jogo** com texto além do ícone; «Banco» deixa de ficar realçado com outro painel aberto; «Fechar» deixa de tapar a lista das trocas. | Hoje só há ícones e o nome só aparece com o dedo pousado. | S |
| E4 | **Desconto com confirmação** (ou forma de anular), e uma faixa a dizer o que mudou. 📜 se for anular | Gasta-se com um toque (`main.ts:787`). | S |
| E5 | **Fonte do ecrã com acentos, minúsculas e «%»**. | «PROGNOSTICO», «OH NAO»; «39 · 61» sem se perceber que são percentagens (`font.ts:2-8`). | M |
| E6 | **Contraste e daltonismo nas notas:** branco sobre as cores das notas tem 2,3–3,9:1; A (vermelho) e B (laranja) confundem-se. | `style.css:711` | S |
| E7 | **Legendas:** atributos, siglas das posições, abreviaturas (Rou, Blq, Seg), o número em «Treino (6)»; «Stats» → «Estatísticas». | O jogador de teste não percebeu vários. | S |
| E8 | **Resultado do treino** mostra claramente o antes → depois de cada atributo. | Hoje parece que o jogador subiu em tudo. | S |
| E9 | **Consistência:** um só estilo para «selecionado»; mesmos controlos no plantel do balneário e do treino; unidades iguais. | Há 4 estilos de seleção. | S |
| E10 | **Estados vazios úteis** (Cartas e Relato no jogo, Adversário, prémio do fim de época). | Ecrãs vazios ou cortados. | S |
| E11 | **Leitor de ecrã:** `aria-live` com o resultado e os momentos-chave. | Nada do jogo chega a um leitor de ecrã. | S |
| E12 | **Definições:** letra maior, alto contraste, menos movimento (incluindo os números que contam), volume. | Não há ecrã de definições. | M |
| E13 | **Primeira semana guiada pela secretária.** | Não há onboarding; o primeiro jogo da liga acaba em goleada sem explicação. | M |
| E14 | A Torre passa a «Guardar», com a data da última exportação. | Exportar é a única cópia de segurança e está escondido. | XS |
| E15 | Atalhos de teclado e melhor uso do espaço no computador. | | M |

❓ **E5:** (a) acrescentar acentos à fonte bitmap atual; (b) usar a fonte do ecrã só para números e títulos curtos, e a outra para frases.
❓ **E13:** o tutorial é (a) opcional, oferecido ao criar o clube; (b) obrigatório na primeira época; (c) só dicas contextuais, sem tutorial.

---

## F. Progressão e ciclo longo

| Código | Proposta | Porquê | Esforço |
|---|---|---|---|
| F1 | **Objetivos da direção por época** (ex.: «ficar no top 4», «chegar às meias da taça»), com a confiança e o orçamento em jogo. | As primeiras épocas não têm objetivo. | S |
| F2 | **Livro de recordes e Galeria de Lendas**, com os dados que já existem (reformas, melhores épocas). | As despedidas não ficam guardadas. | S |
| F3 | **Dinheiro passa de época** e há **instalações** onde gastá-lo (ginásio, médico, olheiros, pavilhão). 📜 | O que sobra perde-se (`club.ts:898`); o dinheiro só serve para jogadores. | M |
| F4 | **O staff passa a ter efeito no jogo.** | Hoje não tem (`staff.ts`). | M |
| F5 | **Prémios individuais:** MVP, Revelação, Melhor Defensor. | | S |
| F6 | **Proteção na 1.ª época e nível de dificuldade.** | ~7 % das carreiras acabam em despedimento na época 2. | S |
| F7 | **Convites de outros clubes** depois de um despedimento, em vez de recomeçar sempre na Liga Iniciados. | `main.ts:519` | M |
| F8 | **Um rival com dérbi.** | Não há rivais. | S |
| F9 | **Desafios com semente fixa**, incluindo um **desafio semanal** igual para todos. | Retenção sem servidor, com o motor determinista. | M |
| F10 | **Partilhar o Match ID** para outra pessoa ver o mesmo jogo. | Já existe `replayMatch`; falta a interface. | S–M |
| F11 | **Ecrã de fim depois do triplete** e um modo «Lenda» para continuar. | Na Pro Liga 1 o clube acaba sempre em 1.º e não há fim. | S |
| F12 | **Várias gravações** e cópia automática alternada. | Uma só gravação; o Safari em iOS pode apagar o `localStorage`. | S |
| F13 | **Contratos plurianuais** e renovações com escolhas reais. 📜 | Hoje fica-se com toda a gente. | M |
| F14 | **Clubes da IA com plantéis que evoluem.** 📜 | O mundo é estático (`club.ts:321`). | L |
| F15 | **Aeroporto:** jogo assíncrono com uma equipa exportada de outra pessoa. | Hoje é uma etiqueta sem função. | M (L com servidor) |
| F16 | **Eventos sazonais:** torneio de Natal, All-Star. | | S cada |
| F17 | **Caderno de combos** com pistas para os que faltam descobrir. | Descobrir combos é o que os jogadores mais elogiam no NPFC. | S |

❓ **F3/F4:** quais instalações e quais efeitos do staff? Proponho começar com ginásio (treino), médico (lesões) e olheiros (mercado).
❓ **F15:** o Aeroporto deve (a) ter jogos assíncronos por ficheiro; (b) ser removido até haver uma ideia; (c) outra função.

---

## G. Arte, cenários e charme

| Código | Proposta | Porquê | Esforço |
|---|---|---|---|
| G1 | **Escala de píxel coerente no campo:** bonecos e balões à mesma escala; linhas do chão sem serrilhado; cartas do combo sem inclinação. | Hoje mistura 1× e 2×. | M |
| G2 | **Nada tapado:** o letreiro «Afundanço!» não tapa o cesto, o prognóstico não tapa o círculo central, os balões da bancada não saem do ecrã no esquema horizontal. | | S |
| G3 | **Mais frases da bancada** (20–30 por contexto). | Só há 8. | S |
| G4 | **Cenas novas** com `drawSceneFrame`: escritório com um vaso que murcha com a confiança; despedimento com a caixa de cartão; balneário vazio ao descer. | Só há 3 cenas desenhadas; o resto são caixas de texto (`scenes.ts:12`). | M |
| G5 | **Pavilhão próprio de cada adversário**, gerado a partir de uma semente do clube. | Todos os adversários da mesma divisão jogam no mesmo campo. | M |
| G6 | **A cidade cresce a cada subida.** | É igual da Liga Iniciados à Pro Liga 1; dois terços do mapa são pinheiros. | M |
| G7 | **Chuva e horas do dia.** | Nunca chove. | S |
| G8 | **Pequenos momentos de humor:** um cão a invadir o campo do bairro, um adepto a dormir numa goleada, um pombo no aro. | O NPFC vive destes detalhes. | S cada |

❓ **G4–G8:** quais queres? Proponho G2, G3 e G4 primeiro.

---

## H. Som

| Código | Proposta | Porquê | Esforço |
|---|---|---|---|
| H1 | **Volume geral e compressor**, e a música baixa nos efeitos. | Os efeitos vão direto à saída e podem saturar (`audio.ts:99,116,138,155`). | S |
| H2 | **O áudio para quando a página fica escondida.** | Gasta bateria. | XS |
| H3 | **Mais temas:** balneário, entrada das equipas, combo, final. | Só há 4 temas; todos os menus usam a música da cidade. | M |
| H4 | **Ambiente diferente em cada pavilhão.** | Hoje é o mesmo em todos. | S |

---

## I. Código, desempenho e robustez

| Código | O que mudar | Medido hoje | Esforço |
|---|---|---|---|
| I1 | **Desenho do chão e das bancadas** em cache, em vez de píxel a píxel em JavaScript a cada imagem; não redesenhar com a câmara parada. | 64 % do CPU num jogo; num telemóvel com CPU 4× mais lento, 20,8 ms por imagem e perde imagens. | M |
| I2 | **Menus e cidade** só redesenham quando algo muda. | Redesenham tudo a 60 fps, o que gasta bateria. | S |
| I3 | **Menos lixo de memória na simulação:** uma função `closest()` sem alocações em vez de `sort()[0]`. | O garbage collector leva 29 % do CPU da simulação. | S |
| I4 | **Os outros jogos da jornada são simulados duas vezes**; a fórmula da semente está copiada em 4 sítios. | `club.ts:535/754/797/971` | S |
| I5 | **Service worker:** prazo na rede, limpeza da cache antiga, e um `manifest` para instalar no Android e no computador. | | S |
| I6 | **Google Fonts** deixa de bloquear o primeiro desenho (fonte incluída ou carregada sem bloquear). | | XS |
| I7 | **Migrações dos saves numa só cadeia** e a versão 1 deixa de saltar a validação. | Há duas cadeias redundantes. | S |
| I8 | Dividir `main.ts` (56 variáveis `let`) em layout, saves, PWA e ciclo de jogo. | | M |
| I9 | Dividir `match.ts` (2532 linhas) em contactos, movimento, decisões e comandos. | | M |
| I10 | Juntar os ~15 `Map<Body,…>` de `match-view.ts` num só, e as equipas de teste repetidas em 6 ficheiros num ficheiro de dados. | | S |
| I11 | Escala inteira também em janelas com menos de 360 px; limpar as caches de sprites. | | S |

O determinismo está bem: gerador exato, só funções matemáticas exatas, ordenação estável.

❓ **I8–I10:** fazer os refactors agora ou só quando se mexer nesses ficheiros por outra razão? Proponho a segunda.

---

## J. Distribuição e negócio

| Código | Proposta | Esforço |
|---|---|---|
| J1 | Publicar a página única (`build-page`) no itch.io e em portais de jogos de browser. | S |
| J2 | Modelo: grátis com um desbloqueio único, sem anúncios e sem vender cartas nem jogadores. | — |
| J3 | Editor de nomes de clubes e jogadores para a comunidade. | M |

❓ **J1–J3:** queres pensar já em distribuição e negócio, ou fica para quando o jogo estiver mais completo?

---

## Ordem que proponho

1. **A** (bugs) e **B1, B2, B4, B5, B7** (verificação mais fiável).
2. **D1–D5, D9, D10, D11** e **E3, E7, E8**: o primeiro jogo deixa de ser uma goleada inexplicável.
3. **C** (equilíbrio) com `npm run sim` em milhares de jogos.
4. **E1, E2, E5, E6** (toque, fonte e contraste) e **I1, I2** (desempenho no telemóvel).
5. **F1, F2, F12, F17** e **G2, G3, H1, H2**.
6. O resto, conforme as tuas respostas.

---

## Decisões (7 de novembro de 2026)

| Grupo | Aprovado | Recusado ou adiado | Escolhas |
|---|---|---|---|
| A | Todos (feitos) | — | A7: o particular mexe na confiança e o texto di-lo. A15: tirar a palavra «objetivos». |
| B | Todos | — | B3: `check` rápido abaixo de 60 s. |
| C | — | Todo o grupo (não mexer no equilíbrio) | — |
| D | D1, D2, D4, D5, D6, D8, D10, D11 | D3 (descontos ficam), D7 (repetir jogo fica), D9, D12–D17 | D4: a troca manual desliga a rotação toda, mas com aviso e botão à vista para voltar a ligar. D5: táticas mudadas a meio valem só para esse jogo. |
| E | E1–E12, E14, E15 | E13 (sem tutorial) | E5: acrescentar acentos e «%» à fonte bitmap. E4: só confirmação (sem anular, para não mudar o contrato). |
| F | F1, F2, F3, F4, F5, F15, F17 | F6–F14, F16 | F3/F4: ginásio (treino), médico (lesões), olheiros (mercado). F15: o Aeroporto serve para jogar contra uma equipa exportada. |
| G | Todos | — | — |
| H | Todos | — | — |
| I | Todos, incluindo os refactors I8–I10 | — | — |
| J | — | Adiado | — |
