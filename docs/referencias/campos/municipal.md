# Referências: o Pavilhão Municipal

Pesquisa de 13 de novembro de 2026 para o Pavilhão Municipal: o pavilhão de um clube de liga média, com 1 000 a 3 000 lugares. Completa a [pesquisa dos pavilhões e bancadas](../pavilhoes/README.md), que já trata das normas das bancadas, do corredor e do guarda-corpos, das cadeiras, das placas soltas, da luz por fila, dos degraus e da fila do chão (P1 a P6), e não repete nada disso. Esta página trata do que distingue um municipal de uma arena e de um ginásio de escola. Ver também [arena.md](arena.md) e [escola.md](escola.md).

**Só referência.** A regra [«Original, não cópia»](../../../AGENTS.md) continua a valer: dos pavilhões reais e dos jogos aproveitam-se ideias de leitura e de composição, nunca a arte, as cores próprias, os logótipos nem as marcas. As descrições são texto nosso. Não descarregámos imagens.

## Como está hoje

Imagem: `dist-check/campos/audit-d2.png`. Em cima está o pavilhão inteiro visto de longe, e em baixo três planos com a câmara do jogo. Os valores vêm de `src/ui/art/court.ts`, da entrada `'Pavilhão Municipal'`.

- **O problema principal é que o Municipal e a Grande Arena quase não se distinguem.** Pondo `audit-d2.png` ao lado de `audit-d3.png`, os dois têm uma bancada de quatro lados com os cantos cortados, que sobe até aos 16 m (`crowd.to: 16`, o mesmo valor da Arena), com o mesmo túnel, o mesmo betão escuro e o mesmo tipo de placas. Só mudam a madeira, um pouco mais clara, e a densidade de público (0,72 contra 0,92). Na câmara do jogo, a faixa de cima (as duas ou três primeiras filas, o muro e as placas) é igual nos dois.
- **Bancada:** tem degraus de 1,3 m por fila e `dim` 0,68, por isso fica escura. A luz de um municipal é igual em todo o lado (ver a secção 1).
- **Piso:** madeira cor de mel e área azul-petróleo. A faixa à volta toma a cor do clube, que na imagem é azul-noite, e é um plano liso.
- **Placas:** quatro cores (laranja, creme, azul e amarelo), todas do mesmo tamanho e pintadas no muro. Leem-se como uma fita contínua de arena.
- **O que falta:** algum sinal de «sala municipal», como as paredes, o teto, as janelas, as linhas de outros desportos, o placar na parede, a publicidade local, as lonas presas à grade e os lugares vazios em blocos.

## 1. O que torna um municipal reconhecível

Um ginásio de escola diz «aula de educação física». Uma arena diz «espetáculo». Um municipal diz «a sala da terra, cheia ao sábado à noite». Os sinais, do mais forte para o mais fraco na nossa câmara:

1. **É uma sala, não um anel.** Há uma bancada principal numa lateral, às vezes também na outra lateral, e raramente nos topos. Nos topos fica uma parede, com o placar e as portas. Muitas vezes a bancada assenta num primeiro andar, por cima dos balneários: no Pavilhão Luís de Carvalho, no Barreiro, o regulamento põe a bancada no 1.º andar, ao lado da galeria de filmagem. À altura do campo fica então um muro alto com portas.
2. **A luz é igual em todo o lado.** As filas de armaduras compridas (tubos fluorescentes ou LED) ficam presas à estrutura do teto, e há claraboias ou uma faixa de chapa translúcida a toda a volta. A bancada está quase tão clara como o campo, e o público vê-se bem, com cara e cor. Não há escuro de palco.
3. **Tem materiais à vista.** Betão ou bloco pintado nas paredes, chapa metálica ondulada na cobertura, treliças de aço, degraus de betão com acabamento de epóxi, e cadeiras de plástico em concha (sem costas altas) fixas no degrau ou bancos corridos.
4. **A publicidade é local e desencontrada.** Lonas e painéis de tamanhos diferentes, presos ao muro ou atados à grade com abraçadeiras: o talho, a farmácia, a construtora, a câmara municipal. O fundo de cada placa tem uma cor diferente, e há falhas entre elas.
5. **Tem placar na parede.** Um ou dois quadros eletrónicos presos à parede dos topos, a 4 m ou mais de altura, e relógios dos 24 segundos nos suportes dos cestos. Não há cubo suspenso.
6. **O piso é de vários desportos.** É madeira ou sintético (há pisos azuis ou verdes de poliuretano), com as linhas do basquetebol em branco e as de andebol, futsal ou voleibol noutras cores, mais finas e esbatidas. É o sinal mais barato e o mais claro de «pavilhão polidesportivo».
7. **A claque fica perto e faz barulho.** Há bombo e tambores, bandeiras de pau curto, uma ou duas tarjas compridas na grade da primeira fila e cachecóis. A claque é um bloco compacto, normalmente num canto ou atrás de um cesto, e o resto da bancada é público familiar com lugares vazios.
8. **Os lugares vazios são normais.** Num jogo de liga regular, os blocos das pontas ficam meio vazios. A bancada só enche nos dérbis.

