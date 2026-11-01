// Todos os números de equilíbrio do jogo. Depois de mudar qualquer um, corre `npm run sim`.
export const BALANCE = {
  // Tempo, em segundos reais
  periodSeconds: 120,
  overtimeSeconds: 60,
  periodBreakSeconds: 2,
  shotClockSeconds: 11,
  offensiveReboundShotClockSeconds: 7,
  deadBallSeconds: 0.9,
  // Reposição: quem repõe fica fora de campo e passa a quem vem receber.
  inboundMaxWaitSeconds: 2,
  inboundOutside: 0.45,
  inboundTwoReceiversChance: 0.35,
  // Início do jogo: as equipas entram a andar e a bola sobe entre dois saltadores.
  introMaxSeconds: 5,
  introWalkFactor: 0.5,
  jumpSeconds: 1.1,
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
  // Quem ganha o ressalto, se for grande, procura o base em vez de subir sozinho.
  outletU: 14,
  outletBoost: 4,
  // Sem pressão, a defesa espera o ataque aqui, em vez de o seguir até ao outro lado.
  defensePickUpU: 10.5,
  freeThrowSeconds: 1,
  freeThrowSetupSeconds: 1,
  freeThrowFlightSeconds: 0.6,
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

  // Movimento
  baseSpeed: 4.3,
  speedPerPoint: 0.03,
  fatigueSpeedLoss: 0.3,
  cutMinSeconds: 1.2,
  cutMaxSeconds: 2.4,

  // Decisões do portador da bola
  decisionMinSeconds: 0.35,
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

  // Cansaço, por segundo
  fatigueGain: 0.0085,
  fatigueStaminaFactor: 2.5,
  fatigueDefenseLoss: 0.4,
  benchRecovery: 0.009,
  benchStrengthFactor: 1,
  periodBreakRecovery: 0.12,
  subOutFatigue: 0.85,
  maxStintSeconds: 60,
  stintStaggerSeconds: 7,
  subInFatigue: 0.4,

  // Corpo: referência de 195 cm, 95 kg e índice de massa corporal 25
  referenceHeight: 195,
  referenceWeight: 95,
  referenceBmi: 25,
  speedLossPerBmi: 0.06,
  fatiguePerBmi: 0.01,
  reboundPerCm: 0.012,
  reboundPerKg: 0.007,
  blockPerCm: 0.003,
  finishPerCm: 0.0015,
  finishPerKg: 0.0006,
  contestPerCm: 0.002,

  // Movimentos especiais
  crossoverChance: 0.85,
  crossoverMinPressure: 0.3,
  crossoverStunSeconds: 2.2,
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
  timeoutSeconds: 3,
  afterTimeoutSeconds: 2.5,
  timeoutRecovery: 0.12,
  aiTimeoutRun: 8,

  // Colisões. O corpo ocupa este raio, e quem tem mais físico e peso é empurrado menos.
  bodyRadius: 0.41,
  bodyRadiusPerBmi: 0.012,
  pushPerKg: 0.8,
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
