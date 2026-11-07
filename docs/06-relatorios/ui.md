# Revisão de UI/UX — Pocket Basketball (R3)

Revisão só de leitura, feita a 7 de novembro de 2026, a partir de ~35 das 129 capturas em `dist-check/` (vertical 390×844 @3x, horizontal 844×390, 1280×720 e 1920×1080) e do código de `src/ui/`. Esforço: **P** = horas, **M** = 1–2 dias, **G** = vários dias.

## Nota prévia: as capturas enganam

Cerca de metade das capturas dos menus (`cidade.png`, `criar-clube.png`, `plantel.png`, `treino-lista.png`, `mercado.png`, `escritorio.png`, `renovacoes.png`, `federacao-tabela.png`, `fim-epoca.png`, `semana-livre.png`) estão **esbatidas a ~50 %**: foram tiradas a meio do `stage-in` (`style.css:513-514`, opacidade .35→1 em 180 ms). Em `fim.png` o marcador grande diz **8 - 8** com o resultado real 46-47: apanhou a contagem a meio. O `browser-check` (`src/tools/browser-check.ts:101,166`) também só testa 390×844 ao alto, e nunca o 360×640 de referência nem um 320 de largura. Quem revê pelas imagens vê contraste e números que não são os do jogo.
**Proposta (P):** no `browser-check`, usar `reducedMotion: 'reduce'` no contexto (ou esperar pelo `animationend`) e juntar um contexto 360×640.

---

## Impacto ALTO

### A1. Alvos de toque muito abaixo de 44 px, e sem zoom (M)
Ao alto, num telemóvel de 360–390 px de largura, a escala fica 1 (`main.ts:270-272`), por isso os valores CSS são píxeis reais:
- linhas do plantel/treino/mercado/renovações `.prow` com **22 px** (`style.css:750`); tabela da federação `.trow` com 24 px (`:1087`); quadro de giz `.crow` com 22 px (`:795`); separadores do quadro `.chalktabs` com 26 px (`:793`); setas `.chalkarrow` com 22 px (`:1113`);
- **as etiquetas da cidade, que são o menu principal, têm 18 px de altura** (`style.css:662-668`). Os edifícios também se podem tocar (`main.ts:338`), o que ajuda, mas o jogador não o sabe;
- **"Passar a semana", a ação mais repetida nas semanas livres, tem 26 px e letra de 13 px** (`style.css:645,1026`; `semana-livre.png`);
- táticas no jogo `.tactic-options` 36 px (`:574`), `.tacrow` 32 px (`:890`), `.pending` 28 px (`:332`), `.choices`/`.chip` 32 px (`:1062,1028`), separadores do jogo 40 px (`:221`), barra `.actions` 38 px (`:688`).
- Deitado num telemóvel, o painel leva `zoom` 0,7 (`main.ts:234`): as linhas de 22 px passam a ~15 px e o texto de 15 px passa a ~10 px (`landscape-telemovel-deitado.png`, `landscape-telemovel-deitado-treino.png`; nos cartões do treino os nomes ficam ilegíveis).
- E o utilizador não pode compensar: `user-scalable=no, maximum-scale=1` (`index.html:6`) e os gestos de zoom são bloqueados em JS (`main.ts:1301-1316`). Falha a WCAG 1.4.4 e 2.5.8.

**Proposta:** altura mínima de 44 px nas linhas tocáveis (ou área de toque com `::before` alargado, sem mudar o desenho); "Passar a semana" passa para um botão grande no fundo da cidade quando a semana é livre; deitado no telemóvel, um `zoom` mínimo de 1 com o painel a rolar, em vez de encolher; deixar o zoom com dois dedos fora do campo.

### A2. A barra do treinador no jogo só tem ícones, e o separador ativo mente (P)
- Os cinco botões (`main.ts:630-635`; `jogo.png`) são só ícones: pausa, som, desconto (com o número dentro do relógio), trocas (setas verde/vermelha) e táticas (prancheta). O nome só aparece com o dedo pousado 450 ms (`main.ts:1322-1330`), coisa que no telemóvel ninguém descobre.
- Quando se abrem as trocas, as táticas ou o desconto, o separador **"Banco" continua realçado** (`substituir.png`, `taticas-jogo.png`, `desconto.png`), porque `tacticsOpen`/`subsOpen` substituem o conteúdo sem mudar o `aria-selected` (`main.ts:622-628, 697-711`). O separador "Banco" também não mostra o banco: mostra os cinco de cada equipa em campo (`jogo.png`).
- No painel das trocas, o botão "Fechar" tapa as últimas linhas do banco (`substituir.png`: "Reis" fica por baixo).