Em relação às vizinhas:

| | Ginásio de escola | **Municipal** | Arena |
|---|---|---|---|
| Lugares | 0–300 | **1 000–3 000** | 5 000–20 000 |
| Bancada | 3–6 filas telescópicas numa lateral | **8–15 filas fixas numa ou duas laterais, topos com parede** | anel contínuo, 2–3 andares |
| Luz | uniforme, janelas | **uniforme, armaduras em fila, claraboias** | campo aceso, bancada no escuro |
| Teto | baixo, à vista | **à vista: treliça de aço e chapa, 9–16 m** | escuro, passadiços, cubo de vídeo |
| Placar | portátil ou na parede | **na parede dos topos** | suspenso por cima do meio campo |
| Publicidade | pouca ou nenhuma | **lonas locais desencontradas** | placas LED animadas |
| Piso | linhas de vários desportos, muito gasto | **linhas de vários desportos, esbatidas** | só basquetebol, verniz de televisão |
| Público | pais e colegas | **claque compacta e famílias, com vazios** | casa cheia, coreografias |

## 2. Elementos com medidas

Quando um número vem de um pavilhão concreto, diz-se qual. Os outros vêm das normas citadas na [pesquisa anterior](../pavilhoes/README.md) ou das fontes no fim.

### A sala

| Elemento | Medida | Fonte |
|---|---|---|
| Nave (só o chão) | 45 × 26 m, o que deixa 5,5 m de cada lateral e 8,5 m de cada topo à volta de um campo de 28 × 15 m | Pavilhão Luís de Carvalho, no Barreiro |
| Área útil de um municipal pequeno | 800 m² | Pavilhão Municipal de Alvalade, em Lisboa |
| Sala de 2 000 espectadores | 71 × 54 m, 16,4 m de altura, cobertura de treliça de aço e luz presa às vigas | Sporthalle Vilsbiburg |
| Pavilhão de 3 000 lugares | cércea de 12,5 m, cúpula com 16 m no máximo e recinto com 39,6 m de diâmetro | Póvoa Arena |
| Grelha de cobertura sobre quatro apoios | interior livre de cerca de 60 × 45 m e uma fachada envidraçada que faz uma faixa de luz | Pavilhão Multiusos de Viana do Castelo |
| Altura livre mínima por cima do campo | 7 m | Basketball England |

### A bancada

| Elemento | Medida | Nota |
|---|---|---|
| Lotação de exemplo | 2 410 cadeiras fixas, 500 numa bancada retrátil e 35 na tribuna | Póvoa Arena (3 000) |
| Lotação de exemplo | 1 342 sentados num total de 2 000 (o resto de pé) | Sporthalle Vilsbiburg |
| Lotação de exemplo | 878 lugares em quatro telescópicas nas laterais e 168 numa bancada móvel num topo, num total de mais de 2 000 | Sa Pedrera, em Ibiza |
| Lotação de exemplo | 1 400 entre cadeiras fixas, telescópicas e lugares de pé | Murrtal-Arena, em Backnang |
| Filas para 2 000 lugares | com 0,5 m por lugar e cerca de 40 m de lateral (80 lugares por fila), duas laterais de 12 filas chegam | conta nossa |
| Profundidade de cada fila | 0,8–0,95 m | fabricantes, na pesquisa anterior |
| Altura de cada degrau | 0,28–0,45 m | fabricantes, na pesquisa anterior |
| Altura total da bancada | 12 filas × 0,4 m ≈ 4,8 m, mais 0 a 3 m se assentar num 1.º andar | conta nossa |
| Material | betão com acabamento de epóxi, ou degraus de madeira | Alvalade |
| Tribuna | uma fila de cadeiras melhores a meio da lateral principal, para cerca de 35 pessoas | Póvoa Arena |

