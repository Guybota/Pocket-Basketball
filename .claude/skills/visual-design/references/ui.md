# Normas de desenho de interface para o Pocket Basketball

Pesquisa sobre as normas de interface, gerais e de jogos, aplicadas a um jogo de gestão de basquetebol em pixel art, jogado no browser em telemóvel (vertical a 360×640 e horizontal) e em computador. A interface é HTML e CSS sobre um canvas, com uma fonte bitmap.

**Nota sobre as fontes.** As pesquisas na web funcionaram. O WebFetch falhou: por exemplo, `devdocs.xbox.com` não resolve nesta sessão. Por isso, muitos números vêm de resumos de resultados de pesquisa e não das páginas originais. Marco com **[não verificado]** o que só vi em fontes secundárias, ou o que não consegui confirmar na fonte primária. Os números das normas W3C, Apple e Google são conhecidos e estáveis, mas também os marco quando só os vi em resumos.

---

## 1. Fundamentos gerais de UI e UX

### 1.1 As 10 heurísticas de Nielsen (1994, revistas em 2020)

| # | Heurística | Aplicação ao Pocket Basketball |
|---|---|---|
| 1 | Visibilidade do estado do sistema | Mostrar sempre o resultado, o período, o relógio, a velocidade (1×/2×/4×) e se o jogo está em pausa. Um desconto de tempo ou uma substituição pedida aparece como pendente («Entra no próximo apito»). |
| 2 | Correspondência com o mundo real | Usar a linguagem do basquetebol português: «desconto de tempo», «cesto», «ressalto», «falta», «5 inicial». Os ícones seguem objetos reais: apito, prancheta, bola. |
| 3 | Controlo e liberdade do utilizador | Qualquer substituição em fila pode ser cancelada (`cancelSubstitution`). Os ecrãs têm sempre «Voltar». A tecla Esc fecha as janelas. |
| 4 | Consistência e normas | O mesmo botão tem o mesmo aspeto e o mesmo sítio em todos os ecrãs. Os mesmos atalhos funcionam em todo o lado. A mesma cor de nota tem o mesmo significado em todas as tabelas. |
| 5 | Prevenção de erros | Desativar o que não é possível (sem descontos restantes, jogador expulso) e explicar porquê. Pedir confirmação só para o que é irreversível (despedir, vender, terminar a época). |
| 6 | Reconhecer em vez de lembrar | Mostrar os atributos ao lado do nome quando se escolhe um suplente. Não obrigar a memorizar o cansaço de um jogador visto noutro separador. |
| 7 | Flexibilidade e eficiência | Atalhos de teclado para quem joga muito, rotação automática para quem não quer gerir, toque longo para ver detalhes. |
| 8 | Estética e desenho minimalista | Cada painel mostra o que serve aquela decisão. A informação secundária fica a um toque de distância. |
| 9 | Ajudar a reconhecer, diagnosticar e recuperar de erros | Mensagens em português simples: «Não podes fazer mais substituições até à próxima paragem.» |
| 10 | Ajuda e documentação | Dicas curtas no contexto, um glossário de siglas (PTS, RES, AST) e uma ajuda de atalhos (tecla `?`). |

Fonte: Nielsen Norman Group, «10 Usability Heuristics for User Interface Design» (nngroup.com/articles/ten-usability-heuristics). A lista é conhecida e estável. Não abri a página nesta sessão.

### 1.2 Princípios da Gestalt

- **Proximidade:** o que está perto lê-se como um grupo. O espaço entre grupos deve ser pelo menos o dobro do espaço dentro de um grupo (por exemplo 4 px dentro e 8 a 12 px entre, na escala de arte).
- **Semelhança:** os elementos com a mesma forma ou cor parecem ter a mesma função. Todos os botões de ação têm o mesmo painel nine-slice. Todas as notas usam o mesmo crachá.
- **Região comum:** um painel com moldura agrupa mais do que a proximidade sozinha. É a base dos painéis em pixel art.
- **Continuidade e alinhamento:** os olhos seguem linhas. As colunas de números alinhadas à direita formam uma linha vertical fácil de percorrer.
- **Figura e fundo:** o campo é o fundo e o painel do treinador é a figura. As janelas modais escurecem o fundo (por exemplo, com um véu preto a 50 a 60 % de opacidade, ou um padrão de pontos em pixel art).
- **Destino comum:** o que se mexe junto parece ligado. Os números flutuantes de pontos devem sair do jogador que marcou.

### 1.3 Hierarquia visual

Ordem dos meios para destacar algo, do mais forte para o mais fraco: **tamanho, contraste e cor, posição (em cima e à esquerda), peso, espaço à volta, movimento**. Em pixel art a escala de tamanhos é curta (só há uma ou duas alturas de fonte), por isso o contraste, a cor e o espaço fazem mais trabalho.

Regra prática: cada ecrã tem **um** elemento primário (no jogo, o resultado; no plantel, a lista), dois ou três secundários e o resto terciário. Se tudo está destacado, nada está destacado.

### 1.4 Escalas de espaçamento (grelha de 4 ou 8 pontos) e escala inteira de pixel art

- A grelha de 8 pt (Material Design, muitos sistemas de desenho) usa múltiplos de 8, com 4 para ajustes finos: 4, 8, 12, 16, 24, 32, 48, 64.
- **Num jogo em pixel art, a unidade é o pixel de arte, não o pixel CSS.** Se a interface é desenhada a 1× e escalada por um fator inteiro *k* (2×, 3×, 4×), cada pixel de arte vale *k* pixels do ecrã. Uma escala de espaços em pixels de arte de **1, 2, 4, 6, 8, 12, 16** dá, a 3×, 3, 6, 12, 18, 24, 36, 48 pixels do ecrã: espaços sempre alinhados com a grelha da arte.
- Recomendação: definir os espaços em unidades de arte (`--u: 1px` a 1×, multiplicado pela escala) e **nunca** usar `rem`, percentagens ou `em` para espaços dentro de painéis em pixel art, porque dão frações.
- A 360×640 com escala 2×, o ecrã lógico é 180×320 pixels de arte. Com escala 3× é 120×213, pequeno de mais para um painel com tabelas. Por isso, a 360 de largura, a arte da interface deve ficar a 2× (e o texto HTML pode usar a sua própria escala).

### 1.5 Alinhamento e grelhas

- Uma margem lateral única (16 px CSS no telemóvel, que é a norma da Material e da Apple para margens de ecrã) e uma só linha de alinhamento à esquerda por painel.
- Texto alinhado à esquerda, números alinhados à direita, ícones e crachás centrados na sua coluna.
- Em horizontal, uma grelha de duas colunas: o campo com proporção fixa e o painel a ocupar o resto, com uma largura mínima (por exemplo, 280 a 320 px CSS) abaixo da qual se volta ao esquema vertical.

### 1.6 Tipografia para interface

| Norma | Número |
|---|---|
| Texto de corpo na web | 16 px CSS como predefinição. Nunca menos de 12 px para texto que se tem de ler. |
| Apple HIG (iOS) | Corpo a 17 pt. O mínimo recomendado é 11 pt. |
| Material Design 3 | Corpo a 14 a 16 sp. Etiquetas a 11 a 14 sp. |
| Xbox Accessibility Guidelines 101 | Na consola, a 1080p, o mínimo de altura do corpo do texto é **26 px** (medida da descendente até à ascendente). A predefinição pode ser esse mínimo, mas o jogador tem de poder escalar o texto. Os ampliadores da plataforma não contam. Nos portáteis, um mínimo de **14 px de altura a 1920×1080** [não verificado: visto em resultados de pesquisa da página devdocs.xbox.com, que não abri]. |
| Altura de linha | 1,4 a 1,6 vezes o tamanho para parágrafos. 1,1 a 1,25 para etiquetas de uma linha. Em pixel art, altura da fonte mais 2 a 4 pixels de arte. |
| Comprimento de linha | 45 a 75 caracteres por linha, com 66 como ideal clássico (Bringhurst). No telemóvel, 30 a 40 é aceitável. O WCAG 1.4.8 (AAA) fixa no máximo 80 caracteres. |
| Espaçamento de texto (WCAG 1.4.12, AA) | O conteúdo não pode partir se o utilizador puser altura de linha a 1,5×, espaço entre parágrafos a 2×, entre letras a 0,12× e entre palavras a 0,16×. |

**Para o Pocket Basketball:** a 360×640, qualquer texto que o jogador tenha de ler (nomes, notas, resultados) deve ter **pelo menos 12 px CSS de altura visível de maiúscula e minúscula**, e o ideal é 14 a 16 px. Uma fonte bitmap com 7 px de altura de maiúscula a 2× dá 14 px: é o mínimo razoável. Abaixo disso só para etiquetas curtas e repetidas, como «PTS».

### 1.7 Consistência e tokens de desenho

Os tokens são as decisões com nome: cores (`--c-bg`, `--c-panel`, `--c-text`, `--c-accent`, `--c-good`, `--c-bad`), espaços (`--s-1` a `--s-6`), tamanhos de fonte (`--f-small`, `--f-body`, `--f-title`), durações (`--t-fast: 100ms`, `--t-base: 200ms`, `--t-slow: 300ms`), raios (em pixel art, zero ou cantos «comidos» de 1 pixel) e a escala inteira (`--px`).

Regras:

1. Nenhum valor solto no CSS. Se um número aparece duas vezes, vira token.
2. Os tokens semânticos (`--c-grade-a`) apontam para tokens de paleta (`--p-green-3`). Assim se troca a paleta para daltonismo sem tocar nos componentes.
3. Um só documento lista os componentes e os seus estados: botão, separador, linha de tabela, crachá, barra.

---

## 2. Telemóvel e toque

### 2.1 Tamanho mínimo das zonas de toque

| Norma | Número | Notas |
|---|---|---|
| Apple Human Interface Guidelines | **44×44 pt** | Na web, 1 pt corresponde a 1 px CSS. |
| Material Design | **48×48 dp**, com pelo menos 8 dp entre alvos | O ícone pode ter 24 dp, mas a zona de toque tem 48. |
| WCAG 2.2, 2.5.8 «Target Size (Minimum)», nível AA | **24×24 px CSS** | Ou então um círculo de 24 px de diâmetro centrado no alvo não pode tocar noutro alvo (exceção do espaçamento). Outras exceções: equivalente, em linha no texto, controlada pelo browser, essencial. |
| WCAG 2.5.5 «Target Size (Enhanced)», nível AAA | **44×44 px CSS** | Sem exceção de espaçamento. |
| Steven Hoober (dados de toque) | **7 mm** ao centro, **9 mm** nas bordas, **12 mm** nos cantos | Mais precisão ao centro do ecrã do que nas bordas. [não verificado na fonte primária] |