**Proposta:** uma legenda de 1 palavra por baixo de cada ícone ("Pausa", "Som", "Desconto 2", "Trocas", "Táticas"); quando um painel do treinador está aberto, tirar a seleção dos separadores (ou mostrar um título "Trocas ×" no lugar deles); mudar "Banco" para "Em campo" ou "Equipas"; deixar o "Fechar" fixo, com `padding-bottom` na lista.

### A3. O desconto de tempo gasta-se com um toque, sem confirmação nem anulação (P)
`main.ts:787-790`: `requestTimeout` corre logo. Com um alvo de 44 px colado ao botão das trocas, um toque ao lado gasta um dos 2 descontos. Depois de pedido, o botão fica desligado (`main.ts:733`) e não há como cancelar.
**Proposta:** o primeiro toque põe o pedido (como hoje), mas mostra uma faixa "Desconto pedido · Cancelar" até o jogo parar; ou pede um segundo toque. É preciso um comando `cancelTimeout` na simulação, o que muda o contrato e tem de ser dito na entrega.

### A4. Não há primeira sessão guiada, e as funções vitais estão escondidas (M)
- Depois de "Começar" (`criar-clube.png`) cai-se na cidade sem saber que a cidade é o menu, nem o que é a Torre e o Aeroporto. A única pista é a linha da secretária, que repete "Há cartas por usar" semana após semana (`cidade.png`, `semana-livre.png`).
- **Exportar e importar o clube, a única cópia de segurança de um jogo guardado em `localStorage`, estão escondidos na Torre** (`main.ts:399-405`). A Torre não diz para que serve, e o Aeroporto só diz "em obras" (`season-screens.ts:99`): é uma etiqueta morta no menu principal.
- Os 7 atributos aparecem só como ícones (plantel, mercado, adversário, trocas), e o nome só surge com o dedo pousado. Só a ficha no jogo tem os nomes por extenso (`ficha-1.png`).

**Proposta:** uma "primeira semana" com a secretária a apontar, por ordem, para Treino → Pavilhão → Balneário → Bola ao alto (3 a 4 balões, que se podem saltar e que se guardam como vistos); a Torre passa a ter a etiqueta "Torre · Guardar"; o Aeroporto fica escondido até haver conteúdo; e uma legenda dos atributos (ícone + nome) que se abre ao tocar no cabeçalho das notas.

### A5. A letra em píxeis do campo não tem acentos nem "%" (P–M)
`art/font.ts` só tem A–Z e algarismos. Resultado: "PROGNOSTICO" (`match-view.ts:697`), "ADVERSARIO" (`art/wardrobe.ts:106`; `equipamento-editor.png`) e os balões da bancada "OH NAO...", "NAO ENTRA!", "ARBITRO!", "ESTAO COM MEDO", "EU TAMBEM O TIRAVA" (`match-view.ts:400-523`; `desconto.png`). Sem o "%", o prognóstico mostra "CAI 39 · 61 SEC", e não se percebe que são percentagens (`jogo.png`, `apresentacao.png`). O quadro dos playoffs usa a mesma letra à escala 1: siglas de ~5 px, ilegíveis (`playoffs-quadro.png`).
**Proposta:** juntar Á À Â Ã É Ê Í Ó Ô Õ Ú Ç e % ao `font.ts` (são 14 glifos 3×5); no quadro, escala 2 ou HTML por cima.

### A6. Contraste das notas e cor que só diz algo a quem a distingue (P)
- `.gr-*` (`style.css:711`): branco sobre o ouro S `#d9a400` ≈ 2,3:1, sobre o verde C ≈ 3,4:1 e sobre o laranja B ≈ 3,9:1, com letra de 13 px (`:305`). Falha AA.
- **A (vermelho `--bad`) e B (laranja `--ball`)** quase não se distinguem para quem tem protanopia, e o vermelho lê-se como "mau" quando é a 2.ª melhor nota (`grade-A`/`grade-B`, `:459-460`; `substituir.png`, `ficha-1.png`).
- No ecrã do combo, "**técnica**" fica escrita a `#3a4252` sobre o fundo azul-escuro, e é invisível (`menus.ts:301`; `combo.png`).
- As bolinhas de condição verde/vermelha no mercado (`mercado.png`) e no plantel só têm cor.
- No adversário, os não-alvos ficam a ~40 % de opacidade (`adversario.png`), e o texto fica ilegível.

