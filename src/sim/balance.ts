// Todos os números de equilíbrio do jogo. Depois de mudar qualquer um, corre `npm run sim`.
export const BALANCE = {
  // Tempo, em segundos reais
  periodSeconds: 135,
  overtimeSeconds: 60,
  periodBreakSeconds: 4,
  shotClockSeconds: 11,
  offensiveReboundShotClockSeconds: 7,
  deadBallSeconds: 0.4,
  // Com trocas, a bola parada dura o bastante para quem entra e quem sai irem a andar antes da reposição.
  substitutionSeconds: 1.6,
  // Nas trocas, o jogo espera que quem sai chegue ao banco e quem entra chegue ao seu lugar, mas nunca mais do que isto.
  substitutionMaxWaitSeconds: 6,
  substitutionArriveDistance: 0.6,
  // Reposição: quem repõe fica fora de campo, assenta os pés e passa a quem vem receber.
  // Quem repõe vai buscar a bola onde ela ficou e leva-a até à linha; só se espera por ele até aqui.
  inboundMaxWaitSeconds: 8,
  inboundSettleSeconds: 0.35,
  inboundOutside: 0.7,
  // Uma bola perdida rola até à linha mais perto, a esta velocidade, antes de a reposição começar.
  lostBallRollSpeed: 6,
  inboundTwoReceiversChance: 0.35,
  // Início do jogo: as equipas entram a andar e a bola sobe entre dois saltadores.
  introMaxSeconds: 5,
  introWalkFactor: 0.5,
  jumpSeconds: 1.1,
  // Quanto a bola ao alto sobe acima da linha reta entre as mãos do árbitro e as dos saltadores: pouco, para lhes cair nas mãos.
  jumpBallArc: 4,
  // Cada ponto de diferença a saltar vale 1% de hipóteses, e nunca passa de 70%.
  jumpEdgePerPoint: 0.01,
  jumpMaxEdge: 0.2,
  jumpPerCm: 0.6,
  // Ressalto: nem toda a gente vai. Os outros recuam, ficam no sítio ou marcam o seu jogador.
  reboundChasersOffense: 2,
  reboundChasersDefense: 2,
  reboundCrashPreference: 1.5,
  reboundGuardReluctance: 1.5,
  reboundSafetyU: 12,
  // Quem ganha o ressalto, se for grande, passa quase sempre ao base em vez de subir sozinho; a técnica dá-lhe licença para ficar com ela.
  outletU: 14,
  outletBoost: 4,
  outletPassChance: 0.95,
  outletSkilledFrom: 65,
  outletSkillSlope: 0.02,
  // Ninguém sai das linhas com a bola em jogo: quem fica fora desliza para dentro a este ritmo, por passo.
  lineSlide: 0.4,
  // Pressão normal: a defesa espera o ataque aqui. A meio campo, espera na linha do meio. Campo inteiro: segue-o sempre.
  defensePickUpU: 10.5,
  halfCourtPickUpU: 14,
  // Zona: cada defensor guarda o seu sítio, puxado um pouco para a bola; quem a tem mais perto fecha-se sobre ela.
  zoneBallPull: 0.7,
  zoneCloseRange: 3,
  zoneCloseGap: 0.8,
  // Saída contra pressão: no campo de trás, um colega vem dar linha de passe, e quem tem a bola passa-a em vez de a segurar.
  pressHelpDistance: 4,
  pressBreakPressure: 0.3,
  pressBreakPassChance: 0.8,
  // Jogadas: o bloqueio conta quando o bloqueador está a esta distância do defensor; com ele posto, a penetração apetece mais.
  screenSetRange: 1.4,
  screenPressureFactor: 0.5,
  pickRollDrive: 1.4,
  // Livre e à distância, ninguém fica a segurar a bola.
  openPressure: 0.25,
  // Em cada posse, a equipa escolhe a jogada pelo foco do ataque: [livre, pick-and-roll, bloqueios sem bola].
  // Com opções de ataque escolhidas, esta parte das posses é uma jogada para uma delas, e destas esta parte é para a primeira.
  optionPlayChance: 0.55,
  optionFirstShare: 0.65,
  // Peso extra para a opção lançar ou penetrar, e para lhe passarem a bola.
  firstOptionFactor: 1.6,
  secondOptionFactor: 1.3,
  // Na jogada montada para ele, os colegas procuram-no ainda mais, e no isolamento penetra mais.
  playPassFactor: 2.5,
  isoDriveFactor: 1.6,
  // Um organizador como opção cria para os outros: os passes dele pesam mais, e o passe ao grande que rola ainda mais.
  creatorPassFactor: 1.6,
  // Um colega muito livre (pressão abaixo disto) ou com o caminho livre para o cesto pede a bola: o passe para ele pesa o dobro.
  wideOpenPressure: 0.1,
  openTeammatePass: 2,
  // O base, ou um organizador, passa-lhe quase sempre, se o lance dele valer pelo menos esta parte do seu.
  guardOpenPassChance: 0.7,
  guardOpenPassValue: 0.8,
  rollPassFactor: 2,
  // Quem acabou de receber do organizador lança e ataca mais: é assim que nascem as assistências dele.
  fedShotFactor: 1.8,
  fedSeconds: 2,
  // Em posição de defesa, perto de quem marca, anda-se de lado e mais devagar; longe dele, corre-se para lá.
  stanceRange: 2.5,
  stanceSpeed: 0.88,
  stanceChaseRange: 1,
  // A partir desta altura é um grande: joga de costas, ou abre para o arco se lançar bem.
  // O nível de altura a partir do qual é um grande.
  bigHeight: 3,
  popShooting: 60,
  playsInside: [0.3, 0.6, 0.1],
  playsMixed: [0.5, 0.25, 0.25],
  playsOutside: [0.3, 0.1, 0.6],
  openHoldFactor: 0.6,
  // Lances livres: o árbitro vai buscar a bola ao aro e entrega-a ao lançador entre cada lance.
  freeThrowSeconds: 3,
  freeThrowSetupSeconds: 2,
  freeThrowFlightSeconds: 0.6,
  // Entre lances livres: a bola cai do aro, rola até ao árbitro debaixo do cesto, e ele passa-a ao lançador.
  freeThrowRefereeU: 0.6,
  freeThrowRefereeV: 1.3,
  freeThrowFallSeconds: 0.35,
  freeThrowRollSeconds: 0.3,
  freeThrowPassSeconds: 0.45,
  refereeWalkSpeed: 3,
  rimHeight: 3.05,
  reboundSeconds: 0.4,
  // A bola demora mais a cair quanto mais alto ressalta.
  reboundSecondsPerRise: 0.25,
  reboundCatchHeight: 2.1,
  reboundDropChance: 0.3,
  reboundDropRiseMin: 0.1,
  reboundDropRiseMax: 0.3,
  reboundBounceRiseMin: 0.8,
  reboundBounceRiseMax: 1.6,
  reboundBlockedRiseMin: 0.3,
  reboundBlockedRiseMax: 0.8,
  reboundBlockedTravel: 1.5,
  // A bola cai e fica no chão até quem a ganhou chegar ao pé dela.
  reboundCatchDistance: 0.8,
  reboundMaxWaitSeconds: 1.5,

  // Movimento
  baseSpeed: 3.7,
  speedPerPoint: 0.02,
  fatigueSpeedLoss: 0.3,
  cutMinSeconds: 1.2,
  cutMaxSeconds: 2.4,

  // Decisões do portador da bola
  decisionMinSeconds: 0.33,
  decisionMaxSeconds: 0.74,
  shootingRangeU: 10,
  forcedShotSeconds: 1,
  holdWeight: 0.32,
  shootWeight: 1,
  passWeight: 1.15,
  driveWeight: 0.9,
  urgencyPerShotClock: 2,
  drivePressureRelief: 0.5,
  aheadPassChance: 0.25,
  // Um colega à frente com o caminho livre para o cesto quase sempre recebe a bola.
  aheadOpenLaneChance: 0.8,
  aheadPassRangeU: 9,
  passSpeed: 15,
  minPassSeconds: 0.2,

  // Lançamento
  rimChance: 0.82,
  rimDistance: 1.2,
  midDistance: 3,
  midChance: 0.65,
  longChance: 0.62,
  threeChance: 0.54,
  threeFalloffPerMeter: 0.03,
  skillPivot: 3,
  closeSkillSlope: 0.035,
  farSkillSlope: 0.07,
  pressurePenalty: 0.16,
  composureSlope: 0.25,
  fatiguePenalty: 0.14,
  clutchSlope: 0.05,
  clutchSeconds: 30,
  awaySlope: 0.015,
  minChance: 0.03,
  maxChance: 0.95,
  shotMinSeconds: 0.35,
  shotSecondsPerMeter: 0.08,
  shotArcBase: 0.5,
  shotArcPerMeter: 1.2,
  ballFallSpeed: 6,
  ballRestHeight: 0.15,
  rimMissOffset: 0.34,
  // Ninguém lança com os pés em cima da linha de 3, a não ser à pressa, com o tempo de posse a acabar.
  shotLineMargin: 0.35,
  shotLineRushSeconds: 2,
  blockedTravel: 0.12,
  // Afundanço: de perto e com impulsão, leva-se a bola até ao aro.
  dunkMaxDistance: 1.7,
  // Quem afunda arranca para o aro: corre a esta fração a mais da sua velocidade, para lá chegar no tempo do lance.
  dunkBurst: 1.5,
  dunkMinJumping: 45,
  dunkArc: 0.3,
  // Nenhum lançamento chega ao aro a subir: mesmo debaixo do cesto, a bola passa por cima e cai lá dentro.
  shotMinArc: 1.6,

  // Pressão do defensor
  pressureRange: 2.5,
  pressureBase: 0.4,
  pressureSkill: 1.2,

  // Bola perdida
  stealPressureMin: 0.35,
  stealBase: 0.006,
  stealSlope: 0.00006,
  looseBallBase: 0.003,
  interceptDistance: 0.7,
  interceptBase: 0.016,
  interceptSlope: 0.00008,
  badPassBase: 0.004,
  badPassPerMeter: 0.0004,

  // Desarme de lançamento
  blockPressureMin: 0.4,
  blockMaxDistance: 4,
  blockBase: 0.09,
  blockSlope: 0.003,

  // Faltas
  reachFoulPressureMin: 0.5,
  reachFoulChance: 0.012,
  rimFoulChance: 0.34,
  jumperFoulChance: 0.09,
  foulSkillSlope: 0.0015,
  teamFoulLimit: 3,
  foulOutAt: 5,

  // Lance livre
  freeThrowBase: 0.46,
  freeThrowSlope: 0.09,

  // Ressalto
  reboundDefenseBonus: 2.5,

  // Cansaço, por segundo. A energia com que se começa vem da condição física e da resistência: com a mesma condição,
  // quem tem mais resistência começa mais fresco.
  conditionStaminaFactor: 1,
  fatigueGain: 0.0045,
  fatigueStaminaFactor: 2.5,
  fatigueDefenseLoss: 0.4,
  benchRecovery: 0.009,
  benchStrengthFactor: 1,
  periodBreakRecovery: 0.12,
  subOutFatigue: 0.85,
  maxStintSeconds: 200,
  stintStaggerSeconds: 10,
  subInFatigue: 0.4,

  // Corpo: referência de 195 cm, 95 kg e índice de massa corporal 25
  referenceHeight: 195,
  // Os centímetros com que cada nível de altura entra nos cálculos, e os limites com que se sorteiam.
  heightByLevel: [184, 198, 212],
  heightLevelFrom: [193, 203],
  reboundPerCm: 0.02,
  blockPerCm: 0.005,
  finishPerCm: 0.003,
  contestPerCm: 0.005,

  // Movimentos especiais
  crossoverChance: 0.85,
  crossoverMinPressure: 0.3,
  crossoverStunSeconds: 2.2,
  // Caminho livre: nenhum defensor a esta distância da linha até ao cesto. Vai-se direito a ele, e lança-se ao chegar.
  openLaneWidth: 1.5,
  openLaneMaxAhead: 1,
  // Sozinho perto do cesto, lança-se logo: nenhuma prioridade de opção vale mais do que isso.
  openShotDistance: 2.8,
  openShotPressure: 0.2,
  openLaneFinish: 1.6,
  openLaneCheckSeconds: 0.15,
  // Quem é mais alto é mais lento: 20 cm valem 0,14 m/s.
  speedLossPerCm: 0.007,
  // Quedas: fica no chão e levanta-se, sem poder fazer nada entretanto.
  fallSeconds: 1.8,
  ankleFallBase: 0.15,
  ankleFallPerTechnique: 0.004,
  // Bater num bloqueio: atordoa conforme a diferença de força, e derruba conforme a força de quem bloqueia.
  screenContactRange: 0.9,
  screenHitCooldownSeconds: 4,
  screenStunBase: 0.35,
  screenStunPerStrength: 0.006,
  screenStunSeconds: 0.9,
  screenFallPerStrength: 0.004,
  screenFallFromStrength: 30,
  // Levar um afundanço em cima: quanto mais forte quem afunda, mais vezes vai ao chão.
  posterRange: 1.8,
  posterFallBase: 0.1,
  posterFallPerStrength: 0.008,
  posterFallMax: 0.7,
  stepBackChance: 0.75,
  stepBackMinPressure: 0.3,
  stepBackMinDistance: 3.5,
  stepBackMaxDistance: 8.5,
  stepBackMeters: 1.8,
  alleyOopChance: 0.1,
  alleyOopRange: 2.6,
  alleyOopMaxPressure: 0.4,
  alleyOopMinJumping: 55,
  alleyOopBonus: 0.05,
  powerDunkMaxDistance: 2,
  powerDunkBonus: 0.12,
  pickpocketFactor: 2.5,

  // Comportamentos sem bola
  cutterCutFactor: 0.6,
  // Os três tipos da Fase 4: o sexto homem recupera mais no banco e entra mais cansado; o dínamo corta e rouba mais;
  // o guarda do aro fica entre o seu homem e o cesto e desarma mais.
  sixthManRecovery: 1.7,
  sixthManSubIn: 0.15,
  dynamoCutFactor: 0.85,
  dynamoSteal: 1.6,
  rimProtectorGap: 1.6,
  rimProtectorSagFrom: 7.5,
  rimProtectorBlock: 2,
  // Quem vive do ressalto ofensivo chega-lhe melhor colocado.
  crasherReboundBonus: 0.3,
  shadowGap: 0.8,
  screenDistance: 1.1,
  screenSlowRange: 0.9,
  screenSlowdown: 0.55,
  leakU: 11,
  leakMinShotDistance: 6.3,
  spotUpBonus: 0.06,
  catchAndShootSeconds: 1.2,
  slasherFinishBonus: 0.1,
  cutterFinishBonus: 0.07,
  postUpFinishBonus: 0.07,

  // Comportamentos com bola: multiplicam a vontade de lançar, lançar de 3, passar, ir para o cesto e esperar
  onBall: {
    balanced: { shoot: 1, three: 1, pass: 1, drive: 1, hold: 1 },
    playmaker: { shoot: 0.7, three: 0.8, pass: 1.6, drive: 1, hold: 1 },
    scorer: { shoot: 1.5, three: 1.2, pass: 0.6, drive: 1.2, hold: 0.7 },
    slasher: { shoot: 0.8, three: 0.4, pass: 0.8, drive: 1.8, hold: 0.8 },
    shooter: { shoot: 1.1, three: 2.2, pass: 1, drive: 0.4, hold: 1 },
    postUp: { shoot: 1.2, three: 0.2, pass: 0.9, drive: 1.5, hold: 1 },
  },
  starterReturnFatigue: 0.25,

  // Táticas: efeito de cada uma no seu extremo
  tacticThree: 0.6,
  tacticInsideDrive: 0.35,
  tacticSpacingSpot: 0.1,
  tacticPaceShoot: 0.25,
  tacticPaceHold: 0.4,
  tacticPacePass: 0.15,
  tacticPaceDecision: 0.2,
  tacticPaceFatigue: 0.15,
  tacticPressureGap: 0.4,
  tacticPressureSteal: 0.6,
  tacticPressureFoul: 0.6,
  tacticPressureFatigue: 0.2,
  // Alvos: quem marca um alvo cola-se a ele e contesta-lhe cada lançamento. Os outros dez encontram um nadinha mais de espaço:
  // mais do que isto, e marcar os melhores deixava de compensar, porque são muitos a aproveitar.
  focusGap: 0.8,
  unfocusedGap: 1,
  focusShotPenalty: 0.1,
  unfocusedShotBonus: 0.01,

  // Descontos de tempo
  timeoutsPerHalf: 2,
  timeoutsInOvertime: 1,
  timeoutSeconds: 4,
  afterTimeoutSeconds: 2.5,
  timeoutRecovery: 0.12,
  aiTimeoutRun: 8,

  // Colisões. O corpo ocupa este raio, e quem tem mais físico e peso é empurrado menos.
  bodyRadius: 0.41,
  pushPerCm: 0.1,
  pushFatigueLoss: 0.3,
  pushPowerMin: 15,
  contactPasses: 2,
  contactSlide: 0.5,
  // Encontrões: só entre adversários, a chocar de frente, e cada um só de vez em quando.
  // A velocidade é a de aproximação, em metros por passo: 0,2 são 4 m/s.
  bumpMinClosing: 0.2,
  // Longe da bola e do cesto, passar de raspão não conta como encontrão.
  bumpHoopRange: 4.5,
  bumpLuck: 18,
  bumpHardMargin: 42,
  bumpSlowdown: 0.65,
  bumpSlowSeconds: 0.3,
  bumpStunSeconds: 0.25,
  bumpCooldownSeconds: 4,
  // Jogo de costas para o cesto: encostar ao defensor e ganhar terreno.
  postMinDistance: 1.7,
  postMaxDistance: 5.5,
  postContactRange: 1.3,
  postPowerEdge: 15,
  postSpeedFactor: 0.4,
  postPressureRelief: 0.25,
  postPowerScale: 40,

  // O tempo: o potencial desce no fim de cada época, mais depressa com os anos no clube e com os jogos jogados.
  // Perto do fim, o corpo começa a ceder.
  potentialDecayBase: 3,
  potentialDecayPerYear: 1,
  potentialDecayPerGame: 0.05,
  potentialDecayLuck: 2,
  potentialDeclineFrom: 20,
  potentialDeclineRate: 0.3,
  // Quem chega para substituir quem sai: mais fraco do que a divisão, mas com futuro.
  freeAgentLevelOffset: -4,
  freeAgentPotentialMin: 65,
  freeAgentPotentialMax: 90,
  // Dinheiro, em milhares: o orçamento de cada divisão, os prémios e os salários por nota.
  budgetByDivision: [600, 900, 1400, 2200],
  prizeMoney: { federation: 200, continental: 400, world: 600, playoffChampion: 300, playoffFinalist: 150 },
  salaryBase: 5,
  salaryPerPoint: 1,
  salaryPotentialWeight: 0.3,
  squadMin: 10,
  squadMax: 15,
  // O mercado: quantos livres e quantos de outros clubes aparecem por semana, o valor de um jogador e as propostas.
  marketFreeAgents: 3,
  marketClubPlayers: 5,
  transferFeeFactor: 2,
  transferDeadlineWeek: 20,
  offerMinWeeks: 1,
  offerMaxWeeks: 3,
  offerAcceptChance: 0.7,

  // Treino: quanto mais alto o atributo, menos rende. Com 140, um atributo de 70 rende metade.
  trainingHardCap: 140,

  // Liga e confiança da direção. O original despede abaixo de 3%.
  confidenceStart: 60,
  confidenceFired: 3,
  confidenceStep: 5,
  confidenceGapWeight: 0.25,
  confidenceMinStep: 2,
  confidenceMaxStep: 9,
  confidenceFriendlyFactor: 0.5,
  confidenceChampion: 20,
  confidencePromoted: 15,
  confidenceRelegated: 15,
  confidenceCup: 10,
  // Os clubes de fora: os da Taça Continental acima da Pro Liga 1, e o campeão do outro continente acima de todos.
  continentalLevelOffset: 4,
  worldLevelOffset: 12,
  clubLevelSpread: 6,
  clubLevelPull: 0.4,
  clubLevelDrift: 1.5,
  otherDivisionLuck: 6,
  playerClubLevelOffset: -2,
} as const;
