# Design, mistura e implementação de som: guia para o Pocket Basketball

Pesquisa feita em novembro de 2026. Foco: jogos de desporto e jogos de gestão pequenos, retro ou em pixel art, com todo o som sintetizado em Web Audio, vistos de cima, com pausas e descontos de tempo, a 1×, 2× e 4×, em telemóvel e computador.

**Sobre as fontes.** O WebFetch falhou para quase todos os sites (ea.com, gamedeveloper.com, developer.mozilla.org, learn.microsoft.com, designingsound.org, bugnet.io: o nome do servidor não resolve nesta sessão). Por isso, tudo o que vem abaixo apoia-se nos resumos da pesquisa web e nas páginas que eles citam. Marco cada afirmação com o grau de confiança:

- **[F]**: fonte primária ou documentação oficial (spec, bug do WebKit, Chrome, Godot, Wwise, ITU, AES).
- **[S]**: fonte secundária razoável (imprensa da especialidade, fórum de programadores, guia técnico).
- **[P]**: prática corrente ou dedução minha, sem fonte que a fixe. Os números assim marcados são pontos de partida a afinar de ouvido.

No fim há uma secção sobre o que o código atual (`src/ui/audio.ts`) já faz e o que lhe falta, e uma lista de números para copiar.

---

## 1. Hierarquia da mistura e prioridades