**Proposta:** uma escala sequencial de uma só família (do escuro ao claro) ou texto escuro sobre as cores claras; a técnica com a cor clara do ícone (`#ffffff`) ou um contorno; uma forma na bolinha (✓ / ✚ / !); a opacidade dos não-alvos a 70 %.

---

## Impacto MÉDIO

### M1. Leitor de ecrã: nada no jogo é anunciado (P)
Não há nenhum `aria-live` em todo o projeto. O marcador e o relato estão desenhados no canvas (`index.html:23`, com uma etiqueta fixa), e os cestos, os descontos e as trocas não chegam a quem não vê. Os separadores têm `role="tab"` mas não têm `aria-controls`, nem um `tabpanel` (`main.ts:622`).
**Proposta:** uma região `aria-live="polite"` escondida que recebe a última linha do relato e o resultado a cada período; `role="tabpanel"` no `#tabContent`.

### M2. O mesmo ecrã com controlos diferentes (P)
- Plantel no balneário: botões com texto "‹ Voltar / ⇄ Trocar / Táticas" (`plantel.png`). Plantel no treino: os mesmos verbos, só com ícones, e o botão principal laranja (Treinar) é um haltere sem texto (`menus.ts:237`; `treino-lista.png`, `landscape-1280x720-treino-lista.png`).
- O "selecionado" muda de ecrã para ecrã: fundo tinta (táticas, separadores do equipamento), ouro (linhas, padrões), contorno laranja (amostras de cor) e cinzento claro (separadores da federação).
- Unidades: "Orçamento 600 · Salários 496 · Sobra 104" sem "mil" no escritório (`escritorio.png`), e "Sobra 104 mil" no mercado. O tempo aparece em "Min" na tabela (`panel.ts:102`) e em "Seg" na ficha (`panel.ts:157`).
- Nomes de cartas: "Pick&Roll" (`menus.ts:109`) e "Pick & Roll" (`fim.png`), "Lançar" e "Lançamento", "Vídeo" e "Ver Vídeo", "Ler Defesa" e "Ler a Defesa" (`treino-jogador.png`).

**Proposta:** um `bar()` com texto + ícone usado nos dois planteis; um só estilo de seleção (ouro + contorno tinta); "mil" sempre; um só nome por carta, tirado do mesmo dicionário.

### M3. Ecrãs vazios ou cortados (P)
- O separador Cartas no jogo mostra uma carta quase transparente num ecrã creme vazio (`carta-no-jogo.png`): falta "Cartas ganhas neste jogo: 1. Usam-se no Treino." O Relato mostra duas linhas e 1000 px vazios (`relato.png`).
- Plantel, mercado, renovações, caderno de combos e federação deixam 30–40 % do ecrã vazio por baixo da lista, e no `combo.png` a metade de baixo é cinzenta.
- No adversário, o painel de cima corta o retrato e "Pressão alta" (`adversario.png`), e o nome do clube aparece duas vezes.
- No fim da época, as cartas do prémio ficam cortadas pelo botão (`fim-epoca.png`).
- No editor do equipamento, a fila de desenhos corta "Met…" sem nenhum sinal de que se pode deslizar (`equipamento-editor.png`).

**Proposta:** textos para os estados vazios; o painel de cima cresce quando a lista é curta (já previsto em `05-analise`, H); uma sombra ou seta nas listas horizontais.