Compara-se com o nosso jogo: lá a bancada sobe até 16 m, com 1,3 m por fila. Isso é a altura de uma arena. Um municipal acaba aos 5–8 m e tem por cima uma parede e o teto.

### Paredes, teto e luz

| Elemento | Medida ou descrição | Fonte |
|---|---|---|
| Cobertura | estrutura metálica e chapa ondulada, com 11 claraboias de chapa translúcida (3 delas de desenfumagem) | Alvalade |
| Faixa de luz natural | chapa translúcida a toda a volta do pavilhão, no alto da parede | Alvalade |
| Paredes | alvenaria pintada em baixo, estrutura e chapa metálica em cima | Alvalade |
| Paredes interiores | painéis acústicos claros (de lã de madeira e cimento) | Vilsbiburg |
| Armaduras de luz | armaduras compridas de tubos fluorescentes ou LED (1,2–1,5 m) | Alvalade |
| Projetores | 59 projetores LED nas filas de armaduras que já lá estavam | Pavilhão Mário Mexia, em Coimbra (2 239 lugares) |
| Altura das luzes | cerca de 7 m (530 lux) | exemplo da Fagerhult |
| Luz no campo | 500 lux em jogos de clube, 1 000–1 400 com televisão; 750 lx para competição | Sportscotland, Basketball England, Fagerhult |
| Placar | dois painéis de informação e dois relógios | Alvalade |
| Placar | montado a 4 m ou mais | Basketball England (pesquisa anterior) |

Quanto à luz: com 500–750 lux no campo e a bancada debaixo das mesmas armaduras, a diferença entre o campo e a bancada é pequena. Na arena (1 500 lux ou mais no campo, bancada no escuro) é grande. **Para o nosso jogo, isto quer dizer que no Municipal a bancada deve escurecer pouco.**

### O campo e a beira

| Elemento | Municipal típico |
|---|---|
| Faixa à volta | 2 m, numa cor lisa ou no mesmo tom de madeira, por vezes com o nome da cidade |
| Linhas de outros desportos | andebol (área de 6 m em arco e linha de 9 m tracejada), futsal e voleibol, em cores diferentes do branco |
| Mesa de oficiais | uma mesa simples com um saiote de lona com publicidade e cadeiras de plástico, ao nível do chão e sem estrado |
| Bancos | cadeiras de plástico em fila ou um banco corrido, sem abrigo |
| Cestos | suporte móvel com contrapeso, almofada de proteção e relógio dos 24 s em cima da tabela |
| Imprensa | galeria de filmagem no 1.º andar ou uma câmara num tripé no alto da bancada, e uma sala de imprensa ao pé dos balneários (Barreiro, Sa Pedrera) |
| Entradas | portas corta-fogo metálicas com óculo e escadas metálicas (Alvalade); os jogadores entram por uma porta de balneário, não por um túnel |

### O ambiente

- Na liga portuguesa, os jogos de basquetebol com mais ambiente nas crónicas são os de Oliveira de Azeméis, Ovar, Queluz e Esgueira, sempre em pavilhões de cidade média.
- A Oliveirense joga num pavilhão de 1986 com cerca de 4 000 lugares, e a Ovarense na Arena de Ovar (3 000).
- Sons: bombo, cânticos, apito, o chiar das sapatilhas e o eco. A sala tem paredes duras, por isso ouve-se mais eco do que numa arena.
- Fumos e pirotecnia são raros e proibidos em recinto fechado. As bandeiras, as tarjas e os papelinhos são o que se vê.

## 3. O que se vê da nossa câmara

A câmara do jogo é alta e lateral e olha para a bancada lateral do fundo. Nos três planos de baixo de `audit-d2.png` vê-se:

- **Sempre (é o que mais conta):**
  - o piso, que ocupa 70–80 % do ecrã;
  - a faixa à volta;
  - o muro e as placas do fundo, numa linha a toda a largura;
  - as duas ou três primeiras filas da bancada do fundo, numa faixa de 5–8 % no topo do ecrã;
  - a mesa e os bancos, quando estão no fundo.
- **Nos planos de canto:**
  - a parede do topo, ou a bancada dele, de lado;
  - o suporte do cesto;
  - o canto onde a lateral encontra o topo, que é onde poderia estar a claque.
