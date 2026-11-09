/** Os tipos do estado de um jogo: corpos, linhas estatísticas, eventos, voos da bola e comandos do treinador. */
import type { Rng } from './rng.ts';
import type { MoveId, Player, Tactics, Team } from './types.ts';

export type TeamIndex = 0 | 1;

export interface LooseBall {
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toY: number;
  /** Quanto a bola sobe acima da linha direta entre o aro e as mãos. */
  rise: number;
  total: number;
  /** Só estes disputam a bola. Os outros seguem o seu papel. */
  chasers: Body[];
  /** Bola perdida: quem a perdeu. A perda só conta quando a bola sai do campo. */
  lostBy?: Body;
  /** Decidido quando a bola cai; só a apanha quando chega ao pé dela. */
  winner: Body | null;
}

/** Quem repõe a bola, de onde, e quem vem receber. */
export interface Inbound {
  passer: Body;
  x: number;
  y: number;
  receivers: { body: Body; x: number; y: number }[];
  waited: number;
  settled: number;
  /** Quem repõe já apanhou a bola do chão e leva-a na mão. */
  hasBall: boolean;
}

export interface JumpBall {
  a: Body;
  b: Body;
  total: number;
}

export type Phase = 'intro' | 'jump' | 'dead' | 'live' | 'pass' | 'shot' | 'rebound' | 'freeThrow' | 'timeout' | 'break' | 'end';

export interface PlayerLine {
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  fouls: number;
  secondsPlayed: number;
}

export interface Body {
  player: Player;
  team: TeamIndex;
  slot: number;
  starterSlot: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  spot: number;
  /** Um corte a ler o defensor: para onde vai, até quando, e se já saiu para o canto (0 sem corte, 1 a cortar, 2 a sair). */
  cutTo: readonly [number, number] | null;
  cutUntil: number;
  cutStage: 0 | 1 | 2;
  nextCutTick: number;
  enteredTick: number;
  stunnedUntil: number;
  /** Porque está atordoado: nos tornozelos partidos tem uma animação própria. */
  stunKind: 'ankle' | null;
  /** No chão, de `fallenFrom` a `fallenUntil`. */
  fallenFrom: number;
  fallenUntil: number;
  /** Para que lado de x fica a cabeça, e se cai de barriga para baixo (senão, de costas). */
  fallHead: -1 | 1;
  fallProne: boolean;
  /** Até quando um bloqueio não o volta a apanhar. */
  screenCooldownUntil: number;
  /** Os 3 segundos: há quantos passos seguidos está na área, e até quando fica fora depois de sair. */
  laneTicks: number;
  laneOutUntil: number;
  /** Depois de perder um encontrão, corre mais devagar até aqui. */
  slowedUntil: number;
  nextBumpTick: number;
  /** O espaço que ocupa em campo. */
  radius: number;
  /** Quanto andou no último passo: um encontrão só acontece com alguém a correr contra o outro. */
  stepX: number;
  stepY: number;
  fatigue: number;
  line: PlayerLine;
}

export interface TeamLine {
  possessions: number;
  twoAttempts: number;
  twoMade: number;
  threeAttempts: number;
  threeMade: number;
  freeThrowAttempts: number;
  freeThrowsMade: number;
  offensiveRebounds: number;
  defensiveRebounds: number;
  turnovers: number;
  steals: number;
  blocks: number;
  fouls: number;
  assists: number;
}

export type MatchEventType =
  | 'period'
  | 'shot'
  | 'made'
  | 'missed'
  | 'block'
  | 'rebound'
  | 'steal'
  | 'turnover'
  | 'foul'
  | 'freeThrowMade'
  | 'freeThrowMissed'
  | 'substitution'
  | 'move'
  | 'bump'
  | 'knockdown'
  | 'tipOff'
  | 'jumpBall'
  | 'timeout'
  | 'shotClockViolation'
  | 'periodEnd'
  | 'end';

export interface MatchEvent {
  type: MatchEventType;
  tick: number;
  period: number;
  clock: number;
  team: TeamIndex;
  player?: string;
  other?: string;
  points?: number;
  offensive?: boolean;
  distance?: number;
  bump?: 'run' | 'rebound' | 'post';
  hard?: boolean;
  move?: MoveId;
  /** O lançamento é um afundanço garantido pelo movimento especial. */
  dunk?: boolean;
  /** Um lay-up: perto do cesto, em corrida, a largar a bola por cima do aro. */
  layup?: boolean;
  /** Numa troca: quanto tempo quem sai leva a chegar ao banco, à sua velocidade. */
  ticks?: number;
}

