# Pocket Basketball e Calciobit A: diferenças e lacunas

Comparação feita com as [28 sequências do Pocket Basketball](README.md) e as [36 do Calciobit A](../calciobit/README.md#sequências), área a área. Cada ponto aponta para a sequência que o prova. Os nomes entre parênteses retos são pastas de `sequencias/` deste levantamento; os do Calciobit levam o caminho.

A regra continua: copia-se a ideia (o ritmo, a ordem, a gramática da câmara), nunca o aspeto. E um golo do Calciobit não é um cesto qualquer: num jogo de basquetebol há dezenas de cestos, por isso o par de um golo é um momento raro.

## Em resumo

O Pocket Basketball já tem a mesma câmara de base e a mesma secura nos jogos normais. A diferença maior é de **ritmo**: faz tudo três a cinco vezes mais depressa e quase nunca para o jogo para marcar um momento. O Calciobit abranda, passa pelo preto e dá palco aos momentos raros: o golo, a falta, o título e a descoberta de um treino. O Pocket Basketball trata quase tudo ao mesmo nível.

| Momento | Calciobit | Pocket Basketball |
|---|---|---|
| Mudança de ecrã nos menus | 0,6–0,8 s, sempre pelo preto | 0,18 s, sem preto |
| Da antevisão à bola em jogo | cerca de 21 s | cerca de 10 s |
| Golo ou cesto grande | cerca de 20 s, com o jogo parado | 1,5–1,8 s, com o jogo a correr |
| Combo de cartas no treino | cerca de 9 s | 1,8 s |
| Título ganho | cerca de 45 s, em cinco momentos | cerca de 11 s, no mesmo campo |

## Igual ou equivalente

- **Câmara:** alta e lateral, nunca de cima. Muda do plano largo para o diagonal a deslizar e a rodar, sem corte e sem zoom. Não faz zoom com a bola a correr ([mudanca-de-lado-pan-e-rotacao](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/README.md); Calciobit: [plano-largo-para-diagonal](../calciobit/sequencias/jogo-camara/plano-largo-para-diagonal/README.md)).
- **Movimentos especiais:** o jogo não abranda e a câmara não muda ([crossover-palavra-e-aviso](sequencias/cesto-festejo/crossover-palavra-e-aviso/README.md)).
- **Fim de um jogo normal:** acaba seco, sem papelinhos nem festa. Os papelinhos são só para o título ([fim-do-jogo-para-relatorio](sequencias/entrada-saida/fim-do-jogo-para-relatorio/README.md)).
- **Mapa da cidade:** a câmara nunca se mexe, e não há cortinas, deslizes nem zooms entre ecrãs.
- **Balneário:** a mesma ideia de uma sala isométrica, antes do jogo e ao intervalo, com os botões do treinador ao lado.
- **Previsão antes do jogo:** o prognóstico com a barra faz o papel do TOTO, sem empate, como é próprio do basquetebol.

## O que o Pocket Basketball tem e o Calciobit não tem

- **Valor de cada cesto no campo:** o «+1», «+2» ou «+3» junto ao aro, e «FALTA» ou «FORA» a flutuar, sem parar o jogo ([cesto-normal-mais-dois](sequencias/cesto-festejo/cesto-normal-mais-dois/README.md)).
- **Bancada que fala durante o jogo:** frases ligadas ao lance e ao marcador, e um letreiro de cântico.
- **Desconto com grande plano:** zoom contínuo até 2× sobre o banco, com a equipa a juntar-se ([desconto-zoom-ao-banco](sequencias/jogo-camara/desconto-zoom-ao-banco/README.md)).
- **Fim de período com o banco:** a equipa vai ao banco e as trocas abrem com uma contagem no botão ([fim-do-periodo-1](sequencias/entrada-saida/fim-do-periodo-1/README.md)).
- **Repetição em câmara lenta** do lance que decidiu o jogo, com uma explicação no painel.
- **Relatório mais completo:** o resultado a contar, o que decidiu o jogo, os outros jogos da jornada e as cartas ganhas, num só ecrã.
- **Treino que mostra o ganho:** as sete barras sobem até à nota nova e aparece «Aprendeu Crossover» ([treino-combo-de-cartas](sequencias/menus-transicoes/treino-combo-de-cartas/README.md)).
- **Cerimónia com a taça:** a roda no círculo central e o capitão a erguer a taça em grande plano ([cerimonia-do-titulo](sequencias/entrada-saida/cerimonia-do-titulo/README.md)).
- **Cidade viva:** bonecos a andar nas ruas, mesmo durante as cortinas.

## Defeitos encontrados

São erros do que já existe, não ideias novas. Estão por ordem de gravidade. **Os cinco foram corrigidos no commit c0b0899** e confirmados numa gravação nova; as sequências mostram ainda o estado de antes.

1. **A barra do marcador tapa os balões da bancada.** Durante o jogo só se lê o início das frases («ISS…», «JÁ VIMOS P…»), e dois balões seguidos tapam-se um ao outro. Só na repetição, sem barra, se lê a frase inteira. As palavras do jogo já ficam por baixo da barra (`FLOATER_MIN_TOP`), mas os balões não ([afundanco-tremor-e-aviso](sequencias/cesto-festejo/afundanco-tremor-e-aviso/README.md), frame 30).
2. **A cena chega um frame depois do painel.** Ao abrir o mapa, o escritório ou o balneário, o primeiro frame mostra o painel sobre um buraco escuro ([cidade-escritorio-mercado](sequencias/menus-transicoes/cidade-escritorio-mercado/README.md), frames 3–4; [cidade-para-pavilhao](sequencias/menus-transicoes/cidade-para-pavilhao/README.md), frames 6–7).
3. **Dois avisos para a mesma jogada.** No afundanço de força, «Afundanço de Força!» é apagado no cesto e trocado por «Afundanço!», e ainda há a palavra por cima do jogador e a linha no painel ([afundanco-de-forca](sequencias/cesto-festejo/afundanco-de-forca/README.md)).
4. **O resultado volta a contar depois da repetição.** Ao sair de «Rever o lance», o relatório recomeça a contagem de 32–21 até 55–36, como se fosse a primeira vez ([repeticao-cesto-e-saida](sequencias/jogo-camara/repeticao-cesto-e-saida/README.md)).
5. **Um véu esbate o combo quando o painel do resultado aparece**, e o título «Combo secreto descoberto!» perde contraste ([treino-combo-de-cartas](sequencias/menus-transicoes/treino-combo-de-cartas/README.md), frames 48–55).

## Lacunas por prioridade

### Alta

> **Feitas a 10 de novembro de 2026:** as lacunas 2, 4 e 5.
> - **2.** Depois da cerimónia vem um palco próprio: o placar do pavilhão acende a prova, o clube e o troféu, linha a linha, e segue-se a foto de equipa. Os suplentes saltam no banco, e o relatório diz «Campeões» e mostra a tabela num título da liga.
> - **4.** Um botão tocado fica a tinta, ou a papel nos botões escuros, pelo menos 120 ms. No mapa, o edifício tocado ganha uma seta dourada.
> - **5.** Na apresentação, as faixas dos dois clubes mostram casa ou fora, o lugar na liga e a forma. A bola ao alto tem um grande plano a 2×, sem o marcador.
> - **Ficaram de fora:** a foto de equipa no escritório e a apresentação do adversário como clube noutros ecrãs.
>
> **Feitas a 10 de novembro de 2026, à noite:** o jogo passou a um só ecrã, como o Calciobit, e ficaram feitas as outras lacunas de interface.
> - **Ecrã único:** no jogo, o campo ocupa o ecrã, os botões do treinador são redondos à direita e o painel é uma janela aberta pelo INFO. Nos menus, a cena ocupa o ecrã e as fichas e as listas abrem em janelas. O escritório e o balneário têm botões redondos com legenda.
> - **Lacunas altas:** 1 (momentos grandes, com a imagem parada e o resultado grande), 3 (falta com grande plano e faixa), 6 (câmara mais calma, por experimentar a jogar) e 7 (cartas do combo ao lado do aviso).
> - **Lacunas médias e baixas:** 8 a 23, menos a 17, a ida para o jogo: a pergunta do adjunto saiu por decisão do dono (tocar no pavilhão entra logo) e as bandeiras no pavilhão ficaram por fazer e o «Rever» oferecido durante o jogo (9 ficou com o filme do jogo no relatório).



1. **Nenhum cesto é maior do que os outros.** Um afundanço de força decisivo tem o mesmo aviso de 1,8 s e o mesmo «+2» de um cesto qualquer, e tudo acaba antes da reposição. A câmara também não reage a nenhum cesto. O golo do Calciobit funciona porque é raro e para o jogo ([resultado-entra-golo-sofrido](../calciobit/sequencias/golo-festejo/resultado-entra-golo-sofrido/README.md)).
   - *Ideia:* reservar um «momento grande» a um a três cestos por jogo: um movimento especial que dá cesto, um cesto sobre o apito, uma reviravolta ou um triplo de empate no fim.
   - Nesse momento, a reposição espera cerca de 2 s e a imagem fica parada um instante. O resultado aparece grande a meio do campo, com o número novo maior e na cor da equipa, e assenta.
   - A câmara pode dar um empurrão curto, sem corte. Os cestos normais ficam como estão.
2. **O título não tem palco.** São cerca de 11 s no mesmo campo, uma faixa e papelinhos, e depois o relatório de um jogo normal. O Calciobit gasta cerca de 45 s com clarão, claque, suplentes a correr, o painel revelado passo a passo e o mosaico ([painel-trofeu-liga](../calciobit/sequencias/entrada-saida/painel-trofeu-liga/README.md), [mosaico-we-are-the-champions](../calciobit/sequencias/entrada-saida/mosaico-we-are-the-champions/README.md)).
   - *Ideia:* depois da roda, um clarão, que fica reservado aos títulos. Segue-se um ecrã próprio, por exemplo o placar do pavilhão a acender com a prova, o clube e a taça, um a um.
   - Depois, uma «foto de equipa» do plantel em pixel art, que podia ficar no escritório.
   - Os suplentes saltam do banco e os vencidos sentam-se de cabeça baixa. O relatório diz «Campeões» e mostra a classificação final.
3. **A falta não tem momento próprio.** É um «FALTA» pequeno a flutuar 1,6 s. Não se vê quem a fez nem quantas faltas leva ([falta-e-lances-livres-plano-fixo](sequencias/jogo-camara/falta-e-lances-livres-plano-fixo/README.md)). No Calciobit, a falta tem um grande plano do árbitro e uma faixa com o nome ([cartao-amarelo-zoom-e-saida](../calciobit/sequencias/jogo-camara/cartao-amarelo-zoom-e-saida/README.md)).
   - *Ideia:* no apito, o mesmo zoom curto do desconto, sem corte, sobre quem fez a falta, com uma faixa «Falta de Botelho · 3.ª falta».
   - A quinta falta ganha uma faixa própria e o jogador a sair.
4. **O toque não dá resposta à vista.** Nenhum toque gravado mostra resposta nos botões, nas etiquetas do mapa ou em «Contratar». O CSS só faz o botão afundar 1 px enquanto o dedo está em cima. No Calciobit, o botão fica amarelo durante um frame e a ação vem logo a seguir ([ficha-jogador-fechar-abrir](../calciobit/sequencias/menus-transicoes/ficha-jogador-fechar-abrir/README.md)).
   - Isto tem de ser confirmado com o dedo, porque os cliques do script são muito rápidos.
   - *Ideia:* um frame numa cor de destaque própria do jogo em qualquer botão, com a ação dois frames depois. No mapa, o edifício pisca.
5. **A entrada no jogo não cria expectativa.** A apresentação mostra os cinco de cada lado, mas não o adversário como clube: casa ou fora, divisão e lugar na liga. A bola ao alto fica no plano largo, sem grande plano. O Calciobit tem antevisão com faixas, claque, sorteio em grande plano e pontapé de saída ([bola-ao-alto](sequencias/entrada-saida/bola-ao-alto/README.md); Calciobit: [sorteio-zoom-e-fade](../calciobit/sequencias/jogo-camara/sorteio-zoom-e-fade/README.md)).
   - *Ideia:* uma faixa por clube a entrar escalonada no topo da apresentação, com o emblema, casa ou fora, o lugar na liga e a forma.
   - Na bola ao alto, um grande plano a 2× do círculo central. O zoom já existe no desconto e na cerimónia.
6. **A câmara anda depressa e roda a cada posse.** Atravessa cerca de um quarto do campo visível por segundo, quatro a cinco vezes mais do que o Calciobit, e roda de um diagonal para o outro em cada ataque ([mudanca-de-lado-pan-e-rotacao](sequencias/jogo-camara/mudanca-de-lado-pan-e-rotacao/README.md)).
   - *Ideia:* limitar a velocidade da câmara, como já se faz no fim do jogo (`END_CAMERA_SPEED`). Ficar a meio campo enquanto a bola atravessa e só rodar quando o ataque se instala.
   - Mudar isto mexe na leitura do jogo e precisa de ser experimentado: os protótipos de câmara anteriores foram postos de lado.
7. **Os movimentos especiais não mostram as cartas.** Só aparece o nome, e o jogador não liga o treino ao que vê. No Calciobit, as cartas que fazem o combo ficam no canto a jogada toda ([habilidade-entrada-cartas-nome](../calciobit/sequencias/golo-festejo/habilidade-entrada-cartas-nome/README.md)).
   - *Ideia:* duas ou três mini-cartas, com os ícones das cartas do treino, ao lado do aviso até ao fim da jogada, e um só aviso, por exemplo «Afundanço de Força! +2».

### Média

8. **O fim de um jogo normal não marca o momento.** Há a faixa «Vitória!», 3 s de jogadores a andar e um escurecimento. *Ideia:* 1 a 1,5 s de grande plano no apito, com os vencedores de braços no ar e os vencidos de cabeça baixa.
9. **A repetição está escondida, demora e sai a seco.** Só há uma, no relatório. São 6 s de câmara lenta antes do cesto e 0,6 s depois, com corte seco nos dois sentidos ([repeticao-entrada-corte](sequencias/jogo-camara/repeticao-entrada-corte/README.md)). *Ideia:* começar mais perto do lance e abrandar só no voo da bola. Ficar 1 s no cesto e entrar e sair por um fundido. Oferecer «Rever» depois de um momento grande.
10. **Não há resumo dos lances.** *Ideia:* um «filme do jogo» com os três a cinco momentos que o mudaram (maior parcial, ultrapassagem no marcador, último cesto), cada um com período, tempo e resultado. Usa a repetição que já existe.
11. **Não há ficha de quem marcou.** Só uma linha no painel, às vezes atrasada. *Ideia:* nos momentos grandes, uma ficha pequena no campo durante a reposição: retrato, nome, pontos de hoje e quem assistiu ([regresso-ficha-marcador](../calciobit/sequencias/golo-festejo/regresso-ficha-marcador/README.md)).
12. **O lance livre não tem enquadramento.** O cesto fica pequeno num canto e o lançador não tem nome. É o par do penálti, que no Calciobit tem câmara fixa e ficha do batedor ([penaltis-remate-camara-fixa](../calciobit/sequencias/jogo-camara/penaltis-remate-camara-fixa/README.md)). *Ideia:* com o jogo apertado, a câmara atrás do lançador, com o nome, a percentagem e os círculos dos lances.
13. **Contratar não dá retorno.** A linha desaparece e o dinheiro muda num frame, sem mensagem ([mercado-abrir-e-contratar](sequencias/menus-transicoes/mercado-abrir-e-contratar/README.md)). *Ideia:* a secretária confirma, e o dinheiro conta para baixo.
14. **O combo de cartas é curto e sem suspense:** 1,8 s, contra 9 s. *Ideia:* cerca de 3 a 4 s, com as cartas a entrar uma a uma e uma bola de luz passada entre elas até um «afundanço» no centro. Mantém-se o toque para saltar.
15. **As transições não mudam de ritmo.** Todas levam 0,18 s, também à volta do jogo. *Ideia:* passar por um azul escuro do jogo, não preto, em cerca de 0,5 s nos menus. Ao entrar no pavilhão e ao sair do relatório, uma passagem mais lenta, para o dia de jogo pesar mais. A cena desenha-se durante o escuro, o que também resolve o segundo defeito.
16. **O intervalo esconde o tempo.** Recomeça sozinho ao fim de 30 s sem nada à vista. *Ideia:* a contagem no botão «Segunda parte», como já acontece no fim de período.
17. **Ir para o jogo não tem cerimónia.** Em semana de jogo o pavilhão fica igual e um toque entra logo. *Ideia:* bandeiras das duas equipas no pavilhão e o adjunto a perguntar «Vamos para o pavilhão?».

### Baixa

18. **Falas sem ritmo:** aparecem com o ecrã, sem fade, e o texto vem inteiro. *Ideia:* fade de 0,2 s e texto letra a letra, com toque para completar.
19. **O cartão do próximo jogo não chama a atenção.** *Ideia:* entra com um pequeno ressalto de escala.
20. **O balneário é sempre a mesma imagem.** *Ideia:* jogadores sentados ao intervalo e de pé antes do jogo.
21. **«Repetição» é discreto.** *Ideia:* fazê-lo piscar, para dizer sem ler que não é ao vivo.
22. **Os raios do combo são sempre roxos.** *Ideia:* a cor da categoria de cartas que domina.
23. **A cápsula do marcador muda sem sinal.** *Ideia:* o algarismo de quem marcou pisca uma vez na cor da equipa.

## O que falta gravar

- **No jogo:** um roubo e um desarme com o jogo a correr, um choque com alguém no chão, o fim de um desconto, dois lances livres com um falhado e uma falta sem cesto.
- **Movimentos:** o step-back, o alley-oop e a mão rápida, com o segundo antes do movimento. Hoje o script entra já depois de o movimento começar.
- **Avisos:** «Sobre o apito!», «Reviravolta!» e «Parcial».
- **Fim do jogo:** uma derrota, um jogo fora e o prolongamento.
- **Cerimónia:** a cerimónia da taça, e a de liga a 10 fps.
- **Menus:** «Passar a semana» a sério, uma pergunta sim/não, a troca de separadores na federação, cartas novas depois de um jogo e uma contratação a outro clube.
- **Ainda sem gravação:** o som. O esquema vertical já não existe: o jogo passou a ser só horizontal, como o Calciobit.

Para gravar de novo, acrescenta-se o percurso em `src/tools/sequences.ts` e corre-se `npm run sequences`.
