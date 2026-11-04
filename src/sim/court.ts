// Medidas em metros, baseadas nas da FIBA. "u" é a distância à linha final atacada e "v" a posição lateral.
export const COURT_LENGTH = 28;
export const COURT_HALF_WIDTH = 7.5;
export const HOOP_U = 1.575;
// A linha de 3 é mais curta do que a verdadeira, sobretudo nos cantos, onde a da FIBA fica quase colada à lateral.
// Os bonecos são grandes para o campo, e assim cabem claramente de um lado ou do outro da linha.
export const THREE_RADIUS = 6.3;
export const THREE_CORNER_V = 5.7;
export const TICKS_PER_SECOND = 20;
export const DT = 1 / TICKS_PER_SECOND;

export const seconds = (s: number): number => Math.round(s * TICKS_PER_SECOND);

// Os bancos, à frente da mesa: onde cada equipa começa a sentar-se, o espaço entre lugares e a linha dos bancos.
export const BENCH_START_X: readonly [number, number] = [4.4, 20.3];
export const BENCH_SPACING = 0.95;
export const BENCH_Y = -9.6;

export function distance(x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return Math.sqrt(dx * dx + dy * dy);
}

export const hoopDistance = (u: number, v: number): number => distance(u, v, HOOP_U, 0);

/** Onde a parte reta da linha de 3 encontra o arco. */
export const THREE_CORNER_MAX_U = HOOP_U + Math.sqrt(THREE_RADIUS * THREE_RADIUS - THREE_CORNER_V * THREE_CORNER_V);

/** A que distância da linha de 3 está o ponto: positiva por fora, negativa por dentro. */
export function threeLineGap(u: number, v: number): number {
  return u < THREE_CORNER_MAX_U ? Math.abs(v) - THREE_CORNER_V : hoopDistance(u, v) - THREE_RADIUS;
}

export const isThree = (u: number, v: number): boolean => threeLineGap(u, v) >= 0;

/** Distância do ponto (px, py) ao segmento entre (x0, y0) e (x1, y1). */
export function segmentDistance(px: number, py: number, x0: number, y0: number, x1: number, y1: number): number {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(px, py, x0, y0);
  const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / lengthSquared));
  return distance(px, py, x0 + dx * t, y0 + dy * t);
}

/** Lugares no lance livre, em (u, v): primeiro os defensores, junto ao cesto. */
// Nos lances livres, como na FIBA: a defesa nos dois lugares mais perto do cesto e num terceiro lugar, o ataque nos dois
// lugares do meio, e os outros quatro atrás da linha de 3, fora da linha de lance livre prolongada.
export const FREE_THROW_DEFENSE_SPOTS: readonly (readonly [number, number])[] = [[1.9, 2.9], [1.9, -2.9], [4.3, 2.9], [8.2, 3.2], [8.2, -3.2]];
export const FREE_THROW_OFFENSE_SPOTS: readonly (readonly [number, number])[] = [[3.1, 2.9], [3.1, -2.9], [8.8, 0], [7.6, 5.4]];

/** Pontos de quem espera aberto na linha de 3. `v` é multiplicado pelo lado do jogador. */
export const ARC_SPOTS: readonly (readonly [number, number])[] = [[1.3, 6.5], [5, 6.2], [7.8, 3.2]];
/** Pontos de quem joga de costas para o cesto. */
export const LOW_POST_SPOTS: readonly (readonly [number, number])[] = [[2.6, 1.9], [2.2, 1.4], [3.2, 2.2]];
// A área restritiva da FIBA: 4,9 m de largura, da linha de fundo até à linha de lance livre, a 5,8 m.
export const LANE_U = 5.8;
export const LANE_HALF_V = 2.45;
export const inLane = (u: number, v: number): boolean => u <= LANE_U && Math.abs(v) <= LANE_HALF_V;
/** Onde o poste espera a bola sem a ter: à beira da área, por fora, e só entra quando a bola lhe chega. */
export const POST_WAIT_SPOTS: readonly (readonly [number, number])[] = [[2.6, 2.85], [1.6, 2.85], [3.6, 2.85]];
/** Onde cada um ataca o ressalto, por lugar no ataque, para não irem todos para o mesmo sítio. */
/** A zona 2-3: dois à frente, três atrás, de cada lado do garrafão. */
export const ZONE_SPOTS: readonly (readonly [number, number])[] = [[6.6, -3.2], [6.6, 3.2], [2.6, -3.6], [2.6, 0], [2.6, 3.6]];
/** Os cinco papéis da zona 2-3, vistos do lado da bola: o guarda e o extremo desse lado, os do outro lado, e o poste no meio. */
export type ZoneRole = 'nearGuard' | 'farGuard' | 'nearForward' | 'farForward' | 'centre';
/** Onde está a bola, para a zona: no topo, na asa acima ou abaixo da linha de lance livre, no canto, ou dentro. */
export type ZoneRegion = 'top' | 'highWing' | 'wing' | 'corner' | 'inside';
/** A zona 2-3 como se ensina: para cada sítio da bola, quem lhe fecha e onde deslizam os outros, em (u, v) com o v positivo
 * do lado da bola. No topo só os dois de cima mexem; na asa o guarda desse lado fecha e o outro vem para o meio; abaixo da
 * linha de lance livre fecha o extremo e o guarda desce ao cotovelo a negar o poste alto; no canto o poste vai ao bloco do
 * lado da bola e o extremo do outro lado mete-se debaixo do cesto; com a bola dentro, o poste fecha e os outros encolhem. */