export interface PassFlight {
  kind: 'pass';
  ticks: number;
  total: number;
  fromX: number;
  fromY: number;
  passer: Body;
  target: Body;
  interceptedBy: Body | null;
  /** Onde o intercetador corta a linha do passe: a bola acaba aí, nas mãos dele, e não no destino. */
  cutX?: number;
  cutY?: number;
  /** Quanto o passe sobe a meio, em metros (um passe comprido vai em arco), e que parte do passe a bola chega a fazer. */
  arc?: number;
  cut?: number;
  bad: boolean;
  lob: boolean;
  /** Um passe que recomeça o jogo: não pode ser intercetado nem conta para assistência. */
  restart: boolean;
  /** A altura de onde parte, na bola ao alto. */
  fromZ: number | null;
}

export interface ShotFlight {
  kind: 'shot';
  ticks: number;
  total: number;
  fromX: number;
  fromY: number;
  shooter: Body;
  points: 2 | 3;
  made: boolean;
  fouledBy: Body | null;
  blockedBy: Body | null;
  dunk: boolean;
  layup: boolean;
  /** No lay-up, onde a bola saiu da mão, quando sai. */
  releaseX?: number;
  releaseY?: number;
  releaseZ?: number;
}

/** Decisões do treinador. Ficam registadas: semente, equipas e comandos reproduzem o jogo exatamente. */
export type Command =
  | { kind: 'timeout'; tick: number; team: TeamIndex }
  | { kind: 'resume'; tick: number; team: TeamIndex }
  | { kind: 'hold'; tick: number; team: TeamIndex }
  | { kind: 'substitution'; tick: number; team: TeamIndex; slot: number; incoming: number }
  | { kind: 'cancelSubstitution'; tick: number; team: TeamIndex; slot: number }
  | { kind: 'reorder'; tick: number; team: TeamIndex; a: number; b: number }
  | { kind: 'autoRotation'; tick: number; team: TeamIndex; on: boolean }
  | { kind: 'tactics'; tick: number; team: TeamIndex; tactics: Tactics };

/** As jogadas de uma posse: livre, bloqueio direto, bloqueios sem bola, e as montadas para uma opção (isolamento, isolamento no poste, bloqueio e abrir). */
export type Play = 'free' | 'pickRoll' | 'screens' | 'iso' | 'postIso' | 'pickPop';

export interface MatchState {
  teams: [Team, Team];
  /** Equipa dirigida por uma pessoa: não pede descontos sozinha. */
  controlled: [boolean, boolean];
  tactics: [Tactics, Tactics];
  /** Quem joga fora, porque a Vontade conta mais longe de casa. */
  visitor: TeamIndex;
  autoRotation: [boolean, boolean];
  timeoutsLeft: [number, number];
  pendingTimeout: [boolean, boolean];
  pendingSubs: { team: TeamIndex; slot: number; incoming: Body }[];
  commands: Command[];
  timeoutTeam: TeamIndex | null;
  clockStopped: boolean;
  run: { team: TeamIndex; points: number };
  bodies: Body[];
  court: [Body[], Body[]];
  rng: Rng;
  seed: number;
  tick: number;
  period: number;
  clock: number;
  phase: Phase;
  timer: number;
  offense: TeamIndex;
  firstOffense: TeamIndex;
  holder: Body | null;
  driving: boolean;
  /** O drive em curso: por que ombro do defensor se ataca, quando começou (ou mudou de direção) e quantas vezes mudou. */
  driveSide: 1 | -1;
  driveStart: number;
  driveTurns: number;
  shotClock: number;
  nextDecision: number;
  flight: PassFlight | ShotFlight | null;
  lastPasser: Body | null;
  lastPassTick: number;
  ball: { x: number; y: number; z: number };
  /** Quem está a jogar de costas para o cesto, a empurrar o defensor. */
  posting: Body | null;
  /**
   * Quem está a fazer um bloqueio nesta jogada, e em quem. O bloqueio direto (`handler`, quem tem a bola) fica o mesmo até a
   * bola mudar de mãos: começa em `since`, o bloqueador vai para o lado do defensor e, quando chega, fica parado em (`x`, `y`)
   * até rolar.
   */
  screen: { by: Body; on: Body; handler?: Body; x?: number; y?: number; since?: number } | null;
  inbound: Inbound | null;
  jump: JumpBall | null;
  /** A trajetória da bola depois de um falhanço, e onde vai cair. */
  loose: LooseBall | null;
  /** A jogada desta posse, escolhida ao começar pelo foco do ataque. */
  play: Play;
  /** Para quem é a jogada desta posse, quando é montada para uma opção de ataque. */
  playFor: Body | null;
  /** `returning`: entre dois lances, a bola ainda está a voltar ao lançador pelas mãos do árbitro. */
  freeThrow: { shooter: Body; left: number; returning?: boolean } | null;
  /** A última leva de trocas: o passo em que aconteceu e até quando quem saiu ainda vai a caminho do banco. */
  subsTick: number;
  /** Até quando dura o contra-ataque, e quem está a cortar agora (um de cada vez). */
  breakUntil: number;
  cutter: Body | null;
  cutterUntil: number;
  subWaitUntil: number;
  score: [number, number];
  teamFouls: [number, number];
  lines: [TeamLine, TeamLine];
  events: MatchEvent[];
}
