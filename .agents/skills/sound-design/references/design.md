# O ofício do desenho de som gerado por código

Pesquisa para o Pocket Basketball: um jogo de gestão de basquetebol em pixel art, no browser, em que todos os efeitos e toda a música são sintetizados em TypeScript para `AudioBuffer`s (hoje em `src/ui/synth.ts`, `src/ui/music.ts` e `src/ui/audio.ts`, a 32 kHz).

Este documento trata do **desenho**: o que fazer soar, porquê e como avaliar. As técnicas de DSP de baixo nível (modos, filtros, FM, formantes, granular, matemática da reverberação) e as bibliotecas ficam para a outra pesquisa e não se repetem aqui.

> **Nota sobre as fontes.** A pesquisa foi feita com muitas buscas na web. O WebFetch não conseguiu abrir os sites principais (audiokinetic.com, designingsound.org, gamedeveloper.com, shmuplations.com) por limites de rede, por isso as citações vêm dos resumos das buscas. Onde uma afirmação assenta numa fonte fraca (fórum, blogue de vendedor, wiki de fãs), isso está dito. Os números práticos (durações, dB, semitons) são **regras de bolso** para afinar, não normas.

---

## Índice

1. [Fundamentos do desenho de som](#1-fundamentos-do-desenho-de-som)
2. [Desenhar a partir de uma referência sem a amostrar](#2-desenhar-a-partir-de-uma-referência-sem-a-amostrar)
3. [Quem fez grande som por código, e o que cada um ensina](#3-quem-fez-grande-som-por-código-e-o-que-cada-um-ensina)
4. [Música procedural e adaptativa para um jogo de desporto](#4-música-procedural-e-adaptativa-para-um-jogo-de-desporto)
5. [Som de interface e menus](#5-som-de-interface-e-menus)
6. [Sons de recompensa e «sumo»](#6-sons-de-recompensa-e-sumo)
7. [Erros comuns do som sintetizado, e como corrigi-los](#7-erros-comuns-do-som-sintetizado-e-como-corrigi-los)
8. [Verificar a qualidade sem ouvir](#8-verificar-a-qualidade-sem-ouvir)
9. [Receitas e lista de verificação para o Pocket Basketball](#9-receitas-e-lista-de-verificação-para-o-pocket-basketball)
10. [Fontes](#10-fontes)

---

## 1. Fundamentos do desenho de som

### 1.1 Camadas: ataque, corpo, cauda (e «adoçante» e sub)

Um som de jogo convincente quase nunca é uma só fonte. É uma pilha de camadas, cada uma com um trabalho:

| Camada | Trabalho | Banda típica | Duração típica |
|---|---|---|---|
| **Transiente / ataque** | Dizer *quando* aconteceu. Dá definição. | Agudos e médios-altos (2–8 kHz), ruído curto ou clique | 1–15 ms |
| **Corpo** | Dizer *o que* é: o material e o carácter. | Médios (200 Hz–2 kHz), tonal ou modal | 30–250 ms |
| **Sub / peso** | Dizer *quão grande* é. | Graves (40–150 Hz) | 50–300 ms |
| **Detalhe / adoçante** | Textura, mecânica, um brilho que dá personalidade. | Qualquer, mas estreito | Variável |
| **Cauda** | Dizer *onde* aconteceu: o espaço. | Larga, a perder agudos com o tempo | 100 ms–2 s |

As fontes de prática de áudio de jogos convergem nesta divisão: um impacto forte junta «um transiente agudo para a definição, um corpo médio para o carácter e um estrondo grave para o peso»; um impacto de herói usa «três ou quatro camadas: sub, corpo, detalhe e cauda» ([Violet Recording, impactos](https://violetrecording.com/how-to-make-impact-sounds/); [Violet Recording, armas](https://violetrecording.com/how-to-design-weapon-sounds/); [IRPR, glossário](https://sounddesign.irpr.agency/glossary/layering/)). Quando um som «parece fraco», quase sempre falta uma camada ou duas lutam pela mesma banda ([Violet Recording](https://violetrecording.com/how-to-design-weapon-sounds/)).

**Regras práticas:**

- **Cada camada no seu espaço de frequências.** Se o corpo e o sub ocupam os mesmos 100–200 Hz, somam lama, não peso. Corta o grave do corpo com um passa-alto suave, ou baixa o sub para baixo dos 100 Hz.
- **Alinhar os inícios.** As camadas têm de começar na mesma amostra para se fundirem num só acontecimento. Pequenos desvios entre o transiente e o corpo (2–10 ms) mudam a sensação de tamanho e de soco: o corpo um pouco atrasado parece maior e mais pesado ([Violet Recording](https://violetrecording.com/how-to-make-impact-sounds/)).
- **Núcleo seco, espaço à parte.** Nos jogos, o núcleo do som deve ser seco e o espaço deve vir do motor (aqui, a convolução com `roomImpulse`). Uma cauda longa colada a um som que toca dezenas de vezes por jogo cansa depressa ([Violet Recording](https://violetrecording.com/how-to-make-impact-sounds/)).
- **Camadas com envelopes diferentes.** O transiente morre em milissegundos, o corpo em décimas, a cauda em segundos. Um único envelope para tudo é a marca do som barato (ver a [secção 7](#7-erros-comuns-do-som-sintetizado-e-como-corrigi-los)).

**Exemplo, um afundanço:** transiente (ruído passa-banda a 3 kHz, 4 ms, a mão no aro) + corpo (modos do aro de aço, inarmónicos, 60 ms) + sub (seno a 70 Hz que desce para 50 Hz em 150 ms, o aro e a tabela a vibrar no suporte) + detalhe (o «tlim» metálico da mola do aro, um modo agudo pouco amortecido, a 6 dB abaixo) + cauda (o pavilhão). Cada camada sozinha é pobre; juntas, «leem» como afundanço.

### 1.2 A anatomia de um impacto

Um impacto tem uma sequência temporal que o ouvido conhece da física:

1. **Pré-impacto (opcional, 0–100 ms antes):** o sopro do movimento, um *whoosh*. Anuncia o golpe e torna-o maior. No basquetebol: o ar da bola num passe picado rápido, a rede a balançar antes do apito.
2. **Contacto (0–5 ms):** o clique ou estalo. É a parte mais curta e a mais importante para a leitura. Sem ela, «o golpe soa abafado» ([Violet Recording](https://violetrecording.com/how-to-design-weapon-sounds/)).
3. **Ressonância do material (5–300 ms):** os modos dos objetos. Madeira: poucos modos, graves, amortecidos depressa. Metal: muitos modos, inarmónicos, longos. Vidro/acrílico da tabela: um brilho agudo curto. Borracha da bola: um «ping» tonal do ar dentro da bola.
4. **Reação secundária (20–150 ms depois):** a segunda pancada (a bola a saltar no aro), o ricochete, o chocalhar. Dá credibilidade, porque o mundo real raramente faz só um som.
5. **Cauda do espaço:** as reflexões da sala.

O código atual de `rim()` já segue esta anatomia (contacto + modos inarmónicos + baque do suporte + segundo toque mais fraco 40–70 ms depois), e é um bom modelo para os outros impactos.

**Regra do tamanho:** objetos maiores têm modos mais graves, transientes menos agudos e decaimentos mais longos. Para tornar um impacto «maior» sem mudar o material, baixa todos os modos na mesma razão (por exemplo 0,8×), alonga o decaimento 1,2× e acrescenta sub. Para o tornar «mais duro», encurta o transiente e sobe a sua frequência.

### 1.3 Fazer um som «ler» de imediato, em tamanho pequeno e duração curta

O jogo corre num telemóvel, muitas vezes no altifalante do próprio telemóvel, com o jogador meio distraído. Um som tem de se perceber em menos de 100 ms e sem graves.

- **Silhueta temporal clara.** O que distingue sons curtos é sobretudo o envelope e o contorno de altura, não o timbre fino. Um «tic» seco, um «tuuum» que desce, um «plim» que sobe: dá para os distinguir mesmo sem os ouvir bem. Desenha cada som principal com uma forma de envelope diferente.
- **O transiente faz a leitura.** O ouvido decide «o que foi» nos primeiros 10–30 ms. Investe aí.
- **Graves em altifalantes pequenos.** Altifalantes de telemóvel reproduzem mal abaixo de algumas centenas de hertz (regra geral de engenharia de áudio, não verificada aqui com uma fonte). Se o peso de um som depende só de um seno a 60 Hz, ele desaparece no telemóvel. Solução: dar ao grave **harmónicos** (uma ligeira saturação, ou somar o 2.º e o 3.º harmónicos) para o ouvido reconstruir a fundamental que falta (o efeito da «fundamental ausente»).
- **Reservar faixas de frequência por papel.** Bola e corpo no chão: 80–700 Hz. Aro: 250–3000 Hz, inarmónico. Rede: ruído 3–7 kHz. Apito: tonal 2–4 kHz. Multidão: banda larga, mas com o médio (500 Hz–2 kHz) baixo quando há jogo. Interface: tonal, 600 Hz–3 kHz, sempre com o mesmo timbre. Se dois sons importantes vivem na mesma faixa e podem soar juntos, um vai esconder o outro.
- **Contorno de altura como significado.** Sobe: bom, para a frente, ganho. Desce: mau, para trás, perda (ver [1.6](#16-convenções-de-altura-e-timbre)).
- **Menos é mais legível.** Um som com três camadas bem separadas lê melhor que um com oito.

### 1.4 Exagero contra realismo

O som de cinema não é gravado, é *construído*, e é exagerado de propósito. Os artistas de *foley* fazem socos batendo em carne crua, em listas telefónicas ou num «saco de pancada» acolchoado; os ossos partidos são aipo torcido (Gary Hecker embrulha o aipo num pano húmido para o som de ossos e sangue); a neve é amido de milho num saco apertado; e os passos, um dos trabalhos mais difíceis, gravam-se em «fossos» com vários pisos ([Mental Floss](https://www.mentalfloss.com/article/91335/how-foley-artists-use-food-make-sound-effects); [NPR, How Hollywood Makes Noise](https://www.npr.org/2007/02/20/7400850/how-hollywood-makes-noise); [Straight Dope](https://www.straightdope.com/21342204/how-do-they-make-punch-sounds-in-movies)). Um soco real quase não faz som; o do cinema é um estrondo. A afirmação de que os realizadores «querem um som exagerado e chocante» vem de um comentário de fórum ([San Diego Reader](https://Www.sandiegoreader.com/news/2002/feb/07/how-do-they-make-sound-punch-movies/)), mas a prática dos materiais está bem documentada.

O exemplo mais famoso nos jogos é o salto do Mario. Koji Kondo contou numa entrevista de 2001 que o diretor lhe pediu um som para o salto e ele respondeu: «…mas os pés não fazem nenhum som especial quando saltas!» ([Nintendo Life, entrevista de 2001](https://www.nintendolife.com/news/2016/11/composer_koji_kondo_talks_super_mario_and_zelda_in_freshly_translated_2001_interview)). O som do salto não é realista: é a *sensação* do salto. Miyamoto pedia muitas vezes «efeitos que se sentem» ([Musical Sound Effects in the Super Mario Series](https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94); [Iwata Asks, Super Mario Galaxy](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/3)).

**Regra para este jogo:** realismo onde o jogador conhece o som de cor (a bola no chão, a rede, o apito, o ténis a chiar) e estilização onde o jogo comunica *estado* (cartas, combos, fim de período, recompensas). E mesmo no realista, exagerar 20–50%:

- A rede num cesto limpo deve soar mais brilhante e mais longa que na realidade, porque é a recompensa principal do jogo.
- O aro num falhanço deve ser mais metálico e mais «ai» que o real, porque é o castigo.
- O chão deve ser mais tonal (o «ping» do ar da bola) que o real, para se ouvir debaixo da multidão.
- Um desarme de lançamento (*block*) não tem som real próprio; inventa-se: uma palmada (ruído médio, curto) + um baque grave da bola desviada.

### 1.5 Dar carácter e emoção a um som

Um som com carácter tem uma «intenção» que se pode descrever com um adjetivo: atrevido, cansado, triunfante, nervoso. Formas de a pôr no som:

- **Contorno de altura com gesto.** Um «uiii» que sobe e cai no fim soa a surpresa; um que só sobe soa a pergunta ou subida; um que desce devagar soa a desilusão. Os gestos vocais humanos são o modelo: o ouvido lê-os como emoção mesmo em sons não vocais.
- **Tempo e ritmo dentro do som.** Notas rápidas = energia, alegria; lentas = peso, solenidade. Um som de recompensa com um pequeno «balanço» (a 2.ª nota ligeiramente atrasada) parece mais humano que um alinhado ao milissegundo.
- **Imperfeição deliberada.** Uma ligeira desafinação, um *vibrato* que só começa a meio, um ataque que «hesita». Estes defeitos lêem-se como personalidade.
- **Timbre como personagem.** Tons quadrados finos (pulso estreito) soam nasais e cómicos; triângulos soam doces e infantis; senos soam limpos e frios; ruído soa físico. Se cada «personagem sonora» do jogo tiver sempre o mesmo timbre (por exemplo, o treinador = metais, o clube = sino de glockenspiel, o adversário = algo mais escuro), o jogador aprende a associação.
- **A reação do Wii Fit.** A equipa do Wii Fit queria que o som de falha indicasse «logo que o jogador não se saiu bem, mas sem o desanimar», e notou que «o som não funciona se for demasiado expressivo ou chamativo» ([Iwata Asks, Wii Fit](https://iwataasks.nintendo.com/interviews/wii/wii_fit/3/1)). Para um jogo de gestão, em que se perde muitas vezes, esta é a regra certa para os sons negativos: claros, mas gentis.

### 1.6 Convenções de altura e timbre

Estas convenções são aprendidas por quem joga e convém respeitá-las, exceto quando se quer surpreender:

| Significado | Convenção | Exemplo |
|---|---|---|
| Positivo, ganho, para a frente | Altura a **subir**; intervalos consonantes (quarta, quinta, oitava); acorde maior | A moeda do Mario: duas notas a subir, de Si para Mi (B5→E6, segundo algumas análises; a oitava exata é disputada) ([Medium, Game Audio Lookout](https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94); [The Mary Sue](https://themarysue.com/super-mario-coin-sound-sheet-music/?amp=1)) |
| Movimento para cima | Notas ascendentes | No Super Mario Bros., os efeitos usam notas ascendentes para mostrar subida ([Medium](https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94)) |
| Negativo, perda, para trás | Altura a **descer**; intervalos dissonantes (trítono, segunda menor); acorde menor | Erro na interface: curto, descendente, médio-grave (200–500 Hz), nunca áspero ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)) |
| Sim / confirmar | Duas notas a subir | — |
| Não / cancelar / voltar | Duas notas a descer, ou a mesma nota repetida mais grave | — |
| Alerta, tempo a acabar | Repetição rápida, intervalo de segunda ou trítono, timbre áspero | A buzina dos 24 segundos |
| Raro, mágico, especial | Agudos brilhantes, sinos, cintilação (muitas notas rápidas), reverberação longa | Carta rara |
| Peso, importância | Graves, timbales, metais, tempo lento | Hino, entrada em campo |

**Maior contra menor.** O maior soa a vitória, o menor a derrota ou tensão. Mas para um jogo de gestão em que a derrota é frequente, um jingle de derrota em menor puro pode pesar. Alternativas: **modo mixolídio** ou **dórico** (melancólico mas com ânimo, «para a próxima»), ou um maior que **termina numa nota suspensa** (não resolve: a época continua). Para a vitória, o maior com a **resolução na tónica** e um acorde final longo.

**Cuidado com a regra.** Subir não é sempre bom: um «uiii» que sobe muito rápido e muito alto pode soar a alarme. A regra é sobre a direção *e* o intervalo: subidas consonantes e moderadas (quarta, quinta, oitava) são positivas; sirenes contínuas são alarme.

### 1.7 Famílias e paletas: um jogo que soa a um só jogo

Um jogo coerente tem uma **paleta sonora**, tal como tem uma paleta de cores. O exemplo da Nintendo no Wii Play: os sons foram feitos por equipas diferentes, mas o diretor de som da Nintendo «deu-lhes a todos uma qualidade uniforme» ([Iwata Asks, Wii Play Motion](https://iwataasks.nintendo.com/interviews/wii/wiiplaymotion/0/3)).

**Como construir uma paleta, na prática:**

1. **Escolher um tom central e uma escala para todo o jogo** (por exemplo, Si bemol maior, que é o tom do hino atual em `music.ts`). Todos os sons tonais (interface, cartas, recompensas, buzinas se possível) usam notas desta escala. Assim, um som de interface que toca por cima da música nunca desafina.
2. **Um número pequeno de timbres-base.** Por exemplo: (a) metais para cerimónia, (b) glockenspiel para recompensa e interface, (c) pulso/quadrado suave para os sinais do jogo, (d) ruído filtrado para o físico. Cada som novo deve ser feito a partir de um destes, não de um timbre novo.
3. **Uma família por função.** Confirmar, cancelar, mudar de separador, abrir carta, carta rara: todos derivados de um mesmo som «mãe», mudando a altura, o comprimento e o filtro. «Faz um som de confirmar de que gostes, e cria os outros mudando a altura, encurtando e filtrando. Uma família de alturas é coerente por natureza» ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)).
4. **Um espaço comum.** Todos os sons do jogo passam pela mesma sala (a do pavilhão atual), com níveis de envio diferentes. A interface pode ficar fora da sala, mas sempre igual.
5. **Uma «curva de brilho» comum.** Decidir quão brilhante é o jogo (por exemplo, nada acima dos 10 kHz que não seja ruído de rede) e aplicar a todos.
6. **Volumes por categoria.** Definir um nível de sonoridade alvo por categoria (interface, jogo, multidão, música) e normalizar cada som para o alvo da sua categoria, não para o pico (ver [8](#8-verificar-a-qualidade-sem-ouvir)).

### 1.8 Silêncio e contraste

- **O silêncio dá valor ao som.** Um cesto decisivo ouve-se mais se a multidão baixar um instante antes (a «inspiração» do pavilhão). O código atual já faz `duckMusic()` no cesto e no apito, que é a mesma ideia.
- **Contraste de densidade.** Se tudo está sempre a tocar, nada se destaca. Dar ao jogo momentos mais vazios (o lançamento livre, um desconto de tempo) para que os cheios valham.
- **Contraste de dinâmica.** O som mais forte do jogo deve ser raro (o fim de jogo, o cesto no último segundo). Se o som de cada cesto normal estiver perto do máximo, não sobra margem para o especial.
- **Kondo e o lugar do som.** Para Kondo, «o som nunca deve atrapalhar o jogo» ([Iwata Asks, Super Mario Galaxy](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/0)). No Galaxy disse que o som do jogo é «a combinação dos efeitos e da música», e não a música sozinha ([Iwata Asks](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/3)).
- **Ritmo de jogo, ritmo de som.** Um jogo de gestão alterna jogo ao vivo (denso) e menus (calmos). A música do menu deve ser menos ativa que a do jogo, e os sons de interface mais discretos durante o jogo.

### 1.9 O fluxo de trabalho iterativo

O ciclo de um designer de som é:

1. **Referência.** Escolher 2–3 gravações reais ou sons de outros jogos que façam o que queres (para estudar, nunca para copiar ou amostrar).
2. **Análise.** Ouvir (ou, para um agente, medir: ver [2](#2-desenhar-a-partir-de-uma-referência-sem-a-amostrar) e [8](#8-verificar-a-qualidade-sem-ouvir)) e descrever: quantas camadas, que bandas, que envelopes, que duração.
3. **Esboço rápido.** Fazer a versão mais simples que tenha a silhueta certa. Sem polimento, sem reverberação ([Future Proof Music School](https://futureproofmusicschool.com/blog/how-do-i-recreate-specific-sounds-i-hear-in-professional-tracks)).
4. **Comparar lado a lado.** Com a referência, ao mesmo volume percebido (comparar sons a volumes diferentes engana: o mais alto parece sempre melhor).
5. **Refinar uma coisa de cada vez.** Primeiro o envelope e a duração, depois o equilíbrio das camadas, depois o timbre, por fim o espaço.
6. **Testar no contexto.** Um som que soa bem sozinho pode desaparecer debaixo da multidão ou irritar à décima vez. Ouvir (medir) no meio do jogo, e repetido 20 vezes seguidas.
7. **Testar no pior altifalante.** O altifalante do telemóvel e o volume baixo.

O livro *Designing Sound*, de Andy Farnell, formaliza o mesmo ciclo para som procedural: cada capítulo vai da **física** do som ao **modelo**, do modelo à **implementação**, e daí ao programa final em Pure Data, sendo o som tratado «como processo e não como dados» ([MIT Press / Penguin Random House](https://penguinrandomhouse.ca/books/655213/designing-sound-by-andy-farnell/9780262014410); [OpenCourser](https://opencourser.com/book/50vd9c/designing-sound)). Esta ordem (física → modelo → código) é a mais adequada para um agente.

---

## 2. Desenhar a partir de uma referência sem a amostrar

O objetivo é perceber *porque* uma gravação soa como soa, e depois reconstruir essas razões com síntese. Não se copia nenhuma amostra, nem se usa nenhum recurso de outro jogo (regra do projeto).

### 2.1 Analisar de ouvido

Perguntas a fazer, por ordem:

1. **Quanto dura?** Até ao silêncio real, e até ao ponto em que deixa de importar (-40 dB).
2. **Quantos acontecimentos?** Um só, ou um principal e outros secundários (ricochetes, ecos)?
3. **Tonal ou ruído?** Tem altura que se possa cantar? Se sim, sobe, desce, ou fica?
4. **Quantas camadas?** Isolar mentalmente: o clique, o corpo, o grave, a cauda.
5. **Onde está a energia?** Grave, médio, agudo?
6. **Como começa e como acaba?** Ataque instantâneo ou suave? Decaimento exponencial (natural), linear (sintético) ou cortado?
7. **Que espaço?** Seco, sala pequena, pavilhão?

### 2.2 Analisar pelo espectrograma

Um espectrograma mostra o tempo na horizontal, a frequência na vertical e a energia em cor ([manual do Praat](https://www.fon.hum.uva.nl/rob/Courses/SpeechRecAndSyn/Literature/praat_manual.pdf)). O que se lê:

| Padrão no espectrograma | O que significa | Como se sintetiza |
|---|---|---|
| Linha vertical fina a toda a altura | Transiente, clique | Rajada de ruído de 1–5 ms, ou impulso filtrado |
| Linhas horizontais paralelas, espaçadas por igual | Som harmónico (voz, apito, buzina) | Oscilador com harmónicos, ou soma de senos múltiplos de f0 |
| Linhas horizontais com espaçamento irregular | Som inarmónico (metal, sino, aro) | Modos com razões não inteiras |
| Linhas que se apagam a ritmos diferentes | Cada modo tem o seu amortecimento; os agudos morrem primeiro | Um tempo de decaimento por modo |
| Mancha difusa | Ruído | Ruído filtrado por passa-banda |
| Mancha que sobe ou desce | Ruído com filtro em movimento (*whoosh*) | Passa-banda com frequência a variar |
| Linha que curva | Altura que muda (glissando, vibrato) | Envelope de frequência |
| Faixas largas fixas que ficam enquanto a altura muda | Formantes (voz, corpo ressonante) | Filtros fixos sobre uma fonte que muda |
| Uma réplica mais fraca, ms depois | Eco, ricochete, segundo toque | Repetir o acontecimento com menos ganho |

A ferramenta *Alchemy* do Logic faz isto automaticamente: analisa o espectrograma e troca os picos por harmónicos de senos e os componentes percussivos por ruído filtrado ([Apple, Spectral synthesis](https://help.apple.com/logicpro-instruments/mac/10.2.1/en.lproj/lgsibf71c5f6.html)). O ARSE, de código aberto, analisa um ficheiro em espectrograma e resintetiza-o ([SourceForge, ARSE](https://sourceforge.net/p/arse/)). A ideia de base ― **parciais sinusoidais + resíduo de ruído** ― é exatamente o que o Microsoft Research mostrou para impactos: acrescentar um **resíduo** ao modelo sintético tornou os impactos «indistinguíveis das gravações na maior parte dos casos», gastando menos memória que várias gravações ([Microsoft Research, Sound Synthesis for Impact Sounds in Video Games](https://microsoft.com/en-us/research/?p=309038)).

### 2.3 Do espectrograma ao código: método em 6 passos

1. **Medir a duração e o envelope global** (RMS em janelas de 5 ms). Anotar o tempo de ataque (10%→90% do pico) e os tempos de decaimento para -20 dB e -40 dB.
2. **Encontrar os picos espectrais** nos primeiros 50 ms e depois aos 150 ms. Os picos que persistem são modos; anota a frequência, a amplitude relativa e quanto tempo duram (o tempo para cair 20 dB dá a constante de decaimento).
3. **Calcular as razões entre picos.** Se forem inteiras (1, 2, 3…), é harmónico; se não, inarmónico. Guardar as razões, não as frequências absolutas: assim podes variar o tamanho do objeto mudando só a base (como `rim()` faz com `ratios`).
4. **Medir o resíduo de ruído:** a energia que sobra depois dos picos. Onde está centrada, quão larga é, quanto dura.
5. **Escrever o modelo:** um conjunto de modos + uma ou duas rajadas de ruído filtrado + os acontecimentos secundários.
6. **Comparar as mesmas medidas** no som sintetizado e na referência (ver [8.3](#83-comparar-com-uma-referência)) e ajustar até ficarem perto. Depois, **exagerar** de propósito o que o jogo precisa de comunicar (ver [1.4](#14-exagero-contra-realismo)).

> **Para um agente que não ouve:** o agente pode **ver imagens**. Gerar o espectrograma e a forma de onda em PNG (do som sintetizado e da referência, lado a lado, com os mesmos eixos) é provavelmente a ferramenta de diagnóstico mais poderosa disponível. O projeto já gera imagens para as poses (`npm run anim-check`); um «`sound-check`» equivalente, que desenhe espectrogramas em `dist-check/`, seguiria o mesmo padrão.

### 2.4 Exemplo: reconstruir o chiar de ténis

- **De ouvido:** um «iiic» agudo, 80–200 ms, altura que sobe ou oscila, áspero.
- **Espectrograma esperado:** uma linha fundamental entre 1 e 3 kHz que oscila depressa, com harmónicos acima; por baixo, ruído largo (o atrito).
- **Física:** atrito de borracha em madeira envernizada: *stick-slip*, a sola agarra e solta centenas ou milhares de vezes por segundo, como um arco de violino.
- **Modelo:** oscilador de pulso/dente-de-serra a 1,5–2,5 kHz com a frequência a variar aleatoriamente (o atrito não é estável), envelope de amplitude irregular, mais ruído passa-banda a 4 kHz em 20% do nível, e um passa-alto a 800 Hz para não ter corpo.
- **Variação:** frequência base, duração e contorno de altura aleatórios por instância.
- **Exagero:** tocá-lo mais vezes do que na realidade nas mudanças de direção rápidas, porque dá vida ao jogo sem custo.

---

## 3. Quem fez grande som por código, e o que cada um ensina

### 3.1 A *demoscene*: 4k, 64k e .kkrieger

**O que é.** Produções de tamanho limitado (4 096 bytes, 64 KB) em que a música e o som são gerados em tempo real por sintetizadores feitos de raiz.

- **.kkrieger (Farbrausch, 2004)** é um jogo de tiros em primeira pessoa com 96 KB. A música e os sons são produzidos por um sintetizador multifuncional chamado **V2**, alimentado por um fluxo contínuo de dados MIDI, que gera a música em tempo real ([Wikipédia, .kkrieger](https://en.wikipedia.org/wiki/.kkrieger)). O V2 foi escrito por Tammo «kb» Hinrichs, foi lançado em 2004 e depois em código aberto, e serviu para outras produções da Farbrausch como *fr-08: .the .product*, *Candytron* e *Flybye* ([KVR Audio](https://www.kvraudio.com/news/farbrausch_v2_synthesizer_system_released_2794); [rekkerd.org](https://rekkerd.org/farbrausch-releases-v2-v15/); [GitHub Blog, dez anos de Farbrausch](https://github.blog/news-insights/ten-years-of-farbrausch-productions-on-github)).
- **4klang (Alcatraz, 2007)**, de Dominik Ries (gopher) e Paul Kraus (pOWL), nasceu da vontade de escrever «um sintetizador pequeno mas flexível» para *intros* de 4k. O centro técnico é a **pilha da FPU**: cada unidade (oscilador, filtro, envelope) faz uma só coisa e os sinais passam por uma pilha, com uma unidade *Store* que permite modulação cruzada. O motor tem cerca de 730 bytes de código ([repositório 4klang](https://github.com/paulyc/4klang); [resumo do texto do autor](https://segmentfault.com/p/1210000047067572)). Os sucessores são o **Sointu** e o **64klang**, que generaliza a pilha num grafo de nós ([Sointu](https://github.com/in4k/sointu); [64klang](https://github.com/w23/64klang)).

**O que ensinam:**

- **A música é dados mínimos + um instrumento rico.** As notas ocupam quase nada; o carácter vem de poucos instrumentos muito bem feitos. Para o Pocket Basketball: investir num pequeno número de instrumentos excelentes (metais, glockenspiel, timbales, tarola) vale mais que muitos instrumentos medianos.
- **Modulação é o que dá vida.** Os sintetizadores de 4k gastam os bytes em envelopes, LFO e modulação cruzada, não em osciladores. Um som parado soa a falso (ver [7.1](#71-envelopes-estáticos)).
- **Efeitos globais dão coesão.** Uma reverberação e um *delay* partilhados por todos os instrumentos colam a mistura. Nas *intros*, um só bus de efeitos é a norma.
- **Pré-calcular o caro.** Muitas *intros* geram os *samples* dos instrumentos no arranque e depois tocam-nos. É o que o projeto já faz com `AudioBuffer`s.

### 3.2 js13kGames e os sintetizadores minúsculos

**O que é.** Uma competição de jogos em JavaScript com o limite de 13 KB comprimidos.

- **sfxr (DrPetter, 2007)** foi feito para o 10.º Ludum Dare, em dezembro de 2007, para dar efeitos básicos a quem tinha 48 horas para fazer um jogo. A ideia-chave: **gerar aleatoriamente** dentro de uma categoria («moeda», «explosão», «salto», «tiro») e deixar o utilizador aceitar ou rejeitar ([DrPetter, project sfxr](https://drpetter.se/project_sfxr.html)). Está em licença MIT. Daí saíram o **as3sfxr**, o **Bfxr** (de increpare, que acrescentou formas de onda, filtros, saltos de altura, bloqueio de parâmetros e uma mesa de mistura de vários sons) e o **bfxr2** em JavaScript ([bfxr.net](https://www.bfxr.net/v1); [bfxr2](https://github.com/increpare/bfxr2); [rekkerd.org](https://rekkerd.org/bfxr-free-sound-fx-generator-by-increpare/)).
- **ZzFX (Frank Force)** começou como entrada do JS1k e é um gerador de efeitos com menos de 1 KB, descrito por um vetor curto de parâmetros. **ZzFXM (Keith Clark)** constrói música a partir de instrumentos ZzFX, com o objetivo de 2–3 minutos de música em cerca de 1,5 KB depois de comprimir ([Keith Clark, ZzFXM](https://keithclark.co.uk/articles/zzfxm/); [npm zzfx](https://npmjs.com/package/zzfx); [frankforce.com](https://frankforce.com/tag/zzfx/)).
- **Sonant e SoundBox.** Marcus Geelnard portou o sintetizador Sonant (de Jake «Ferris» Taylor) para JavaScript e construiu o SoundBox, um *tracker* de síntese em HTML5 para *demos* de 4K/8K, com um leitor mínimo em licença zlib ([SoundBox](https://www.github.com/mbitsnbites/soundbox); [bitsnbites.eu](https://bitsnbites.eu/category/audio)). Entradas do js13k como *nomis 2* fizeram toda a música e os efeitos com ele ([nomis 2](https://github.com/js13kGames/nomis-2)).
- **Lições dos relatórios pós-competição:** um autor achou os *trackers* desadequados porque as notas tinham de ser tocadas uma a uma, e escreveu a sua própria ferramenta, guardando os *frames* gerados para reduzir o tempo de carga ([2021: a Space Opera](https://medium.com/@herebefrogs/2021-a-space-opera-a-js13kgames-2021-post-mortem-94cc2e061031)). O ZzFX ganhou a opção de **pré-gerar** os efeitos, o que ajudou na música ([Keith Clark](https://keithclark.co.uk/articles/zzfxm/)).

**O que ensinam:**

- **Um som é um vetor de parâmetros.** Se cada efeito do jogo for descrito por um pequeno objeto (frequência base, envelope, ruído, filtro, variação), é fácil gerar variantes, comparar, guardar e testar. É o modelo do sfxr. O código atual mistura parâmetros e lógica em funções; extrair os números para tabelas tornaria a afinação e os testes mais fáceis.
- **A aleatoriedade é uma ferramenta de busca.** O botão «aleatório dentro da categoria» do sfxr é um método de desenho: gerar 20 candidatos, escolher o melhor, afinar. Um agente pode fazer o mesmo com medidas objetivas (ver [8](#8-verificar-a-qualidade-sem-ouvir)).
- **O perigo do sfxr.** Os sons sfxr são reconhecíveis à primeira: onda quadrada ou dente-de-serra pura, envelope linear, sem espaço, sem ruído com forma. Isto é o «som 8-bit de *game jam*». É bom se for o estilo escolhido; para um jogo que quer soar «quente», os sons sfxr são o ponto de partida, nunca o fim (ver [7](#7-erros-comuns-do-som-sintetizado-e-como-corrigi-los)).

### 3.3 Chiptune e as restrições da NES e do Game Boy

**As restrições.** A NES tem cinco canais (dois de pulso, um triângulo, um de ruído e um de amostras DPCM) partilhados entre a música e os efeitos. O motor de som do *Contra* mantém seis «ranhuras» em ordem de prioridade, e as mais altas tocam antes das mais baixas ([documentação do som do Contra](https://raw.githubusercontent.com/vermiceli/nes-contra-us/main/docs/Sound%20Documentation.md)). Na maior parte dos jogos da NES os efeitos têm prioridade sobre a música, porque um canal interrompido menos de um segundo raramente se nota; e quando dois efeitos disputam o mesmo canal, ganha o último ([fórum NESdev](https://nesdev.nes.science/f6/t4836.xhtml), discussão informal). No Game Boy, Jeroen Tel compôs as músicas de *Warlocked* só com o 2.º canal de pulso e o canal de onda, deixando o canal de ruído livre para os efeitos ([GB Studio Central](https://gbstudiocentral.com/?p=2903)).

**O que ensinam (mesmo sem restrições de hardware):**

- **Prioridade e *voice stealing*.** Mesmo com canais ilimitados, tocar tudo é ruído. Definir prioridades: o apito e a buzina nunca são cortados; um cesto corta o drible; vinte dribles seguidos não tocam vinte vezes por cima uns dos outros (limitar as vozes por tipo de som, por exemplo 2–3 dribles simultâneos).
- **Um papel por canal.** Pensar a mistura como «canais com papéis» (melodia, baixo, percussão, efeitos) obriga a deixar espaço para os efeitos. A música do jogo deve deixar a faixa da rede e do apito (2–7 kHz) relativamente livre durante o jogo.
- **A música é composta a saber que vai ser interrompida.** Os compositores da NES escreviam a melodia de modo a sobreviver a cortes. Para este jogo: a música do jogo ao vivo deve ser feita de frases curtas e repetitivas que aguentam ser abafadas (`duckMusic`) sem perder o fio.
- **Carácter com pouco.** O ciclo de trabalho (*duty cycle*) do pulso (12,5%, 25%, 50%) dá três timbres muito diferentes; arpejos rápidos fingem acordes; o ruído em modo «curto» (periódico) dá um som metálico. São técnicas de timbre que continuam úteis num sintetizador moderno, se usadas com intenção.

### 3.4 A filosofia da Nintendo: efeitos curtos e com carácter

- **Sentir, não descrever.** O salto do Mario não imita nada: dá a sensação do salto ([Nintendo Life](https://www.nintendolife.com/news/2016/11/composer_koji_kondo_talks_super_mario_and_zelda_in_freshly_translated_2001_interview)). Miyamoto quer «efeitos que se sentem» e é «muito exigente» com eles.
- **Sincronizar com o movimento.** Em 3D, Kondo não conseguia que o salto acertasse com a ação, por isso dividiu-o: um som na descolagem, outro na aterragem, e uma voz ([Nintendo Life](https://www.nintendolife.com/news/2016/11/composer_koji_kondo_talks_super_mario_and_zelda_in_freshly_translated_2001_interview)). Lição: um som tem de coincidir com o *frame* em que a animação acontece. Se o som do cesto chega 80 ms depois da bola passar a rede, parece desligado.
- **Efeitos musicais, em sincronia com a música.** No Galaxy, um designer de som já experimentava pôr os efeitos a tocar automaticamente em sincronia com a música de fundo, como em *Wind Waker* e *Jungle Beat* ([Iwata Asks, Super Mario Galaxy](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/3)). No *Wonder*, a equipa de som entrou cedo: como teste, as plantas piranha saíam dos canos ao ritmo da música ([Miketendo64](https://miketendo64.com/2023/10/19/mario-devs-on-the-sound-teams-influence-on-wonder/)).
- **Vertical layering clássico.** No *Super Mario World*, montar o Yoshi acrescenta uma camada de bongós à música; desmontar tira-a. A estrela, em contraste, *substitui* a música ([Mario Wiki](https://www.mariowiki.com/Overworld_Theme_(Super_Mario_World)); [Video Game Music Nerd](https://videogamemusicnerd.blogspot.com/2014/06/my-gaming-audio-history-super-mario.html)). É o modelo de «uma camada por estado».
- **Memória curta, ideia forte.** Kondo diz que, com memória muito limitada, era difícil fazer efeitos eficazes ([Iwata Asks](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/3)). Os efeitos curtos da Nintendo resolvem isto com uma ideia musical por som (duas notas na moeda, um arpejo no *power-up*).

**Para o Pocket Basketball:** cada efeito importante deve ter uma «ideia» que caiba numa frase («a rede sussurra e cintila», «o aro diz *clong* e ri-se de ti», «a carta abre como uma caixa de música»). Se não se consegue dizer a ideia, o som ainda não está desenhado.

### 3.5 A fala balbuciada: Animal Crossing e Undertale

**Animalese (Animal Crossing).** As personagens «falam» com sons curtos, de altura alterada e encadeados ao ritmo do texto: soa a fala, mas não são palavras. Cada personagem tem uma altura própria, e se o texto passar depressa, a voz acelera e fica mais aguda ([Nookipedia, Animalese](https://nookipedia.com/wiki/Animalese)). Os primeiros jogos ocidentais usavam um sintetizador reprogramado para as línguas ocidentais, e os mais recentes usam o sintetizador japonês em todas as línguas (Nookipedia; números como «241 sílabas» vêm de fóruns e não estão verificados). O K.K. Slider tem um vocabulário próprio de sílabas («nah», «me», «oh», «now», «queh»), uivos, cliques e assobios ([Nookipedia](https://nookipedia.com/wiki/Animalese)).

**Bipes de texto (Undertale e afins).** Cada personagem tem um som curto que toca a cada letra: o Sans um «er» grave, o Papyrus algo agudo e áspero (descrições de fãs, [Steam](https://steamcommunity.com/app/391540/discussions/0/412448158156787760); [Wikipédia, Sans](https://en.wikipedia.com/wiki/Sans_(Undertale))). Um *plugin* de RPG Maker que imita a técnica toca um bipe aleatório de uma lista por cada carácter visível, com um mínimo de cerca de 30 ms entre bipes e uma pequena variação de altura ([Winterbite Studios](https://winterbitestudios.itch.io/plugin-rpg-maker-mz-dialogue-bleep)).

**O que ensinam:**

- **Voz sem palavras = personagem barata e universal.** Não precisa de tradução nem de atores. Para o Pocket Basketball: o treinador, o presidente do clube, os jogadores numa entrevista, o locutor do pavilhão podem ter cada um uma «voz» de balbucio.
- **Receita de balbucio por formantes** (o projeto já tem `vox()` e `VOWELS`): para cada sílaba do texto, uma vogal escolhida pela letra (determinista: a mesma frase dá sempre o mesmo som), uma altura base por personagem, uma pequena curva de entoação (subir no fim de uma pergunta, descer no fim de uma frase), 50–90 ms por sílaba, consoantes como rajadas de ruído de 5–15 ms.
- **Não tocar em todas as letras.** Uma sílaba a cada 2–3 letras e nenhuma nos espaços e na pontuação; senão, a vibração torna-se irritante.
- **Prosódia é emoção.** Uma personagem zangada: altura mais alta, sílabas mais curtas e mais fortes. Triste: mais grave, mais lento, a descer. Este é o modo mais barato de dar emoção a texto.
- **Respeitar a regra da originalidade:** não imitar o timbre do Animalese nem os bipes do Undertale; usar a ideia (balbucio de formantes, altura por personagem), com sons próprios.

### 3.6 A música procedural do Spore (Brian Eno, Kent Jolly, Aaron McLeran)

Kent Jolly e Aaron McLeran apresentaram «Procedural Music in SPORE» na GDC de 2008 ([archive.org](https://archive.org/details/GDC2008Jolly)). O sistema foi feito numa implementação própria de Pure Data dentro do jogo ([PDCON, Using Pure Data in Spore](https://www.uni-weimar.de/kunst-und-gestaltung/wiki/PDCON:Conference/Using_Pure_Data_in_Spore_and_Darkspore)). Eno passou uma semana com a equipa e percebeu logo que «a música estava sempre a mudar, seria procedural» ([Exclaim](https://exclaim.ca/music/article/brian_eno_scores_spore)). Um ponto central relatado da palestra: **ensinaram o sistema a filtrar as notas por escalas e modos**, e foi aí que começou a «soar a música em vez de ruído» ([Synthtopia](https://www.synthtopia.com/content/2008/09/24/brian-enos-music-for-spore/); [Brian Eno, GameSpy](https://moredarkthanshark.org/eno_int_gspy-feb08.html)). A metáfora de Will Wright e Eno: compor assim é «mais jardinagem do que engenharia; plantam-se sementes» ([Long Now, Eno e Wright](https://longnow.org/seminars/02006/jun/26/playing-with-time); [CDM](https://cdm.link/2007/06/brian-eno-with-wright-on-spore-and-generative-systems-sound-and-paintings/)).

**O que ensinam:**

- **A escala é o filtro que transforma aleatório em música.** Qualquer nota gerada passa por uma escala (pentatónica para nunca soar mal; maior/mixolídia para alegria; dórica para tensão leve).
- **Desenhar regras, não peças.** O compositor escolhe o material (instrumentos, escalas, padrões rítmicos, densidades) e as regras de combinação.
- **A música procedural soa a «ambiente» se não tiver estrutura.** Para um jogo de desporto, que pede energia e reconhecimento, o procedural puro não chega: é preciso um tema reconhecível (o hino do clube) sobre o qual o procedural varia.

### 3.7 No Man's Sky: VocAlien e Pulse (Paul Weir)

Paul Weir criou com Sandy White o **VocAlien**, um trato vocal modelado fisicamente para sintetizar inteiramente as vozes das criaturas ([MCV UK](https://mcvuk.com/development-news/the-sound-of-no-mans-sky/); [GDC Vault, The Sound of No Man's Sky](https://gdcvault.com/play/1024067/The-Sound-of-No-Man)). Os parâmetros não são técnicos, são **descrições da criatura**: massa do corpo, comprimento da traqueia, «humidade», «estridência» ([Smithsonian](https://www.smithsonianmag.com/smart-news/how-video-game-designers-make-artificial-creatures-sound-real-180955268/)). Cada tipo de criatura tem um som **arquétipo**, e a programação gera variações desse arquétipo para povoar os mundos ([A Sound Effect](https://www.asoundeffect.com/no-mans-sky-sound-procedural-audio/)). A música generativa vem do **Pulse**, que o próprio Weir descreve como «no fundo, um leitor de ficheiros aleatórios glorificado, capaz de controlar conjuntos de sons a partir da mecânica do jogo», com material da banda 65daysofstatic. E Weir avisa: o áudio procedural «só faz sentido se resolver um problema que seria difícil de resolver com o desenho de som convencional; continua a ser uma maneira fraca de criar sons realistas»; e por isso os ambientes usaram muitas gravações originais de tempo e natureza ([Audiokinetic, Q&A com Paul Weir](https://audiokinetic.com/en/blog/behind-the-sound-of-no-mans-sky-a-qa-with-paul-weir-on-procedural-audio)).

**O que ensinam:**

- **Parâmetros com significado.** Os parâmetros de um gerador de som devem ser os do *mundo do jogo*, não os do DSP. Para o Pocket Basketball: `bounce({ floor, ballWear, force })`, `crowd({ size, mood, excitement })`, `voice({ age, size, temper })`. O código atual já vai neste sentido (`bounce('wood' | 'asphalt')`, `Room`); vale a pena levá-lo mais longe.
- **Arquétipo + variação.** Desenhar um som perfeito à mão (o arquétipo), e depois deixar o código gerar as variações à volta, dentro de limites. Não deixar o aleatório desenhar o arquétipo.
- **Honestidade sobre o realismo.** Weir, um dos maiores praticantes do áudio procedural, diz que é fraco para o realismo. Num jogo 100% sintetizado (regra do projeto), a resposta é **estilizar**: apontar para «credível e com carácter», não para «indistinguível de uma gravação». Exatamente como a pixel art não tenta ser fotografia.
- **Um leitor aleatório com regras chega muito longe.** O Pulse é, nas palavras do autor, simples. Para a música do jogo, um sistema de «frases pré-compostas escolhidas por regras de jogo» é muitas vezes melhor que geração nota a nota.

### 3.8 Proteus (Ed Key e David Kanaga)

Um jogo de exploração de 2013 numa ilha gerada proceduralmente, em que a banda sonora de Kanaga se forma a partir das interações do jogador: cada coisa do mundo tem o seu som, e aproximar-se dela acrescenta-o à música ([Wikipédia, Proteus](https://en.wikipedia.org/wiki/Proteus_(video_game))). A ideia de deixar o jogador compor foi abandonada porque transformaria o jogo numa ferramenta criativa; e a *Edge* criticou que a música «nunca chega a arrancar», sobretudo por faltar percussão na maior parte das estações (Wikipédia).

**O que ensinam:**

- **O mundo é o instrumento.** Cada objeto, cada estado, cada personagem pode contribuir com uma voz. Num jogo de basquetebol, os próprios sons do jogo (dribles, chiar de ténis, rede) podem ser parte da música.
- **Sem pulso não há energia.** A crítica da *Edge* é a lição para um jogo de desporto: a música de jogo precisa de ritmo e percussão claros. Ambiente sem bateria serve os menus calmos, não o jogo ao vivo.

### 3.9 Rez e Tetris Effect: música que responde ao jogo

No *Rez* (Tetsuya Mizuguchi, United Game Artists), ao fixar alvos, disparar e destruir inimigos, o jogador produz notas que encaixam no estilo e no andamento da música; a ideia vem de uma viagem de Mizuguchi a um festival em Zurique, onde viu a música, as cores e a dança mudarem juntas ([New Statesman](https://newstatesman.com/culture/2017/07/how-tetsuya-mizuguchi-reinvented-video-games-his-love-synaesthesia); [TheGamer](https://www.thegamer.com/tetsuya-mizuguchi-synaesthesia-game-rez-infinite-area-x/)). No *Tetris Effect*, cada fase tem o seu esquema musical e os seus efeitos; rodar uma peça toca uma nota, e quando a peça assenta toca um «stinger» percussivo que junta uma nota longa, um padrão curto de sintetizador de quatro notas, uma percussão e um efeito visual; os sons do jogador tornam-se blocos de uma partitura maior que cresce ao longo da fase ([Game Developer, Game audio analysis - Tetris Effect](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect); [Digital Trends](https://digitaltrends.com/gaming/tetris-effect-makes-tetris-feel-new-again)). Não encontrei uma fonte primária que confirme que os efeitos do Rez são **quantizados** à grelha do compasso (é a leitura comum, mas fica por confirmar), nem que os do Tetris Effect estão sempre no tom da fase (só um blogue sem fonte o afirma, [dinogame.gg](https://dinogame.gg/blog/tetris-sound-design-analysis/)).

**Técnicas a tirar daqui:**

- **Efeitos tonais na tonalidade da música.** Os sons tonais do jogador escolhem a nota a partir do acorde atual da música. Se o hino está em Si bemol e o acorde atual é Mi bemol, o «plim» de uma assistência toca uma nota de Mi bemol maior.
- **Quantização parcial.** Atrasar um som decorativo até à próxima colcheia (máx. ~60–120 ms, conforme o andamento) para cair no ritmo. Mas **nunca** quantizar sons de *feedback* direto (cesto, apito, toque na interface): a latência mata a resposta. Um fórum de Max nota o problema de um disparo um pouco tardio ir parar ao tempo seguinte; uma saída é tocar já e alinhar só as camadas decorativas ([Cycling '74](https://cycling74.com/forums/simply-quantize-sfplay-start-time)).
- **Divisão em duas camadas:** a camada imediata (seca, física, sem atraso) + uma camada musical (tonal, quantizada, no tom). O jogador sente a resposta instantânea e ouve a música a responder.

### 3.10 Mini Metro e Mini Motorways (Disasterpeace)

No *Mini Metro*, cada linha de metro tem a cada momento um ritmo e uma nota; cada estação de uma linha gera um pulso na altura dessa linha, e a forma da estação decide o timbre; ao alterar a linha, a nota mais antiga da estrutura harmónica é trocada pela seguinte. O volume, o timbre e o *panning* de cada pulso calculam-se a partir dos dados do jogo, o sistema é 100% baseado em andamento, e o projeto evitou faixas em ciclo, usando sequências de dados ([Designing Sound, entrevista a Rich Vreeland](https://designingsound.org/2016/02/18/the-programmed-music-of-mini-metro-interview-with-rich-vreeland-disasterpeace); [Disasterpeace, blogue](https://disasterpeace.com/blog/tag.analysis)). No *Mini Motorways* o princípio é transformar o barulho da estrada em música ([Game Developer](https://www.gamedeveloper.com/design/turning-road-noise-into-music-mini-motorways)).

**O que ensina:** uma harmonia **lenta**, guiada pelo estado do jogo, e eventos rápidos que tocam notas dessa harmonia. Para um jogo de gestão: a harmonia pode seguir o estado do jogo (a ganhar, empatado, a perder) e os acontecimentos (passes, cestos) tocam notas do acorde atual.

### 3.11 Ape Out (Matt Boch)

Uma bateria de jazz procedural que reage à ação: cada partida é diferente, até nas peças da bateria que tocam com o que acontece no ecrã ([Shacknews](https://www.shacknews.com/article/110273/ape-outs-jazz-soundtrack-explored-in-devolver-digital-video); [GameSpot](https://www.gamespot.com/reviews/ape-out-review-monkey-business/1900-6417095/)). O que ensina para um jogo de desporto: **a percussão é a camada mais reativa**. Os pratos podem marcar os grandes momentos (um cesto, um desarme), o bombo pode subir de densidade quando o jogo aquece, e a música soa «tocada ao vivo».

### 3.12 sfxr e o espírito das *game jams*

Ver [3.2](#32-js13kgames-e-os-sintetizadores-minúsculos). A lição mais importante do sfxr não é técnica: **baixou o custo de ter som a zero**, e com isso quase todos os jogos de *jam* passaram a ter som ([DrPetter](https://drpetter.se/project_sfxr.html)). A versão moderna da lição para um agente: tornar barato **gerar, medir e comparar** muitas variantes, para que a qualidade venha da escolha.

---

## 4. Música procedural e adaptativa para um jogo de desporto

### 4.1 As duas técnicas de base (e uma terceira)

| Técnica | O que é | Bom para | Cuidado |
|---|---|---|---|
| **Camadas verticais** | Várias pistas (*stems*) na mesma linha de tempo, misturadas conforme a intensidade. «Exploração calma: duas camadas; combate: entram mais três, sempre em sincronia» ([bugnet.io, adaptive music](https://bugnet.io/blog/adaptive-music-a-beginners-guide)) | Intensidade contínua (o resultado, o tempo a acabar) | Todas as camadas têm de soar bem juntas e separadas |
| **Re-sequenciação horizontal** | Trocar de secção ou de cue conforme o jogo, normalmente nos limites de compasso ou de frase ([Berklee Online](https://online.berklee.edu/takenote/?p=14985)) | Mudanças de estado (intervalo, prolongamento, último minuto) | Precisa de transições: pontes, cortes no compasso |
| **Stingers** | Frases curtas (normalmente 2–5 s) tocadas por cima da música, de preferência no mesmo tom e andamento ([bugnet.io](https://bugnet.io/blog/adaptive-music-a-beginners-guide); [Packt, FMOD stingers](https://packtpub.com/en-tr/product/game-audio-development-with-unity-5x-9781787286450/chapter/fmod-for-dyanmic-and-adaptive-audio-7/section/transition-timelines-and-stingers-ch07lvl1sec48)) | Acontecimentos (cesto, triplo, vitória) | Não exagerar na frequência |

A maior parte das bandas sonoras adaptativas que se admiram combinam as duas técnicas com polimento nas transições: *stingers* para tapar as costuras, *crossfades* quantizados ao tempo e pequenas pontes ([bugnet.io](https://bugnet.io/blog/adaptive-music-a-beginners-guide)).

### 4.2 Proposta de níveis de intensidade para o jogo ao vivo

Uma só peça (por exemplo, a variação do hino ou um tema de jogo), com camadas que entram e saem:

| Nível | Quando | Camadas |
|---|---|---|
| 0 | Desconto de tempo, lance livre | Só uma pulsação (bombo suave, baixo); a multidão em primeiro plano |
| 1 | Jogo normal, diferença grande | + baixo, + percussão leve |
| 2 | Jogo equilibrado (diferença ≤ 6) | + harmonia (metais suaves), + chimbal |
| 3 | Últimos 2 minutos e diferença ≤ 5 | + melodia, + tarola, andamento ligeiramente mais rápido (ou percussão em dobro) |
| 4 | Últimos 24 segundos, diferença ≤ 3 | + timbales em rufo, + harmonia mais alta; tudo resolve no *stinger* final |

**Regras:**

- **Subir depressa, descer devagar.** A intensidade sobe num compasso e desce em dois a quatro, para não oscilar a cada cesto.
- **Mudanças nos limites do compasso**, nunca a meio de uma nota.
- **Num jogo de gestão, a música pode ser mais discreta**: é o jogador que observa, não que joga. A multidão é muitas vezes a melhor «música» adaptativa. A EA, no NHL 22, liga a multidão à mesma lógica que alimenta os comentários: o sistema avalia o estado do jogo a cada *frame* e prefere os acontecimentos que encaixam no humor atual da multidão, com camadas de base, grandes acontecimentos (aplauso, assobio), gritos individuais e multidão próxima ([SVG, NHL 22](https://www.sportsvideo.org/2021/10/28/svg-sit-down-ea-sports-audio-director-eric-paul-talks-sound-for-nhl-22/?print=1)). Como a multidão é parecida com ruído de banda larga, esconde bem os sons que entram e saem ([O'Reilly, Game Audio Implementation, cap. 11](https://www.oreilly.com/library/view/game-audio-implementation/9781317679455/xhtml/Ch011.xhtml)).

### 4.3 Stingers para acontecimentos

| Acontecimento | Stinger | Duração | Tom |
|---|---|---|---|
| Cesto normal | Nenhum (só a rede e a multidão). Se houver, uma nota de glockenspiel no acorde atual | — / 0,3 s | Acorde atual |
| Triplo | 3 notas a subir, no acorde atual | 0,4 s | Acorde atual |
| Afundanço / jogada espetacular | Rufo curto de timbale + acorde de metais | 0,8 s | Tónica |
| Corrida de pontos (*run* 8-0) | A música sobe um nível, sem stinger | — | — |
| Fim de período | Buzina + uma cadência curta | 1–2 s | Resolve na tónica |
| Cesto no último segundo | Silêncio de 150–300 ms depois da buzina, depois explosão: timbales + metais + multidão | 2–3 s | Tónica maior |
| Vitória | Jingle de vitória (já existe `win`) | 3–6 s | Maior, resolve |
| Derrota | Jingle de derrota (`loss`) | 2–4 s | Menor ou dórico; não arrastado |
| Combo de cartas | Sequência a subir, uma nota por carta (ver [6](#6-sons-de-recompensa-e-sumo)) | 0,1 s por carta | Escala do jogo |

### 4.4 Manter a música no tom dos efeitos

- **Uma «afinação do jogo».** Guardar o tom e a escala atuais num sítio que os efeitos possam ler (por exemplo, `currentKey` e `currentChord` no `GameAudio`). Todos os sons tonais escolhem a nota dali.
- **Sons físicos não precisam de tom**, mas os que têm altura (o «ping» da bola, o aro, a buzina) podem ser ligeiramente afinados para uma nota da escala. A buzina dos 24 s a 310 Hz está entre Ré#4 (311 Hz) e Mi4: arredondar para uma nota da escala do jogo, ou para um trítono propositado se se quer tensão.
- **O apito e a buzina podem ser «fora do tom» de propósito**: são alertas, e a dissonância ajuda a chamar a atenção. Mas que seja uma decisão.
- **Música de menus e efeitos de interface no mesmo tom.** Se a música do clube está em Fá maior, os cliques da interface tocam notas de Fá maior.

### 4.5 Ciclos curtos que não cansam

- **Comprimento.** Winifred Phillips sugere, segundo um relato indireto, que uma peça dure pelo menos 5 minutos antes de recomeçar, e que ciclos curtos sirvam para mini-jogos; outros ajustam o comprimento ao tempo que o jogador passa no sítio: mais longos nos sítios onde se fica, mais curtos onde se passa ([Devon Thome](https://world.hey.com/thome/game-101-reducing-music-fatigue-d0214e31); [Game Developer, Rethinking the audio loop](https://www.gamedeveloper.com/audio/rethinking-the-audio-loop-in-games); [Gamewatcher, Pillars of Eternity](https://www.gamewatcher.com/2014-16-04-pillars-of-eternity-blog-update-covers-music-writing-and-production)).
- **O código gera, por isso o ciclo pode não se repetir.** Técnicas baratas com o gerador determinista:
  - **Variações por passagem.** Cada vez que a secção recomeça, mudar algo pequeno: a oitava de uma frase, uma nota de passagem, a inversão do acorde, que instrumento toca a melodia. O `scheduleSection(..., pass)` já recebe o número da passagem; é o sítio natural para isto.
  - **Secções em ordem variável** (A A B A, A B A C…), escolhidas pela semente.
  - **Tirar a melodia** numa passagem em cada três. Ouvir só o acompanhamento descansa o ouvido, e a melodia volta com força.
  - **Ciclos de comprimentos diferentes por camada** (técnica de Eno: 7 compassos contra 8 contra 5), o que faz a combinação total demorar muito a repetir.
- **Evitar momentos que «saltam»**: uma nota muito alta ou um prato forte numa música de ciclo é a primeira coisa que o ouvido reconhece como repetição ([Game Developer](https://www.gamedeveloper.com/audio/rethinking-the-audio-loop-in-games)).
- **Esconder a costura**: o fim do ciclo deve levar ao início sem pausa nem cadência final.

---

## 5. Som de interface e menus

### 5.1 Princípios

- **Curto.** Os cliques devem ficar abaixo de cerca de 100 ms e as confirmações entre 100 e 250 ms ([Morphic](https://morphic.com/resources/how-to/how-to-make-sound-effects-for-games); [bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)). A regra de 150 ms do pedido é um bom limite superior para o clique comum. Abaixo dos 30 ms, um som tonal deixa de ter altura percetível e passa a ser só um clique.
- **Uma família.** Um som «mãe» de confirmar; o resto deriva dele ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)).
- **Hierarquia de presença.** Passar por cima (*hover*) quase silencioso, ou sem som; clique, confirmar e alternar com presença; as ações importantes (contratar, vender, começar o jogo) com um som mais rico ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)).
- **Direção = sentido.** Subir para sim/em frente, descer para não/voltar ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)).
- **Erro:** curto, a descer, médio-grave (200–500 Hz), nunca áspero ([bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)). Num jogo de gestão, o jogador vai ver muitos «não podes» (sem dinheiro, plantel cheio): o erro deve ser informativo, não castigador (lição do Wii Fit, [1.5](#15-dar-carácter-e-emoção-a-um-som)).
- **Poucos agudos.** Usar com moderação as frequências acima de 1,5–3 kHz nos menus (comentário de fórum citado em [bugnet.io](https://bugnet.io/blog/ui-sound-design-for-indie-games)); os agudos cansam mais depressa.
- **Variação pequena.** Variar a altura em ±2 semitons e o volume em ±1,5 dB pode fazer um ficheiro parecer vários ([SFX Engine](https://sfxengine.com/blog/common-game-audio-mistakes); [r/GameAudio](https://redlib.belloworld.it/r/GameAudio/comments/1g0rz2b/do_you_create_variations_for_the_ui_sounds)). Para interface, **menos que isso**: ±0,3 a ±1 semitom, ou variar só o timbre (um filtro ligeiramente diferente), para que o som continue a significar o mesmo. A variação de altura tem de ficar **dentro da escala** se o som é tonal.

### 5.2 Uma família de interface proposta

Partindo de um som mãe: «plim» de glockenspiel suave, triângulo + 2.º harmónico, ataque de 2 ms, decaimento exponencial de 80 ms, passa-baixo a 4 kHz, numa nota da escala do jogo (por exemplo Fá5).

| Ação | Derivação | Duração |
|---|---|---|
| Mover a seleção | Mãe, uma oitava abaixo, 50% do volume, 40 ms | 40 ms |
| Confirmar | Mãe + a quinta acima 40 ms depois | 120 ms |
| Voltar / cancelar | Quinta acima → mãe (a descer), mais escuro (passa-baixo a 2,5 kHz) | 110 ms |
| Mudar de separador | Mãe com um ruído curto de «papel» (passa-banda 3 kHz, 15 ms) | 60 ms |
| Alternar ligado | Mãe + terça acima | 90 ms |
| Alternar desligado | Terça acima → mãe | 90 ms |
| Erro | Duas notas iguais, graves (Fá4), a 2.ª um semitom abaixo, timbre mais quadrado mas filtrado | 140 ms |
| Ação importante (contratar) | Arpejo de 3 notas a subir + cauda de sala curta | 250 ms |
| Abrir/fechar painel | Ruído filtrado com filtro a subir (abrir) ou a descer (fechar); sem tom | 80 ms |

### 5.3 Não irritar na repetição

- **O teste dos 50 cliques.** Gerar uma sequência de 50 cliques a 4 por segundo e verificar (ver [8](#8-verificar-a-qualidade-sem-ouvir)) que a sonoridade é baixa, que não há agudos fortes e que a variação existe.
- **Limitar a cadência.** Se o jogador percorre uma lista depressa, não tocar um som por item: tocar no máximo um a cada 40–60 ms, ou baixar o volume dos que vêm muito seguidos.
- **Sem cauda longa na interface.** Uma cauda de 1 s em cada clique cria uma «sopa».
- **Baixar a interface durante o jogo ao vivo.**

---

## 6. Sons de recompensa e «sumo»

### 6.1 O que é «sumo»

O termo foi popularizado pela palestra *Juice It or Lose It* de Martin Jonasson e Petri Purho (2012): pegaram num jogo de partir blocos aborrecido e, sem mudar a mecânica, acumularam *feedback* até se tornar delicioso ([Game Juice](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons); [Game Developer](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)). O som é uma das vitórias mais baratas. O artigo sobre *game feel* nota que um bom *feel* pede sons adequados, impactantes, agradáveis e não repetitivos ([Game feel](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Game_feel)). Na *Candy Crush*, a análise do áudio conclui que o som «está lá quase todo para reforçar as coisas boas que o jogador faz» ([Game Developer, Candy Crush audio breakdown](https://www.gamedeveloper.com/audio/why-candy-crush-saga-is-so-engaging-an-audio-breakdown)).

### 6.2 Técnicas de recompensa

- **Escada de alturas em sequências.** Cada acontecimento seguido sobe um degrau na escala: 1.º cesto seguido Dó, 2.º Ré, 3.º Mi… O jogador *ouve* a sequência a crescer. Repor quando a sequência se parte. Funciona para combos de cartas, sequências de vitórias, pontos de experiência a encher. (Os jogos de *slot* usam o mesmo truque: altura a subir = multiplicador a subir, segundo análises de fraca qualidade; a técnica, essa, é comum.)
- **Antecipação → resolução.** Uma subida (*riser*: ruído com filtro a abrir, ou um rufo de timbale a crescer) seguida de um acorde que resolve. O tempo da antecipação deve ser o tempo da animação (a carta a virar).
- **Raridade em camadas.** Uma carta comum: 1 nota. Pouco comum: 2 notas. Rara: arpejo + cintilação. Lendária: arpejo + cintilação + metais + uma pequena pausa antes. O jogador aprende a reconhecer a raridade **antes** de a ver.
- **O silêncio antes do grande momento.** O *Peggle* faz isto: no último pino, câmara lenta, zoom, e depois o «Hino da Alegria» de Beethoven a toda a força; se a bola falha por pouco, o coro geme de desilusão ([TV Tropes, Peggle](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Peggle); [Game Informer](https://gameinformer.com/games/peggle_2/b/xboxone/archive/2013/12/10/ode-to-joy)). A «Extreme Fever» começou como provisória, acumulou efeitos um a um e ficou porque os testadores reagiram muito ([TCRF](https://new.tcrf.net/Prerelease:Peggle_Deluxe_(Windows,_Mac_OS_X)); [Audiogang, Peggle 2](https://www.audiogang.org/peggle2-sonic-joy/)). Lição: **o exagero ridículo funciona em momentos raros**; e o «quase» também merece som.
- **Proporção ao valor.** Um subir de nível é progresso duradouro e pode ser mais longo e triunfal; uma melhoria rápida na interface deve ser curta, porque «à quinquagésima vez começaria a irritar»; e um jingle que chega atrasado parece desligado do momento ([Morphic, level up](https://morphic.com/resources/sounds/level-up-sound-effects)).

### 6.3 O crescendo de uma vitória

Para o fim de jogo ganho:

1. **Buzina final** (seca, forte, o som mais alto do jogo até aqui).
2. **150–300 ms de quase silêncio** (a multidão corta a meio).
3. **Explosão da multidão** (aplauso + gritos, entrada de 50–100 ms, não instantânea).
4. **Jingle de vitória** por cima, 0,5 s depois, no tom do hino, maior, a resolver.
5. **Ecrã de resultados:** cada estatística que aparece com um «tic» numa escala a subir; o resultado final com um acorde.
6. **Recompensas** (dinheiro, cartas): escada de alturas, a acabar num acorde maior longo.
7. **Volta à calma:** a música do clube regressa suave, em *fade-in* de 2 s.

Para a derrota, a mesma estrutura mais curta e mais gentil: buzina, a multidão a esvaziar (*fade-out* rápido), um jingle curto em menor ou dórico, e estatísticas sem a escada a subir.

### 6.4 Desbloquear cartas: um exemplo de desenho

- **0 ms:** toque na carta: clique de papel (ruído passa-banda 2–4 kHz, 10 ms) + um baque de cartão (seno 180 Hz → 120 Hz, 40 ms).
- **0–400 ms:** antecipação: ruído com passa-banda a subir de 800 Hz para 5 kHz, volume a crescer; para as raras, um rufo de glockenspiel a subir.
- **400 ms (a carta vira):** acorde: tónica + terça + quinta da escala, glockenspiel; nas raras, acrescentar a oitava e uma cintilação (6–10 notas muito rápidas e aleatórias da escala, em agudos, a decair).
- **400–1500 ms:** cauda de sala; nas lendárias, metais.

---

## 7. Erros comuns do som sintetizado, e como corrigi-los

Os sintomas do «som barato» ou «8-bit sem querer», com a correção:

### 7.1 Envelopes estáticos

**Sintoma:** o som liga, fica igual, desliga. Soa a «bip de microondas».
**Porquê:** os sons reais evoluem. O timbre muda ao longo do som: os agudos morrem antes dos graves, a altura cai ligeiramente, a vibração estabiliza. Os sons sintetizados muitas vezes «não têm evolução de timbre e ficam estáticos» ([resumo de fontes de prática](https://sozai.app/transcript/why-sounds-feel-fake/index.md)).
**Correção:**

- Decaimento **exponencial**, não linear.
- **Um envelope por parcial/camada**: os modos agudos decaem mais depressa que os graves (como em `rim()`, em que os `taus` diminuem com a frequência).
- **Envelope de filtro**: o passa-baixo começa aberto e fecha durante o som.
- **Envelope de altura**: uma pequena queda de altura nos primeiros 20–50 ms (1–3% para objetos, mais para tambores) dá «golpe».
- **Modulação lenta** de filtro ou de altura nos sons longos (metais, multidão).

### 7.2 Falta de componente de ruído

**Sintoma:** o som soa limpo demais, «eletrónico», como um diapasão.
**Porquê:** quase todos os sons físicos têm ruído: o atrito, o ar, o contacto. Um modelo só tonal perde a «matéria».
**Correção:** acrescentar um **resíduo de ruído** com forma (filtrado e com envelope próprio). É o resultado do Microsoft Research: com o resíduo, os impactos sintéticos tornam-se quase indistinguíveis dos gravados ([Microsoft Research](https://microsoft.com/en-us/research/?p=309038)). Também em instrumentos: um sopro no ataque dos metais, um clique de baqueta no glockenspiel, o ar no início da voz.

### 7.3 Espectros harmónicos perfeitos

**Sintoma:** tudo soa a órgão ou a sintetizador barato.
**Porquê:** os objetos reais são inarmónicos (sinos, metais, pratos, aros) ou quase-harmónicos com ligeiro desvio (cordas, voz). Os osciladores digitais são perfeitamente harmónicos e perfeitamente estáveis.
**Correção:**

- Para objetos: razões de modos **inarmónicas** (o aro com 1; 1,47; 2,09; 2,56… em vez de 1; 2; 3; 4).
- Para instrumentos: ligeira **desafinação entre vozes** (2–8 cêntimos), *chorus* leve, ou um ligeiro esticamento dos harmónicos.
- **Deriva de altura** muito pequena e lenta (±3 cêntimos) nas notas longas.
- **Variar a fase inicial** dos parciais.

### 7.4 Sem variação

**Sintoma:** o mesmo drible vinte vezes: «metralhadora» (*machine-gun effect*). O ouvido identifica a repetição como artificial.
**Correção:**

- Cada instância com pequenas variações aleatórias (com o gerador, mantendo o determinismo onde importa): altura ±2–5%, volume ±1–2 dB, tempos de decaimento ±10–20%, posição do filtro, fase do ruído ([SFX Engine](https://sfxengine.com/blog/common-game-audio-mistakes)).
- **Pré-gerar um conjunto** de 4–8 variantes por som e escolher sem repetir a última (*round-robin* aleatório).
- **Variar com o contexto**: um drible forte (contra-ataque) e um fraco (a gerir o relógio) não devem ser o mesmo som com mais volume: o forte é mais brilhante e com mais transiente.
- O código atual já varia a frequência (`between(r, 0.94, 1.06)`) e a velocidade de leitura (`0.97 + Math.random() * 0.06`). Bom; a variação pode chegar também ao timbre e ao envelope.

### 7.5 Agudos a mais

**Sintoma:** som áspero, «digital», cansativo; em altifalantes de telemóvel fica estridente.
**Porquê:** osciladores quadrados e dente-de-serra têm harmónicos fortes até ao limite de Nyquist (e *aliasing* se não forem limitados em banda); ruído branco não filtrado tem energia igual por hertz, que soa muito agudo.
**Correção:**

- **Passa-baixo em quase tudo.** Os sons reais perdem agudos com a distância e com o material.
- **Ruído rosa ou filtrado**, não branco puro, como base.
- **Inclinação espectral**: para sons «quentes», a energia acima de 5 kHz deve ser bem menor que a dos médios (ver as medidas em [8](#8-verificar-a-qualidade-sem-ouvir)).
- **Osciladores limitados em banda** (o `PeriodicWave` do Web Audio já o faz; nos `AudioBuffer` gerados à mão, somar só os harmónicos abaixo de Nyquist).
- A 32 kHz (o `SR` atual), o limite é 16 kHz: já é um passa-baixo natural, desde que não haja *aliasing*.

### 7.6 Sem espaço

**Sintoma:** os sons parecem «colados» ao ouvido, separados uns dos outros, como num menu de telemóvel.
**Correção:**

- **Uma sala comum** para todos os sons do mundo (o `roomImpulse` atual, por pavilhão). A convolução com uma resposta ao impulso reduz a perceção de artificialidade ([resumo de fontes](https://sozai.app/transcript/why-sounds-feel-fake/index.md)).
- **Níveis de envio diferentes** conforme a distância: a bola perto, seca; a multidão longe, molhada.
- **Reflexões iniciais** dizem o tamanho da sala melhor que a cauda; num pavilhão grande, um eco de *slap-back* depois do apito é o que se ouve na realidade ([Morphic, basketball](https://morphic.com/resources/sounds/basketball-sound-effects)).
- **A interface pode ficar seca** (é «fora do mundo»), mas então deve ser *sempre* seca.

### 7.7 Outros erros frequentes

- **Cliques no início e no fim.** Um som que começa ou acaba com uma amostra diferente de zero dá um clique. Rampa de 1–5 ms (o `fadeOut` atual faz o fim).
- **Ataques demasiado instantâneos em sons tonais suaves.** Um glockenspiel aceita ataque de 0 ms; uma voz ou metais não: 10–40 ms.
- **Normalizar tudo ao pico.** Normalizar ao mesmo pico (`normalize(out, 0.9)`) não dá a mesma sonoridade: um clique curto e um ruído longo com o mesmo pico têm sonoridades muito diferentes. Normalizar à sonoridade (RMS ou LUFS) por categoria (ver [8](#8-verificar-a-qualidade-sem-ouvir)).
- **Tudo no centro.** Pequenas posições estéreo (a bola segue o jogador no campo) dão vida e separam os sons.
- **Sons mais longos do que o acontecimento.** Uma cauda que continua depois da ação seguinte suja a leitura.
- **Demasiados sons em simultâneo.** Limitar vozes por tipo e definir prioridades (ver [3.3](#33-chiptune-e-as-restrições-da-nes-e-do-game-boy)).

---

## 8. Verificar a qualidade sem ouvir

Um agente não ouve, mas pode **medir** e **ver**. A estratégia: transformar cada propriedade do bom desenho (secções 1–7) em números com intervalos aceitáveis, e em imagens.

### 8.1 Medidas por som

Todas estas medidas são simples de calcular em TypeScript sobre um `Float32Array` (sem bibliotecas):

| Medida | Como | O que diz | Alvo de exemplo |
|---|---|---|---|
| **Duração útil** | Tempo até o envelope ficar abaixo de -40 dB do pico, e -60 dB | Se o som é curto o bastante | Clique de interface < 100 ms; drible < 250 ms; rede < 450 ms |
| **Pico** | `max(abs(x))` | Saturação | ≤ 0,95 (≤ -0,5 dBFS) |
| **RMS / sonoridade** | RMS em janela de 50–400 ms; ou LUFS (BS.1770: filtro K + média). Valores mais perto de 0 = mais alto ([LUFS, Wikipédia](https://en.wikipedia.org/wiki/LUFS)) | Volume percebido | Dentro de ±1,5 dB do alvo da categoria |
| **Fator de crista** | pico / RMS (em dB) | «Soco», transientes. Um impacto tem crista alta; um ruído contínuo, baixa ([audio-inspect](https://unpkg.com/audio-inspect@0.0.2/README.md)) | Impactos > 12 dB; multidão 8–12 dB |
| **Tempo de ataque** | Tempo de 10% a 90% do pico do envelope | Duro ou suave | Impactos < 5 ms; metais 15–40 ms |
| **Decaimento** | Tempo do pico até -20 dB e até -40 dB; e a forma (log do envelope ≈ reta = exponencial) | Natural ou sintético | Envelope em dB quase linear no tempo (exponencial) |
| **Centróide espectral** | Média das frequências pesada pela magnitude (FFT) | Brilho ([BrainModular](https://www.brainmodular.com/manuals/hh7/en/modules/audio/analysis/audio-analysis-descriptors)) | Drible 300–900 Hz; rede 3–6 kHz; interface 800–2500 Hz |
| **Evolução do centróide** | Centróide em janelas ao longo do som | Envelope estático ou não | Deve **descer** ao longo de um impacto |
| **Energia por bandas** | % da energia em < 150 Hz, 150–600, 600–2k, 2k–6k, > 6k | Equilíbrio, agudos a mais | > 6 kHz < 10% exceto rede e ruídos de papel |
| **Planura espectral** (*flatness*) | Média geométrica / média aritmética do espectro | Tonal (≈0) ou ruído (≈1). Confirma que há componente de ruído | Impactos: planura do ataque > 0,3; tons de interface < 0,1 |
| **Inarmonicidade** | Encontrar picos, comparar com múltiplos inteiros do mais grave | Metal/sino vs harmónico | Aro: desvio grande; buzina: pequeno |
| **Altura e contorno** | Autocorrelação ou YIN em janelas | Se sobe/desce como deve; se a nota está na escala | Confirmar: subida (≥ +1 semitom) nos positivos, descida nos negativos |
| **Nota na escala** | Converter a altura medida em classe de nota e verificar se pertence à escala do jogo, com tolerância de ±20 cêntimos | Coerência com a música | 100% dos sons tonais de interface e recompensa |
| **DC e cliques** | Média do sinal; valor absoluto da 1.ª e última amostra; maior salto entre amostras | Defeitos técnicos | Média < 0,001; extremos < 0,001 |
| **Taxa de cruzamentos por zero** | Cruzamentos por segundo | Proxy barato de ruído/brilho | Para comparar variantes |

### 8.2 Medidas da família e do conjunto

- **Variação entre instâncias.** Gerar o mesmo som com 20 sementes. A distância entre espectros (por exemplo, a diferença média em dB por banda) não deve ser zero (sem variação: efeito metralhadora) nem enorme (deixa de ser o mesmo som). Alvo de exemplo: centróide com desvio-padrão de 3–10%; sonoridade ±1 dB.
- **Determinismo.** A mesma semente → o mesmo buffer, amostra a amostra (é uma regra do projeto para a simulação, e convém para o áudio também, para testes estáveis).
- **Coerência da família.** Os sons de uma família (interface) devem ter centróides próximos, sonoridade dentro de ±2 dB e o mesmo timbre (por exemplo, uma razão parecida entre o 2.º e o 1.º harmónico).
- **Separação de papéis.** Os sons que podem soar juntos (rede + multidão + música) devem ter os centróides e as bandas dominantes separados. Teste: misturar e verificar que, na banda dominante da rede (3–7 kHz), a rede tem pelo menos 6 dB mais que o resto durante o seu ataque.
- **Hierarquia de volume.** A sonoridade do som mais importante (buzina final, cesto) deve ser maior que a dos sons frequentes (drible, interface). Testar a ordem.
- **Teste da repetição.** Gerar 50 cliques de interface a 4/s: sonoridade média baixa (por exemplo, pelo menos 12 dB abaixo do cesto), energia > 3 kHz baixa, variação presente.
- **Teste de cansaço da música.** Medir quantos compassos passam até a música repetir *exatamente* (comparar a sequência de notas geradas); alvo: muito mais que a duração média de um jogo.
- **Sonoridade da mistura.** Os padrões de sonoridade para jogos (ASWG-R001 da Sony, de 2013) tentam pôr a indústria de acordo num alvo de sonoridade integrada; os números exatos variam por plataforma e não os confirmei a partir do documento ([Designing Sound, entrevista a Garry Taylor](https://designingsound.org/2012/07/30/video-games-and-loudness-standards-interview-with-sonys-garry-taylor/feed); [MCV, Crytek](https://mcvuk.com/development-news/audio-loudness-for-gaming-the-battle-against-ear-fatigue)). Como os jogos são imprevisíveis, uma medida de **gama de sonoridade** pode ser mais útil que um só número ([Designing Sound, 2013](https://designingsound.org/2013/02/loudness-in-game-audio/)). Para um jogo de browser/telemóvel, um alvo prático é ter a mistura de um jogo típico com uma sonoridade integrada estável entre partidas.

### 8.3 Comparar com uma referência

1. **Escolher referências** reais (gravações de bola, rede, pavilhão de bibliotecas livres de direitos, só para análise; nunca entram no jogo).
2. **Extrair o mesmo vetor de medidas** (duração, ataque, decaimento, centróide e a sua evolução, energias por banda, planura, crista) da referência e do som sintetizado.
3. **Calcular uma distância** por medida, normalizada. O projeto DeepAFX faz isto para efeitos de áudio: perda L1 entre fatores de crista e entre centróides médios, com a sonoridade medida pelo `pyloudnorm` ([DeepAFX, metrics.py](https://huggingface.co/spaces/nateraw/deepafx-st/blob/66a6dc0077230e43f7698f7f9a9567b4cafc3c08/deepafx_st/metrics.py)). Não há limiares validados de semelhança percetiva; usar as distâncias para **ordenar candidatos e detetar regressões**, não como juízo final.
4. **Comparar imagens.** Espectrograma (STFT, escala de frequência logarítmica, dB) da referência e do sintetizado, lado a lado, nos mesmos eixos, guardados em PNG. O agente pode ler as imagens e comparar formas: onde está a energia, como decai, se há linhas (tons) ou manchas (ruído).
5. **Exagero intencional.** A distância à referência não deve ser zero: a [1.4](#14-exagero-contra-realismo) pede exagero. Registar o desvio pretendido («a rede 20% mais longa e mais brilhante que a referência») e testar *esse* alvo.

### 8.4 O que o projeto pode fazer já (sem mexer agora, só como proposta)

- Um teste que, para cada som de `synth.ts`, verifica duração, pico, cliques, crista e centróide dentro de intervalos escritos ao lado (como `audio.test.ts` faz já para algumas coisas).
- Um comando tipo `anim-check` que desenhe espectrogramas e formas de onda de todos os sons em `dist-check/`, para revisão visual (por um agente ou por uma pessoa).
- Uma tabela da escala do jogo e um teste que confirme que todos os sons tonais de interface e de recompensa caem em notas da escala.
- Um teste de mistura: um jogo simulado curto, renderizado em `OfflineAudioContext`, com a sonoridade e o pico da mistura medidos.

### 8.5 Limites das medidas

As medidas apanham defeitos técnicos e mudanças, e garantem coerência. **Não garantem que o som é bonito ou que tem carácter.** Para isso: pedir a uma pessoa que ouça os sons novos (e registar o que disse), e confiar mais nas decisões de desenho das secções 1 a 6 do que nos números.

---

## 9. Receitas e lista de verificação para o Pocket Basketball

### 9.1 Paleta proposta

- **Tom do jogo:** Si bemol maior (o do hino) para cerimónia e vitória; o mesmo centro em dórico para tensão e derrota.
- **Timbres-base:** metais (cerimónia), glockenspiel (recompensa e interface), timbales e tarola (drama), ruído filtrado (mundo físico), vozes de formantes (multidão e balbucio).
- **Espaço:** a sala do pavilhão para tudo o que é do mundo; a interface seca.

### 9.2 Receitas curtas

| Som | Camadas | Notas de desenho |
|---|---|---|
| **Drible** | Ping tonal do ar (modos 90–1200 Hz) + baque do piso + clique curto | Variar a força com o contexto; limitar a 2–3 vozes; ligeiro *pan* com a posição |
| **Chiar de ténis** | Oscilador 1,5–2,5 kHz com altura irregular + ruído 4 kHz | Aleatório por instância; nas mudanças de direção |
| **Passe** | *Whoosh* curto (ruído com passa-banda a subir) + pancada na mão (ruído médio 10 ms + baque grave) | O passe picado com drible no meio |
| **Rede (cesto)** | Ruído agudo que sobe e decai suave + cintilação opcional | A recompensa principal: exagerar brilho e duração; ducking da música |
| **Aro (falhanço)** | Modos inarmónicos + baque do suporte + 2.º toque | O castigo: mais metálico que o real, mas curto |
| **Tabela** | Baque cheio + brilho curto do acrílico/vidro | — |
| **Desarme (*block*)** | Palmada (ruído médio, ataque 1 ms) + baque da bola desviada + «uuh» da multidão 100 ms depois | Inventado, por isso estilizado |
| **Afundanço** | Ver [1.1](#11-camadas-ataque-corpo-cauda-e-adoçante-e-sub) | Raro, por isso pode ser grande |
| **Apito** | Tom 2–4 kHz com trilo (a bola dentro do apito) + sopro | Prioridade máxima |
| **Buzina** | Tom quadrado/serra filtrado, com batimento entre duas vozes desafinadas | A final: o som mais alto do jogo |
| **Multidão** | Camada de base contínua + reações por humor (ver NHL 22) | O melhor sistema adaptativo de um jogo de gestão |
| **Carta** | Ver [6.4](#64-desbloquear-cartas-um-exemplo-de-desenho) | Raridade em camadas |
| **Interface** | Família da [5.2](#52-uma-família-de-interface-proposta) | Na escala do jogo |
| **Balbucio** | Formantes por sílaba, altura por personagem, entoação | Ver [3.5](#35-a-fala-balbuciada-animal-crossing-e-undertale) |

### 9.3 Lista de verificação para cada som novo

- [ ] Consigo descrever a **ideia** do som numa frase?
- [ ] Tem **ataque, corpo e cauda** (ou a razão por que não)?
- [ ] Tem **componente de ruído**?
- [ ] O **envelope evolui** (exponencial, filtro a fechar, modos com decaimentos diferentes)?
- [ ] Os parciais são **inarmónicos** onde o material o pede?
- [ ] Há **variação** entre instâncias (e é determinista com a semente)?
- [ ] Os **agudos** estão controlados (energia > 6 kHz pequena, salvo intenção)?
- [ ] Está na **sala** certa (ou explicitamente seco)?
- [ ] A **duração** cabe no acontecimento?
- [ ] Se é tonal, está **na escala do jogo**? O **contorno** (sobe/desce) corresponde ao significado?
- [ ] A **sonoridade** está no alvo da categoria?
- [ ] Não tem **cliques** no início nem no fim, nem DC?
- [ ] Coincide com o **frame** da animação?
- [ ] Aguenta **50 repetições** sem irritar (medido)?
- [ ] Não tapa um som mais importante que possa soar ao mesmo tempo?
- [ ] É **original** (não imita um som reconhecível de outro jogo)?
- [ ] Alguém **ouviu**? (Se não, dizê-lo na entrega.)

---

## 10. Fontes

**Fundamentos e prática de desenho de som**

- Violet Recording, [How to Make Impact and Hit Sounds](https://violetrecording.com/how-to-make-impact-sounds/) e [How to Design Weapon Sounds for Games](https://violetrecording.com/how-to-design-weapon-sounds/)
- IRPR Sound, glossário: [layering](https://sounddesign.irpr.agency/glossary/layering/), [impact](https://sounddesign.irpr.agency/glossary/impact/)
- Morphic, [How to layer sound effects](https://morphic.com/resources/how-to/how-to-layer-sound-effects), [How to make sound effects for games](https://morphic.com/resources/how-to/how-to-make-sound-effects-for-games), [Basketball sound effects](https://morphic.com/resources/sounds/basketball-sound-effects), [Level up sound effects](https://morphic.com/resources/sounds/level-up-sound-effects)
- Andy Farnell, *Designing Sound*, MIT Press, 2010: [Penguin Random House](https://penguinrandomhouse.ca/books/655213/designing-sound-by-andy-farnell/9780262014410), [OpenCourser](https://opencourser.com/book/50vd9c/designing-sound), [recensão Cycling '74](https://cycling74.com/articles/book-review-designing-sound/replies/1)
- Microsoft Research, [Sound Synthesis for Impact Sounds in Video Games](https://microsoft.com/en-us/research/?p=309038)
- SozAI, [Why your sounds feel fake](https://sozai.app/transcript/why-sounds-feel-fake/index.md) (resumo de vídeo; fonte fraca)
- SFX Engine, [Common game audio mistakes](https://sfxengine.com/blog/common-game-audio-mistakes)
- Future Proof Music School, [How do I recreate specific sounds](https://futureproofmusicschool.com/blog/how-do-i-recreate-specific-sounds-i-hear-in-professional-tracks)
- Apple, [Spectral synthesis no Alchemy](https://help.apple.com/logicpro-instruments/mac/10.2.1/en.lproj/lgsibf71c5f6.html); [ARSE](https://sourceforge.net/p/arse/); [manual do Praat](https://www.fon.hum.uva.nl/rob/Courses/SpeechRecAndSyn/Literature/praat_manual.pdf)

**Foley**

- Mental Floss, [How Foley Artists Use Food](https://www.mentalfloss.com/article/91335/how-foley-artists-use-food-make-sound-effects)
- NPR, [How Hollywood Makes Noise](https://www.npr.org/2007/02/20/7400850/how-hollywood-makes-noise)
- The Straight Dope, [How do they make punch sounds](https://www.straightdope.com/21342204/how-do-they-make-punch-sounds-in-movies); San Diego Reader, [idem](https://Www.sandiegoreader.com/news/2002/feb/07/how-do-they-make-sound-punch-movies/)

**Nintendo**

- Nintendo Life, [Koji Kondo, entrevista de 2001 traduzida](https://www.nintendolife.com/news/2016/11/composer_koji_kondo_talks_super_mario_and_zelda_in_freshly_translated_2001_interview)
- Iwata Asks: [Super Mario Galaxy (som)](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/3), [idem, início](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/0), [Wii Fit (som)](https://iwataasks.nintendo.com/interviews/wii/wii_fit/3/1), [Wii Play Motion](https://iwataasks.nintendo.com/interviews/wii/wiiplaymotion/0/3)
- Game Audio Lookout, [Musical Sound Effects in the Super Mario Series](https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94)
- The Mary Sue, [partitura do som da moeda](https://themarysue.com/super-mario-coin-sound-sheet-music/?amp=1); Nintendo Wire, [marca registada do som da moeda](https://nintendowire.com/news/2016/03/23/nintendo-files-trademark-mario-bros-coin-sound/)
- Miketendo64, [Mario devs on the sound team's influence on Wonder](https://miketendo64.com/2023/10/19/mario-devs-on-the-sound-teams-influence-on-wonder/)
- Mario Wiki, [Ground BGM (Super Mario World)](https://www.mariowiki.com/Overworld_Theme_(Super_Mario_World)); Video Game Music Nerd, [My gaming audio history: Super Mario](https://videogamemusicnerd.blogspot.com/2014/06/my-gaming-audio-history-super-mario.html)
- Nookipedia, [Animalese](https://nookipedia.com/wiki/Animalese)

**Demoscene e sintetizadores minúsculos**

- Wikipédia, [.kkrieger](https://en.wikipedia.org/wiki/.kkrieger), [Farbrausch](https://en.wikipedia.org/wiki/Farbrausch)
- KVR Audio, [Farbrausch V2 synthesizer system released](https://www.kvraudio.com/news/farbrausch_v2_synthesizer_system_released_2794); rekkerd.org, [farbrausch releases V2 v1.5](https://rekkerd.org/farbrausch-releases-v2-v15/); GitHub Blog, [Ten Years of farbrausch Productions on GitHub](https://github.blog/news-insights/ten-years-of-farbrausch-productions-on-github)
- [4klang](https://github.com/paulyc/4klang); [resumo do texto do autor](https://segmentfault.com/p/1210000047067572); [Sointu](https://github.com/in4k/sointu); [64klang](https://github.com/w23/64klang); in4k, [Auld's 4k synth](https://in4k.github.io/wiki/aulds-4k-synth)
- DrPetter, [project sfxr](https://drpetter.se/project_sfxr.html); [Bfxr](https://www.bfxr.net/v1); [bfxr2](https://github.com/increpare/bfxr2); rekkerd.org, [Bfxr](https://rekkerd.org/bfxr-free-sound-fx-generator-by-increpare/)
- Keith Clark, [ZzFXM](https://keithclark.co.uk/articles/zzfxm/); [zzfx no npm](https://npmjs.com/package/zzfx); [Frank Force, ZzFX](https://frankforce.com/tag/zzfx/)
- Marcus Geelnard, [SoundBox](https://www.github.com/mbitsnbites/soundbox), [bitsnbites.eu](https://bitsnbites.eu/category/audio); [nomis 2 (js13k)](https://github.com/js13kGames/nomis-2)
- [2021: a Space Opera, post-mortem js13k](https://medium.com/@herebefrogs/2021-a-space-opera-a-js13kgames-2021-post-mortem-94cc2e061031); Mozilla Hacks, [js13kGames: code golf for game devs](https://hacks.mozilla.org/2016/08/js13kgames-code-golf-for-game-devs/)

**Chiptune**

- [Documentação do som do Contra (NES)](https://raw.githubusercontent.com/vermiceli/nes-contra-us/main/docs/Sound%20Documentation.md); NESdev, [Nerdy Nights: APU overview](https://nesdev.org/wiki/Nerdy_Nights:_APU_overview); [fórum NESdev, sound effects](https://nesdev.nes.science/f6/t4836.xhtml)
- GB Studio Central, [canais reservados para efeitos](https://gbstudiocentral.com/?p=2903)

**Procedural, generativo e adaptativo**

- Kent Jolly e Aaron McLeran, [Procedural Music in SPORE, GDC 2008](https://archive.org/details/GDC2008Jolly); [PDCON, Using Pure Data in Spore](https://www.uni-weimar.de/kunst-und-gestaltung/wiki/PDCON:Conference/Using_Pure_Data_in_Spore_and_Darkspore); Exclaim, [Brian Eno scores Spore](https://exclaim.ca/music/article/brian_eno_scores_spore); Synthtopia, [Brian Eno's Music For Spore](https://www.synthtopia.com/content/2008/09/24/brian-enos-music-for-spore/); [entrevista GameSpy a Eno](https://moredarkthanshark.org/eno_int_gspy-feb08.html); Long Now, [Eno e Wright, Playing with Time](https://longnow.org/seminars/02006/jun/26/playing-with-time); CDM, [Eno with Wright on Spore](https://cdm.link/2007/06/brian-eno-with-wright-on-spore-and-generative-systems-sound-and-paintings/)
- Paul Weir: Audiokinetic, [Behind the Sound of No Man's Sky](https://audiokinetic.com/en/blog/behind-the-sound-of-no-mans-sky-a-qa-with-paul-weir-on-procedural-audio); MCV, [The Sound of No Man's Sky](https://mcvuk.com/development-news/the-sound-of-no-mans-sky/); GDC Vault, [The Sound of No Man's Sky](https://gdcvault.com/play/1024067/The-Sound-of-No-Man); Smithsonian, [How video game designers make artificial creatures sound real](https://www.smithsonianmag.com/smart-news/how-video-game-designers-make-artificial-creatures-sound-real-180955268/); A Sound Effect, [No Man's Sky procedural audio](https://www.asoundeffect.com/no-mans-sky-sound-procedural-audio/); Kill Screen, [Watch the man who creates No Man's Sky's creature sounds](https://www.killscreen.com/watch-creates-no-mans-sky-creature-sounds)
- Wikipédia, [Proteus](https://en.wikipedia.org/wiki/Proteus_(video_game))
- New Statesman, [How Tetsuya Mizuguchi reinvented video games](https://newstatesman.com/culture/2017/07/how-tetsuya-mizuguchi-reinvented-video-games-his-love-synaesthesia); TheGamer, [Mizuguchi synaesthesia](https://www.thegamer.com/tetsuya-mizuguchi-synaesthesia-game-rez-infinite-area-x/); PC Gamer, [Mizuguchi on Tetris Effect](https://www.pcgamer.com/japan-week-mizuguchi-on-the-magic-of-tetris-effect)
- Game Developer, [Game audio analysis - Tetris Effect](https://www.gamedeveloper.com/audio/game-audio-analysis---tetris-effect); Digital Trends, [Tetris Effect](https://digitaltrends.com/gaming/tetris-effect-makes-tetris-feel-new-again); dinogame.gg, [Tetris sound design](https://dinogame.gg/blog/tetris-sound-design-analysis/) (fonte fraca)
- Designing Sound, [The Programmed Music of Mini Metro](https://designingsound.org/2016/02/18/the-programmed-music-of-mini-metro-interview-with-rich-vreeland-disasterpeace); [Disasterpeace, blogue](https://disasterpeace.com/blog/tag.analysis); Game Developer, [Turning road noise into music in Mini Motorways](https://www.gamedeveloper.com/design/turning-road-noise-into-music-mini-motorways)
- Shacknews, [Ape Out's jazz soundtrack](https://www.shacknews.com/article/110273/ape-outs-jazz-soundtrack-explored-in-devolver-digital-video); GameSpot, [Ape Out review](https://www.gamespot.com/reviews/ape-out-review-monkey-business/1900-6417095/)
- Berklee Online, [horizontal re-sequencing](https://online.berklee.edu/takenote/?p=14985); bugnet.io, [Adaptive music: a beginner's guide](https://bugnet.io/blog/adaptive-music-a-beginners-guide); Packt, [FMOD transition timelines and stingers](https://packtpub.com/en-tr/product/game-audio-development-with-unity-5x-9781787286450/chapter/fmod-for-dyanmic-and-adaptive-audio-7/section/transition-timelines-and-stingers-ch07lvl1sec48); Cycling '74, [quantize sfplay start time](https://cycling74.com/forums/simply-quantize-sfplay-start-time)
- Game Developer, [Rethinking the audio loop in games](https://www.gamedeveloper.com/audio/rethinking-the-audio-loop-in-games); Devon Thome, [Reducing music fatigue](https://world.hey.com/thome/game-101-reducing-music-fatigue-d0214e31); Gamewatcher, [Pillars of Eternity music](https://www.gamewatcher.com/2014-16-04-pillars-of-eternity-blog-update-covers-music-writing-and-production)

**Desporto e multidão**

- SVG, [EA Sports' Eric Paul on sound for NHL 22](https://www.sportsvideo.org/2021/10/28/svg-sit-down-ea-sports-audio-director-eric-paul-talks-sound-for-nhl-22/?print=1); O'Reilly, [Game Audio Implementation, cap. 11: Sports Dialogue and Crowds](https://www.oreilly.com/library/view/game-audio-implementation/9781317679455/xhtml/Ch011.xhtml); SVG, [NBA virtual crowd-noise mix](https://www.sportsvideo.org/2020/08/13/nba-returns-court-sound-is-complex-and-authentic/)
- Big Fish Audio, [Basketball sound effects](https://www.bigfishaudio.com/Sports-Sound-Effects-Basketball) (catálogo, para perceber as categorias de sons)

**Interface, recompensa e sumo**

- bugnet.io, [UI sound design for indie games](https://bugnet.io/blog/ui-sound-design-for-indie-games); r/GameAudio, [variações nos sons de interface](https://redlib.belloworld.it/r/GameAudio/comments/1g0rz2b/do_you_create_variations_for_the_ui_sounds)
- Game Juice, [What Juice it or Lose it teaches](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons); Game Developer, [Is your game juicy enough?](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-); [Game feel](https://wiki.krisyotam.com/content/wikipedia_en_all_nopic_2026-03/Game_feel)
- Game Developer, [Why Candy Crush Saga is so engaging: an audio breakdown](https://www.gamedeveloper.com/audio/why-candy-crush-saga-is-so-engaging-an-audio-breakdown); PocketGamer.biz, [Inside audio design at King](https://www.pocketgamer.biz/inside-audio-design-at-king/)
- TV Tropes, [Peggle](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Peggle); Game Informer, [Ode to Joy](https://gameinformer.com/games/peggle_2/b/xboxone/archive/2013/12/10/ode-to-joy); TCRF, [Prerelease: Peggle Deluxe](https://new.tcrf.net/Prerelease:Peggle_Deluxe_(Windows,_Mac_OS_X)); Audiogang, [Peggle 2: sonic joy](https://www.audiogang.org/peggle2-sonic-joy/)
- Winterbite Studios, [RPG Maker MZ dialogue bleep](https://winterbitestudios.itch.io/plugin-rpg-maker-mz-dialogue-bleep); Steam, [discussão sobre as vozes do Undertale](https://steamcommunity.com/app/391540/discussions/0/412448158156787760)

**Medidas e sonoridade**

- [audio-inspect](https://unpkg.com/audio-inspect@0.0.2/README.md); BrainModular, [Audio analysis descriptors](https://www.brainmodular.com/manuals/hh7/en/modules/audio/analysis/audio-analysis-descriptors); DeepAFX, [metrics.py](https://huggingface.co/spaces/nateraw/deepafx-st/blob/66a6dc0077230e43f7698f7f9a9567b4cafc3c08/deepafx_st/metrics.py)
- Wikipédia, [LUFS](https://en.wikipedia.org/wiki/LUFS); Designing Sound, [Video games and loudness standards: Garry Taylor](https://designingsound.org/2012/07/30/video-games-and-loudness-standards-interview-with-sonys-garry-taylor/feed) e [Loudness in game audio](https://designingsound.org/2013/02/loudness-in-game-audio/); MCV, [Crytek on audio loudness](https://mcvuk.com/development-news/audio-loudness-for-gaming-the-battle-against-ear-fatigue)