- **Só de longe** (intervalo, apresentação, `npm run campos`): a altura da bancada, o teto, as paredes por cima e o lado da câmara.

Daqui saem três conclusões:

1. O que mais distingue o Municipal na câmara do jogo está **no piso** (as linhas de outros desportos e a cor) e **na faixa de cima** (a publicidade desencontrada, a grade com as tarjas, a bancada clara com vazios). A altura da bancada e o teto quase não se veem.
2. Nos planos de canto, o topo de **parede com placar** em vez de bancada diz logo «municipal».
3. A diferença de luz (bancada clara contra bancada no escuro) vê-se na faixa de cima e é uma mudança de números.

## 4. O que outros jogos fazem

Os jogos que já estão estudados na [pesquisa anterior](../pavilhoes/README.md) e em [cenarios/jogos-basquete-pixel/](../cenarios/jogos-basquete-pixel/README.md) não se repetem aqui. Ficam só as ideias que servem a um pavilhão médio. As descrições são nossas e os pormenores visuais são de memória (a confirmar com vídeos).

- **Calciobit A:** a escala do estádio diz-se pelo muro, pela altura da bancada e pelos lugares vazios. Na captura local [06-medio-escadas-lugares-vazios.jpg](../cenarios/calciobit/06-medio-escadas-lugares-vazios.jpg), o estádio médio tem escadas à vista e cadeiras vazias, sem anel de cobertura. O médio não é um grande com menos gente: tem outra forma.
- **Pro Basketball Manager (série):** o pavilhão em 3D é feito à medida das instalações do clube. A loja da edição de 2024 diz que se começa numa sala pequena e se melhora até uma média. O tamanho do pavilhão é um sinal de progresso, e cada degrau tem um aspeto próprio, não só mais lugares.
- **Basketball Club Story (Kairosoft):** a bancada cresce aos blocos à medida que o clube cresce, e os lugares vazios estão à vista de propósito.
- **Hoop Land:** a casa diz-se pelo piso, com a cor do clube na faixa à volta e o nome na lateral. Funciona mesmo com a bancada pequena.
- **HD-2D (Octopath Traveler e outros):**
  - a profundidade e o ar de maqueta vêm de luzes pontuais que fazem sombra, de tilt-shift e de profundidade de campo, não de pormenor;
  - nos interiores, as vigas e o teto ficam na penumbra e as janelas e os candeeiros em pontos de luz;
  - para nós, isto quer dizer que as treliças e as filas de armaduras do teto bastam como silhuetas com pontos claros.
- **Simuladores de gestão com motor 3D low-poly:** nos estádios pequenos usam bancadas de um só lado ou de dois e mostram as paredes e o teto da sala, e nos grandes usam o anel no escuro. A forma da sala muda conforme a categoria.

### Truques que servem ao Municipal

1. **Para mudar de categoria, muda-se a forma da sala, não o número de filas.** Uma ou duas bancadas mais paredes dizem «média», e o anel diz «grande».
2. **Publicidade desencontrada:** placas de larguras e fundos diferentes, com uma falha aqui e ali. A pouca resolução lê-se como «patrocinadores locais».
3. **Bancada clara, com cara:** quando o público tem pouco escuro por cima, vê-se gente. A arena é a que se perde no escuro.
4. **Linhas fantasma no piso:** uma segunda grelha de linhas noutra cor e com pouco contraste diz «polidesportivo» sem roubar a leitura do jogo.
5. **Uma coisa na parede** (o placar, o relógio, o emblema da câmara municipal) diz que aquilo é uma sala.

## 5. Melhorias para o nosso Municipal

A ordem é a do que mais se nota na câmara do jogo, a dividir pelo risco. Valem as regras da pesquisa anterior:

- as contas mudam em `Camera.drawScene` e em `src/ui/gpu/venue-shader.ts` ao mesmo tempo, e corre-se `npm run gpu-check`;
- quem usa `sideFanSpot`, `endFanSpot`, `seats` e `chairPhase` mexe-se com a geometria;
- primeiro mostra-se uma imagem de pré-visualização ao dono, e depois o trabalho passa pela revisão do skill visual-design.

### M1. Uma sala, não um anel: bancada mais baixa e topos com parede (ganho alto, risco médio)

