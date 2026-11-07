# O que os jogadores elogiam e de que se queixam em jogos de gestão desportiva

**Âmbito:** Nintendo Pocket Football Club (NPFC), Calciobit, Basketball GM (BBGM), Hoop Land, Retro Bowl, Football Manager (PC, Touch e Mobile), Top Eleven, Kairosoft (Basketball Club Story e outros) e Pro Basketball Manager.

**Método e limites:** a pesquisa foi só por WebSearch. O WebFetch estava bloqueado nesta sessão (os domínios cubed3.com, pocketgamer.com, nintendolife.com, metacritic.com, operationsports.com e vaporlens.app não resolvem), e nenhuma pesquisa devolveu tópicos do Reddit diretamente. As citações vêm dos excertos que o motor de pesquisa devolveu. São curtas, estão em inglês e algumas podem ter sido ligeiramente encurtadas. A **frequência** é uma estimativa qualitativa: **Alta** quando o tema aparece em 4 ou mais jogos ou fontes independentes, **Média** em 2 ou 3, **Baixa** numa só. Os agregadores gerados por IA (marlvel.ai) e as páginas de SEO foram excluídos ou estão marcados como fracos.

---

## A. Queixas

### 1. Repetição a meio prazo, ou "a novidade passa" — **Alta**
- NPFC: "holds amusement for a brief period, but the novelty factor phases out hastily" ([Cubed3, 5/10](https://cubed3.com/review/1433/1/nintendo-pocket-football-club-nintendo-3ds.html)).
- Retro Bowl: "a fun game for the first 3 seasons; after that, replayability isn't there" ([GameBrain, utilizador](https://gamebrain.co/game/retro-bowl)), e "can get a bit repetitive after a while" ([Grand Screen](https://grand-screen.com/games/retro-bowl/)).
- Kairosoft: "becomes repetitive and lacks content in the later stages" (Hot Springs Story, [GameBrain](https://gamebrain.co/game/hot-springs-story)), e "snowballs relatively quickly once you hit mid-game" ([r/Kairosoft](https://nyc1.lr.ggtyler.dev/r/Kairosoft/comments/1grohv5/how_is_cavern_advanturers)).
- **Lição:** cada época tem de trazer algo de novo. Exemplos: uma divisão nova com regras ou adversários diferentes, uma taça nova, cartas e combos que só se desbloqueiam mais tarde, e acontecimentos raros. A descoberta não pode acabar no primeiro ano.

### 2. Grind no treino e na progressão — **Alta**
- NPFC: "more about grinding to make players better" ([Cubed3](https://cubed3.com/review/1433/1/nintendo-pocket-football-club-nintendo-3ds.html)). A Pocket Gamer diz que as "quirks and grind" o deixam como "a downloadable curio" ([Pocket Gamer](https://www.pocketgamer.com/nintendo-pocket-football-club/review/)). Segundo a Reticule, a maior parte das semanas resume-se a "spending or harvesting training cards" ([The Reticule](https://thereticule.com/?p=18720)).
- Basketball Club Story: "progression, especially in later stages, … a tedious and repetitive grind", com "slow training" ([Vaporlens](https://vaporlens.app/app/2102490/basketball_club_story)).
- Retro Bowl: "progression system feels a little grindy at higher levels" ([Grand Screen](https://grand-screen.com/games/retro-bowl/)).
- **Lição:** o gesto de usar uma carta tem de ser rápido (aplicar várias de uma vez, ou aplicar a recomendada). Cada semana deve dar um ganho que se vê. O custo de subir de nota não deve crescer tão depressa que o jogador sinta que está a marcar passo.

### 3. Progressão opaca e táticas sem feedback — **Alta**
- NPFC: "lack of tactical options makes you feel powerless" (excerto de crítica agregado no [Metacritic](https://legacy.prod.metacritic.com/game/3ds/nintendo-pocket-football-club/critic-reviews)). Outra crítica diz que, depois de "a couple of dozen hours", ficou "frustrated they couldn't have more granular control" ([Digitally Downloaded](https://www.digitallydownloaded.net/?p=48313)). Ainda no NPFC, tirar o máximo das cartas é "trial and error" ([Alt-UK](https://alt-uk.net/2014/04/23/nintendo-pocket-football-club-3ds-review)). Isto agrada a uns e frustra outros.
- FM: "most, if not all of the instructions on this game are just pure eye candy" ([Steam FM24](https://steamcommunity.com/app/2252570/discussions/0/3878222169793507369)). Há também testes da comunidade que dizem que "only nine of the FM24 attributes really matter" ([RealSport101](https://realsport101.com/article/fm24-only-9-attributes-really-matter-claims-community-test)). A própria Sports Interactive teve de publicar um texto a desfazer os mitos de que o jogo "trabalha contra" o jogador ([footballmanager.com](https://www.footballmanager.com:443/node/674)).
- **Lição:** depois de cada jogo, mostrar porque se ganhou ou perdeu, por exemplo "a defesa zonal cortou 6 lançamentos interiores" ou "a fadiga do base custou 8 pontos no 4.º período". Mostrar o efeito de cada carta (atributo antes → depois) e dar pistas sobre combos ainda por descobrir. Cada atributo tem de ter um efeito visível no jogo, porque um atributo decorativo destrói a confiança.

### 4. "Está viciado": RNG que parece injusto — **Média**
- Top Eleven: "weaker teams keep beating me … fix the match algorithm" ([Şikayetvar](https://www.sikayetvar.com/en/top-eleven-us/top-elevens-match-results-feel-riggedweaker-teams-keep-beating-me)).
- FM: queixas de equipas que dominam as estatísticas e perdem, e quem responda "there is luck involved" ([Steam FM24](https://steamcommunity.com/app/2252570/discussions/0/3879347492852865342)).
- **Lição:** a variância tem de existir, mas tem de ser legível. Se o favorito perde, o resumo deve mostrar a causa: percentagem de lançamento anormal, um jogador "em chamas", faltas. O Match ID e as repetições deterministas permitem rever o jogo e mostrar que não houve batota. Convém medir em `npm run sim` com que frequência o favorito ganha, por nível de diferença entre as equipas.

### 5. Ver todos os jogos é obrigatório e lento — **Média**
- NPFC: "demands each match be watched, which can prove extremely bothersome" ([Cubed3](https://cubed3.com/review/1433/1/nintendo-pocket-football-club-nintendo-3ds.html)).
- Basketball Club Story: "unskippable matches" ([Vaporlens](https://vaporlens.app/app/2102490/basketball_club_story/stats/details)).
- Calciobit: "matches slow" (NTSC-UK, 5/10, citada em [playpile.gg](https://playpile.gg/games/calciobit)).
- O FM Touch 2017 acrescentou "instant result" para acelerar o jogo ([Android Authority](https://androidauthority.com/football-manager-touch-2017-released-727783)), embora "purists will argue it removes part of the magic" ([VideoGamer](https://www.videogamer.com/?p=1173555)).
- **Lição:** ter várias velocidades (1×, 2×, 4×) e um modo de resumo com as jogadas-chave. Os particulares e os treinos-jogo podem simular-se de uma vez. Como é tudo determinista, saltar o jogo dá o mesmo resultado, por isso não há "batota" em saltar. As cartas continuam a ser dadas.

### 6. Monetização pay-to-win e compras que falham — **Alta (nos jogos F2P)**
- Top Eleven: "heavy pay to win" ([Trustpilot](https://nl-be.trustpilot.com/review/topeleven.com)), "when tokens end you have to spend real money … to keep up in player auctions" ([Metacritic](https://legacy.prod.metacritic.com/game/ios/top-eleven)), e tokens comprados que não chegam ([Şikayetvar](https://www.sikayetvar.com/en/top-eleven-us/top-eleven-tokens-not-delivered-despite-purchase)).
- Ao contrário, o Hoop Land é elogiado precisamente por oferecer "unlimited Franchise Mode … with no ads or micro-transactions" ([App Store](https://apps.apple.com/th/app/hoop-land/id1605197976); [GameBrain](https://gamebrain.co/game/hoop-land)). O BBGM é elogiado por correr no browser "without having to pay or download anything" ([Medium](https://medium.com/testers/sports-management-games-and-simulators-arent-going-away-anytime-soon-c4ad39e32da7)).
- **Lição:** nada de moedas premium, temporizadores nem anúncios. Joga-se de graça no browser. É uma vantagem competitiva direta.

### 7. Exploração da IA de transferências e trocas — **Média**
- BBGM: o próprio autor admite "certainly some of you know how to exploit it" e já reescreveu a IA várias vezes ([zengm blog 2025](https://zengm.com/blog/2025/01/trading-block-filters/); [2014](https://zengm.com/blog/2014/02/new-improved-trade-ai)). Os jogadores queixam-se dos dois extremos: é fácil enganar a IA ("fleece the AI"), e a IA faz "ridiculous demands" ([r/BasketballGM via zengm/gmgames](https://gmgames.org/?p=16977)).
- **Lição:** um mercado simples (como no NPFC: lista de jogadores livres e de olheiros, sem trocas negociadas entre clubes) reduz a superfície de exploração. Se houver trocas, é preciso uma regra de valor clara e limites, testados na simulação em massa.

### 8. Domínio sem fim: ganhar torna-se aborrecido — **Média**
- BBGM e semelhantes: "It gets boring to always win" ([NBA-Live forums](https://forums.nba-live.com/viewtopic.php?p=240302)). Há jogadores que inventam "house rules" para voltar a ter desafio ([Operation Sports](https://forums.operationsports.com/fofc/archive/index.php/.../a%3E/t-2016.html)). Outro jogador desistiu quando a estrela se retirou ([r/BasketballGM](https://axebps-redlib.hf.space/r/BasketballGM/comments/9k2tg1/1000_seasons_of_basketballgm_one_season_at_a_time)).
- **Lição:** forças que puxam a equipa para o equilíbrio, como o envelhecimento e a retirada dos jogadores, rivais que contratam quem se destaca, e a subida da exigência ao subir de divisão. Também ajudam objetivos opcionais depois do triplete (desafios de época, recordes) e uma dificuldade que se possa escolher.

### 9. Estabilidade, bugs e perda de progresso — **Média**
- Hoop Land: "disliked it for its stability" ([GameBrain](https://gamebrain.co/game/hoop-land)).
- Pro Basketball Manager: "significant bugs and performance issues", "UI buggy" ([GameBrain PBM 2024](https://gamebrain.co/game/pro-basketball-manager-2024)), e "too many bugs" ([Multiplayer.it 2017](https://multiplayer.it/recensioni/179354-pro-basketball-manager-2017-gestire-la-palla.html)).
- FM: saves na nuvem que não carregam ([Steam FM24](https://steamcommunity.com/app/2252570/discussions/0/3879346999827293140); [SEGA support](https://support.sega.com/hc/en-gb/articles/19429132311569-What-should-I-do-if-I-can-t-access-my-Football-Manager-save-game-on-cloud)). No iOS, apagar uma aplicação sem nuvem apaga o progresso ([TouchArcade](https://toucharcade.com/community/threads/if-you-remove-a-game-from-your-iphone-does-your-saved-progress-also-get-deleted.117558/)).
- **Lição:** num jogo de browser, o `localStorage` pode ser apagado. Devemos guardar automaticamente com versão e cópia de reserva (duas posições alternadas), e ter exportação e importação do save como texto ou ficheiro. O formato JSON que já existe torna isto barato.

### 10. UI de telemóvel difícil — **Baixa a média**
- FM26 Touch: "countless UI issues", e "substitutions are anything but intuitive" ([Pocket Tactics](https://www.pockettactics.com/football-manager-26-touch/review)). O FM Mobile 2016 tinha uma simulação "disjointed" ([Trusted Reviews](https://www.trustedreviews.com/football-manager-mobile-2016-review)).
- **Lição:** as substituições e o desconto de tempo são os comandos mais usados a meio do jogo, por isso têm de estar a um ou dois toques, com alvos grandes no esquema vertical de 360×640.

### 11. Narrativa vazia, "só números" — **Baixa**
- Basketball Club Story: a história "full of random numbers, making it hard to engage" ([GameBrain](https://gamebrain.co/games-like/basketball-club-story)).
- **Lição:** dar a cada jogador uma marca (alcunha, tipo, uma frase) e manchetes que se referem ao que aconteceu de facto.

---

## B. Pontos fortes

### 1. Acessível, mas não simplista — **Alta**
- NPFC: "simplifies the experience without dumbing it down" ([Nintendo World Report](https://nintendoworldreport.com/review/37181/nintendo-pocket-football-club-review)), e "a great introduction to the genre" (várias críticas). Só se mexe na equipa antes dos jogos, o que é "less demanding than Football Manager".
- BBGM: "simple, yet in-depth" ([Medium](https://medium.com/testers/sports-management-games-and-simulators-arent-going-away-anytime-soon-c4ad39e32da7)).
- **Lição:** poucos atributos e poucos menus, mas com interações que dão profundidade (combos, tipos, química).

### 2. Ver os jogadores evoluir e subir de divisão — **Alta**
- NPFC: "seeing players develop and climbing up the leagues is insanely satisfying" ([GodIsAGeek](https://godisageek.com/2014/04/nintendo-pocket-football-club-review/)).
- **Lição:** celebrar cada subida de nota (som e animação) e cada promoção. Guardar a história de cada jogador.

### 3. Charme da pixel art e humor — **Alta**
- NPFC: "the most adorably cute little football players … the most charming soccer fields", com treinos que vão de "weights and sprinting, to oil therapy and karaoke" (excertos de críticas, ver [Nintendo Life](https://nintendolife.com/reviews/3ds-eshop/nintendo_pocket_football_club) e [GameGrin](https://gamegrin.com/reviews/nintendo-pocket-football-club-review)). Calciobit: "lovable character animations" (NTSC-UK, via [playpile](https://playpile.gg/games/calciobit)).
- Hoop Land: "nostalgic arcade vibe through its retro pixel graphics" ([GameKeepr](https://gamekeepr.net/en/reviews/63)).
- **Lição:** cartas com nomes engraçados e originais, e animações expressivas de festejo e desânimo. Já está previsto em `docs/05-analise-visual-charme.md`.

### 4. Descobrir combos às escondidas — **Média**
- NPFC: "experimenting for special combos is part of the fun" ([Alt-UK](https://alt-uk.net/2014/04/23/nintendo-pocket-football-club-3ds-review)).
- **Lição:** manter o segredo, mas com um caderno de combos descobertos e pistas progressivas. Isto resolve também a queixa A3.

### 5. Jogos curtos e sessões rápidas — **Alta**
- Retro Bowl: "quick matches, rewarding progression", "you can play many games in one sitting" ([OpenCritic](https://opencritic.com/game/12714/retro-bowl/reviews)).
- NPFC: 90 minutos condensados em cerca de 8 (dito pelo criador, ver doc 01). O BBGM tem uma "quick simulation".
- **Lição:** um jogo deve durar 3 a 6 minutos, e uma semana completa menos de 10.

### 6. Sem pagar e sem anúncios, a correr em qualquer lado — **Alta**
- Hoop Land ("no ads or micro-transactions") e BBGM (grátis e no browser, popular "in an office/school setting") ([Medium](https://medium.com/testers/sports-management-games-and-simulators-arent-going-away-anytime-soon-c4ad39e32da7)).
- **Lição:** uma só página HTML que funciona offline, e que se pode retomar e fechar a qualquer momento.

### 7. Histórias emergentes — **Média**
- FM é "a platform for storytelling", em que cada save conta uma história diferente ([FM Projects](https://fmprojects.substack.com/p/storytelling-in-football-manager); [PC Gamer](https://www.pcgamer.com/why-i-play-football-manager-the-story-of-shane-the-wonder-kid-paul)). O BBGM tem ligas de mais de 1000 épocas jogadas por gosto pela história ([r/BasketballGM](https://axebps-redlib.hf.space/r/BasketballGM/comments/9k2tg1/1000_seasons_of_basketballgm_one_season_at_a_time)).
- **Lição:** guardar registos, recordes, um hall of fame do clube, rivais que voltam, e jogadores da formação que crescem. São coisas baratas de fazer e alimentam o longo prazo.

### 8. Rejogabilidade por personalização e partilha — **Média**
- Hoop Land: ligas personalizadas para "import or share … infinite replay-ability" ([App Store](https://apps.apple.com/th/app/hoop-land/id1605197976)). O BBGM tem o God Mode ([football-gm blog](https://football-gm.com/blog/17/)).
- **Lição:** o Match ID e o save em JSON já permitem partilhar jogos e equipas. Vale a pena expor isso na interface ("partilha este jogo").

### 9. Moral e decisões fora de campo — **Baixa (fontes fracas)**
- Retro Bowl: decisões sobre jogadores que se portam mal, com efeito na moral (só páginas de guias de fraca qualidade, a confirmar).
- **Lição:** opcional. Pequenos acontecimentos com uma escolha entre duas opções dão personalidade sem precisar de muitos menus.

---

## C. Fontes sem acesso direto
O Reddit (r/footballmanagergames, r/HoopLand, r/3DS), as reviews do Steam e da App Store, e o GameFAQs não foram lidos diretamente. A pesquisa não devolveu esses tópicos, e o WebFetch estava bloqueado na rede desta sessão. Numa sessão com rede aberta, valeria a pena confirmar as frequências lendo cerca de 50 reviews negativas do Steam do Hoop Land e do Basketball Club Story.