**Para o Pocket Basketball:** botões da barra de controlo com pelo menos **44×44 px CSS** (a 2×, 22×22 pixels de arte). Linhas de tabela que se tocam com pelo menos **40 a 44 px CSS de altura** no telemóvel. Os ícones de 16 pixels de arte a 2× têm 32 px de desenho, mas a zona de toque é alargada com `padding` até 44. Em computador, com rato, as linhas podem baixar para 24 a 28 px.

Fontes: [W3C, Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); [Adrian Roselli, 2.5.8 Adversarial Conformance](https://adrianroselli.com/2023/12/2-5-8-adversarial-conformance.html); [Addy Osmani, Touch-Friendly Design](https://addyosmani.com/blog/touch-friendly-design/).

### 2.2 Zonas do polegar e onde pôr as ações primárias

- No estudo de Hoober de 2013 (1333 observações), **49 %** das pessoas usavam o telemóvel com uma mão, **36 %** seguravam-no com uma mão e tocavam com a outra, e **15 %** usavam os dois polegares.
- O mapa clássico da «zona do polegar» (verde em baixo ao centro, vermelho nos cantos de cima) foi depois **renegado pelo próprio Hoober**: a pega muda constantemente e as pessoas tocam mais, mais depressa e com mais precisão no **centro** do ecrã. Os cantos de cima são os piores sítios.
- Conclusão prática para o esquema vertical: o campo fica em cima, porque é para ver e não para tocar. **A barra de controlo fica em baixo**, ao alcance do polegar, e o painel ao centro. As ações destrutivas ou raras (sair do jogo, definições) ficam longe das ações frequentes, por exemplo no canto de cima.
- Em horizontal, o telemóvel é seguido com as duas mãos: os controlos frequentes vão para as **bordas laterais em baixo**, onde estão os polegares, nunca no meio do topo.

Fontes: [A List Apart, How We Hold Our Gadgets](http://alistapart.com/article/how-we-hold-our-gadgets); [Gizmodo sobre Hoober](https://gizmodo.com/were-designing-apps-wrong-for-huge-smartphones-1651751412); [Thumb motor performance (PubMed)](https://pubmed.ncbi.nlm.nih.gov/22858316/).

### 2.3 Gestos e como os descobrir

- Os gestos são invisíveis. **Todo o gesto precisa de uma alternativa visível** (um botão) e só deve servir de atalho. Isto também é o WCAG 2.5.1 «Pointer Gestures»: tudo o que se faz com vários dedos ou com um caminho tem de poder fazer-se com um só toque.
- Gestos esperados num jogo de gestão: tocar (escolher), toque longo (detalhes, com 400 a 500 ms e um sinal visual a crescer), arrastar (trocar jogadores entre o 5 inicial e o banco, com alternativa de tocar num e depois no outro), deslizar entre separadores (com os separadores visíveis em cima).
- Para que se descubram: mostrar o gesto na primeira vez (uma mão animada, uma vez), deixar pistas (o separador seguinte aparece cortado na borda) e dar resposta imediata (o elemento acompanha o dedo).
- Evitar gestos que o browser usa: deslizar a partir da borda esquerda (voltar atrás no iOS), puxar para baixo (atualizar a página). Usar `overscroll-behavior: contain` e `touch-action` no campo.

### 2.4 Áreas seguras e entalhes

- Pôr `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. Sem `viewport-fit=cover`, `env(safe-area-inset-*)` vale 0.
- Barra de controlo em baixo: `padding-bottom: max(8px, env(safe-area-inset-bottom))`. Em horizontal, as laterais precisam de `env(safe-area-inset-left/right)` por causa do entalhe.
- Altura: usar `100dvh` (que acompanha a barra de endereço) para o contentor, ou `100svh` se não se quiser que o esquema salte quando a barra se esconde. `100vh` transborda no telemóvel.
- **Ligação à escala inteira:** a escala inteira calcula-se sobre a área **segura** (largura menos as margens seguras), não sobre a janela inteira.
- Problemas conhecidos: há relatos de alturas erradas em aplicações instaladas (PWA) no iOS com `viewport-fit=cover` (WebKit bug 254868). Testar em aparelhos reais.

Fontes: [OpenReplay, fix 100vh](https://blog.openreplay.com/fix-100vh-mobile-viewport/); [WebKit bug 254868](https://bugs.webkit.org/show_bug.cgi?id=254868); [Safe area insets](https://mohammadshehadeh.com/css/safe-area-insets/).

### 2.5 Vertical e horizontal

| | Vertical (360×640) | Horizontal |
|---|---|---|
| Estrutura | Campo em cima (cerca de 40 a 45 % da altura), painel com separadores ao meio, barra de controlo em baixo | Campo à esquerda, painel à direita, a barra no fundo do painel ou em coluna |
| Mão | Uma mão, polegar | Duas mãos, polegares nas laterais |
| Densidade | Uma coluna, listas | Duas colunas, tabelas mais largas |
| Riscos | O teclado virtual tapa metade do ecrã. A barra de endereço come altura. | A altura é curta (cerca de 360 px): os painéis precisam de deslocamento. O entalhe fica de lado. |

Regras: o estado do jogo não se perde ao rodar. O separador ativo, a posição do deslocamento e o foco do teclado mantêm-se. Não forçar a orientação (WCAG 1.3.4 «Orientation», AA), a não ser que seja essencial.

---

## 3. Acessibilidade

### 3.1 Contraste (WCAG 2.2)

| Critério | Número |
|---|---|
| 1.4.3 Contraste (mínimo), AA | **4,5:1** para texto normal. **3:1** para texto grande (pelo menos 24 px CSS, ou 18,66 px CSS a negrito). |
| 1.4.6 Contraste (melhorado), AAA | **7:1** e 4,5:1 para texto grande. |
| 1.4.11 Contraste de elementos não textuais, AA | **3:1** para as bordas dos controlos, ícones necessários, estados (selecionado e foco) e partes de gráficos necessárias para os perceber. |

**Atenção às fontes bitmap:** a regra do «texto grande» conta em px CSS, mas uma fonte bitmap fina de traço de 1 pixel de arte a 2× (2 px CSS) é visualmente mais leve do que uma fonte vetorial do mesmo tamanho. Tratar todo o texto em pixel art como **texto normal: 4,5:1**.

Exemplos: branco `#FFFFFF` sobre azul escuro `#1D2B53` dá cerca de 13:1. Amarelo `#FFEC27` sobre preto dá mais de 15:1. Cinzento claro sobre bege claro quase sempre falha: as paletas de pixel art «retro» falham muitas vezes nos tons médios.

### 3.2 Daltonismo

- Cerca de **8 % dos homens e 0,5 % das mulheres** têm alguma deficiência de visão das cores, sobretudo vermelho-verde (deuteranomalia, a mais comum, e protanomalia).
- **Nunca a cor sozinha** (WCAG 1.4.1, nível A; Game Accessibility Guidelines, nível básico). Juntar sempre forma, ícone, padrão, letra ou posição.
- Aplicações no Pocket Basketball:
  - **Notas:** a letra (A, B, C, D, E) é a informação. A cor só reforça.
  - **Equipas no campo:** além da cor do equipamento, um contorno ou um padrão diferente (riscas, calções escuros contra claros) e um indicador por cima do jogador com o número.
  - **Subidas e descidas** (forma, moral, posição na tabela): setas ▲ ▼ e sinal + e −, não só verde e vermelho.
  - **Cansaço:** a barra tem um número ou um ícone quando está crítica, não só vermelho.
  - Escalas de cor: evitar vermelho contra verde. Usar azul contra laranja, ou uma escala de luminosidade de um só tom.
- Teste: passar as capturas de `browser-check` por um simulador de deuteranopia, protanopia e tritanopia, e por escala de cinzentos. Se o significado sobrevive em cinzento, sobrevive para todos.
- Opção recomendada: um modo de cores para daltonismo nas definições, que troca os tokens de paleta.

Fontes: [uxdesign.cc, Among Us](https://uxdesign.cc/the-importance-of-colorblind-friendly-design-case-study-among-us-dcd042c87b9); [Thumb Culture, Colourblind and Gaming](https://www.thumbculture.co.uk/colourblind-and-gaming); [IGDA GA-SIG Top Ten](https://igda-gasig.org/how/game-accessibility-top-ten-se/).

### 3.3 Escala do texto

- WCAG 1.4.4 «Resize Text» (AA): o texto pode ir a **200 %** sem perder conteúdo nem função. WCAG 1.4.10 «Reflow» (AA): a **320 px CSS** de largura não há deslocamento horizontal, exceto em tabelas e jogos, que são exceção.
- Game Accessibility Guidelines e Xbox 101: o tamanho predefinido tem de se ler bem, e o jogador pode aumentá-lo.
- Em pixel art, a escala de texto tem de ser **por passos inteiros** (1×, 2×, 3× da fonte bitmap), ou uma opção «texto legível» que troca a fonte bitmap por uma fonte de sistema nítida em listas e tabelas. Recomendação: uma definição «Tamanho do texto: Normal / Grande / Muito grande» que muda o fator da fonte bitmap, e os painéis passam a deslocar-se.
- Não bloquear o zoom do browser (`user-scalable=no`, `maximum-scale=1`) nos ecrãs de lista. No campo é aceitável impedir o zoom de dois dedos com `touch-action`, mas não o zoom de acessibilidade do sistema.

### 3.4 Menos movimento

- `@media (prefers-reduced-motion: reduce)`: tirar tremores de ecrã, piscar, paralaxe, zooms e deslizes longos. Trocar por cortes ou desvanecimentos curtos (100 ms ou menos).
- WCAG 2.3.1 (A): nada pisca mais de **3 vezes por segundo**. WCAG 2.2.2 (A): o que se mexe sozinho mais de 5 segundos tem de poder ser pausado (por exemplo, um texto a correr no relato).
- WCAG 2.3.3 (AAA): animações de interação podem ser desligadas.
- Ter também uma opção no próprio jogo («Movimento reduzido»), porque muita gente não sabe da definição do sistema. Ligada por defeito se o sistema o pedir.
- Os jogadores no campo continuam a mexer-se: isso é conteúdo, não decoração.

### 3.5 Leitores de ecrã num jogo com canvas

- Para um leitor de ecrã, um canvas é uma imagem. Como a interface do Pocket Basketball já é HTML, o painel, as listas e os botões podem ser acessíveis de raiz. O campo não.
- Padrão recomendado:
  - `<canvas role="img" aria-label="Campo: Leões 54, Águias 51, 3.º período, 4:12">`, atualizado de vez em quando, ou `aria-hidden="true"` se houver um resumo em texto ao lado.
  - Uma região **`aria-live="polite"`** com os acontecimentos importantes do jogo: cestos, descontos de tempo, fim de período, substituições. Uma região `role="alert"` (assertiva) só para o que é urgente: falta de um jogador, lesão, fim do jogo.
  - **Não anunciar cada jogada.** No máximo uma mensagem a cada 2 a 5 segundos, com resumos («Parcial de 8-0 para os Leões»). O leitor lê a região inteira, não só o que mudou, por isso as mensagens são curtas e a região é limpa entre mensagens.
  - As regiões vivas existem no DOM desde o início (algumas combinações de browser e leitor ignoram regiões criadas ou mostradas depois).
  - O separador «Relato» (feed) é o melhor sítio: uma lista com `role="log"`, que já é uma região viva educada.
  - Tabelas como `<table>` reais, com `<th scope="col">` e `aria-sort`. Crachás de nota com texto («Nota B»), não só uma imagem.
  - Os botões são `<button>`, com `aria-pressed` para os interruptores (pausa, som) e `aria-label` quando só têm ícone.
- As Game Accessibility Guidelines põem o suporte a leitores de ecrã, incluindo menus, no nível **avançado**.

Fontes: [bugnet.io, canvas sem anúncios](https://bugnet.io/blog/how-to-fix-web-game-canvas-no-screen-reader-announcements); [bugnet.io, canvas e foco](https://bugnet.io/blog/fix-html5-game-canvas-not-keyboard-focusable-screen-reader); [PixiJS, Accessibility](https://pixijs.com/8.x/guides/components/accessibility.md); [ARIA for Web Games](https://ianeress.substack.com/p/aria-for-web-games-november-13-2024); [Paul J. Adam, canvas](https://pauljadam.com/demos/canvas.html). São sobretudo blogues: confirmar no WAI-ARIA.

### 3.6 Teclado e foco visível

- WCAG 2.1.1 (A): tudo se faz com o teclado. WCAG 2.1.2 (A): nada prende o foco (as janelas modais prendem-no de propósito e libertam-no com Esc).
- WCAG 2.4.3 (A): ordem do foco lógica (de cima para baixo, da esquerda para a direita). WCAG 2.4.7 (AA): foco visível.
- WCAG 2.4.11 «Focus Not Obscured (Minimum)» (AA, novo no 2.2): o elemento com foco não fica totalmente tapado por cabeçalhos fixos ou pela barra de controlo. Usar `scroll-padding` nas listas com cabeçalho fixo.
- WCAG 2.4.13 «Focus Appearance» (AAA): o contorno do foco tem pelo menos **2 px CSS** à volta e contraste de **3:1** entre o estado com foco e o estado sem foco. Mesmo sendo AAA, é a regra prática a seguir.
- WCAG 2.1.4 «Character Key Shortcuts» (A): os atalhos de uma só tecla (espaço para pausa, `T` para desconto de tempo) têm de poder ser **desligados ou remapeados**, ou só funcionar quando o foco está no jogo. As Game Accessibility Guidelines põem o remapeamento no nível básico.
- Em pixel art: um foco com um contorno de 1 pixel de arte (2 px CSS a 2×), numa cor de alto contraste (amarelo ou branco), com `outline-offset` de 1 pixel de arte, mais um indicador ▶ ao lado da linha de uma lista. Usar `:focus-visible` para não mostrar o anel quando se toca.
- Atalhos sugeridos (a confirmar contra `src/ui/keys.ts`): espaço para pausar e continuar, 1/2/3 para a velocidade, `T` para o desconto de tempo, `S` para substituições, `M` para o som, setas e Enter nas listas, Esc para fechar, `?` para a ajuda dos atalhos.

Fontes: [WebAIM, WCAG 2.2](https://webaim.org/standards/wcag/wcag22); [TetraLogical, novidades do WCAG 2.2](https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2); [tempertemper, Focus appearance explained](https://tempertemper.net/blog/focus-appearance-explained).

### 3.7 Game Accessibility Guidelines (gameaccessibilityguidelines.com)

Três níveis. O que importa para este jogo (lista reconstruída a partir de resultados de pesquisa e de conhecimento prévio da página; os níveis de alguns itens mudaram entre versões da página **[não verificado item a item]**):

**Básico** (fácil, beneficia muita gente):
- Tamanho de letra predefinido fácil de ler.
- Nenhuma informação essencial só pela cor.
- Contraste alto entre o texto e o fundo.
- Controlos remapeáveis (teclas).
- Botões grandes e bem espaçados no toque.
- Formatação de texto simples e clara. Linguagem simples.
- Legendas para a fala importante. Volumes separados para efeitos, música e voz.
- Começar o jogo sem passar por várias camadas de menus.
- Definições guardadas.
- Dizer, dentro do jogo, que opções de acessibilidade existem.
- Dificuldade ou ritmo ajustáveis (aqui: a velocidade do jogo e a pausa).
- Nada a piscar depressa. Opção para desligar o tremor de ecrã.

**Intermédio:**
- Dar forma de rever o que já foi dito ou mostrado (o relato que se pode rever).
- Permitir aumentar o texto e redimensionar a interface (uns instantâneos põem-no no intermédio, outros no avançado).
- Evitar ou permitir desligar o movimento de fundo e a paralaxe.
- Dar avisos antes de eventos com tempo, e permitir ajustar ou parar tempos limite.
- Indicar sempre o objetivo atual.
- Modo de daltonismo, ou uma paleta segura.

**Avançado:**
- Suporte a leitores de ecrã, incluindo os menus.
- Descrição áudio, voz para todo o texto.
- Personalização completa da interface (tamanho, posição).

Fontes: [gameaccessibilityguidelines.com](https://gameaccessibilityguidelines.com/); [Basic](https://gameaccessibilityguidelines.com/basic/); [Unity, accessibility basics](https://unity.com/blog/video-game-accessibility-basics); [IGDA GA-SIG](https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/).

### 3.8 Xbox Accessibility Guidelines (XAG)

Os pontos mais úteis aqui (versão 3.2, segundo os resumos; não consegui abrir devdocs.xbox.com):

- **XAG 101 Text display:** texto mínimo de 26 px de altura na consola a 1080p; o jogador pode escalar; o texto dentro de ícones e glifos segue os mesmos mínimos; os ampliadores do sistema não substituem o tamanho mínimo; pede também contraste, estilo de letra simples e fundo atrás do texto sobre imagens.
- **XAG 102 Contrast:** 4,5:1 para texto e 3:1 para elementos importantes, e uma opção de alto contraste.
- **XAG 103 Additional channels for visual and audio cues:** cada aviso dado por cor ou por som tem um segundo canal (ícone, texto, vibração).
- **XAG 104 Subtitles and captions; 105 Audio accessibility** (volumes separados).
- **XAG 106 Screen narration:** ler os menus e os elementos da interface.
- **XAG 107 Input; 108 Song and audio; 112 UI navigation:** navegação previsível, o foco nunca se perde, voltar com um botão constante.
- **XAG 114 Difficulty options; 115 Errors and warnings:** erros explicados no momento e no sítio certo.
- **XAG 116 Time limits:** permitir pausar, abrandar ou tirar limites de tempo. O jogo do Pocket Basketball já pausa, o que cumpre.
- **XAG 117 Visual distractions and motion settings:** desligar tremores, desfocagem e piscares.

Fontes: [XAG 101](https://learn.microsoft.com/gaming/accessibility/xbox-accessibility-guidelines/101); [lista das XAG](https://learn.microsoft.com/en-us/gaming/accessibility/guidelines); [XAG 102](https://learn.microsoft.com/es-es/gaming/accessibility/xbox-accessibility-guidelines/102); [orientações para portáteis](https://devdocs.xbox.com/build/gdk-and-engines/handheld/handheld-guidelines-and-testcases). Os números dos XAG 103 a 117 vêm de conhecimento prévio **[não verificado nesta sessão]**.

---

## 4. Teoria da interface de jogos

### 4.1 Diegético, não diegético, espacial e meta (Fagerholt e Lorentzon, 2009)

Erik Fagerholt e Magnus Lorentzon, «Beyond the HUD», tese de mestrado da Chalmers University of Technology, 2009. Dois eixos: o elemento pertence à **ficção**? Está no **espaço** do jogo?

| | No espaço do jogo | Fora do espaço do jogo |
|---|---|---|
| **Na ficção** | **Diegético:** o marcador do pavilhão, o relógio dos 24 segundos por cima do cesto, o treinador a gesticular | **Meta:** o ecrã a escurecer quando a equipa está em crise; a «câmara de TV» com o resultado a entrar como num canal desportivo |
| **Fora da ficção** | **Espacial:** o círculo por baixo do jogador com a bola, a seta do passe, o número de cansaço por cima do jogador | **Não diegético:** o painel do treinador, os separadores, a barra de controlo |

Aplicação ao Pocket Basketball:
- O **resultado** pode ser diegético (um marcador pendurado no pavilhão, em pixel art) e repetido como não diegético na barra de cima, por causa da legibilidade.
- Os **indicadores por cima dos jogadores** (quem tem a bola, quem está cansado) são espaciais: são os que mais ajudam a ler o jogo sem tirar os olhos do campo.
- O **painel do treinador** é não diegético, mas pode ganhar charme se parecer um objeto do mundo (uma prancheta, um bloco de notas), o que o aproxima do meta sem perder clareza.
- Ter em conta que as fronteiras entre categorias são discutíveis. Serve de vocabulário, não de regra.

Fontes: [Game Developer, User interface design in video games](https://www.gamedeveloper.com/design/user-interface-design-in-video-games); [Stony Brook, Game UI](https://www3.cs.stonybrook.edu/~tony/ui/lectures/game_design/gameUI.pdf); [Mastering UI Development with Unity, Four game interface types](https://www.oreilly.com/library/view/mastering-ui-development/9781787125520/78296d1f-f5be-4af9-8ed6-b47ece9c8bda.xhtml).

### 4.2 HUD e densidade de informação

- Dividir a informação do jogo em três camadas:
  1. **Sempre visível:** resultado, período, relógio, velocidade, pausa.
  2. **Um toque:** cansaço e faltas dos 5 em campo, estatísticas do jogo, o banco.
  3. **Sob pedido:** estatísticas detalhadas, tabela da liga, cartas.
- O HUD num telemóvel vertical não deve ocupar mais de 10 a 15 % da área do campo. O resto vai para o painel, que já é uma zona separada.
- Mostrar **diferenças e tendências** mais do que valores absolutos: «−3» no cansaço desde o último desconto de tempo é mais útil do que «62».
- Alertas para decisões: um jogador com 4 faltas, um jogador muito cansado, o adversário numa série. Um ponto ou ícone no separador «Banco», mais um aviso no relato. Nunca uma janela que pare o jogo sem pedido do jogador.

### 4.3 Menus e profundidade de navegação

- Regra prática da indústria: as ações frequentes ficam **a um ou dois toques** do ecrã principal, e nenhum ecrã fica a mais de **três níveis** de profundidade.
- A queixa mais forte contra o Football Manager 26 é exatamente esta: informação que estava num ecrã passou para janelas, separadores e submenus, «o dobro dos cliques para tarefas simples» (ver 5.1).
- Navegação da cidade: cada edifício é um destino de primeiro nível. Mas ter **também** uma barra ou lista de atalhos, porque procurar um edifício num mapa cada vez é lento. A cidade dá charme e a lista dá velocidade.
- O botão «Voltar» fica sempre no mesmo sítio, e um caminho («Cidade › Escritório › Contratos») no topo dos ecrãs com mais de um nível.
- O jogo começa ou continua com um toque a partir do ecrã inicial («Continuar» como primeiro botão). É um item básico das Game Accessibility Guidelines.

### 4.4 Estados de resposta

Todos os controlos interativos precisam de todos estes estados, desenhados de propósito:

| Estado | Em pixel art |
|---|---|
| Normal | Painel com sombra em baixo de 1 a 2 pixels de arte (o «degrau»). |
| Por cima (hover, só com rato) | Mais claro 1 passo na paleta, ou contorno. Nunca a única forma de descobrir algo, porque no toque não existe. |
| Premido | O conteúdo desce **1 pixel de arte** e a sombra de baixo desaparece (ver 6.8). |
| Com foco (teclado) | Contorno de alto contraste de 1 pixel de arte, mais ▶. Diferente do hover. |
| Selecionado (separador ativo, linha escolhida) | Fundo diferente, mais uma marca de forma (sublinhado, ▶, moldura). Não só a cor. |
| Desativado | Contraste reduzido mas legível (o WCAG não exige contraste para controlos desativados, mas eles têm de se ler), um padrão ou ícone de cadeado, e uma explicação ao tocar («Sem descontos de tempo»). |
| A carregar ou pendente | Uma animação de 2 a 4 frames, ou o texto «Em fila». |

### 4.5 Transições e durações

| Tipo | Duração |
|---|---|
| Resposta a um toque (premir, mudar de estado) | **0 a 100 ms**. Abaixo de 100 ms parece instantâneo (o limite clássico de Nielsen). |
| Aparecer e desaparecer pequeno (dica, menu) | **150 a 200 ms** |
| Mudança de separador, painel a deslizar | **200 a 300 ms** |
| Mudança de ecrã inteiro | **300 a 400 ms**. No máximo 500 ms. |
| Material Design (telemóvel) | Cerca de **300 ms** em geral, 150 a 200 ms para pequenas, 300 a 400 ms para grandes. Tablets mais 30 %, relógios menos 30 %. |

Em pixel art, as transições ficam bem em **passos** (por exemplo, a 12 ou 15 frames por segundo, `steps()` no CSS) e com deslocamentos em múltiplos inteiros de pixels de arte. Uma transição suave com frações borra a arte (ver 6.6). Entrar a desacelerar (`ease-out`), sair a acelerar (`ease-in`). Nunca bloquear a entrada do jogador durante uma transição: um toque durante a animação salta para o fim.

Fontes: [Material Design 1, Duration & easing](https://m1.material.io/motion/duration-easing.html); [Val Head, How fast should your UI animations be?](https://valhead.com/?p=2978). O intervalo de 100 a 500 ms atribuído ao Nielsen Norman Group só o vi em fontes secundárias **[não verificado]**.

### 4.6 Integração e tutoriais

- Ensinar **no momento em que é preciso** (o primeiro desconto de tempo explica o desconto de tempo), e não numa parede de texto no início.
- Uma ideia por ecrã, com no máximo 1 a 2 frases. Destacar o controlo de que se fala.
- **Tudo se pode saltar.** O tutorial que não se pode saltar é das queixas mais repetidas, sobretudo de quem recomeça.
- Poder rever as dicas depois (um «Ajuda» ou «Dicas vistas» no escritório).
- Revelar a complexidade aos poucos: na primeira época só os separadores essenciais. O mercado e as cartas avançadas abrem depois.
- O Nintendo Pocket Football Club foi elogiado pela interface simples e poucos toques, mas criticado porque a parte mais usada fora do jogo (as cartas de treino) podia ser mais rápida e mais bem organizada. Lição: o ecrã mais usado merece o maior polimento.

Fontes: [Steam, queixas de tutorial obrigatório](https://steamcommunity.com/app/1535100/discussions/0/3764482382515980812); [r/gamedev, What do you hate about game tutorials](https://redlib.hbubli.cc/r/gamedev/comments/1fex2yy/what_do_you_hate_about_game_tutorials); [Citizen Game, NPFC](https://citizengame.co.uk/Review-detail/nintendo-pocket-football-club); [Gert Lush Gaming, NPFC](https://gertlushgaming.co.uk/review-nintendo-pocket-football-club/); [Digitally Downloaded, NPFC](https://www.digitallydownloaded.net/?p=48313).

### 4.7 Estados vazios

Um ecrã sem dados nunca fica em branco. Tem três partes: **o que é isto, porque está vazio, e o que fazer**.

- Relato antes do jogo: «O jogo ainda não começou. Carrega em ▶ para o salto inicial.»
- Cartas: «Ainda não tens cartas. Ganhas cartas ao vencer jogos e ao treinar.»
- Mercado sem jogadores: «Não há jogadores livres agora. O mercado renova-se na segunda-feira.»
- Tabela antes da primeira jornada: mostrar as equipas a zero, não um ecrã vazio.

Uma pequena ilustração em pixel art (uma bola parada, um banco vazio) dá charme ao estado vazio.

### 4.8 Prevenção de erros

- Prevenir é melhor do que confirmar. Desativar o impossível e explicar.
- **Confirmar só o irreversível ou caro:** vender um jogador, despedir, gastar dinheiro grande, sair de um jogo a meio. A confirmação diz a consequência em concreto: «Vender Rui Costa por 1200 €? Ele sai da equipa já.» O botão de confirmação tem o verbo («Vender»), não «Sim».
- Melhor ainda do que confirmar: **desfazer** («Venda feita. Desfazer» durante alguns segundos, quando for possível no modelo de dados). A falta de desfazer é uma queixa do NBA 2K14 e um pedido no TODO do Basketball GM.
- Separar fisicamente as ações destrutivas das frequentes. O botão de sair do jogo não fica ao lado do de pausa.
- Guardar automaticamente, e mostrá-lo («Guardado ✓»).

---

## 5. Interface de jogos de desporto e de gestão

### 5.1 Football Manager

**Elogios (tradição até ao FM24):** a densidade, as tabelas personalizáveis, atributos de 1 a 20 com cores por faixas, o polígono de atributos no perfil, a comparação de jogadores, os filtros de pesquisa guardados, os «skins» da comunidade.

**Queixas (FM26, lançado em 2025 com interface nova em Unity):**
- **Demasiados cliques:** a informação foi enterrada em janelas, separadores e submenus redundantes. As tarefas simples do dia a dia pedem o dobro dos cliques.
- **Texto pequeno com espaços enormes:** estética de «aplicação de iPad», janelas modulares, texto minúsculo e espaços exagerados. Cansativo num monitor grande. Escala má em 4K e ecrãs ultralargos.
- **Painéis em vez de tabelas:** os menus parecem um painel de Power BI em vez de listas e folhas de cálculo. Os jogadores de computador perderam o ecrã compacto de visão geral.
- **Desenho para toque num jogo de rato:** a interface orientada ao toque estraga o jogo no computador. A sugestão de usar um comando no PC foi mal recebida.
- Texto desalinhado, a sair dos mosaicos, inconsistências, botões que não funcionam.
- As críticas do Steam ficaram «maioritariamente negativas». A Sports Interactive dedicou o primeiro vídeo do FM27 à interface e à navegação.
- Há precedentes: no FM2015 houve protestos porque uma tarefa passou de um clique para dois.

**Lição para o Pocket Basketball:** um esquema para o toque **e** um para o rato e teclado (o jogo já escolhe pela proporção, mas a densidade também deve mudar com o tipo de ponteiro: `@media (pointer: coarse)` contra `(pointer: fine)`). Não esconder num separador o que o jogador consulta a cada minuto. Os espaços grandes não compensam o texto pequeno.

Fontes: [PC Gamer, FM26 nas críticas do Steam](https://www.pcgamer.com/games/sim/football-manager-26-launches-straight-into-a-relegation-battle-as-steam-reviews-plummet-to-mostly-negative-been-playing-since-1993-and-this-is-the-worst-one); [Final Boss, 70 horas com o FM26](https://finalboss.io/after-70-hours-with-football-manager-26-im); [AOL, FM26 review](https://www.aol.com/articles/football-manager-26-review-fun-100115198.html); [Galaxus, FM26 labirinto de interface](https://www.galaxus.de/en/page/football-manager-26-is-floundering-in-an-interface-labyrinth-40507); [Operation Sports, comando no PC](https://www.operationsports.com/football-manager-26-players-criticize-suggestion-to-use-a-controller-on-pc); [FMScout, opinião sobre o FM2026](https://www.fmscout.com/q-33940-FM2026--Whats-your-opinion.html); [The Sixth Axis, FM27 deep dive](https://www.thesixthaxis.com/2026/09/22/football-manager-27s-first-deep-dive-video-is-all-about-the-ui-and-navigation/); [Gosugamers](https://www.gosugamers.net/entertainment/news/77565-review-football-manager-26-looks-good-but-its-buggy-interface-leaves-much-to-be-desired); [PCInvasion, FM2015](https://www.pcinvasion.com/?p=89150).

**Atributos no FM:** escala de 1 a 20. As cores por faixas vêm do skin; por defeito há quatro faixas (1–5, 6–10, 11–15, 16–20) **[faixas de uma fonte de 2010, não verificado para versões atuais]**. Atributos fora do clube aparecem como intervalos («mascarados») até haver relatório do olheiro: uma boa ideia para a incerteza no mercado. A comunidade cria muitas ferramentas de comparação com polígonos e radares, sinal de que comparar é uma necessidade central. Fontes: [FMInside, atributos](https://fminside.net/football-manager-player-attributes); [FMScout, cores de atributos](https://www.fmscout.com/i-991-How-to-change-player-attribute-colors-in-FM-2011.html); [Football Manager Blog, comparar jogadores](https://www.footballmanagerblog.org/database/fm27/players/compare).

### 5.2 Nintendo Pocket Football Club (3DS, 2014) e jogos de gestão de bolso

- **Elogios:** interface simples e fácil de perceber, poucos toques apesar da estrutura funda, a música nos menus, o charme das cartas de treino.
- **Queixas:** o sistema de cartas, que é o que mais se usa fora dos jogos, podia ser mais rápido e mais bem organizado. Ter de ver todos os jogos pode cansar (daí a importância da velocidade 2× a 4× e do «saltar para o fim»).
- Notas de 5/10 a 8/10: a interface simples agrada a uns e parece pobre a outros.

Fontes: [Pocket Gamer](https://www.pocketgamer.com/nintendo-pocket-football-club/review/); [Cubed3](https://cubed3.com/review/1433/1/nintendo-pocket-football-club-nintendo-3ds.html); [Nintendo World Report](https://nintendoworldreport.com/review/37181/nintendo-pocket-football-club-review); [Nintendo Life](https://nintendolife.com/reviews/3ds-eshop/nintendo_pocket_football_club).

### 5.3 Kairosoft

- **Elogios:** muita coisa num ecrã pequeno, ciclo de jogo claro, a cidade ou a base vista de cima como «menu vivo».
- **Queixas:** interface pequena e «janota» (no mau sentido), texto pequeno e por vezes borrado (texto nítido num jogo, serrilhado e borrado noutro), letras cortadas no fim das janelas, texto colorido a sobrepor-se, menus lentos e difíceis com comando nas versões de consola, janelas que ficam mal em ecrãs grandes.
- **Lição:** a escala tem de ser inteira e pensada para cada ecrã (as queixas de texto borrado vêm de escalas fracionárias); o texto nunca pode ser cortado pela moldura; testar os textos portugueses mais compridos.

Fontes: [Kotaku, Kairosoft no Steam](https://kotaku.com/kairosoft-game-dev-story-steam-ios-android-pc-windows-m-1848717007); [Complete Xbox](https://completexbox.co.uk/?p=49400); [Jay Is Games, The Pyraplex](https://games.jayisgames.com/review/the-pyraplex.php); [Gamezebo, Pocket League Story](https://www.gamezebo.com/reviews/pocket-league-story-review/); [TouchArcade](https://toucharcade.com/?p=95443).

### 5.4 Basketball GM (ZenGM)

- Interface web em React e Bootstrap: tabelas densas, todas ordenáveis, com filtros por coluna (sintaxe `>40&<60`, `!FA`).
- Avaliações de 0 a 100 por atributo, com «ovr» e «pot» (potencial) e com as letras de capacidades (por exemplo «3», «A», «B», «Di», «Dp», «Po», «Ps», «R», «V») como etiquetas curtas.
- Pedidos frequentes da comunidade (no TODO do projeto): comparar jogadores lado a lado e desfazer ações.
- **Lição:** as etiquetas de capacidades (uma palavra ou ícone por ponto forte) leem-se mais depressa do que vinte números. Bom modelo para o Pocket Basketball mostrar 2 ou 3 «traços» por jogador.

Fontes: [Basketball GM Manual](https://basketball-gm.com/manual/); [ZenGM, What do skills mean?](https://zengm.com/blog/2014/02/what-do-skills-mean/); [ZenGM TODO](https://www.github.com/zengm-games/zengm/blob/master/TODO); [ZenGM changelog](https://zengm.com/changelog/).

### 5.5 NBA 2K MyGM e MyLeague

- **Queixas:** carregamentos longos entre menus (um minuto ou mais no 2K16), menu inicial estático e simplista, um toque errado que não se pode desfazer, e mais tarde quebras de desempenho que impediam navegar nos menus.
- **Lição:** num jogo de gestão o jogador passa a maior parte do tempo nos menus. A navegação tem de ser instantânea (menos de 100 ms para responder, menos de 300 ms para mudar de ecrã) e tudo tem de se poder desfazer ou cancelar.

Fontes: [Game Informer, NBA 2K15 Wish List](https://gameinformer.com/b/features/archive/2014/01/05/nba-2k15-wish-list.aspx); [Inverse, NBA 2K16](https://nc.inverse.com/article/11918-nba-2k16-is-extremely-flawed-and-fixing-stephen-curry-is-beside-the-point); [PC Gamer, NBA 2K20](https://pcgamer.com/nba-2k20-is-plagued-with-issues-and-taking-a-hammering-on-steam); [NBA-Live forums, 2K25](https://www.forums.nba-live.com/viewtopic.php?p=2094471).

### 5.6 Retro Bowl

- **Elogios:** a interface simples e nostálgica (100 % «Critics Recommend» no OpenCritic). Gestão do plantel simples: moral, imprensa, egos. Nada de micro-gestão. Partidas curtas.
- **Lição:** o charme em pixel art e a simplicidade vencem a densidade num telemóvel. Cada jogador tem poucos números (uma nota geral em estrelas e poucos atributos). As escolhas de imprensa são cartas com duas opções.

Fontes: [GamesRadar](https://gamesradar.com/retro-bowls-addictive-simplicity-makes-it-one-of-the-best-sports-games-in-recent-years); [Wikipedia, Retro Bowl](https://www.wikipedia.com/wiki/Retro_Bowl); [App Store](https://apps.apple.com/app/id1478902583).

### 5.7 Hoop Land

- **Elogios:** modos de carreira, franquia e comissário surpreendentemente fundos para um jogo de basquetebol 2D em pixel art.
- **Queixas:** pedidos de menus pendentes e de navegação mais integrada entre ecrãs; problemas de navegação com comando; um tutorial pouco fundo.
- **Lição:** ligar os ecrãs entre si (tocar num nome numa tabela abre o jogador; tocar numa equipa abre a equipa) poupa muitos «voltar».

Fontes: [148Apps](https://www.148apps.com/reviews/hoop-land-review); [Gamekeepr](https://gamekeepr.net/en/reviews/63); [Steam, Hoop Land](https://www.wasdland.com/game/hoop-land-2453660/); [TouchArcade, beta](https://devforums.toucharcade.com/threads/beta-hoop-land-2d-pixel-basketball-simulation-by-koality-game.427946/).

### 5.8 OOTP Baseball

- **Queixas:** curva de aprendizagem íngreme, páginas densas que intimidam quem começa, uma interface que «prendeu a série» (OOTP 18), uma reorganização que tornou a informação difícil de encontrar (pedido de um interruptor «compacto» no OOTP 27).
- **Elogios:** o ecrã inicial do treinador junta o importante num sítio (OOTP 13). A interface do OOTP 25 foi simplificada. Estatísticas sempre ordenáveis e presentes.
- **Lição:** um ecrã de «hoje» que junta as decisões pendentes (próximo jogo, lesões, contratos a acabar, ofertas) vale mais do que menus bem arrumados. Mudar a interface tem um custo para quem já joga. Uma opção de densidade (compacta ou confortável) agrada aos dois públicos.

Fontes: [OpenCritic, OOTP 18](https://opencritic.com/game/4120/out-of-the-park-baseball-18); [Operation Sports, OOTP 12](https://forums.operationsports.com/reviews/611/out-of-the-park-baseball-12/); [OSFTW, OOTP 13](https://www.osftw.com/reviews/664/out-of-the-park-13-review); [GameCritics, OOTP 25](https://gamecritics.com/brad-bortone/out-of-the-park-baseball-25-review/); [The Hardball Times, OOTP 14](https://tht.fangraphs.com/out-of-the-park-14-a-review); [Steam, OOTP 27](https://stmstat.com/app/4045750/reviews).

### 5.9 Motorsport Manager (PC e Mobile)

- **Elogios:** interface limpa e intuitiva, gestão complexa a partir do ecrã inicial, fácil de ler e de navegar. A versão para telemóvel é quase igual à do PC.
- **Queixas:** no MMM3, botões de ação passados para o topo do ecrã, mais difíceis de alcançar; a página da corrida «uma confusão»; o ecrã inicial cheio de mais com as novidades.
- **Lição direta para o jogo:** durante o jogo, as ações (desconto de tempo, substituições, tática) ficam **em baixo**, ao alcance do polegar. O MMM3 é o contra-exemplo.

Fontes: [TouchArcade, MMM3](https://toucharcade.com/2018/07/24/motorsport-manager-mobile-3-review/); [TouchArcade, MMM2](https://toucharcade.com/2017/07/18/motorsport-manager-mobile-2-review-racing-at-a-whole-new-level/); [Top Gear, MM3](https://www.topgear.com/car-news/gaming/motorsport-manager-3-review-streamlined-and-intuitive); [JustUseApp, MMM3](https://justuseapp.com/en/app/1346580540/motorsport-manager-mobile-3/reviews); [The News Wheel, MMM2](https://thenewswheel.com/?p=114778).

### 5.10 Como mostrar atributos

| Forma | Bom para | Mau para | Quem usa |
|---|---|---|---|
| **Número** (1–20, 0–100) | Precisão, ordenar, comparar pequenas diferenças | Leitura rápida de muitos valores; ilusão de precisão | FM, BBGM, OOTP |
| **Letra ou nota** (A–E, S–F) | Leitura rápida, cabe em 1 caractere, funciona sem cor | Diferenças dentro da mesma letra | NPFC, muitos jogos japoneses |
| **Barra** | Comparar com o máximo, ver de relance | Espaço; pouco precisa em pixel art (máx. 10 a 20 passos) | Motorsport Manager, muitos RPG |
| **Cor da célula** | Ver padrões numa tabela grande | Daltonismo; sozinha não chega | FM (cores por faixa) |
| **Estrelas** (½ a 5) | Valor geral e potencial | Atributos individuais | Retro Bowl, FM (classificações do treinador) |
| **Polígono ou radar** | Perfil e comparação de dois jogadores | Ler valores exatos; ecrãs pequenos | FM, ferramentas da comunidade |
| **Etiquetas de traço** | Dizer o que o jogador faz bem | Graduação | BBGM, 2K (insígnias) |

**Recomendação para o Pocket Basketball:** no plantel, **crachás de nota com letra e cor** por atributo (a letra é a informação e a cor reforça). No perfil, uma barra por atributo com a letra ao lado e, se o espaço deixar, o valor. Para comparar, dois jogadores lado a lado com a diferença (▲ +2 / ▼ −1) e a coluna mais forte destacada com forma e não só com cor. O valor «escondido» do mercado pode ser um intervalo de notas («B–C») até se observar o jogador.

### 5.11 Hierarquia de informação no dia de jogo

Por ordem de importância, a partir dos jogos estudados:

1. **Resultado e tempo** (sempre visíveis, maiores).
2. **O que está a acontecer** (o campo, e o relato numa linha).
3. **Estado dos meus 5 em campo:** cansaço, faltas, como estão a jogar (nota do jogo). É aqui que está a decisão.
4. **Controlos:** pausa, velocidade, desconto de tempo, substituições, tática.
5. **Estatísticas da equipa e comparação** (separador).
6. **Liga, outros jogos, cartas** (separadores secundários).

Os momentos em que o jogo pede uma decisão (um jogador com 5 faltas, uma lesão) merecem uma pausa automática **opcional** («Pausar em: lesões, faltas graves, fim de período»).

---

## 6. Interface em pixel art

### 6.1 Painéis e molduras em nove partes (nine-slice)

- Uma imagem de moldura cortada numa grelha de 3×3: os quatro cantos ficam fixos, as quatro bordas esticam ou repetem num eixo, e o centro estica ou repete nos dois.
- Em CSS: `border-image: url(painel.png) 4 fill / calc(4px * var(--scale)) / 0 stretch;` com `image-rendering: pixelated`. A largura do corte e a largura da borda têm de dar um múltiplo inteiro (`corte × escala`).
- Esticar (`stretch`) é seguro para bordas lisas. Repetir (`round` ou `repeat`) só para bordas com padrão, e então o tamanho do painel tem de ser múltiplo do padrão, senão o padrão parte nas pontas.
- Como a arte é gerada por código (regra do projeto), também se pode desenhar a moldura com `box-shadow` em camadas (cada sombra é um pixel de arte) ou com um canvas pequeno exportado para `data:` URL. A `border-image` com uma imagem gerada é a opção com menos código.
- Tamanho típico dos cantos: 3 a 6 pixels de arte. Um conjunto pequeno de variantes: painel (fundo), botão normal, botão premido, botão desativado, separador ativo e inativo, campo de texto.
- **Verificar no browser** se `image-rendering: pixelated` se aplica à `border-image` em todos os browsers-alvo. Não encontrei uma fonte que o confirme **[não verificado]**.

Fontes: [Wikipedia, 9-slice scaling](https://en.wikipedia.org/wiki/9-slice_scaling); [Pixel Art 9-Slicer 4-CSS](https://alanrobinsondev.itch.io/9slice-pixel-art-4css); [Lean Rada, 9-slicer](https://leanrada.com/wares/9-slicer/); [besthub, CSS 9-slice com border-image](https://besthub.dev/articles/master-css-9-slice-scaling-with-border-image-for-seamless-ui-stretching-b267f5ebeceb); [PixiJS, NineSlice Sprite](https://pixijs.com/8.x/guides/components/scene-objects/nine-slice-sprite).

### 6.2 Fontes de píxeis

- **Tamanhos:** uma fonte de 5 pixels de altura de maiúscula é o mínimo para letras distinguíveis (só maiúsculas, sem acentos bons). Uma de **7 pixels de maiúscula com 2 de descendente e 2 de acentos** (corpo total de 11 a 12) é o tamanho confortável para texto de interface com minúsculas e acentos. A fonte Atom, por exemplo, tem 12 px de altura total, 6 px de maiúscula e 4 px de altura-x, e quase todo o conjunto da Europa Ocidental.
- **Acentos para o português** (á à â ã é ê í ó ô õ ú ç e as maiúsculas Á À Â Ã É Ê Í Ó Ô Õ Ú Ç): é preciso **pelo menos 1 pixel extra de ascendente** acima da maiúscula para os acentos se lerem, e o ideal é **1 pixel de intervalo mais 2 a 3 pixels de acento**. O til e o circunflexo precisam de 3 pixels de largura para se distinguir; o agudo e o grave podem ter 2. A cedilha precisa de 1 a 2 pixels abaixo da linha de base.
- Em maiúsculas os acentos sobem acima da altura normal. Ou se reserva essa altura na linha (recomendado), ou se usam maiúsculas acentuadas achatadas (a letra encolhe 1 pixel). Nunca cortar o acento.
- **Espaçamento entre letras:** 1 pixel de arte entre letras em fontes de largura variável. Pares problemáticos (por exemplo `rn` que parece `m`, `l1I`) precisam de formas distintas mais do que de kerning. Kerning manual só para poucos pares (`LT`, `AV`, `To`, `Te`).
- **Espaço:** 3 a 4 pixels de arte. Altura de linha: corpo mais 2 a 3 pixels.
- **Testar sempre** com as palavras mais compridas e acentuadas do jogo: «Substituições», «Ressaltos», «Classificação», «Transferências», «Ação», «Pavilhão», «ÚLTIMO».
- Numerais **tabulares** (todos com a mesma largura) para as tabelas, para as colunas alinharem. Um zero diferente do «O» (com ponto ou barra) ajuda nos números.

Fontes: [Pixlet, fonts](https://www.github.com/tidbyt/pixlet/blob/main/docs/fonts.md); [Hackaday, pixelfonts](https://hackaday.com/2026/10/10/slim-type-for-small-screens-with-pixelfonts); [MyFonts, Atom](https://myfonts.com/fonts/minifonts/atom); [Pixuf charset update](https://erytau.itch.io/pixuf/devlog/1000469/pixuf-charset-update); [monogram](https://datagoblin.itch.io/monogram/comments?after=54).

### 6.3 Ícones de 16 px

- Tamanhos em pixels de arte: **8×8** para ícones dentro do texto, **16×16** para botões e separadores, 24×24 ou 32×32 para os edifícios e as cartas.
- Em 16×16 há espaço útil de cerca de 14×14 (deixar 1 pixel de margem). Silhueta forte, 2 a 4 cores mais o contorno, legível como mancha. O teste: o ícone reconhece-se a preto e branco e a 1×.
- Contorno de 1 pixel escuro (não preto puro, para não ficar duro) para se separar de qualquer fundo.
- Todos os ícones na mesma grelha, com o mesmo peso de traço e a mesma direção da luz (por exemplo, de cima à esquerda).
- Ícone sozinho só para ações muito conhecidas (▶ ❚❚, som). As outras levam **etiqueta de texto** ou, no mínimo, `aria-label` e dica.

### 6.4 Escala inteira da interface

- A escala é `k = floor(min(larguraSegura / larguraBase, alturaSegura / alturaBase))`, contada em pixels do ecrã físico (`devicePixelRatio` incluído). Com `devicePixelRatio = 3` (comum em telemóveis), 1 px CSS são 3 pixels físicos, e um pixel de arte a «2 px CSS» são 6 pixels físicos: inteiro e nítido. Com `devicePixelRatio = 2,625` (muitos Android), 1 px CSS **não** é inteiro: é preciso calcular a escala em pixels físicos (por exemplo, 1 pixel de arte = 5 pixels físicos = 1,905 px CSS) e acertar o canvas com esse número. Os elementos HTML com moldura em pixel art sofrem com estes DPR fracionários.
- A sobra (a área que não cabe num múltiplo inteiro) fica como margem com a cor de fundo ou com um padrão. Nunca se estica para a preencher.
- Ao redimensionar (rodar, zoom do browser), recalcular. O zoom do browser muda o `devicePixelRatio`.
- O AGENTS.md já exige «a arte é sempre escalada por múltiplos inteiros de píxeis do ecrã»: estas regras só o detalham.

### 6.5 Juntar texto HTML nítido com pixel art

Três opções:

1. **Fonte bitmap como webfont** (uma fonte de contornos quadrados, desenhada numa grelha) a um tamanho que seja múltiplo exato da grelha (por exemplo, uma fonte com grelha de 8 a `16px`, `24px`, `32px`), com `-webkit-font-smoothing: none` (só macOS) e `font-smooth: never`. Os browsers ainda podem suavizar as bordas: a margem de sucesso depende do sistema.
2. **Texto desenhado no canvas** a partir de uma folha de glifos: nítido de certeza, mas perde-se a seleção, o leitor de ecrã e a escala do sistema (é preciso um espelho em HTML com `aria-live` ou texto escondido).
3. **Híbrido** (recomendado): títulos, resultados e etiquetas curtas na fonte bitmap; listas, tabelas, descrições longas e definições de acessibilidade com uma opção de fonte de sistema nítida («Texto: Píxel / Legível»).

Regra: não misturar no mesmo painel duas escalas de pixel diferentes (por exemplo, uma moldura a 2× com uma fonte a 3×). Fica estranho. Se o texto precisa de ser maior, sobe a escala do painel todo, ou usa-se a fonte de sistema que não tem «pixel».

### 6.6 Evitar transformações CSS borradas

- A desfocagem aparece quando um elemento fica numa posição fracionária: a borda cai a meio de um pixel e fica cinzenta.
- Causas típicas: `transform: translate(-50%, -50%)` para centrar (dá 0,5 px com tamanhos ímpares), `scale(1.05)` em hover, `translate` com percentagens, `left: 33.333%`, `gap` em `rem`, animações com `ease` que passam por frações, `vw` e `vh`.
- Correções:
  - centrar com flexbox ou grelha, e não com `translate(-50%)`;
  - posições e tamanhos em pixels inteiros (de arte × escala);
  - animações em passos (`steps()`) ou com o valor arredondado em JavaScript (`Math.round`) antes de escrever o `transform`;
  - nunca `scale()` não inteiro em pixel art. Para «crescer» ao premir, trocar de sprite ou deslocar 1 pixel;
  - evitar `filter: blur(0)` e `translateZ(0)` como remendos: dão resultados misturados.
- Os canvas e imagens: `image-rendering: pixelated`. Ver 6.7.

Fontes: [WebKit bug 120583](https://bugs.webkit.org/show_bug.cgi?id=120583); [Ben Nadel, Chrome e translate em percentagem](https://www.bennadel.com/blog/3399-sanity-check-chrome-63-still-causes-blurry-borders-with-percentage-based-css-translation.htm); [Mozilla bug 739176](https://bugzilla.mozilla.org/show_bug.cgi?id=739176); [Stack Overflow, translate a meio pixel](https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/40634288/blurry-text-because-translate-50-50-positions-on-half-a-pixel).

### 6.7 `image-rendering: pixelated`

- `pixelated`: vizinho mais próximo nas ampliações; nas reduções o browser pode suavizar. Suportado no Chrome, Edge, Safari e Firefox modernos.
- `crisp-edges`: pede um algoritmo que preserve contrastes; no Firefox é vizinho mais próximo, mas a especificação não o garante. Para pixel art, **usar `pixelated`**.
- Aplica-se a `<canvas>`, `<img>`, fundos (`background-image`) e, em princípio, `border-image`. Não se aplica a texto.
- Com escala não inteira, `pixelated` dá pixels de tamanhos desiguais (uns com 2 e outros com 3 pixels físicos): a arte «treme» ao mexer. Por isso a escala inteira (6.4) é obrigatória mesmo com `pixelated`.
- Para o canvas: o buffer interno tem o tamanho da arte a 1× (ou o tamanho físico exato) e o CSS amplia por um fator inteiro. Com `ctx.imageSmoothingEnabled = false` quando se desenha sprites ampliados dentro do canvas.

Fonte: MDN, `image-rendering` (conhecimento prévio, não aberto nesta sessão **[não verificado]**); [besthub, 9-slice](https://besthub.dev/articles/master-css-9-slice-scaling-with-border-image-for-seamless-ui-stretching-b267f5ebeceb).

### 6.8 Botões com estado premido que desce 1 pixel

Padrão clássico:

```
Normal:    [ cara do botão ]       ← cara clara
           [▁▁ sombra 2 px ▁▁]     ← parte de baixo escura (o "degrau")

Premido:   (1 px de espaço em cima)
           [ cara do botão ]       ← desce 1 pixel de arte
           [▁ sombra 1 px ▁]       ← a sombra encolhe 1 pixel
```

- O botão mantém a mesma altura total (o espaço em cima compensa), para o esquema não saltar.
- Em CSS: `:active` muda o `border-image` para a variante premida, ou aplica `transform: translateY(calc(1px * var(--scale)))` ao conteúdo e reduz a sombra, sempre em pixels inteiros.
- No toque, `:active` tem atrasos no iOS: usar `pointerdown` e `pointerup` para pôr uma classe `.is-pressed`, e cancelar com `pointercancel` e quando o dedo sai.
- Juntar um som curto de clique (já previsto nas regras de som do projeto) e, onde houver, `navigator.vibrate(10)` como opção.
- O estado premido aparece em menos de 16 ms (no mesmo frame) e a ação dispara ao **largar** (`pointerup` dentro do botão), para o jogador poder desistir arrastando o dedo para fora.

---

## 7. Mostrar dados

### 7.1 Tabelas

- **Linhas em zebra:** ajudam em tabelas largas com muitas colunas; em tabelas estreitas de 3 a 4 colunas, um separador fino ou só espaço chega. A diferença entre as linhas deve ser subtil (1 passo da paleta), para não competir com a linha selecionada. A linha selecionada leva forma (▶, moldura) além de cor.
- **Alinhamento:** texto à esquerda, **números à direita** (com numerais tabulares), notas e ícones ao centro. O cabeçalho alinha como a coluna.
- **Cabeçalho fixo** (`position: sticky; top: 0`) em listas que se deslocam. Cuidado com WCAG 2.4.11: o foco não pode ficar escondido debaixo do cabeçalho (`scroll-padding-top`).
- **Primeira coluna fixa** (o nome) quando a tabela desliza na horizontal. Em 360 px de largura, mostrar no máximo 4 a 6 colunas e deixar o resto para o perfil, ou deslizar na horizontal com a primeira coluna fixa.
- **Ordenar:** tocar no cabeçalho ordena; tocar outra vez inverte. Mostrar ▲ ▼ no cabeçalho ativo e `aria-sort`. A ordem predefinida tem sentido (a tabela da liga por posição, o plantel por posição em campo).
- **Siglas** com explicação (`<abbr title>` e um glossário), porque «RES», «AST», «ROU» não são óbvias para todos.
- **Densidade:** linhas de 40 a 44 px CSS no toque, 24 a 32 px no rato. Uma opção «compacto» para quem quer mais linhas.
- **Destacar a minha equipa** na tabela da liga (fundo e ícone), e as zonas (subida, descida, play-off) com uma linha separadora e uma etiqueta, não só cor.

### 7.2 Crachás de nota

- Formato: um quadrado ou retângulo de 9 a 11 pixels de arte com a letra centrada, cantos «comidos» de 1 pixel, contorno escuro de 1 pixel.
- Escala de letras sugerida: **S, A, B, C, D, E** (ou A a E). Cada uma com cor e **forma ou tratamento** diferente (por exemplo S com brilho e moldura dupla, A cheio, E só contorno), para funcionar em cinzento.
- Escala de cores sugerida, segura para daltonismo: uma progressão de luminosidade de frio para quente (azul escuro → azul → verde azulado → amarelo → laranja → vermelho-tijolo), ou uma escala de um só tom com a luminosidade a fazer o trabalho. Verificar 4,5:1 entre a letra e o fundo do crachá em cada nota.
- Sempre o mesmo crachá em todo o jogo (plantel, mercado, perfil, cartas).
- Texto alternativo: «Lançamento: nota B».

### 7.3 Barras e mini-gráficos (sparklines)

- **Barras em pixel art:** número de passos inteiro (10 ou 20 segmentos). Cada passo tem largura inteira em pixels de arte. Fundo da barra visível (a barra vazia diz qual é o máximo). O número ao lado quando é preciso exatidão.
- Barras de cansaço e energia: a mesma direção sempre (cheia = descansado), com o limiar crítico marcado com um traço e um ícone quando se passa.
- **Sparklines** (forma dos últimos 5 a 10 jogos, moral ao longo da época): 5 a 10 pontos em 16 a 24 pixels de arte de largura; o último ponto destacado; um traço de referência (a média). Para resultados V/D, um mini-gráfico de quadrados («VVDVV») é mais claro do que uma linha, com letras dentro ou formas (cheio e vazio) e não só verde e vermelho.
- Sem eixos nem etiquetas dentro do mini-gráfico; o contexto vem do título da coluna.

### 7.4 Escalas de cor

- **Sequencial** (de pouco a muito: valor de um atributo): um tom, a luminosidade a variar. Funciona em daltonismo e em cinzento.
- **Divergente** (abaixo e acima de uma referência: diferença para o adversário, +/−): dois tons opostos com um neutro ao meio. **Azul–laranja** em vez de verde–vermelho.
- **Categórica** (equipas, posições): no máximo 6 a 8 cores distintas, sempre com etiqueta.
- Numa paleta de pixel art limitada (16 a 32 cores), escolher de antemão uma rampa de 5 a 6 cores para as notas e uma rampa divergente de 5 cores, e passá-las por um simulador.
- Nunca usar a cor como único sinal de bom e mau; a letra, a seta ou o sinal tem de estar lá.

---

## 8. Queixas comuns dos jogadores sobre interfaces de jogos

Recolhidas das fontes acima e de fóruns (Steam, Reddit, fóruns oficiais e de comunidades):

1. **Texto pequeno de mais**, sobretudo em ecrãs grandes ou em portes de telemóvel para PC (FM26, Kairosoft, EVE Online), e sem opção para o aumentar.
2. **Demasiados cliques ou toques** para tarefas frequentes; informação enterrada em submenus (FM26, OOTP).
3. **Tutoriais que não se podem saltar**, paredes de texto que param o jogo, dicas que não se podem rever.
4. **Texto cortado ou a sair da moldura**, sobreposições (Kairosoft, FM26). Em português o problema é maior: os textos são 20 a 30 % mais compridos do que em inglês.
5. **Menus lentos** e carregamentos entre ecrãs (NBA 2K).
6. **Não haver desfazer**, ou haver confirmações a mais para coisas banais (e a menos para as perigosas).
7. **Interface pensada para outro aparelho:** toque num jogo de rato (FM26), rato num telemóvel, comandos mal suportados (Hoop Land, Kairosoft na consola).
8. **Botões fora do alcance** no telemóvel (MMM3 com as ações no topo).
9. **Ecrãs carregados de mais** («cluttered», MMM3), ou o contrário, espaço desperdiçado (FM26).
10. **Informação só pela cor** (as queixas de daltónicos são constantes).
11. **Mudanças de interface que partem os hábitos** de quem já joga, sem opção de densidade ou de esquema antigo (FM26, OOTP 27).
12. **Navegação sem ligações:** ver um nome numa tabela e não poder tocar nele para abrir o jogador (pedido no Hoop Land).
13. **Definições que não se guardam**, ou que se perdem com atualizações.
14. **Notificações e janelas que interrompem** o jogo sem o jogador pedir.
15. **Falta de comparação** lado a lado (pedido no Basketball GM e muitas ferramentas da comunidade para o FM).
16. **Textos com tempo** que desaparecem antes de se lerem (Empyrion).

Fontes: as já citadas nas secções 4 e 5, e [EVE Online forums, critique](https://forums.eveonline.com/t/critique/378760); [Empyrion forums](https://empyriononline.com/posts/415645/); [Game Developer, Game UI Discoveries: What Players Want](https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want); [Wayline, UI/UX debt](https://www.wayline.io/blog/ui-ux-debt-player-retention); [gamedev.net, 7 UX Lessons From The Trenches](https://gamedev.net/articles/game-design/ux-for-games/7-ux-lessons-from-the-trenches-r4969/). O aumento de 20 a 30 % dos textos em português face ao inglês é uma regra prática da localização **[não verificado nesta sessão]**.

---

## 9. Números para copiar

| Tema | Número | Origem |
|---|---|---|
| Zona de toque mínima (AA) | 24×24 px CSS, ou 24 px de afastamento | WCAG 2.2, 2.5.8 |
| Zona de toque recomendada | 44×44 px CSS (Apple, WCAG AAA), 48×48 dp (Material) | Apple HIG, WCAG 2.5.5, Material |
| Espaço entre alvos de toque | Pelo menos 8 px CSS | Material |
| Precisão do toque | 7 mm ao centro, 9 mm nas bordas, 12 mm nos cantos | Hoober [não verificado] |
| Uso com uma mão | 49 % (36 % segura e toca com a outra, 15 % dois polegares) | Hoober, 2013 |
| Contraste do texto | 4,5:1 (normal), 3:1 (≥ 24 px ou ≥ 18,66 px negrito), 7:1 (AAA) | WCAG 1.4.3 e 1.4.6 |
| Contraste de controlos, ícones e foco | 3:1 | WCAG 1.4.11 |
| Contorno do foco | ≥ 2 px CSS, 3:1 entre focado e não focado | WCAG 2.4.13 (AAA) |
| Escala do texto | Até 200 % sem perder nada | WCAG 1.4.4 |
| Largura mínima sem deslizar na horizontal | 320 px CSS | WCAG 1.4.10 |
| Piscar | No máximo 3 vezes por segundo | WCAG 2.3.1 |
| Movimento automático | Pausável se durar mais de 5 s | WCAG 2.2.2 |
| Daltonismo | 8 % dos homens, 0,5 % das mulheres | Colour Blind Awareness |
| Texto mínimo na consola a 1080p | 26 px de altura do corpo | XAG 101 |
| Texto mínimo em portáteis a 1080p | 14 px | Orientações Xbox para portáteis [não verificado] |
| Texto de corpo no telemóvel | 14 a 16 px CSS; mínimo legível 12 px | Material, web |
| Fonte bitmap confortável | 7 px de maiúscula, +2 px de acentos, +2 px de descendente (≈ 11 a 12 px de corpo) | Pixlet, Atom, Hackaday |
| Acentos | ≥ 1 px de intervalo e 2 a 3 px de altura acima da maiúscula | Pixlet, Hackaday |
| Altura de linha | 1,4 a 1,6 (parágrafo); corpo + 2 a 3 px de arte (pixel) | Tipografia, WCAG 1.4.12 |
| Comprimento de linha | 45 a 75 caracteres (ideal 66); máx. 80 | Bringhurst, WCAG 1.4.8 |
| Escala de espaços (pixels de arte) | 1, 2, 4, 6, 8, 12, 16 | Grelha de 4/8 pt adaptada |
| Margem lateral no telemóvel | 16 px CSS | Material, Apple |
| Ícones | 8×8 (no texto), 16×16 (botões), 24 a 32 (edifícios, cartas) | Prática de pixel art |
| Resposta ao toque | < 100 ms (premido no mesmo frame, < 16 ms) | Nielsen, limites de resposta |
| Transição pequena | 150 a 200 ms | Material |
| Mudança de separador | 200 a 300 ms | Material, NN/g [não verificado] |
| Mudança de ecrã | 300 a 400 ms; máx. 500 ms | Material |
| Toque longo | 400 a 500 ms, com sinal visual | Prática de plataformas |
| Botão premido | Desce 1 pixel de arte; a ação dispara ao largar | Prática de pixel art |
| Profundidade dos menus | Ações frequentes a 1 a 2 toques; máx. 3 níveis | Prática da indústria |
| Linhas de tabela | 40 a 44 px CSS (toque), 24 a 32 px (rato) | Apple, Material |
| Colunas a 360 px | 4 a 6 | Prática |
| Regiões vivas | Uma mensagem a cada 2 a 5 s, no máximo | Guias de ARIA para jogos |
| Véu das janelas modais | 50 a 60 % de opacidade | Prática |
| Comprimento dos textos em português | +20 a 30 % face ao inglês | Localização [não verificado] |

---

## 10. Lista de verificação

### Esquema e escala
- [ ] A arte da interface usa só escalas inteiras, calculadas sobre a área segura e o `devicePixelRatio`.
- [ ] Nenhum `translate(-50%)`, `scale()` fracionário, percentagem ou `rem` dentro dos painéis em pixel art.
- [ ] `image-rendering: pixelated` em canvas, imagens e molduras; `imageSmoothingEnabled = false` no canvas.
- [ ] `viewport-fit=cover` e `env(safe-area-inset-*)` na barra de controlo e nas laterais em horizontal.
- [ ] `100dvh` (ou `svh`) e não `100vh`.
- [ ] O estado (separador, deslocamento, foco) sobrevive à rotação.
- [ ] A densidade muda com `pointer: coarse` e `pointer: fine`, não só com a proporção.

### Toque
- [ ] Todos os alvos com pelo menos 44×44 px CSS no telemóvel (24×24 como mínimo absoluto) e 8 px entre eles.
- [ ] Ações frequentes do jogo em baixo; destrutivas e raras longe delas.
- [ ] Cada gesto tem um botão visível equivalente.
- [ ] A ação dispara ao largar; arrastar para fora cancela.
- [ ] `touch-action` e `overscroll-behavior` evitam gestos do browser no campo.

### Texto
- [ ] Texto de leitura com pelo menos 12 px CSS visíveis (ideal 14 a 16).
- [ ] Todos os acentos portugueses desenhados e legíveis, maiúsculas incluídas; nenhum acento cortado.
- [ ] As palavras mais compridas («Substituições», «Transferências», «Classificação») cabem sem cortes em 360 px.
- [ ] Numerais tabulares nas tabelas.
- [ ] Opção de tamanho de texto (Normal, Grande, Muito grande) e opção de fonte legível.
- [ ] O zoom do browser não está bloqueado nos ecrãs de lista.

### Cor e contraste
- [ ] Texto a 4,5:1, controlos, ícones e foco a 3:1 (verificado com uma ferramenta).
- [ ] Nada se percebe só pela cor: notas com letra, subidas com setas, equipas com padrão ou número.
- [ ] Capturas verificadas em simulação de deuteranopia, protanopia, tritanopia e em cinzento.
- [ ] Escalas divergentes azul–laranja, não verde–vermelho.

### Teclado, foco e leitores de ecrã
- [ ] Tudo se faz com o teclado; ordem do foco lógica; Esc fecha; as janelas modais prendem e libertam o foco.
- [ ] `:focus-visible` com contorno de ≥ 2 px CSS e 3:1, diferente do hover e do selecionado.
- [ ] O foco nunca fica tapado pelo cabeçalho fixo ou pela barra (`scroll-padding`).
- [ ] Atalhos de uma tecla podem ser desligados ou remapeados; há ajuda dos atalhos (`?`).
- [ ] Botões reais (`<button>`), `aria-pressed` nos interruptores, `aria-label` nos ícones.
- [ ] Tabelas reais com `<th scope>` e `aria-sort`.
- [ ] Relato com `role="log"`; uma região `polite` e uma `alert` existem desde o início; no máximo uma mensagem a cada 2 a 5 s.
- [ ] O canvas tem `aria-label` com o resultado, ou está escondido e há um resumo em texto.

### Movimento
- [ ] `prefers-reduced-motion` e uma opção no jogo tiram tremores, piscares e deslizes longos.
- [ ] Nada pisca mais de 3 vezes por segundo.
- [ ] Transições: 100 ms (resposta), 150 a 200 ms (pequenas), 200 a 300 ms (separadores), ≤ 400 ms (ecrãs), em passos inteiros.
- [ ] Um toque durante uma transição salta para o fim; nenhuma transição bloqueia a entrada.

### Componentes e estados
- [ ] Cada controlo tem os estados normal, hover, premido (desce 1 pixel), foco, selecionado, desativado (com explicação) e pendente.
- [ ] Um só conjunto de painéis nine-slice e de crachás usado em todo o jogo; todos os valores vêm de tokens.
- [ ] Ícones de 16×16 com contorno, mesma luz e mesmo peso; os ícones menos óbvios têm etiqueta.

### Navegação e fluxo
- [ ] «Continuar» é o primeiro botão do ecrã inicial.
- [ ] Ações frequentes a 1 a 2 toques; nenhum ecrã a mais de 3 níveis.
- [ ] «Voltar» sempre no mesmo sítio; caminho no topo dos ecrãs fundos.
- [ ] A cidade tem uma lista de atalhos além do mapa.
- [ ] Nomes de jogadores e de equipas são ligações em todas as tabelas.
- [ ] Um ecrã de «hoje» junta as decisões pendentes.

### Dados
- [ ] Números à direita, texto à esquerda, notas ao centro; cabeçalho fixo; ordenar com ▲ ▼.
- [ ] No máximo 4 a 6 colunas a 360 px; o nome fica fixo ao deslizar.
- [ ] A minha equipa e as zonas da tabela destacadas com forma e etiqueta.
- [ ] Comparação de dois jogadores lado a lado com diferenças ▲ ▼.
- [ ] Barras com passos inteiros e fundo visível; forma recente com quadrados e letras.
- [ ] Siglas explicadas num glossário.

### Integração, erros e estados vazios
- [ ] As dicas aparecem quando são precisas, têm 1 a 2 frases, podem saltar-se e rever-se.
- [ ] Todo o ecrã vazio diz o que é, porque está vazio e o que fazer.
- [ ] O impossível está desativado e explicado; só o irreversível pede confirmação, com o verbo no botão.
- [ ] Há desfazer onde o modelo de dados o permite.
- [ ] Gravação automática visível; as definições guardam-se.
- [ ] Pausa automática opcional para lesões, faltas graves e fim de período.
- [ ] As opções de acessibilidade estão listadas e explicadas dentro do jogo.