- **O quê:**
  - bancada só nas duas laterais (ou só na do fundo e numa mais pequena do nosso lado);
  - 10 a 12 filas, a acabar aos 6–8 m (`crowd.to` à volta de 7–8 em vez de 16);
  - nos topos (x = −4 e x = 32), uma parede lisa de bloco pintado, sem bancada, ou no máximo 3 a 4 filas de uma bancada móvel;
  - por cima da bancada lateral, a parede continua até ao teto.
- **Porquê:** é a diferença de forma que separa o Municipal da Arena, e é ela que se vê nos planos de canto.
- **Atenção:** `chamfer` deixa de fazer sentido no Municipal. As bandeiras e a claque que usam `endFanSpot` passam para a lateral ou para o canto. Decidir com o dono se o Municipal tem uma ou duas laterais com bancada.

### M2. Luz de sala: bancada clara (ganho alto, risco baixo)

- **O quê:**
  - subir `dim` de 0,68 para 0,85–0,95 e baixar `spot` (a luz concentrada no campo);
  - deixar a bancada escurecer pouco com a altura (a P4 da pesquisa anterior propõe ir de 0,95 a 0,7 no Municipal, e isto confirma que a descida é pequena);
  - degraus de betão cinzento claro ou bege em vez do castanho e azul escuros.
- **Porquê:** na faixa de cima da câmara do jogo, é o que mais separa o Municipal da Arena (bancada no escuro) e do Escolar (paredes claras).
- **Atenção:** só se mexe em números do tema, por isso o risco é baixo.

### M3. Publicidade local desencontrada (ganho alto, risco baixo a médio)

- **O quê:**
  - placas de larguras variadas (por exemplo 3, 4,5 e 6 m), cada uma com o seu fundo (creme, amarelo, verde, vermelho ou branco) e uma falha de muro nu de 0,3–1 m entre algumas;
  - nomes inventados de comércio da terra (talho, farmácia, padaria, construtora, «Câmara Municipal»);
  - uma ou duas lonas um pouco mais altas, atadas à grade da primeira fila em vez de pintadas no muro.
- **Porquê:** a linha das placas está sempre no ecrã. Uma fita regular diz «arena», e uma fita desencontrada diz «municipal».
- **Atenção:** os nomes e as marcas são todos inventados e originais.

### M4. Linhas de outros desportos no piso (ganho alto, risco baixo)

- **O quê:**
  - as linhas de andebol (o arco dos 6 m e o arco tracejado dos 9 m, à volta de cada cesto, até às linhas laterais) e um retângulo de voleibol, a 1 píxel, em cores esbatidas (amarelo-torrado, verde ou azul), com 30–40 % do contraste das linhas de basquetebol;
  - opcional: uma variante de piso sintético (azul ou verde) para alguns clubes.
- **Porquê:** o piso ocupa a maior parte do ecrã, e estas linhas são o sinal de «pavilhão polidesportivo» que nenhuma arena tem.
- **Atenção:**
  - a escola também tem linhas de outros desportos (ver [escola.md](escola.md)), por isso no Municipal ficam mais esbatidas e em menos cores;
  - as linhas de basquetebol têm de continuar a ser as mais fortes.

### M5. Placar na parede dos topos (ganho médio, risco baixo)

- **O quê:**
  - um quadro retangular de 3 × 1,5 m na parede de cada topo, a 5–6 m de altura, com os números do resultado (já existem no estado do jogo);
  - um relógio dos 24 s em cima de cada tabela.
- **Porquê:** aparece nos planos de canto e diz «sala» de imediato. A arena tem o cubo suspenso (ver [arena.md](arena.md), A5), e assim cada pavilhão tem o seu placar.
- **Atenção:** depende de M1, porque precisa de parede nos topos.

### M6. Claque compacta e lugares vazios em blocos (ganho médio, risco baixo)

- **O quê:**
  - a densidade de público por blocos: o meio da lateral cheio (0,8–0,9) e as pontas a 0,3–0,5;
  - a claque num bloco de 3 a 4 filas no canto do fundo, com bombo, bandeiras de pau curto e uma tarja na grade;
  - nos dérbis ou nos jogos grandes, as pontas enchem.
- **Porquê:** a câmara vê as primeiras filas no fundo, e os vazios dão escala. Na Arena a bancada está cheia.
- **Atenção:** mexe nas bandeiras e na claque que já existem, por isso convém confirmar que os balões e as bandeiras caem no bloco certo.

