// Todos os números de equilíbrio do jogo. Depois de mudar qualquer um, corre `npm run sim`.
export const BALANCE = {
  // Tempo, em segundos reais
  periodSeconds: 120,
  overtimeSeconds: 60,
  periodBreakSeconds: 2,
  shotClockSeconds: 11,
  offensiveReboundShotClockSeconds: 7,
  deadBallSeconds: 0.9,
  freeThrowSeconds: 1,
  freeThrowSetupSeconds: 1,
  freeThrowFlightSeconds: 0.6,
  reboundSeconds: 0.4,

  // Movimento
  baseSpeed: 4.3,
  speedPerPoint: 0.03,
  fatigueSpeedLoss: 0.3,
  cutMinSeconds: 1.2,
  cutMaxSeconds: 2.4,

  // Decisões do portador da bola
  decisionMinSeconds: 0.35,
  decisionMaxSeconds: 0.7,
  shootingRangeU: 10,
  forcedShotSeconds: 1,
  holdWeight: 0.22,
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
  rimChance: 0.87,
  rimDistance: 1.2,
  midDistance: 3,
  midChance: 0.69,
  longChance: 0.63,
  threeChance: 0.55,
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
  reboundDefenseBonus: 1.9,

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
  starterReturnFatigue: 0.25,
} as const;