export const ZONE_PLAN: Record<ZoneRegion, { closer: ZoneRole; spots: Record<Exclude<ZoneRole, never>, readonly [number, number]> }> = {
  top: { closer: 'nearGuard', spots: { nearGuard: [6.6, 3.2], farGuard: [6, -1.3], nearForward: [2.6, 3.6], farForward: [2.6, -3.6], centre: [2.6, 0] } },
  highWing: { closer: 'nearGuard', spots: { nearGuard: [6.6, 3.2], farGuard: [5.8, -0.8], nearForward: [2.8, 3.2], farForward: [2.3, -1.8], centre: [2.6, 0.9] } },
  wing: { closer: 'nearForward', spots: { nearGuard: [4.5, 1.8], farGuard: [5.8, -0.8], nearForward: [2.6, 3.6], farForward: [2.3, -1.8], centre: [2.6, 0.9] } },
  corner: { closer: 'nearForward', spots: { nearGuard: [4.3, 2], farGuard: [5, -0.3], nearForward: [2.6, 3.6], farForward: [1.3, -0.9], centre: [1.9, 1.3] } },
  inside: { closer: 'centre', spots: { nearGuard: [5, 1.6], farGuard: [5, -1.6], nearForward: [2.2, 2.2], farForward: [2.2, -2.2], centre: [2.6, 0] } },
};
export function zoneRegion(u: number, v: number): ZoneRegion {
  const side = Math.abs(v);
  if (u <= 3.5 && side >= 4) return 'corner';
  if (side > 2.3) return u > 4.8 ? 'highWing' : 'wing';
  return u > 5 ? 'top' : 'inside';
}
/** O papel de cada lugar da zona (0 e 1 em cima, 2 e 4 em baixo, 3 no meio) conforme o lado onde a bola está. */
export function zoneRole(slot: number, side: 1 | -1): ZoneRole {
  if (slot === 3) return 'centre';
  const onBallSide = (slot === 1 || slot === 4) === (side > 0);
  if (slot <= 1) return onBallSide ? 'nearGuard' : 'farGuard';
  return onBallSide ? 'nearForward' : 'farForward';
}
export const CRASH_SPOTS: readonly (readonly [number, number])[] = [[3.6, 0], [3.2, -3], [3.2, 3], [3, 2.1], [2.6, -1.9]];
/** Num isolamento, os outros quatro abrem o campo do lado contrário ao de quem ataca: dois cantos, uma asa e o topo. O v é para o lado de lá. */
export const CLEAR_SPOTS: readonly (readonly [number, number])[] = [[0.9, 6.6], [5.6, 6.0], [8.2, 1.5], [0.9, -6.6]];
/** Pontos de quem corta: uma posição aberta e duas junto ao cesto. */
export const CUT_SPOTS: readonly (readonly [number, number])[] = [[5.4, 5.7], [1.9, 0.9], [2.4, 0.3]];

/** Pontos de ataque de cada posição, em (u, v). O primeiro é o ponto base. */
export const SPOTS: readonly (readonly (readonly [number, number])[])[] = [
  [[8.4, 0], [7.8, -3], [7.8, 3]],
  [[5.2, -6], [7.2, -5], [1.3, -6.5]],
  [[4.6, 4.8], [1.3, 6.5], [7.2, 5]],
  [[5.8, 2.4], [3.6, 3.2], [1.9, 1]],
  [[2.4, -2.2], [2.4, 2.2], [1.7, -1]],
];