### M7. Muro alto com portas: bancada no 1.º andar (ganho médio, risco médio)

- **O quê:**
  - na lateral do fundo, a primeira fila assenta num muro de 2,5–3 m (os balneários por baixo), com uma ou duas portas metálicas de balneário com óculo;
  - os jogadores entram por uma dessas portas, sem túnel;
  - a publicidade fica no muro, por baixo da grade.
- **Porquê:** é uma forma muito comum nos municipais portugueses (o Barreiro tem a bancada no 1.º andar) e substitui o túnel, que fica para a Arena.
- **Atenção:** mexe em `fanHeight` e no corredor P1, e faz subir a primeira fila no ecrã. Precisa de imagem de pré-visualização para confirmar que o público continua à vista.

### M8. Mesa e bancos simples (ganho baixo a médio, risco baixo)

- **O quê:**
  - a mesa ao nível do chão, sem estrado, com um saiote de lona de uma só cor e um nome local;
  - os bancos como cadeiras de plástico soltas, numa cor neutra.
- **Porquê:** a mesa está no centro da faixa de cima em muitos planos, e a da Arena deve ser a mais vistosa.

### M9. Teto e paredes por cima (só de longe e no intervalo)

- **O quê:**
  - parede de bloco pintado ou de chapa por cima da bancada, com uma faixa translúcida clara a toda a volta a cerca de 8–10 m;
  - teto de chapa com 3 a 4 treliças de aço à vista, atravessadas na sala;
  - filas de armaduras compridas e claras presas às treliças, a cerca de 9–12 m;
  - algumas claraboias.
- **Porquê:**
  - tira o «vazio azul-noite» dos planos largos e fecha a sala;
  - pelo estilo HD-2D, chegam silhuetas e pontos de luz, sem pormenor.
- **Atenção:** não se vê na câmara do jogo, por isso fica depois de M1–M6.

### M10. Pormenores (se sobrar tempo)

- Uma tribuna de 1 fila com cadeiras de outra cor a meio da lateral principal.
- Um tripé de câmara com um operador no alto da bancada, que é a galeria de filmagem.
- Portas corta-fogo verdes com o sinal de saída por cima nos topos.
- Um emblema da câmara municipal (inventado) na parede de um topo.
- No som, mais eco na sala e bombo na claque (segue o skill sound-design).

## Fontes

### Pavilhões portugueses