### M4. Rótulos pouco claros (P)
- "Sem alvos" é o botão principal do Adversário, mas o que faz é **limpar** os alvos (`menus.ts:515`). Melhor: "Limpar alvos". E não se diz que os alvos se marcam tocando na linha.
- "Segunda opção" está desligada sem explicação (`taticas-jogo.png`): "Escolhe primeiro a 1.ª".
- "Era › Pede" (`menus.ts:460`): o "›" parece uma seta de navegação. Melhor: "Salário: agora → pede".
- Nas renovações, todas as linhas estão a ouro (selecionadas por omissão, `renovacoes.png`), e por isso não se distingue quem fica de quem sai. Falta um ✓/✗ por linha e o total a atualizar.
- No combo, as duas filas de notas (em cima e em baixo) não dizem qual é "antes" e qual é "depois" (`combo.png`).
- No treino, as cartas com ×0 e com ×1 têm o mesmo esbatido (`treino-jogador.png`), e não se sabe quais se podem usar.
- O cartão final junta "Lançamento" ×3 como três cartas iguais (`fim.png`). Melhor: uma carta com "×3".

### M5. Desktop: o espaço fica desperdiçado (M)
Em 1280×720 e 1920×1080, o painel fica com 360 px e a ficha do jogador ocupa um quadro gigante meio vazio (`landscape-1280x720-treino-lista.png`); os nomes das cartas do treino ficam minúsculos (`landscape-telemovel-deitado-treino.png`). Não há atalhos de teclado (espaço = pausa, T = desconto, S = trocas, 1–5 = separadores).
**Proposta:** `ui` a crescer com a largura até ×2; atalhos com `keydown` e indicação no `title`.

---

## Impacto BAIXO

- **Anglicismos evitáveis:** "Stats" (`main.ts:624`) e "Stats da época" (`menus.ts:512`) passam a "Números" ou "Estatísticas", que já se usa no intervalo (`intervalo.png`). "Playoffs" é aceitável em pt-PT. Os movimentos (Crossover, Step-back, Alley-oop) são jargão corrente e podem ficar.
- **Abreviaturas sem legenda:** Rou, Blq, Fal, Seg, Res, Ass, "Ép Equipa", "Alt." (`stats.png`, `ficha-1.png`, `plantel.png`). Dar um `title` a cada uma, ou uma legenda no fundo. "Desarmes" (equipa) e "Blq" (jogador) são a mesma estatística com dois nomes.
- **pt-PT:** não encontrei brasileirismos nos textos ("fato", "Ficámos", "Perdemos" estão corretos). "O lugar na lista é o papel em campo" (`plantel.png`) está certo, mas é críptico.
- **Reduzir movimento:** o CSS respeita-o (`style.css:176,519,533,999`) e o canvas também (`match-view.ts:193`), mas a contagem dos números no fim do jogo e no prognóstico continua (`fim.png`, `match-view.ts:697-700`). Com o movimento reduzido, mostrar logo o valor final.
- O prognóstico tapa o centro do campo durante a apresentação (`jogo.png`). Basta encostá-lo à parte de baixo do campo.
- A linha de rodapé da cidade junta 6 dados num parágrafo ("Jornada 1 de 18 · Em casa · Sporting da Foz · Época 1 · Liga Iniciados · 0 V · 0 D") e repete o cartão de cima (`cidade.png`).

---

## Propostas de ecrãs novos

1. **Primeira semana guiada** (A4): a secretária com balão e uma seta sobre o edifício, em 4 passos.
2. **Legenda / Ajuda** (no Escritório ou com "?" no cabeçalho das notas): os 7 atributos com ícone, nome e para que servem; tipos com e sem bola; o que é o Potencial; e as abreviaturas.
3. **"Guardar" (Torre renomeada)**: exportar e importar, com a data da última exportação e um aviso se passaram mais de 4 semanas de jogo.
4. **Resumo pós-desconto**: no regresso ao campo, uma faixa de 2 s com "Trocas: Chaves ↔ Castro · Ataque: 3 pontos", para o treinador ver que o comando entrou. Hoje a única confirmação é o painel fechar.
5. **Notas do jogo / Cartas no jogo** com estado vazio útil: "Ainda nenhuma carta. Ganham-se com lançamentos, ressaltos…".
6. **Definições** (Escritório): som e música à parte, velocidade do jogo, letra maior (escala da interface ×1,25), alto contraste nas notas e movimento reduzido forçado.

## Ordem sugerida
1. A1 + A2 + A6 (tocar e ler; esforço P–M, e chega a todos os ecrãs).
2. A5 + A3 (P).
3. A4 + ecrãs novos 1–3 (M).
4. M1–M5, depois o resto.