A regra que todos os guias repetem: **decidir por escrito o que tem de se ouvir sempre**, e fazer o resto ceder a isso [S] ([bugnet: mix so nothing drowns out](https://bugnet.io/blog/how-to-mix-game-audio-so-nothing-drowns-out)). Jan Willem Nijman, na lista de 30 truques da palestra *The Art of Screenshake*, inclui um que é exatamente isto: um som que devia ser baixo está alto de mais e tira atenção aos que deviam mandar [S] ([lista dos 30 truques](https://makegamessa.com/discussion/comment/16542)).

A DICE (Battlefield: Bad Company, motor Frostbite) usou "HDR audio": a prioridade de cada som é a sua sonoridade, porque o volume é uma boa aproximação da importância; os sons mais baixos são cortados quando não cabem na "janela" de dinâmica [F/S] ([HDR Audio, Adaptive mixing in Frostbite](https://www.slideshare.net/slideshow/adaptive-mixing-in-frostbite/3128152)). O Wwise adotou a mesma ideia: o som mais alto em jogo baixa automaticamente os outros, o que dá uma mistura mais focada e menos vozes [F] ([Audiokinetic, HDR](https://audiokinetic.com/en/blog/wwise-hdr-overview-and-best-practices-for-game-mixing); [MCV, Simon Ashby](https://mcvuk.com/development-news/audio-special-getting-ready-for-hdr-audio)). Para um jogo pequeno, um HDR completo é exagero; basta uma tabela fixa de prioridades e um ducking simples.

### Tabela proposta para o Pocket Basketball [P]

| Nível | Sons | Regra |
|---|---|---|
| 1. Informação de jogo (nunca cortar) | apito, buzina de fim de período, buzina dos 24 s, cesto marcado (rede e o "ping" de pontos), pedido de desconto de tempo aceite | Toca sempre, rouba voz se for preciso, baixa a música e a bancada |
| 2. Ação principal | ressalto no aro, tabela, desarme, desconto, carta jogada, combo | Toca quase sempre, com limite de repetições |
| 3. Reação | aplauso, "uh!", grito da bancada depois de cesto ou falha | Segue o nível 1 e 2 com atraso de 80 a 200 ms |
| 4. Ambiente | burburinho, passos, ressaltos de bola em drible, chiar de ténis | Primeiro a ser cortado, primeiro a ser rarefeito a 2× e 4× |
| 5. Música | temas de menu, de jogo, vinhetas | Baixa debaixo de 1; nunca tapa 1 nem 2 |

Equilíbrio de níveis relativo (ponto de partida) [P]: nível 1 entre −6 e −3 dBFS de pico antes do master; ação principal 3 a 6 dB abaixo; reação e ambiente 8 a 14 dB abaixo do apito; música de jogo 10 a 15 dB abaixo do apito, e música de menu mais alta (no menu ela é o protagonista).

---

## 2. Ducking e sidechain

- Ducking clássico: um compressor no barramento da música, comandado pelo barramento de voz ou de efeitos críticos, com **ataque rápido, cerca de 10 ms** [S] ([bugnet](https://bugnet.io/blog/how-to-mix-game-audio-so-nothing-drowns-out)). Exige que música, efeitos e voz estejam em barramentos separados, porque o ducking atua sobre o barramento [S] ([bugnet: ducking under dialogue](https://bugnet.io/blog/how-to-fix-audio-not-ducking-under-dialogue)).
- Alternativa: *snapshots* (fotografias de todos os volumes e parâmetros) com transições entre eles, que funcionam como automação de baixa resolução [S] ([Game Audio Theory: Ducking, Gamasutra](https://www.gamedeveloper.com/audio/game-audio-theory-ducking); [Unity, snapshots e ducking](https://uhiyama-lab.com/en/notes/unity/unity-audio-mixer-dynamic-music/)).
- No Web Audio não há sidechain nativo no `DynamicsCompressorNode`. O caminho barato e determinístico é o "ducking por evento": quando sai um som de nível 1, agenda-se uma curva no ganho do barramento da música [P]. É o que o código já faz em `duckMusic()`.

Números típicos [P]:

| Parâmetro | Música debaixo de apito/buzina | Bancada debaixo de apito | Música debaixo de vinheta de carta |
|---|---|---|---|
| Atenuação | −6 a −9 dB (ganho 0,35 a 0,5) | −3 a −6 dB | −10 a −12 dB |
| Ataque | 10 a 30 ms | 10 a 30 ms | 50 ms |
| Retenção | duração do som + 100 ms | idem | duração da vinheta |
| Recuperação | 300 a 800 ms | 300 a 500 ms | 500 ms |

Regra prática: a recuperação deve ser mais lenta do que o ataque, senão ouve-se "bombar". E se dois apitos chegam em 300 ms, o segundo prolonga o ducking em vez de o reiniciar (`cancelScheduledValues` + nova curva a partir do valor atual).

---

## 3. Limite de vozes e roubo de vozes

- O Wwise distingue vozes físicas e virtuais: um som passa a virtual se cai abaixo do limiar de volume ou se é empurrado pelo limite de reprodução e pela prioridade; fica-se a seguir o estado sem gastar processador [F/S] ([capítulo sobre Wwise, Taylor & Francis](https://www.taylorfrancis.com/books/9781315157542/chapters/10.1201/b22247-9)). A opção recomendada por defeito é "matar se for finito, senão virtual" [S]. Quando se atinge o limite, saem **as vozes de menor prioridade**, e o limite conta vozes, não eventos [S] ([Audiokinetic Q&A](https://audiokinetic.com/qa/1507/getting-the-voice-limit-count)). Desde o Wwise 2011.1 pode-se fixar um máximo global de vozes físicas por plataforma [F] ([notas da versão](https://www.audiokinetic.com/products/wwise/versions/2011-1)).
- A Nintendo 64 já fazia o mesmo em hardware: `alSynAllocVoice` rouba a voz física de prioridade mais baixa que seja igual ou inferior à pedida; se não houver, devolve uma voz virtual que não toca nada [F] ([manual N64](https://ultra64.ca/files/documentation/online-manuals/man-v5-1/n64man/al/alSynAllocVoice.htm)).
- Web Audio: não há limite oficial de `AudioBufferSourceNode` em simultâneo [F/S]. Mas:
  - uma fonte em ciclo gasta processador desde o `start()`, mesmo com ganho a zero; num portátil fraco o Firefox chegou aos 100% antes das 256 notas, e um telemóvel falhou logo [F] ([Mozilla bug 1271425](https://bugzilla.mozilla.org/show_bug.cgi?id=1271425));
  - em 2013, um iPad 2 rebentou com 8 sons curtos e o Chrome com 17, porque cada fonte guardava a sua cópia do buffer; a solução é **descodificar uma vez e reutilizar o mesmo AudioBuffer em todas as fontes** [F] ([WebKit bug 106621](https://bugs.webkit.org/show_bug.cgi?id=106621));
  - regra de bolso de um guia de áudio para jogos web: **20 a 30 sons em simultâneo no telemóvel, 50 a 60 no computador; memória de áudio até 40 MB no telemóvel e 150 MB no computador** [S, sem medição] ([abratabia, audio performance](https://www.abratabia.com/web-game-audio/audio-performance.php)).

Proposta para este jogo [P]:

- **Teto global: 24 vozes** (telemóvel) e 32 (computador). Uma "voz" é uma fonte com o seu grafo (buffer → filtro → ganho). Os osciladores contam como vozes.
- **Limites por família**: drible/passos 3; aro/tabela 2; aplauso e grito 4; burburinho 2 (cadeia de pedaços); apito 1 (um novo substitui o anterior com um corte de 10 ms); buzinas 1; UI 2; música conforme o arranjo (6 a 10 notas em simultâneo).
- **Quem é roubado**: dentro da família, a voz mais antiga (ou a mais baixa); entre famílias, a de menor prioridade da tabela da secção 1. Um som de nível 4 que não cabe **não toca**, não rouba.
- **Roubar sem estalo**: rampa de 5 a 15 ms até zero e `stop()` logo a seguir, nunca `stop()` a seco (secção 13.6).
- Desligar (`disconnect`) cada fonte no `onended`, para o lixo ser recolhido.

---

## 4. Sonoridade alvo para telemóvel e web

| Referência | Integrado | Pico verdadeiro | Fonte |
|---|---|---|---|
| Consolas de mesa (prática medida) | −24 ± 2 LKFS | — | ITU-R BS.2434 [F] ([PDF](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-BS.2434-2018-PDF-E.pdf)) |
| Portáteis de jogo (prática medida) | −18 ± 2 LKFS | — | ITU-R BS.2434 [F] |
| Sony ASWG-R001 | −23 (PS3) e −18 (PS Vita), ± 2 LU; LRA < 20 LU | −1 dBTP | [Designing Sound](https://designingsound.org/2013/02/20/different-loudness-ranges-for-console-and-mobile-games) [S]; outra fonte diz −24 LUFS para consola ([MCV, Simon Pressey](https://mcvuk.com/development-news/audio-loudness-for-gaming-the-battle-against-ear-fatigue)) |
| Streaming (AES TD1004) | não passar de −16 LUFS; não descer de −20 para se ouvir no telemóvel | −1 dBTP | [AES TD1004](https://www.scribd.com/document/440898812/AESTD1004-1-15-10-pdf) [F] |
| Guia de áudio para jogos | −16 a −20 LUFS | abaixo de 0, idealmente −1 dB | [bugnet: how loud](https://bugnet.io/blog/how-loud-should-your-game-be) [S] |

**Alvo proposto** [P, apoiado nas fontes]: **−18 LUFS integrado (± 2 LU) num jogo completo, pico verdadeiro ≤ −1 dBTP**, LRA (gama de sonoridade) entre 6 e 12 LU. Num telemóvel com altifalante pequeno vale a pena estar no topo da faixa (−16 a −17). Os momentos fortes (cesto decisivo, fim do jogo) podem chegar a −12 LUFS de curto prazo (3 s); o burburinho em descanso fica perto de −30 LUFS de curto prazo.

### Compressor e limitador no master

`DynamicsCompressorNode` [F] ([Chromium IDL](https://chromium.googlesource.com/external/github.com/dart-lang/webcore/+/master/modules/webaudio/DynamicsCompressorOptions.idl); [código WebCore](https://opensource.apple.com/source/WebCore/WebCore-7610.3.7.0.3/Modules/webaudio/DynamicsCompressorNode.cpp.auto.html)): valores por defeito limiar −24 dB, joelho 30 dB, razão 12, ataque 3 ms, recuperação 250 ms; razão de 1 a 20, joelho de 0 a 40. **Não é um limitador "parede"**, deixa passar picos [S/P]; tem ainda um pequeno atraso de antecipação próprio.

Cadeia sugerida [P]:

1. **Compressor de "cola"** (opcional, o que já existe): limiar −14 a −18 dB, razão 2 a 4, joelho 6 a 12, ataque 5 a 10 ms, recuperação 150 a 250 ms. Ganho de redução normal: 1 a 3 dB.
2. **Limitador de segurança**: um segundo `DynamicsCompressorNode` com limiar −3 dB, joelho 0, razão 20, ataque 1 ms, recuperação 50 a 100 ms. Em funcionamento normal não deve atuar mais de 1 a 2 dB.
3. **Teto final**: um `GainNode` a −1 dB (0,89) e, se a medição mostrar picos acima de −0,5 dBFS, um `WaveShaperNode` de saturação suave (curva tanh tabelada) só nos últimos 1 a 2 dB.
4. Ler `compressor.reduction` nos testes do browser: se passar de 6 dB com frequência, a mistura está alta de mais antes do master, e o problema não é do limitador.

---

## 5. Mascaramento de frequências e EQ

Princípios [S] ([ear training, faixa de presença](https://theaudiostuff.com/tools/ear-training.md); [Violet Recording](https://violetrecording.com/blog/how-to-fix-frequency-masking/); [eMastered](https://emastered.com/blog/frequency-masking)):

- A **zona de presença, 2 a 5 kHz**, é onde o ouvido é mais sensível; pequenas mudanças aí mexem muito na clareza e na fadiga.
- **Cava-se a camada concorrente, não o sinal**: um corte suave de 1 a 2 dB por volta dos 3 kHz nos instrumentos que competem; cortes subtrativos até 2 a 6 dB no máximo.
- Se o choque só acontece às vezes, **EQ dinâmica** (ou ducking por banda) em vez de corte fixo.
- Graves densos tapam sons agudos e fracos; corta-se primeiro o grave que mascara [S].

Mapa de espectro para o pavilhão [P]:

| Camada | Onde vive | O que tirar |
|---|---|---|
| Bola no chão (drible) | 80 a 250 Hz de corpo, 1 a 3 kHz de estalo | nada; é curto |
| Aro e tabela | 300 Hz a 2 kHz (metal), estalo a 3 a 6 kHz | passa-altos a 150 Hz |
| Rede ("swish") | 3 a 10 kHz, ruído | passa-altos a 1,5 a 2 kHz |
| Apito | fundamental 2,5 a 3,5 kHz com trilo | nada; é a referência |
| Buzina | 200 a 400 Hz com harmónicos fortes | passa-altos a 120 Hz |
| Bancada e burburinho | 300 Hz a 3 kHz (é voz humana) | passa-altos a 150 a 200 Hz; corte de 2 a 4 dB em 2,5 a 4 kHz; passa-baixos a 6 a 8 kHz em descanso |
| Música de jogo | toda a gama | passa-altos a 100 Hz no telemóvel; corte de 2 a 3 dB em 2,5 a 4 kHz durante o jogo (é aí que vivem apito e rede) |
| UI | 500 Hz a 4 kHz | curtos, por isso podem partilhar a presença |

Notas sobre telemóveis [P]: os altifalantes de telemóvel reproduzem pouco abaixo de 200 a 300 Hz; o grave de uma buzina tem de ter harmónicos acima disso para se ouvir. Testar sempre com um passa-altos a 300 Hz como "simulador de telemóvel".

---

## 6. Contra a repetição

### Bolsas de variantes

- O `AudioStreamRandomizer` do Godot é uma boa referência de valores e modos [F] ([documentação](https://docs.godotengine.org/en/latest/classes/class_audiostreamrandomizer.html)): `random_pitch_semitones` (desvio máximo em semitons; 0 desliga); `random_volume_offset_db` (3,0 significa entre −3 e +3 dB); um modo que **escolhe ao acaso por peso mas evita tocar o mesmo duas vezes seguidas**; com uma só amostra, toca sempre a mesma.

### Faixas de aleatoriedade usadas [P, com base na prática corrente]

| Som | Variantes | Altura | Volume | Outros |
|---|---|---|---|---|
| Drible, passos, chiar | 4 a 8 | ±1 a ±2 semitons | ±2 a ±3 dB | começo deslocado 0 a 10 ms |
| Aro, tabela | 3 a 6 | ±0,5 a ±1 semitom | ±2 dB | filtro ±10% |
| Rede | 3 a 4 | ±0,5 semitom | ±1,5 dB | — |
| Aplauso, gritos | 4 a 8, em camadas | ±1 semitom por camada | ±3 dB | 2 a 4 camadas desfasadas 20 a 80 ms |
| Apito | 1 a 2 | ±0,3 semitom no máximo | ±1 dB | tem de ser reconhecível; quase sem variação |
| Buzinas | 1 por pavilhão | 0 | 0 | identidade do pavilhão |
| UI | 1 por ação | 0, ou família tonal (secção 9) | 0 | consistência acima de variedade |

Regra: quanto mais **informativo** é o som, menos varia; quanto mais **ambiente**, mais varia. Acima de ±3 semitons, o objeto "muda de tamanho" (um alerta repetido nos fóruns de Unity [S] ([Unity Discussions](https://discussions.unity.com/t/music-speed-and-pitch-is-different-from-original-audio/344379))).

### Arrefecimentos (cooldowns)

Os sistemas de "barks" (falas curtas) usam três portas em camadas [S] ([StraySpark, barks](https://www.strayspark.studio/docs/godot-dialog-system/barks); [PulseGeek, cooldowns](https://pulsegeek.com/articles/dialogue-barks-timing-and-cooldown-best-practices/)): um intervalo mínimo global entre quaisquer falas, um arrefecimento por personagem e um por fala; mais uma memória do que tocou recentemente. Um jogador de Last Epoch pede **5 a 10 variantes por evento** e arrefecimentos muito mais longos para as falas de fundo [S] ([fórum Last Epoch](https://forum.lastepoch.com/t/add-more-varied-voice-over-lines-fools-fools-fools-fools/76115)).

Valores propostos [P]:

- Mesmo buffer no mesmo canal: pelo menos 40 a 60 ms entre disparos (evita "metralhadora" e fase).
- Grito de bancada do mesmo tipo: 1,5 a 3 s.
- Cântico ou ritmo de palmas: não repetir o mesmo antes de 2 a 3 minutos de jogo.
- Frase de narrador ou texto de comentário: não repetir a mesma frase em 10 minutos, nem a mesma categoria em 20 a 30 s; com a bolsa esgotada, cair para uma frase mais genérica ou para silêncio.
- Escolha "baralho" (shuffle bag): tirar sem reposição até esvaziar; ao rebaralhar, a primeira não pode ser a última do baralho anterior.

---

## 7. Bancada adaptativa nos jogos de desporto

### NBA 2K (Visual Concepts)

- Para o NBA 2K17, a equipa terá percorrido mais de 16 000 milhas e gravado mais de 200 horas de jogos ao vivo nas 30 equipas, incluindo as buzinas de cada pavilhão [S] ([Middle of Nowhere Gaming](https://middleofnowheregaming.com/2016/09/07/every-sound-is-authentic-in-nba-2k17-trailer); [SGO, Arena Authenticity](https://www.sportsgamersonline.com/games/basketball/nba-2k17-arena-authenticity-stadiums/amp/)).
- No NBA 2K19 os efeitos mudam conforme o pavilhão: bola, buzinas, bancada [S] ([PowerUp Gaming](https://powerup-gaming.com/2018/08/18/the-sound-effects-in-nba-2k19-are-different-based-on-which-arena-you-play-in); [Birchtree](https://birchtree.me/blog/i-love-that-game-developers-even-think-to-do-this/)).
- **Não encontrei documentação oficial** sobre como a bancada do 2K reage ao estado do jogo. Há páginas genéricas que o afirmam, sem fonte.

### NBA Live (EA Tiburon)

- NBA Live 09: a equipa cortou o ruído da bancada, cânticos e pequenas músicas de jogos reais da NBA e "espalhou-os" pelo jogo [S] ([blog de apresentação do Live 09, Operation Sports](https://www.osftw.com/iminurbase/blog/222-nba-live-09-pres-blog)).
- NBA Live 15: pesquisa de cânticos, música, efeitos e frases do locutor por equipa; mas sem ambiente autêntico para todos os pavilhões [S] ([Operation Sports](https://www.osftw.com/news/791286/how-the-nba-live-15-audio-team-created-an-authentic-arena-atmosphere)).
- Um jogador em 2015 achava que a bancada do Live tinha "um sobe e desce muito mais natural ao longo dos quatro períodos" do que a do 2K [S, opinião] ([Operation Sports](https://www.osftw.com/news/847285/nba-2k-lets-talk-about-some-nba-2k-audio-issues)).

### FIFA / EA Sports FC

- A equipa de áudio diz que nada é simulado nem sintético e que não há bancada genérica de biblioteca; o som muda por estádio (Old Trafford diferente do Vitality, do Bournemouth) [S] ([HyperX, FIFA 21 na Premier League](https://blog.hyperx.com/article/11006/how-fifa-21s-audio-engineers-came-to-the-rescue-of-premier-league-broadcasts)).
- Paul Boechler criou o sistema de reprodução dinâmica da bancada do FIFA; trabalhou com expansão para cima, EQ dinâmica e automação manual para dar dinâmica [S] ([Sound Particles](https://blog.soundparticles.com/how-paul-boechler-created-live-stadium-crowds-from-fifa-recordings)).
- Em 2020, o mesmo material serviu às transmissões sem público: um operador "como um DJ" disparava reações, cânticos e excitação em várias faixas ao ritmo da jogada [S] ([CFJC Today / Canadian Press](https://cfjctoday.com/?p=838128)). A NBA fez o mesmo na "bolha", com bancada virtual misturada a partir de material do 2K [S] ([SVG, NBA virtual crowd-noise](https://www.sportsvideo.org/2020/08/13/nba-returns-court-sound-is-complex-and-authentic/); [BU](https://www.bu.edu/articles/2020/the-bu-alum-behind-the-nbas-high-tech-fan-cheers-chants-and-chatter)).
- O College Football 25 anunciou bancadas dinâmicas com áudio real [S] ([esports.gg](https://cache.esports.gg/news/gaming/college-football-25-crowds-dynamic-use-real-world-audio)).

### Madden NFL 22 (o caso com mecânica explícita)

"Dynamic Gameday": o barulho da bancada afeta o jogo (o ataque visitante falha alterações de jogada; no estádio dos Seahawks os desenhos de jogada ficam difíceis de ler), um medidor de *momentum* que oscila conforme o desempenho, e uma vantagem de casa própria para cada uma das 32 equipas [S] ([Game Informer](https://www.gameinformer.com/preview/2021/06/17/madden-nfl-22-preview-a-new-set-of-downs); [SGO](https://www.sportsgamersonline.com/games/football/madden-22-brings-home-field-advantage-with-dynamic-gameday/amp/); [MUT.gg](https://www.mut.gg/news/madden-nfl-22-all-access-dynamic-gameday-deep-dive/)).

### Football Manager

O que há de público são sobretudo pacotes de som feitos por jogadores, que acrescentam reações da bancada a mais situações, cânticos e locutor do estádio; os sons ligam-se aos ficheiros `match_event` e `match_sounds` [S] ([FM Scout, FM24 sound pack](https://www.fmscout.com/a-fm24-audio-match-commentary.html); [sortitoutsi](https://sortitoutsi.net/comments/get/353338)). Ou seja: o FM base tem um ambiente de estádio e reações ligadas a eventos do motor de jogo, sem comentário falado; a comunidade sente que é pouco e enche-o. Não encontrei documentação oficial dos parâmetros.

### Modelo de excitação proposto para o Pocket Basketball [P]

Uma variável `excitement` entre 0 e 1, calculada pela interface a partir do estado da simulação (só lê, não muda nada, e não precisa de ser determinista porque não afeta o jogo):

```
alvo = base_pavilhão
     + 0,25 × proximidade        // 1 se diferença ≤ 3 pontos, 0 se ≥ 15, linear entre
     + 0,20 × fim_de_jogo         // 0 até faltarem 5 min do 4.º período; 1 no último minuto
     + 0,15 × série_casa          // série de pontos seguidos da equipa da casa, satura a 8-0
     + 0,30 × pico                // impulso que decai: cesto 0,4; triplo 0,6; afundanço/desarme 0,7; cesto da vitória 1
     − 0,30 × desnível            // diferença ≥ 20 pontos: a bancada "desliga"
excitement → segue o alvo com subida rápida (τ ≈ 0,3 s) e descida lenta (τ ≈ 4 a 8 s)
```

O que a excitação comanda:

| Excitação | Burburinho | Reações | Filtro | Extra |
|---|---|---|---|---|
| 0 a 0,3 | −30 LUFS curto prazo, poucas vozes | só depois de cestos | passa-baixos 5 kHz | silêncios longos (jogo decidido) |
| 0,3 a 0,6 | −26 | cesto e falhas grandes | 7 kHz | palmas ritmadas de vez em quando |
| 0,6 a 0,85 | −22 | quase todas as ações | 9 kHz | "de-fe-sa!" quando a casa defende |
| 0,85 a 1 | −18 | todas, mais altas | aberto | pé no chão, assobios, rugido no último segundo |

Outras regras do basquetebol que vale a pena imitar [P]:

- **Lado da bola**: a bancada da casa reage quando a casa marca; um cesto visitante tira "oohs" e silêncio (o silêncio é informação).
- **Lance livre**: o burburinho baixa 6 a 10 dB enquanto a casa lança; quando lança o visitante, assobios e ruído sobem.
- **Últimos 24 s e últimos 5 s**: contagem da bancada ou subida contínua do ruído, que é o sinal mais claro de "clutch" no basquetebol real.
- **Pavilhão**: o código já tem cinco salas (rua, escola, pavilhão, arena, jogo-treino vazio). Juntar a cada uma uma **buzina própria** e um "teto" de excitação (a rua nunca chega a 1) é o equivalente, em pequeno, às buzinas gravadas por pavilhão do 2K.

---

## 8. Comentário e alternativas a um locutor

Gravar comentário está fora de questão (o som é todo sintetizado, e a síntese de voz soa mal). Alternativas usadas em jogos pequenos [P, com exemplos]:

1. **Texto em rodapé, sem voz** (Football Manager em modo texto, Basketball GM, que é um jogo "de folhas de estatística" sem quase som [S] ([gmgames](https://gmgames.org/?p=16973))). O ritmo do texto faz de comentário. O projeto já tem `narrate.ts`.
2. **"Gibberish" ou "simlish" sintetizado**: sílabas curtas com altura que segue a emoção da frase (à maneira de Animal Crossing ou Undertale). Uma "voz" por tipo de frase: entusiasmo sobe, desilusão desce. Duração 0,3 a 1 s, volume 6 a 10 dB abaixo do apito.
3. **Locutor do pavilhão em motivos musicais**: em vez de dizer o nome do marcador, um motivo de 3 a 4 notas por tipo de cesto (2 pontos, 3 pontos, afundanço), tocado pelo "órgão do pavilhão". É o que o basquetebol real faz com o órgão e os "stings" de DJ.
4. **Bancada como comentador**: o "uh!", o assobio e o silêncio contam a história melhor do que uma voz repetida.
5. **Cartões de momento**: um banner de texto grande ("TRIPLO!", "RESSALTO!") com um som próprio; bom para quem joga sem som (secção 12).

Se houver frases de texto, aplicar as regras de arrefecimento da secção 6: o maior problema dos comentários em jogos de desporto é a repetição (secção 15).

---

## 9. Sons de interface e menus

Valores dos guias (fontes de qualidade variável, mas convergentes) [S] ([Violet Recording, UI sounds](https://violetrecording.com/how-to-design-ui-sounds/); [IRPR](https://sounddesign.irpr.agency/guides/what-is-ui-sound-design/); [Creator Sounds Pro](https://creatorsoundspro.com/the-art-of-soft-ui-sounds-how-subtle-notification-audio-shapes-modern-apps-games)):

- Toques e cliques: **30 a 150 ms**; feedback imediato: 50 a 200 ms; notificações: **200 a 500 ms**.
- **Confirmar sobe, cancelar desce**: duas notas a subir para confirmar ou ter êxito; um tom mais grave, ligeiramente desafinado ou a descer para erro ou cancelar.
- **Família**: mesmo timbre, mesma paleta tonal, durações e níveis da mesma ordem. Faixa de 200 a 800 Hz para não incomodar (só uma fonte).

Família proposta (uma tonalidade fixa, por exemplo Dó maior pentatónico, onda quadrada com 12,5% ou triangular, envolvente com 2 ms de ataque) [P]:

| Ação | Notas | Duração |
|---|---|---|
| Mover cursor / tocar num item | uma nota, G5 | 25 a 40 ms |
| Confirmar | C5 → G5 | 2 × 40 ms |
| Voltar | G5 → C5 | 2 × 40 ms |
| Erro / indisponível | E4 + F4 (meio-tom, dissonante), ou C4 em onda quadrada abafada | 120 ms |
| Abrir painel | arpejo C-E-G rápido | 90 ms |
| Desconto de tempo pedido (fica na fila) | duas notas iguais, C5 C5 | 2 × 50 ms |
| Desconto concedido | apito curto + acorde | 300 ms |
| Substituição | C5 → E5 → G5 | 3 × 40 ms |

Regras: **sem aleatoriedade na UI**; volume de UI 6 a 10 dB abaixo do apito; o som de UI não passa pela sala (sem reverberação do pavilhão) e não é acelerado pelo 2× ou 4×; a repetição rápida do cursor (mais de 8 por segundo) é limitada a uma por 60 ms.

---

## 10. Sons de recompensa e "juice"

- *The Art of Screenshake* (Jan Willem Nijman, Vlambeer, 2013): um shooter aborrecido transforma-se com 30 pequenos truques; entre eles, sons mais fortes, mais graves e com mais variação nas armas, e o equilíbrio para que o som importante domine [S] ([Kenney, vídeos essenciais](https://kenney.nl/learn/must-see-videos-for-indie-developers); [lista dos 30 truques](https://makegamessa.com/discussion/comment/16542); [Game Developer](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)).
- No Nuclear Throne, ao disparar a pistola, **o som sai antes dos efeitos visuais** [S] ([Vlambeer, Nuclear Throne juice](https://makegamessa.com/discussion/1344/vlambeer-s-jn-talks-about-nuclear-throne-juice)). Rami Ismail contou que, no Super Crate Box, os jogadores jogavam de forma mais agressiva quando o som da arma era mais forte [S] ([infovore](https://infovore.org/?p=5275)).
- *Juice it or Lose it* (Jonasson e Purho): som em quase todas as ações, variação de altura, camadas [S] ([resumo](https://gamejuice.pages.dev/articles/juice-it-or-lose-it-lessons)).

Aplicação a cartas, subir de nível e troféus [P]:

- **Antecipação → impacto → cauda**. Carta: um "whoosh" de 80 a 150 ms (ruído filtrado a subir) → ataque de 1 a 3 ms com transiente forte → cauda tonal de 300 a 600 ms. O impacto coincide com o frame em que a carta "assenta" (som antes ou no frame do impacto, nunca depois).
- **Raridade pela altura e pelas camadas**, não só pelo volume: comum = 1 nota; rara = acorde de 3 notas; épica = arpejo + brilho (sinos a 2 a 4 kHz) + sub-grave curto. O volume sobe no máximo 2 a 3 dB por grau; o resto vem da densidade.
- **Escada de notas para combos e séries** (moedas do Mario, combos de puzzle): cada combo seguido sobe um tom da escala, até 6 a 8 degraus, depois reinicia. Com um arrefecimento de 2 a 3 s para voltar ao início.
- **Subir de nível / promoção de divisão**: vinheta de 1,5 a 3 s, a música baixa 10 a 12 dB (ducking) e retoma depois (o código já tem temas com `resume`).
- Pequena pausa (20 a 60 ms) de "hit-stop" na imagem com o pico do som deixa o impacto mais legível.
- Não exagerar: a recompensa forte só vale se for rara. Se tudo tilinta, nada tilinta.

---

## 11. Som a 2× e a 4×

O comportamento por defeito de muitos motores (o Unity com `Time.timeScale`) é **acelerar e subir a altura de tudo**, música e UI incluídas; para os compensar usa-se `pitch = 1/timeScale` ou um pitch-shifter no misturador, com artefactos audíveis [S] ([bugnet: Unity timescale](https://bugnet.io/blog/fix-unity-timescale-affecting-audio-pitch); [Unity Discussions](https://discussions.unity.com/t/music-speed-and-pitch-is-different-from-original-audio/344379)). Em som sintetizado não há problema técnico: **cada som toca sempre à velocidade e altura normais**; só muda **quantos** sons e **quais**.

Política proposta [P]:

| Camada | 1× | 2× | 4× |
|---|---|---|---|
| Apito, buzinas, cesto | todos | todos | todos (cestos: só o "ping" e uma reação curta; buzina de 24 s mantém-se) |
| Aro, tabela, desarme | todos | todos, com arrefecimento por família de 100 ms | só os que mudam a posse; arrefecimento 200 ms |
| Drible, passos, chiar | todos | 1 em cada 2, volume −3 dB | desligados, ou 1 em cada 4 a −6 dB |
| Reações da bancada | normais | encurtadas (corte com rampa de 150 ms) | só para cestos e momentos de pico; nunca dois ao mesmo tempo |
| Burburinho | normal | normal | normal, −3 dB (é a "cama" que dá continuidade) |
| Música de jogo | tempo normal | tempo normal | tempo normal (nunca acelerar a música) |
| Narração em texto | toda | resumida | só eventos-chave |

Regras:

- Programar os sons pelo **tempo real**, não pelo tempo de jogo. Um evento que acontece a meio de um frame a 4× é agendado para `currentTime + pequena folga` (10 a 30 ms), não para o instante "simulado", que ficaria no passado.
- **Agrupar**: vários eventos do mesmo tipo dentro de 120 ms reais tocam um só som, um pouco mais alto (+1 a +2 dB).
- **Encurtar por envolvente**, nunca por velocidade de reprodução: as caudas de aplauso e reverberação levam um desvanecimento mais cedo.
- Na mudança de velocidade, não cortar o que está a tocar; só as novas decisões seguem a nova política.

---

## 12. Pausa e descontos de tempo

- Estado de pausa típico: snapshot com **passa-baixos na música por volta de 365 Hz** (exemplo Unity) para soar abafado; o Spelunky é dado como exemplo de menu de pausa que deixa sobretudo o grave; um estado de "pouca vida" usa 150 a 300 Hz [S] ([Natalie Agus, audio management](https://natalieagus.github.io/50033/docs/toddlers/audio-management); [Game Dev Beginner](https://gamedevbeginner.com/create-a-low-health-audio-filter-in-unity-using-the-audio-mixer-transition-to-snapshots/)).
- Cuidado: se o relógio do jogo pára, transições de snapshot que dependem desse relógio também param; há jogos em que o filtro de pausa ficou "preso" ou demorou de mais a sair [S] ([Adventure Creator](https://adventurecreator.org/forum/discussion/comment/47811); [BetaHub, bug de filtro abafado](https://app.betahub.io/projects/pr-5642738318/issues/g-156863)). No Web Audio, as rampas correm no relógio do `AudioContext`, independente do jogo, e isso resolve-o; mas **não suspender o contexto na pausa**, senão os sons de menu deixam de tocar.

Proposta, separando três estados [P]:

| Estado | O que se ouve | Valores |
|---|---|---|
| **Pausa do jogador** (botão pausa / `holdMatch`) | bancada abafada e mais baixa, música de jogo abafada ou parada, UI normal | passa-baixos 400 a 800 Hz em 150 ms; −8 a −12 dB; sons de jogo novos não disparam; os que tocam acabam a sua cauda |
| **Desconto de tempo** (é um momento do jogo, não uma pausa técnica) | apito + buzina; bancada continua viva, "DJ do pavilhão": um pequeno tema ou batida de órgão de 15 a 30 s; burburinho sobe 2 a 3 dB nos primeiros 2 s | o apito toca a seco, sem ducking nele; o tema do desconto ao −14 a −16 LUFS curto prazo |
| **Separador escondido** | silêncio total | `context.suspend()` (secção 13.2) |

Ao retomar: o filtro abre em 200 a 300 ms (não instantâneo, nem 2 s), e a primeira coisa que se ouve é o apito de reinício, que confirma que o jogo voltou.

---

## 13. Implementação em Web Audio

### 13.1 Desbloqueio (autoplay)

- Desde o Chrome 71, a Web Audio está sujeita à política de autoplay. Um `AudioContext` criado ao carregar a página fica `suspended`; chama-se `resume()` dentro de um gesto (clique, toque, tecla), ou o contexto retoma ao chamar `start()` numa fonte dentro desse gesto. Verificar `context.state` logo a seguir [F] ([Chrome, Autoplay policy](https://developer.chrome.com/blog/autoplay); [W3C issue 1802](https://github.com/WebAudio/web-audio-api/issues/1802)).
- Para testes automáticos: `--autoplay-policy=no-user-gesture-required` [F] (mesma fonte).
- Prática [P]: ligar o desbloqueio a `pointerdown` **e** `keydown` e `touchend` (o iOS antigo só aceitava `touchend`), com `{ once: false }` até `state === 'running'`; tocar um buffer mudo de 1 amostra no mesmo gesto; mostrar o ícone de som com estado "toca para ligar" enquanto estiver suspenso.

### 13.2 Separador escondido: suspender e retomar

- `visibilitychange` → `suspend()` ao esconder, `resume()` ao voltar (poupa bateria e processador).
- Problemas conhecidos no Safari/iOS [F]: o `resume()` pode **nunca resolver** depois de o browser ir para segundo plano ([WebKit 281566](https://bugs.webkit.org/show_bug.cgi?id=281566)); o contexto pode dizer `running` e não tocar; um `setTimeout` de cerca de 300 ms antes de retomar ajudou ([WebKit 202846](https://bugs.webkit.org/show_bug.cgi?id=202846)); fechar outro separador com som pode emudecer a Web Audio até um `suspend`/`resume` explícito ([WebKit 276687](https://bugs.webkit.org/show_bug.cgi?id=276687)).
- Defesa [P]: ao voltar, `resume()` com tempo limite de 1 s; se não resolver ou o estado não for `running`, mostrar "toca para retomar o som" e, no gesto, fechar o contexto e criar um novo (refazer os buffers sintetizados é barato e o código já os gera a pedido). Também ouvir `statechange` (o iOS põe o contexto em `interrupted` durante chamadas).

### 13.3 iOS: interruptor de silêncio e frequência de amostragem

- No iOS a Web Audio é tratada como som "ambient": mistura-se com outras apps e **obedece ao interruptor de silêncio**; os elementos `<audio>`/`<video>` ignoram-no [F] ([WebKit 237322](https://auto-bugs.webkit.org/show_bug.cgi?id=237322)).
- Desde o iOS 17: `navigator.audioSession.type = 'playback'` faz a Web Audio ignorar o interruptor; é ainda uma proposta, não uma recomendação W3C [F] ([WebKit 251532](https://bugs.webkit.org/show_bug.cgi?id=251532); [artigo "web audio ios unmute"](https://portfolio-2024-b6r.pages.dev/blog/web-audio-ios-unmute)). No iOS 18 há casos em que fica mudo mesmo assim [F] ([WebKit 264473](https://bugs.webkit.org/show_bug.cgi?id=264473); [WebKit 252746](https://bugs.webkit.org/show_bug.cgi?id=252746)). Truque antigo: tocar em ciclo um ficheiro silencioso num `HTMLAudioElement`.
- **Decisão de design** [P]: um jogo de gestão que se joga no autocarro deve **respeitar o interruptor por defeito** (o jogador escolheu silêncio). Dar uma opção "Tocar mesmo com o iPhone em silêncio" que põe `audioSession.type = 'playback'`. Atenção: `playback` interrompe a música de outras apps; `ambient` não.
- Frequência de amostragem: o iOS mudou o contexto para 48 kHz depois de reabrir o Safari e o som ficou distorcido ([WebKit 154538](https://bugs.webkit.org/show_bug.cgi?id=154538)); trocar para um altifalante Bluetooth pôs a Web Audio a tocar distorcida e à velocidade errada no iOS 16 e 17 ([WebKit 258864](https://bugs.webkit.org/show_bug.cgi?id=258864)); pedir uma `sampleRate` diferente da nativa deu má qualidade no Safari ([WebKit 219201](https://bugs.webkit.org/show_bug.cgi?id=219201)) [F].
- Regras [P]: **não forçar `sampleRate`**; sintetizar sempre à `ctx.sampleRate` real (nunca assumir 44 100); se `sampleRate` mudar depois de uma interrupção ou mudança de saída, recriar o contexto e regenerar os buffers. (No código atual, `synth.ts` exporta uma constante `SR`; convém confirmar que coincide com `ctx.sampleRate` ou que os buffers são reamostrados.)

### 13.4 Memória dos AudioBuffers

- Um AudioBuffer guarda PCM linear de 32 bits em vírgula flutuante, não intercalado, um buffer por canal; pensado para trechos curtos, tipicamente menos de 45 s [F] ([MDN, AudioBuffer](https://developer.mozilla.org/docs/Web/API/AudioBuffer)).
- Conta: 44 100 × 4 bytes = **172 KB por segundo em mono**, 345 KB em estéreo, ≈ 20,7 MB por minuto estéreo; a 48 kHz, +9% [P, cálculo].
- O WebKit liberta tarde a memória de buffers grandes [F] ([WebKit 189337](https://bugs.webkit.org/show_bug.cgi?id=189337)).
- Orçamento proposto [P]: efeitos em **mono** (o campo é visto de cima; o estéreo vem do `StereoPannerNode`), 0,05 a 1,5 s cada, 3 a 8 variantes. 60 sons × 5 variantes × 0,5 s × 172 KB ≈ 26 MB, já perto do teto de 40 MB sugerido para telemóvel [S]. Por isso: gerar sob pedido, guardar só o pavilhão atual, encurtar as caudas e deixar a reverberação ao `ConvolverNode` (uma resposta de impulso de 1,5 s estéreo ≈ 0,5 MB). A música, feita por notas agendadas, quase não gasta memória.

### 13.5 Latência

- `baseLatency` (atraso de processamento do contexto) e `outputLatency` (do sistema até ao altifalante) variam com a plataforma e o dispositivo; o `latencyHint` pode ser ignorado [F] ([MDN baseLatency](https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency.html); [MDN outputLatency](https://www-igm.univ-mlv.fr/~forax/MDN/developer.mozilla.org/en-US/docs/Web/API/AudioContext/outputLatency.html); [Blink intent to ship](https://groups.google.com/a/chromium.org/g/blink-dev/c/dTQniJNVVMY)). No Android a saída muda com a rota (Bluetooth, auscultadores) [S] ([react-native-audio-api](https://docs.swmansion.com/react-native-audio-api/docs/next/core/audio-context)).
- Ordens de grandeza [P]: computador 10 a 40 ms; Android 20 a 100 ms; Bluetooth 150 a 300 ms ou mais.
- Para este jogo [P]: `latencyHint: 'interactive'` (o defeito). Num jogo que se vê e não se joga com reflexos, a latência importa sobretudo para o **sincronismo imagem-som**: o atraso ouve-se a partir de cerca de 45 ms de som atrasado e 15 a 25 ms de som adiantado (valores de broadcast, ITU-R BT.1359; não verifiquei nesta pesquisa). Opção: atrasar a imagem não vale a pena; em vez disso, agendar os sons em `currentTime` + 0 e, se `outputLatency` > 150 ms (Bluetooth), aceitar que vá atrasado mas manter a ordem dos eventos. Os botões dão som no `pointerdown`, não no `click`.
- Música: agendar com antecedência (o código agenda secções e marca a seguinte 300 ms antes do fim, o que está bem); nunca usar `setTimeout` para a altura exata de uma nota.

### 13.6 Evitar estalos

- O estalo nasce de cortar a onda longe de um cruzamento por zero; a solução é descer o ganho até zero antes de parar. `setTargetAtTime(0, t, 0.015)` elimina-o num exemplo clássico [S] ([alemangui, "the ugly click"](https://alemangui.github.io/ramp-to-value)); uma rampa linear de 20 ms até 0,0001 é outra receita [S] ([Stack Overflow](https://kiwix.lema.org/stackoverflow.com_en_all_2023-11/questions/29378875/how-can-i-avoid-this-clicking-sound-when-i-stop-playing-a-sound)).
- Mudar `gain.value` diretamente (por exemplo com um deslizador) estala no Firefox; algumas combinações de eventos (`setTargetAtTime` seguido de `exponentialRampToValueAtTime`) ainda dão problemas [F] ([Mozilla 1232644](https://bugzilla.mozilla.org/show_bug.cgi?id=1232644); [Mozilla 1567777](https://bugzilla.mozilla.org/show_bug.cgi?id=1567777)).
- Recomeçar uma envolvente a partir do valor atual, e não de zero, evita estalos ao redisparar [S] ([ez-web-audio](https://app.unpkg.com/ez-web-audio@0.1.0/files/dist/envelope.d.ts)).

Receitas [P]:

- Ataque mínimo de **1 a 3 ms** em todos os sons sintetizados (mesmo nos "secos"); 0,5 ms só para estalos intencionais (aro).
- Libertação mínima de **5 a 10 ms**; parar a fonte 20 ms depois de a rampa chegar a zero.
- `exponentialRampToValueAtTime` não aceita 0: usar 0,0001 (−80 dB) e depois `setValueAtTime(0)`.
- Antes de qualquer rampa: `cancelScheduledValues(t)` + `setValueAtTime(param.value, t)` (ou `cancelAndHoldAtTime` onde existir).
- Buffers gerados: começar e acabar em zero (janela de 1 a 2 ms nos extremos) e sem desvio DC (subtrair a média).
- Deslizadores de volume: sempre por `setTargetAtTime` com τ ≈ 20 ms (o código já faz isto em `glide()`).

---

## 14. A estética "Nintendo de bolso"

O que se pode dizer com fontes:

- **Nintendo Pocket Football Club**: as críticas falam de "efeitos sonoros digitalizados, engraçados" e de muito humor na apresentação [S] ([Nintendo World Report](https://www.nintendoworldreport.com/review/37181); [Pocket Gamer](https://www.pocketgamer.com/nintendo-pocket-football-club/review/)). A ficha do original japonês (Pocket Soccer League: Calciobit) pergunta se consegues "manter a bancada a cantar" [S] ([Metacritic](https://www.metacritic.com/game/pocket-soccer-league-calciobit/)).
- **Kairosoft**: há um "som da casa" reconhecível, repetido de jogo para jogo, a ponto de uma crítica notar quando um título se afasta dele [S] ([TouchArcade, Pocket City Railway via pesquisa](https://toucharcade.com/?p=209798)). Não encontrei análise do desenho de som.
- **Retro Bowl** (New Star Games): música chiptune que lembra os anos 80 e 90 e efeitos arcade simples, que não tentam ser realistas [S, páginas fracas] (várias páginas de fãs, sem fonte da New Star).
- **Basketball GM**: jogo de estatística, praticamente sem som [S] ([gmgames](https://gmgames.org/?p=16973)).
- **Football Manager**: ambiente de estádio e reações por evento, sem comentário falado; os jogadores acrescentam pacotes de som (secção 7).

Princípios que daí saem [P]:

1. **Menos sons, mais caráter**. Cada som deve ser reconhecível pela silhueta (envolvente + altura) em menos de 200 ms, mesmo num altifalante de telemóvel. O jogador deve conseguir "ver" o jogo de olhos fechados: drible, aro, rede, apito.
2. **Uma paleta fechada**: 2 ou 3 timbres de síntese para tudo (por exemplo: pulso/quadrada para UI e música, ruído filtrado para bola e bancada, FM simples para metais e sinos). Isto dá a coerência do "som da casa" da Kairosoft sem a copiar.
3. **Exagero simpático, não realismo**: um "boing" de aro um pouco cómico, um apito de 3 notas com trilo, bancada de "vozinhas" curtas ("ê!", "ó!") em vez de ruído rosa contínuo (o código já evita ruído contínuo, que "soa a mar", e usa gritos curtos).
4. **O silêncio também conta**: deixar 0,5 a 1 s de quase silêncio antes do lance livre decisivo vale mais do que qualquer efeito.
5. **Música curta e de ciclo longo**: temas de 8 a 16 compassos com variações por passagem (o código já tem `pass`), para não cansar em sessões de 30 minutos.
6. **Original**: nada de jingles, notas ou "fanfarras" reconhecíveis de jogos da Nintendo ou da Kairosoft. Verificar que nenhum motivo de 4 a 5 notas coincide com um conhecido.

---

## 15. Queixas dos jogadores

| Queixa | Exemplos | Lição |
|---|---|---|
| **Comentário repetitivo / reciclado** | NBA 2K22: os comentadores davam as boas-vindas ao "NBA 2K21" [S] ([Dexerto](https://www.dexerto.com/nba-2k/nba-2k22-players-blast-lazy-devs-old-commentary-1872070)); FC 26: "as mesmas frases há três anos"; FC 24: "aborrecido e repetitivo" [S] ([fórum EA FC 26](https://forums.ea.com/discussions/fc-26-general-discussion-en/does-anybody-else-mutes-the-ea-fc-commentary/12440206); [fórum EA FC 24](https://forums.ea.com/discussions/fc-24-general-discussion-en/commentary-needs-to-be-improved/7930552)). Há guias para desligar o comentário [S] ([Digital Trends](https://digitaltrends.com/gaming/nba-2k22-turn-off-commentary)) | arrefecimentos, bolsas grandes, e deixar desligar |
| **Bancada parada / sem reação** | 2K: "a bancada é a parte mais bafienta do jogo"; momentos decisivos sem emoção; aro e rede iguais há anos [S] ([Operation Sports](https://www.osftw.com/news/847285/nba-2k-lets-talk-about-some-nba-2k-audio-issues)); FC 27: bancada "mais baça" do que no FIFA 23 [S] ([fórum EA](https://forums.ea.com/discussions/fc-27-feedback-en/crowd-noise-and-chants/13686871)) | bancada ligada ao estado (secção 7), sobretudo ao fim de jogo apertado |
| **Sons fora de tempo / em falta** | FC 26: apito atrasado ou em falta, apitos de falta, intervalo e fim fora de tempo; comentário que vai ficando atrasado; comentário que desaparece e a bancada continua [S] ([FC 26 bug PS5](https://forums.ea.com/idea/fc-26-bug-reports-de/missing-crowd-chants-audio-bug-on-ps5-fc-26/13353371); [FC 26 missing and delayed sounds](https://forums.ea.com/idea/fc-26-bug-reports-en/audio-bugs-after-latest-update-%E2%80%94-missing-and-delayed-sounds/12831956); [guia FC 27](https://pixelnitro.com/?p=20153)) | o apito é sagrado: nunca cortado, nunca atrasado; teste que verifica que cada evento de apito da simulação dá um som |
| **Má mistura** | queixas sobre como os elementos se misturam e sobre o som do aro [S] ([Operation Sports](https://www.osftw.com/features/2268/nba-2k-lets-talk-about-some-nba-2k-audio-issues/?page=2)) | hierarquia escrita (secção 1), barramentos com volumes próprios |
| **Fadiga** | sessões longas de jogos de gestão; o mesmo tema em ciclo | variação por passagem, temas diferentes por ecrã, opção de música só nos menus |

---

## 16. Acessibilidade

O consenso entre as diretrizes [F/S] ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/intermediate/); [Xbox Accessibility Guideline 105](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/105); [Steamworks, acessibilidade](https://partner.steamgames.com/doc/accessibility_features); [Unity, accessibility basics](https://unity.com/blog/video-game-accessibility-basics); [IGDA GA-SIG](https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/)):

- **Volumes separados** (nível básico das GAG). A Xbox recomenda controlos independentes para música, voz, efeitos críticos de jogo, efeitos de ambiente, narração e chat; a Steam sugere separar efeitos ativos de efeitos de fundo.
- **Opção mono**, para quem ouve de um só lado e perderia o que vai panorâmico para o outro ouvido.
- **Nenhuma informação essencial só por som**; cada pista sonora importante tem um equivalente visual; legendas para fala e **legendas de sons importantes**, disponíveis antes de o primeiro som tocar.

Para o Pocket Basketball [P]:

- Deslizadores: **Geral, Música, Jogo (bola, apito, buzinas), Bancada, Interface**. Hoje há geral, efeitos e música; separar a bancada é o pedido mais comum em jogos de desporto (há quem queira o jogo sem o "ruído"). Escala de deslizador em dB, não linear: de −40 dB a 0, com o fundo a desligar (`gain = 10^(dB/20)` tabelado; a regra da proibição de `Math.pow` vale só para `src/sim/`, mas uma tabela fica igualmente bem).
- **Mono**: um `ChannelMergerNode`/soma no master, ou simplesmente pôr todos os `StereoPannerNode` a 0. Ligado por defeito no telemóvel não é preciso: o altifalante já é quase mono.
- **Equivalentes visuais**: apito → ícone de apito e o relógio a piscar; buzina dos 24 s → o relógio dos 24 s fica vermelho; cesto → o marcador pulsa; desconto concedido → banner. O jogo já é legível sem som (é um jogo de gestão), o que é bom; confirmar com o som desligado nos testes do browser.
- **Legendas de som** opcionais no rodapé: "[apito]", "[bancada em pé]", "[buzina]".
- **Análogo do "movimento reduzido"**: um modo "som calmo" que tira a bancada de pico, os rugidos e os "stings" fortes, limita a dinâmica (LRA ≤ 6 LU) e baixa os agudos acima de 8 kHz. Ligar automaticamente se `prefers-reduced-motion` estiver ativo é discutível; melhor oferecer, não impor.
- **Sem sons de frequência muito alta e repetitiva** (assobios acima de 8 kHz em ciclo) e sem picos súbitos > 10 dB acima do nível médio sem aviso (o rugido final pode ser grande, mas com uma subida de 300 a 500 ms).
- **Desligar a música, manter os efeitos**, e vice-versa; e um botão de silêncio sempre visível no jogo.

---

## 17. Testar som sem ouvidos

### 17.1 Verificações automáticas por buffer (em Node, sobre o que `synth.ts` gera)

Bibliotecas de referência: o `audio_defect_detector` (Dart) define cortes como sequências de amostras presas a ±1,0, estalos como 1 a 10 amostras e "pops" como 10 a 150 amostras [S] ([pub.dev](https://pub.dev/packages/audio_defect_detector)); o `voirs-evaluation` (Rust) mede RMS, pico, percentagem de corte, desvio DC e amostras silenciosas com limites configuráveis (defeitos para fala: 5% de corte, 6 dB de gama dinâmica mínima, DC até 10%, demasiado largos para jogos) [S] ([docs.rs](https://docs.rs/crate/voirs-evaluation/latest/source/src/audio/validation.rs)); o `arduino-audio-tools` faz o mesmo em tempo real, por blocos [S] ([wiki](https://github.com/pschatzmann/arduino-audio-tools/wiki/Determining-the-Quality)).

Limites propostos para os testes do projeto [P]:

| Verificação | Como | Limite |
|---|---|---|
| Pico | max(abs(x)) | ≤ 0,89 (−1 dBFS) por som; nenhuma amostra NaN ou infinita |
| RMS | sqrt(média(x²)) | por família, numa faixa (ex.: drible −24 a −16 dBFS; UI −24 a −18); evita um som "esquecido" a −50 |
| Fator de crista | pico/RMS | 6 a 20 dB para percussão; < 6 dB indica ruído achatado |
| Desvio DC | média(x) | |média| < 0,001 (−60 dBFS) |
| Extremos | primeira e última amostra | abs < 0,001 (começa e acaba em silêncio) |
| Estalos | diferença entre amostras vizinhas, ou 2.ª diferença | abs(x[n] − x[n−1]) < 0,3 fora do ataque; para ondas de banda larga usar a 2.ª diferença comparada com a RMS local (> 10× = suspeito) |
| Duração | comprimento e "cauda útil" (última amostra acima de −60 dBFS) | UI 25 a 300 ms; efeitos ≤ 1,5 s; reações ≤ 3 s |
| Silêncio inesperado | RMS de janelas de 10 ms | sem buracos de silêncio no meio de sons contínuos |
| Variantes diferentes | correlação entre variantes | não idênticas (correlação < 0,98) mas da mesma família (RMS dentro de ±3 dB) |
| Determinismo | mesma semente → mesma soma de controlo | útil para comparar versões |

### 17.2 Verificações da mistura completa (no browser, com `OfflineAudioContext`)

- Renderizar 60 a 120 s de um jogo real (mesma semente) num `OfflineAudioContext` com o grafo do jogo, e medir:
  - **Sonoridade integrada** (BS.1770: filtro K, blocos de 400 ms com 75% de sobreposição, porta absoluta −70 LUFS e relativa −10 LU; implementável com biquads e somas, sem bibliotecas): alvo −18 ± 2 LUFS.
  - **Pico verdadeiro** com sobreamostragem ×4 (filtro de interpolação simples): ≤ −1 dBTP.
  - **LRA**: 6 a 12 LU.
  - Redução do limitador: atua em menos de 5% dos blocos.
  - Comparar o ruído em momentos marcados: o apito deve ficar pelo menos 6 dB acima da média da bancada nos 100 ms à volta.
- **Contagem de vozes**: instrumentar `play()` para registar o número de vozes ativas por frame; o teste falha se passar o teto ou se um som de nível 1 for recusado.
- **Sincronismo**: para cada evento da simulação com som obrigatório (apito, buzina, cesto), verificar que houve um `start()` agendado a menos de 30 ms do frame correspondente; a 2× e 4× também.
- **Política de velocidade**: a 4×, número de sons por segundo de jogo real ≤ 1,5 × o de 1×, e nenhum som de nível 1 em falta.

### 17.3 Espectrogramas

- Gerar PNG de espectrograma (STFT de 1024 ou 2048 pontos, janela de Hann, salto de 256) de cada som e da mistura, e guardá-los em `dist-check/` como as imagens do `browser-check`. A proibição de `Math.sin` só vale para `src/sim/`; na interface e nos testes pode-se usar, mas uma tabela de senos também serve.
- O que procurar: energia abaixo de 30 Hz (DC ou grave inútil, cortar); riscas verticais finas (estalos); "aliasing" (riscas que descem quando deviam subir, típico de ondas quadradas geradas sem limitar a banda); a banda de 2 a 5 kHz livre nos instantes do apito.
- Comparar o espectro médio das camadas (bancada vs música vs efeitos) para ver se se sobrepõem na zona de presença (secção 5).

### 17.4 Escuta A/B (quando houver ouvidos)

- Protocolos clássicos [F/S] ([Wikipedia, codec listening test](https://en.wikipedia.org/wiki/Codec_listening_test); [Fora Soft, MUSHRA/MOS/ABX](https://www.forasoft.com/learn/audio-for-video/articles-audio/subjective-testing-mushra-mos-ab-abx)): **ABX** (X é A ou B?), **ABC/HR** (referência sempre disponível, A e B baralhados), **MUSHRA** (referência, amostras, referência escondida e âncoras; pela ITU BS.1534-3 exclui-se quem dá à referência escondida menos de 90 em mais de 15% dos itens). Ferramenta web: webMUSHRA.
- Para um jogo pequeno [P]:
  - **Igualar a sonoridade** antes de comparar (diferenças de 0,5 a 1 dB já fazem "o mais alto parecer melhor").
  - ABX com 12 a 16 tentativas por par; 12 certas em 16 (p < 0,05) para dizer que a diferença se ouve.
  - Ouvir em três sistemas: altifalante do telemóvel, auscultadores baratos, colunas de computador. E a volume baixo (como no autocarro).
  - Teste de "olhos fechados": alguém ouve 30 s do jogo e diz o que aconteceu (cesto? falha? desconto?). Se acerta em 80% ou mais, a hierarquia funciona.
  - Teste de fadiga: 20 minutos seguidos; anotar o primeiro som que irrita.
- Para um agente sem ouvidos: a página `anim-check`/`browser-check` pode gerar um relatório com as métricas da 17.1 e 17.2 e os espectrogramas, e um humano só confirma os pares que o relatório marcar.

---

## 18. O que o código atual já faz, e o que lhe falta

Lido de `src/ui/audio.ts` (sem o alterar):

**Já faz bem**: barramentos separados de efeitos e música, com volume geral, efeitos e música; ducking da música por evento (`duckMusic`: −7 dB, ataque τ 30 ms, regresso τ 250 ms após 450 ms) em apito e rede; compressor suave no master (limiar −14, razão 4, joelho 12, ataque 5 ms, recuperação 200 ms); salas diferentes por pavilhão com `ConvolverNode`; bancada por pavilhão (vozes, palmas, conversas); buffers calculados uma vez e reutilizados, gerados nos momentos livres; `suspend`/`resume` com a página escondida; desvanecimento de 250 ms ao trocar de tema; `setTargetAtTime` nos volumes para não estalar; ambiente feito de sons curtos e soltos em vez de ruído contínuo.

**Falta ou merece verificação** [P]:

1. **Limitador de segurança** depois do compressor (limiar −3, razão 20, joelho 0, ataque 1 ms) e teto a −1 dB. O compressor atual, a razão 4, não impede picos acima de 0 dBFS.
2. **Limite de vozes** global e por família, com roubo por prioridade.
3. **Política de velocidade** (2× e 4×) explícita: rarefazer drible e reações, agrupar eventos.
4. **Excitação da bancada** ligada ao marcador e ao relógio (fim de jogo apertado, desnível grande).
5. **Barramento próprio da bancada** e de interface, com deslizadores; opção mono.
6. **Pausa vs desconto de tempo** como estados de mistura diferentes (abafar na pausa; DJ do pavilhão no desconto).
7. **iOS**: opção `navigator.audioSession.type = 'playback'`; tratar `interrupted` e `resume()` que não resolve; recriar o contexto se `sampleRate` mudar. Confirmar que `SR` em `synth.ts` acompanha `ctx.sampleRate`.
8. **Arrefecimentos** por som e memória de variantes (sem repetir a mesma duas vezes seguidas).
9. **Testes de sinal** (secção 17.1) sobre os buffers de `synth.ts`, e uma medição de LUFS de um jogo renderizado offline.
10. O ruído de base usa `Math.random` (está em `src/ui/`, por isso não viola a regra da simulação), mas torna os buffers diferentes a cada sessão; se se quiserem somas de controlo nos testes de som, usar o `makeRng` que já existe.

---

## 19. Números para copiar

| Tema | Valor |
|---|---|
| Sonoridade integrada | −18 LUFS ± 2 (telemóvel pode ir a −16) |
| Pico verdadeiro | ≤ −1 dBTP |
| LRA | 6 a 12 LU |
| Compressor de cola | −14 a −18 dB, 2:1 a 4:1, joelho 6 a 12, 5 a 10 ms / 150 a 250 ms |
| Limitador | −3 dB, 20:1, joelho 0, 1 ms / 50 a 100 ms, teto −1 dB |
| Ducking da música | −6 a −9 dB, ataque 10 a 30 ms, recuperação 300 a 800 ms |
| Vozes | 24 (telemóvel) / 32 (computador); 20 a 30 e 50 a 60 segundo um guia web |
| Memória de áudio | ≤ 40 MB telemóvel; mono a 44,1 kHz = 172 KB/s |
| Aleatoriedade | ambiente ±1 a ±2 semitons e ±2 a ±3 dB; informação ±0 a ±0,5 semitom e ±1 dB; UI nenhuma |
| Variantes | 4 a 8 para ambiente, 5 a 10 para falas/reações |
| Arrefecimentos | mesmo som 40 a 60 ms; grito 1,5 a 3 s; cântico 2 a 3 min; frase 10 min |
| UI | 25 a 150 ms (toque), 200 a 500 ms (notificação); confirmar sobe, cancelar desce |
| Envolventes | ataque ≥ 1 a 3 ms, libertação ≥ 5 a 10 ms, `setTargetAtTime` τ 15 a 20 ms |
| Pausa | passa-baixos 400 a 800 Hz em 150 ms, −8 a −12 dB, abrir em 200 a 300 ms |
| EQ | bancada: passa-altos 150 a 200 Hz, −2 a −4 dB em 2,5 a 4 kHz; música: −2 a −3 dB em 2,5 a 4 kHz durante o jogo |
| Testes | pico ≤ 0,89; |DC| < 0,001; extremos < 0,001; salto entre amostras < 0,3 |
| ABX | 12 em 16 certas para p < 0,05; igualar sonoridade a 0,5 dB |

---

## Limites desta pesquisa

- Os sites com conteúdo mais técnico (Game Developer, MDN, Microsoft Learn, Designing Sound, EA, bugnet) não abriram nesta sessão; os resumos vêm da pesquisa web. Para os ler diretamente, estes servidores têm de ser autorizados na rede da sessão.
- Não há documentação oficial de como NBA 2K, EA FC ou Football Manager ligam a bancada ao estado do jogo; o modelo de excitação da secção 7 é uma proposta minha, não a deles.
- Kairosoft e Retro Bowl só têm descrições superficiais (e de páginas fracas) do seu som.
- Os números marcados [P] são pontos de partida de prática corrente; afinar de ouvido e medir no próprio jogo.