- [Lista de pavilhões em Portugal (Wikipédia)](https://en.wikipedia.org/wiki/List_of_indoor_arenas_in_Portugal): lotação, cidade, clube e ano dos pavilhões de 1 000 a 3 000 lugares (Ovar, Póvoa, Guimarães, Coimbra, Viseu, Portimão).
- [Regulamento do Pavilhão Municipal Luís de Carvalho, no Barreiro](https://www.cm-barreiro.pt/wp-content/uploads/2023/08/Regulamento_Municipal_Pavilh_o_Municipal.pdf): nave de 45 × 26 m e bancada, galeria de filmagem e som no 1.º andar.
- [Levantamento do Pavilhão Municipal de Alvalade](https://documentos.jf-alvalade.pt/jfalvalade-docs/uploads/document/file/11579/13_pav_mun_alvalade.pdf): cobertura de chapa com 11 claraboias, faixa translúcida em todo o perímetro, bancadas de betão em epóxi, armaduras T5 e LED, dois painéis e dois relógios.
- [Ficha técnica da Póvoa Arena](https://www.cm-pvarzim.pt/content/uploads/2019/11/04-ARENA-FICHA-TECNICA.pdf): 3 000 lugares (2 410 fixos, 500 retráteis e tribuna de 35), cércea de 12,5 m e cúpula de 16 m.
- [Pavilhão Desportivo Municipal da Póvoa de Varzim](https://en.wikipedia.org/wiki/Pavilh%C3%A3o_Desportivo_Municipal_da_P%C3%B3voa_de_Varzim): municipal de 2 500 lugares de 1998, usado pelas seleções de voleibol e andebol.
- [Apresentação do Pavilhão Mário Mexia, em Coimbra](https://www.coimbra.pt/wp-content/uploads/2025/02/Apresentacao_PMMM.pdf): troca da luz fluorescente por 59 projetores LED nas filas de armaduras que já existiam.
- [Pavilhão Multiusos de Viana do Castelo (Arquitectura Viva)](https://arquitecturaviva.com/works/pabellon-multiusos-en-viana-do-castelo-2): grelha de cobertura de aço sobre quatro apoios, interior de cerca de 60 × 45 m e uma faixa envidraçada.
- [U.D. Oliveirense (Wikipédia)](https://www.wikipedia.org/wiki/Oliveirense_Basquetebol): o clube joga num pavilhão de 1986 com cerca de 4 000 lugares.
- [Crónica do Record sobre a atmosfera nos pavilhões](https://www.record.pt/opiniao/cronistas/daniel-sa/amp/a-atmosfera-criada-pelos-adeptos-nos-pavilhoes): nomeia Oliveirense, Ovarense, Queluz e Esgueira como casas de basquetebol com ambiente forte.

### Pavilhões europeus de liga média

- [Sporthalle Vilsbiburg (Heinze)](https://www.heinze.de/architekturobjekt/sporthalle-vilsbiburg/12525814/): 2 000 espectadores (1 342 sentados), 71 × 54 × 16,4 m, treliça de aço com luz nas vigas e painéis acústicos brancos.
- [Murrtal-Arena, em Backnang (Heinze)](https://www.heinze.de/architekturobjekt/murrtal-arena-backnang/13246558/): 1 400 lugares entre fixos, telescópicos e de pé, madeira na bancada, piso azul e luz na cor do clube nos jogos em casa.
- [Pabellón de Sa Pedrera, em Ibiza (La Voz de Ibiza)](https://lavozdeibiza.com/current-news/sant-antoni-expands-the-capacity-of-sa-pedrera-more-than-2000-seats-and-state-of-the-art-improvements/): passa a mais de 2 000 lugares com telescópicas nas laterais e uma bancada móvel num topo, placares de vídeo, sala de imprensa e espaço para câmaras.
- [Pabellón de Mendizorroza, em Vitória (Gasteiz Hoy)](https://www.gasteizhoy.com/pabellon-mendizorroza-historia-50-anos/): pavilhão municipal de 1969 que ganhou 200 lugares junto ao campo, placares novos e uma zona de imprensa melhor.
- [Pabellón Pisuerga, em Valladolid (taquilla.com)](https://www.taquilla.com/valladolid/pabellon-polideportivo-pisuerga-valladolid): municipal grande com 3 800 lugares fixos e 3 000 telescópicos, para comparar com o tamanho acima do nosso.
- [HUK-COBURG Arena (Baviera, PPP)](https://www.bauministerium.bayern.de/assets/stmi/buw/bauthemen/iia4_ppp_infotour2015_projekt_sporthalle_lauterer_hoehe2.pdf): pavilhão triplo com cerca de 3 500 lugares na bancada, para basquetebol e outras ligas.

### Luz e normas

- [Sportscotland, luz natural em pavilhões](https://sportscotland.org.uk/media/frliup3a/understandingdaylightsc.pdf): 300/400/500/1 000 lux para lazer, treino, clube e televisão, e cuidado com os padrões de sol na estrutura do teto.
- [Fagerhult, pavilhões polidesportivos](https://www.fagerhult.com/knowledge/light-guides/sports-facilities/multi-purpose-halls/): 750 lx em competição e um exemplo de 530 lux com luminárias a 7 m.
- [Basketball England, normas da liga nacional](https://www.basketballengland.co.uk/media/13797/nbl-facility-standards.pdf): altura livre mínima de 7 m, 500 lux (1 400 com televisão) e placar eletrónico obrigatório.

### Jogos

- [Pro Basketball Manager 2024 (Steam)](https://store.steampowered.com/app/2328780): pavilhão em 3D que começa pequeno e cresce para médio com as receitas.
- [Pro Basketball Manager 2023 (Steam)](https://store.steampowered.com/app/1875310/): pavilhões em 3D personalizáveis, ligados às melhorias do clube.
- [HD-2D (Wikipédia)](https://en.wikipedia.org/wiki/HD-2D): bonecos em pixel art sobre cenário 3D, com luz pontual, tilt-shift, profundidade de campo e bloom.
- [Entrevista da Unreal Engine sobre o Octopath Traveler II](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style): como a equipa usa a luz e a câmara no estilo HD-2D.
- Calciobit A, Hoop Land e Basketball Club Story: ver [cenarios/](../cenarios/) e a [pesquisa anterior](../pavilhoes/README.md).
