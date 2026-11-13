// O pavilhão por dentro (muro, bancadas em degraus, escadas, túnel, paredes) na placa gráfica: as mesmas contas do traçador
// de raios (`Camera.drawScene`, em art/court.ts), feitas em cada píxel do ecrã. Onde o raio bate no chão não se desenha nada:
// aí fica a malha do chão. Escreve a profundidade do que encontra, para peças 3D futuras se cruzarem bem com as bancadas.
// Mudar o aspeto das bancadas obriga a mudar os dois sítios: o traçador continua a ser a reserva sem WebGL 2, e o
// `npm run gpu-check` compara os dois píxel a píxel.
import { DataTexture, Matrix4, NearestFilter, RGBAFormat, UnsignedByteType, Vector2, Vector3, Vector4, type Texture } from 'three';
import { FAN_SPACING, FLOOR_AREA, OPEN_SHAPE, TUNNEL, WALL_SHAPE, chairPhase, stairs, type CourtTextures, type SeatPlane } from '../art/court.ts';

/** As cores dos degraus por fila, numa textura de 11 colunas (uma por cor) e uma linha por fila. */
const STEP_KEYS = ['tread', 'nosing', 'chair', 'chairTop', 'gap', 'riser', 'aisleTread', 'aisleRiser', 'aisleSide', 'aisleNose', 'cutSide'] as const;
const MAX_ROWS = 32;

const f = (n: number): string => (Number.isInteger(n) ? n.toFixed(1) : String(n));

export const VENUE_VERTEX = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const VENUE_FRAGMENT = /* glsl */ `
precision highp float;
precision highp int;
uniform vec3 eye;
uniform vec3 fwdV;
uniform vec3 rightV;
uniform vec3 upV;
uniform float focal;
uniform vec2 artSize;
uniform vec2 res;
uniform float zoom;
uniform vec2 shift;
uniform mat4 viewProj;
uniform sampler2D wallMap;
uniform sampler2D stepMap;
uniform float rows;
uniform float slope;
uniform float endSlope;
uniform float standTop;
uniform bool endStands;
uniform bool chamferOn;
uniform bool hasSteps;
uniform bool wood;
// As cadeiras pintadas no espelho, como no traçador (o gpu-check); no jogo são modelos 3D à frente dele.
uniform bool paintedChairs;
// O muro a direito, com um corredor plano em cima dele à frente da primeira fila (onde fica o guarda-corpos).
uniform bool corridor;
uniform float zs;
uniform float t0;
uniform float rise;
uniform float stairStep;
uniform vec2 stSide[6];
uniform int nSide;
uniform vec2 stEnd[2];
uniform int nEnd;
uniform vec2 stDiag[2];
uniform int nDiag;
uniform float phaseSide[${MAX_ROWS}];
uniform float phaseEnd[${MAX_ROWS}];
uniform float phaseDiag[${MAX_ROWS}];

const float INF = 1e30;
const float SQRT2 = 1.4142135623730951;
const float R = 0.7071067811865476;
const float NEAR_X = ${f(FLOOR_AREA.x0)};
const float FAR_X = ${f(FLOOR_AREA.x1)};
const float WALL_Y = ${f(FLOOR_AREA.y0)};
const float CHAMFER = ${f(FLOOR_AREA.chamfer)};
const float SIDE_SPAN = ${f(WALL_SHAPE.sideSpan)};
const float WALL_SCALE = ${f(WALL_SHAPE.scale)};
const float WALL_Z_SPAN = ${f(WALL_SHAPE.zSpan)};
const float TX0 = ${f(TUNNEL.x0)};
const float TX1 = ${f(TUNNEL.x1)};
const float TH = ${f(TUNNEL.height)};
const float HALF_SEAT = ${f(FAN_SPACING / 2)};

vec4 stepColor(int kind, float k) { return texelFetch(stepMap, ivec2(kind, int(k)), 0); }
// Como no traçador: o texel por truncatura, preso à textura. (Filtrá-las não baixava o tremor e misturava, nas dobras, a
// coluna de outra parede.)
vec4 wallColor(float along, float z) {
  ivec2 size = textureSize(wallMap, 0);
  int u = clamp(int(along * WALL_SCALE), 0, size.x - 1);
  int v = clamp(int(z * WALL_SCALE), 0, size.y - 1);
  return texelFetch(wallMap, ivec2(u, v), 0);
}
float standAt(float d) { return !hasSteps || d < slope * zs ? d / slope : t0 + rise * max(0.0, floor((d / slope - t0) / rise) + 1.0); }
float stairLid(float z) { return !hasSteps ? 0.0 : z < t0 ? t0 : t0 + stairStep * ceil((z - t0) / stairStep); }
float stairAt(float d) {
  if (!hasSteps || d < slope * zs) return d / slope;
  float z = d / slope;
  return z < t0 ? t0 : t0 + stairStep * (floor((z - t0) / stairStep) + 1.0);
}
int stairCount(int kind) { return kind == 0 ? nSide : kind == 1 ? nEnd : nDiag; }
vec2 stairOf(int kind, int i) { return kind == 0 ? stSide[i] : kind == 1 ? stEnd[i] : stDiag[i]; }
float phaseOf(int kind, int row) { return kind == 0 ? phaseSide[row] : kind == 1 ? phaseEnd[row] : phaseDiag[row]; }

void finish(vec4 color, vec3 hitPos) {
  gl_FragColor = vec4(color.rgb, 1.0);
  vec4 clip = viewProj * vec4(hitPos, 1.0);
  gl_FragDepth = clamp(0.5 * clip.z / clip.w + 0.5, 0.0, 1.0);
}

void main() {
  // O centro deste píxel em píxeis da arte, como o traçador (que lança o raio pelo centro de cada píxel), e sem a aproximação.
  vec2 frag = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / res * artSize;
  vec2 p = (frag - shift) / zoom;
  float vx = p.x - artSize.x * 0.5;
  float vy = artSize.y * 0.5 - p.y;
  float dirX = fwdV.x * focal + upV.x * vy + rightV.x * vx;
  float dirY = fwdV.y * focal + upV.y * vy + rightV.y * vx;
  float rz = fwdV.z * focal + upV.z * vy + rightV.z * vx;
  float cx = eye.x;
  float cy = eye.y;
  float cz = eye.z;
  vec3 dir = vec3(dirX, dirY, rz);

  // O chão fica para a malha do chão.
  if (rz < 0.0) {
    float floorT = -cz / rz;
    float hx = cx + dirX * floorT;
    float hy = cy + dirY * floorT;
    if (hx > NEAR_X && hx < FAR_X && hy > WALL_Y && (!chamferOn || (hx - NEAR_X + hy - WALL_Y > CHAMFER && FAR_X - hx + hy - WALL_Y > CHAMFER))) discard;
  }

  float sideOffset = cy - WALL_Y + slope * cz;
  float nearOffset = cx - NEAR_X + endSlope * cz;
  float farOffset = FAR_X + endSlope * cz - cx;
  float wallAboveY = WALL_Y - slope * standTop;
  float diagNear0 = (NEAR_X - cx + WALL_Y - cy + CHAMFER) / SQRT2;
  float diagFar0 = (cx - FAR_X + WALL_Y - cy + CHAMFER) / SQRT2;

  // As bancadas em degraus: profundidade d = d0 + a·dir e posição ao longo da fila c = c0 + b·dir.
  float sd0[5]; float sax[5]; float say[5]; float sc0[5]; float sbx[5]; float sby[5]; int skind[5];
  int ns = 0;
  if (hasSteps) {
    sd0[ns] = WALL_Y - cy; sax[ns] = 0.0; say[ns] = -1.0; sc0[ns] = cx; sbx[ns] = 1.0; sby[ns] = 0.0; skind[ns] = 0; ns++;
    if (endStands && endSlope == slope) {
      sd0[ns] = NEAR_X - cx; sax[ns] = -1.0; say[ns] = 0.0; sc0[ns] = cy; sbx[ns] = 0.0; sby[ns] = 1.0; skind[ns] = 1; ns++;
      sd0[ns] = cx - FAR_X; sax[ns] = 1.0; say[ns] = 0.0; sc0[ns] = cy; sbx[ns] = 0.0; sby[ns] = 1.0; skind[ns] = 1; ns++;
    }
    if (chamferOn) {
      sd0[ns] = diagNear0; sax[ns] = -R; say[ns] = -R; sc0[ns] = (cx - NEAR_X - cy + WALL_Y) * R; sbx[ns] = R; sby[ns] = -R; skind[ns] = 2; ns++;
      sd0[ns] = diagFar0; sax[ns] = R; say[ns] = -R; sc0[ns] = (FAR_X - cx - cy + WALL_Y) * R; sbx[ns] = -R; sby[ns] = -R; skind[ns] = 2; ns++;
    }
  }

  float hit = INF;
  bool onSide = false;
  bool far = false;
  bool diag = false;
  float dSide = dirY + slope * rz;
  if (dSide < 0.0) {
    float tS = -sideOffset / dSide;
    if (cz + rz * tS >= 0.0) { hit = tS; onSide = true; }
  }
  float dNear = dirX + endSlope * rz;
  if (dNear < 0.0) {
    float tN = -nearOffset / dNear;
    if (tN < hit && cz + rz * tN >= 0.0) { hit = tN; onSide = false; }
  }
  float dFar = dirX - endSlope * rz;
  if (dFar > 0.0) {
    float tF = farOffset / dFar;
    if (tF < hit && cz + rz * tF >= 0.0) { hit = tF; onSide = false; far = true; }
  }
  if (chamferOn) {
    for (int q = 0; q < 2; q++) {
      bool isFar = q == 1;
      float ddg = ((isFar ? dirX : -dirX) - dirY) / SQRT2;
      float den = ddg - slope * rz;
      if (den <= 0.0) continue;
      float tD = (slope * cz - (isFar ? diagFar0 : diagNear0)) / den;
      if (tD > 0.0 && tD < hit && cz + rz * tD >= 0.0) { hit = tD; onSide = false; far = isFar; diag = true; }
    }
  }
  if (onSide && !diag && cz + rz * hit > standTop && dirY < 0.0) hit = (cy - wallAboveY) / -dirY;

  if (hasSteps && hit < INF && rz < 0.0 && (onSide || diag || endStands) && cz + rz * hit < standTop) {
    float zIn = cz + rz * hit;
    float inward = diag ? ((far ? dirX : -dirX) - dirY) / SQRT2 : onSide ? -dirY : far ? dirX : -dirX;
    float xIn = cx + dirX * hit;
    bool tunnel = onSide && xIn > TX0 - 0.2 && xIn < TX1 + 0.2 && zIn < TH + 0.2;
    if (inward > 0.0 && !tunnel && ns > 0) {
      int owner = 0;
      float tHit = hit;
      int face = 5;
      float j = 0.0;
      float below = 0.0;
      if (zIn >= zs) {
        j = max(0.0, ceil((zIn - t0) / rise));
        float top = t0 + j * rise;
        below = j == 0.0 ? zs : top - rise;
        float tTread = (top - cz) / rz;
        float tRiser = INF;
        int riserOwner = owner;
        for (int q = 0; q < 5; q++) {
          if (q >= ns) break;
          float dd = sax[q] * dirX + say[q] * dirY;
          if (dd <= 0.0) continue;
          float tp = (slope * below - sd0[q]) / dd;
          if (tp < tRiser) { tRiser = tp; riserOwner = q; }
        }
        tHit = max(tTread, tRiser);
        face = tTread >= tRiser ? 0 : 1;
        owner = riserOwner;
      } else if (corridor) {
        // Por baixo do primeiro piso: o raio bate primeiro no muro a direito (d = 0), passa-lhe por cima para o corredor ou
        // chega ao espelho do primeiro piso, ao fundo do corredor.
        float tV = INF;
        int vOwner = 0;
        for (int q = 0; q < 5; q++) {
          if (q >= ns) break;
          float dq = sax[q] * dirX + say[q] * dirY;
          if (dq <= 0.0) continue;
          float tq = -sd0[q] / dq;
          if (tq < tV) { tV = tq; vOwner = q; }
        }
        if (cz + rz * tV < zs) {
          tHit = tV;
          onSide = skind[vOwner] == 0;
          diag = skind[vOwner] == 2;
          far = sax[vOwner] > 0.0;
        } else {
          float tC = (zs - cz) / rz;
          float deep = -INF;
          for (int q = 0; q < 5; q++) {
            if (q >= ns) break;
            deep = max(deep, sd0[q] + (sax[q] * dirX + say[q] * dirY) * tC);
          }
          if (deep < slope * zs) {
            finish(deep < 0.1 ? stepColor(1, 0.0) : stepColor(0, 0.0), vec3(cx, cy, cz) + dir * tC);
            return;
          }
          float tR = INF;
          for (int q = 0; q < 5; q++) {
            if (q >= ns) break;
            float dq = sax[q] * dirX + say[q] * dirY;
            if (dq <= 0.0) continue;
            float tp = (slope * zs - sd0[q]) / dq;
            if (tp < tR) { tR = tp; owner = q; }
          }
          tHit = tR;
          face = 1;
          below = zs;
        }
      }
      if (face != 1 && ns > 1) {
        float deepest = -INF;
        for (int q = 0; q < 5; q++) {
          if (q >= ns) break;
          float d = sd0[q] + (sax[q] * dirX + say[q] * dirY) * tHit;
          if (d > deepest) { deepest = d; owner = q; }
        }
      }
      float d0 = sd0[owner];
      float c0 = sc0[owner];
      int kind = skind[owner];
      float dd = sax[owner] * dirX + say[owner] * dirY;
      float db = sbx[owner] * dirX + sby[owner] * dirY;
      float best = tHit;
      float stairFront = 0.0;
      if (dd > 0.0) {
        float cHit = c0 + db * tHit;
        int count = stairCount(kind);
        for (int si = 0; si < 6; si++) {
          if (si >= count) break;
          vec2 st = stairOf(kind, si);
          float lo = st.x;
          float hi = st.y;
          if (cHit < lo - 3.0 || cHit > hi + 3.0) continue;
          if (face != 5 && cHit > lo && cHit < hi) best = INF;
          float tP = (slope * cz - d0) / (dd - slope * rz);
          float zP = cz + rz * tP;
          if (zP >= zs) {
            float lid = stairLid(zP);
            float front = lid <= t0 ? slope * zs : slope * (lid - stairStep);
            float tTr = (lid - cz) / rz;
            float tRi = (front - d0) / dd;
            float tS = max(tTr, tRi);
            float cS = c0 + db * tS;
            if (tS > 0.0 && tS < best && cS >= lo && cS <= hi) { best = tS; face = tTr >= tRi ? 6 : 7; stairFront = front; }
          }
          if (db == 0.0) continue;
          for (int e = 0; e < 2; e++) {
            float edge = e == 0 ? lo : hi;
            float tb = (edge - c0) / db;
            if (!(tb > 0.0) || tb >= best) continue;
            float d = d0 + dd * tb;
            if (d < 0.0) continue;
            bool into = (db > 0.0) == (e == 0);
            if (cz + rz * tb <= (into ? stairAt(d) : standAt(d))) { best = tb; face = into ? 8 : 9; }
          }
        }
      }
      if (best < INF) tHit = best;
      if (face != 5) {
        float zHit = cz + rz * tHit;
        float k = clamp(face <= 1 ? j : ceil((zHit - t0) / rise), 0.0, rows - 1.0);
        float dHit = d0 + dd * tHit;
        vec3 hitPos = vec3(cx, cy, cz) + dir * tHit;
        vec4 color;
        if (face == 0) color = dHit - slope * below < 0.08 ? stepColor(1, k) : stepColor(0, k);
        else if (face == 1) {
          float local = zHit - below;
          if (wood) color = fract(local / 0.3) < 0.12 ? stepColor(4, k) : stepColor(5, k);
          else if (paintedChairs && local < 0.55 && j > 0.0) {
            float u = fract((c0 + db * tHit) / HALF_SEAT + phaseOf(kind, int(j) - 1));
            color = u < 0.07 || u > 0.93 ? stepColor(4, k) : local > 0.47 ? stepColor(3, k) : stepColor(2, k);
          } else color = stepColor(5, k);
        } else if (face == 6) {
          // O rebordo tem sempre pelo menos 1,2 píxeis da arte, como no traçador (o que um píxel da arte cobre no piso, a esta
          // distância): com um só píxel do ecrã ficava um fio que cintilava ao longe.
          float noseW = max(0.08, (1.2 * tHit * (dirX * dirX + dirY * dirY + rz * rz)) / (focal * -rz));
          color = dHit - stairFront < noseW ? stepColor(9, k) : stepColor(6, k);
        } else if (face == 7) color = stepColor(7, k);
        else if (face == 8) color = stepColor(8, k);
        else color = stepColor(10, k);
        finish(color, hitPos);
        return;
      }
      hit = tHit;
    }
  }
  float along = hit >= INF ? 0.0 : diag ? SIDE_SPAN + 0.5 : onSide ? cx + dirX * hit - NEAR_X : max(SIDE_SPAN, cy + dirY * hit - WALL_Y + SIDE_SPAN);
  float z = hit >= INF ? WALL_Z_SPAN : cz + rz * hit;
  vec4 color = wallColor(along, z);
  if (hit >= INF) {
    gl_FragColor = vec4(color.rgb, 1.0);
    gl_FragDepth = 1.0;
  } else finish(color, vec3(cx, cy, cz) + dir * hit);
}`;

function packedTexture(data: Uint32Array, w: number, h: number): DataTexture {
  const t = new DataTexture(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), w, h, RGBAFormat, UnsignedByteType);
  t.magFilter = NearestFilter;
  t.minFilter = NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}

/** As texturas e os números de um pavilhão para o shader. `walls` tem uma textura por imagem do público. */
export function venueUniforms(t: CourtTextures): { uniforms: Record<string, { value: unknown }>; walls: Texture[]; dispose(): void } | null {
  const { theme, steps } = t;
  // Os tamanhos fixos do shader: 6 escadas na lateral, 2 nos topos e na diagonal, MAX_ROWS filas.
  if (stairs(theme, 'side').length > 6 || stairs(theme, 'end').length > 2 || stairs(theme, 'diag').length > 2 || (steps?.rows ?? 0) > MAX_ROWS) return null;
  const walls = t.walls.map(w => packedTexture(w, t.wallW, t.wallH));
  const rows = steps?.rows ?? 1;
  const stepData = new Uint32Array(STEP_KEYS.length * rows);
  if (steps) for (let r = 0; r < rows; r++) STEP_KEYS.forEach((key, c) => (stepData[r * STEP_KEYS.length + c] = steps[key][r]!));
  const stepMap = packedTexture(stepData, STEP_KEYS.length, rows);
  const list = (plane: SeatPlane, n: number): [number, number][] => {
    const out = stairs(theme, plane);
    while (out.length < n) out.push([0, 0]);
    return out;
  };
  const vec2s = (pairs: [number, number][]): Vector2[] => pairs.map(([x, y]) => new Vector2(x, y));
  // A fase das cadeiras de cada fila: `chairPhase` ao longo da fila é fract(c / meio lugar + a fase em c = 0).
  const phases = (plane: SeatPlane): number[] => Array.from({ length: MAX_ROWS }, (_, row) => (theme.crowd && row < rows ? chairPhase(theme, plane, row, 0) : 0));
  const stairStep = steps ? steps.rise / Math.max(2, Math.round(steps.rise / 0.3)) : 1;
  const uniforms: Record<string, { value: unknown }> = {
    eye: { value: new Vector3() },
    fwdV: { value: new Vector3() },
    rightV: { value: new Vector3() },
    upV: { value: new Vector3() },
    focal: { value: 1 },
    artSize: { value: new Vector2(1, 1) },
    res: { value: new Vector2(1, 1) },
    zoom: { value: 1 },
    shift: { value: new Vector2() },
    viewProj: { value: new Matrix4() },
    wallMap: { value: walls[0] },
    stepMap: { value: stepMap },
    rows: { value: rows },
    slope: { value: theme.slope },
    endSlope: { value: theme.endSlope ?? theme.slope },
    standTop: { value: theme.wallAbove && theme.crowd ? theme.crowd.to : 1e30 },
    endStands: { value: theme.endStands !== false },
    chamferOn: { value: steps !== null && theme.chamfer === true },
    hasSteps: { value: steps !== null },
    wood: { value: steps?.wood ?? false },
    paintedChairs: { value: false },
    corridor: { value: steps !== null && !steps.wood },
    zs: { value: steps?.zs ?? 0 },
    t0: { value: steps?.t0 ?? 0 },
    rise: { value: steps?.rise ?? 1 },
    stairStep: { value: stairStep },
    stSide: { value: vec2s(list('side', 6)) },
    nSide: { value: stairs(theme, 'side').length },
    stEnd: { value: vec2s(list('end', 2)) },
    nEnd: { value: stairs(theme, 'end').length },
    stDiag: { value: vec2s(list('diag', 2)) },
    nDiag: { value: stairs(theme, 'diag').length },
    phaseSide: { value: phases('side') },
    phaseEnd: { value: phases('end') },
    phaseDiag: { value: phases('diag') },
  };
  return {
    uniforms,
    walls,
    dispose() {
      for (const w of walls) w.dispose();
      stepMap.dispose();
    },
  };
}

const rgb = (p: number): Vector3 => new Vector3((p & 255) / 255, ((p >>> 8) & 255) / 255, ((p >>> 16) & 255) / 255);

/**
 * O campo de rua: as contas de `Camera.drawOpenScene` por píxel. O chão do campo fica para a malha; fora dele, o passeio e
 * a relva, o pano de fundo (prédios e árvores) e o céu. Com `fencePass`, desenha só a rede, sobre fundo transparente, para
 * ficar por cima de quem está do lado de fora.
 */
export const OPEN_FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 eye;
uniform vec3 fwdV;
uniform vec3 rightV;
uniform vec3 upV;
uniform float focal;
uniform vec2 artSize;
uniform vec2 res;
uniform float zoom;
uniform vec2 shift;
uniform mat4 viewProj;
uniform sampler2D wallMap;
uniform bool exactFence;
uniform vec3 sky;
uniform vec3 ground0;
uniform vec3 ground1;
uniform vec3 ground2;
uniform vec4 fenceColor;
uniform vec4 postColor;
uniform vec4 veilColor;
uniform bool fencePass;
uniform bool blendFence;

const float INF = 1e30;
const float NEAR_X = ${f(FLOOR_AREA.x0)};
const float FAR_X = ${f(FLOOR_AREA.x1)};
const float WALL_Y = ${f(FLOOR_AREA.y0)};
const float SIDE_SPAN = ${f(WALL_SHAPE.sideSpan)};
const float WALL_SCALE = ${f(WALL_SHAPE.scale)};
const float BACKDROP = ${f(OPEN_SHAPE.backdrop)};
const float FH = ${f(OPEN_SHAPE.fenceHeight)};
const float CELL = ${f(OPEN_SHAPE.fenceCell)};
const float PAVEMENT = ${f(OPEN_SHAPE.pavement)};
const float STRIPE = ${f(OPEN_SHAPE.stripe)};
const float TX0 = ${f(TUNNEL.x0)};
const float TX1 = ${f(TUNNEL.x1)};

vec4 wallColor(float along, float z) {
  ivec2 size = textureSize(wallMap, 0);
  int u = clamp(int(along * WALL_SCALE), 0, size.x - 1);
  int v = clamp(int(z * WALL_SCALE), 0, size.y - 1);
  return texelFetch(wallMap, ivec2(u, v), 0);
}

// Quanto de um fio da malha (de 0 a lineW, em células) cobre um píxel do ecrã centrado em d, com fw células de largura.
float wireCover(float d, float lineW, float fw) {
  float h = 0.5 * fw;
  float inside = max(0.0, min(d + h, lineW) - max(d - h, 0.0)) + max(0.0, min(d - 1.0 + h, lineW) - max(d - 1.0 - h, 0.0));
  return clamp(inside / fw, 0.0, 1.0);
}

// Quanto anda cada coordenada dos fios num píxel do ecrã: o comprimento do gradiente (o fwidth soma os dois eixos e, nos
// fios a 45°, dava o dobro).
vec2 footprint(vec2 u) {
  vec2 dx = dFdx(u);
  vec2 dy = dFdy(u);
  return sqrt(dx * dx + dy * dy);
}

// A cobertura do último fio encontrado e quanto véu lhe cabe: no jogo, a borda dos fios esbate-se num píxel do ecrã e, onde a
// malha se aperta (vista de lado), passa aos poucos a véu, para não cintilar a andar. Com \`exactFence\` (o gpu-check), o fio
// é cheio ou nada e o véu só onde o traçador o põe.
float meshCover = 1.0;
float veilMix = 0.0;

// 0 nada, 1 poste, 2 véu, 3 malha.
int fenceAt(int mesh, float tf, float a, bool side, float cz, float rz, float floorT, vec2 fw) {
  float zf = cz + rz * tf;
  if (zf <= 0.0 || zf >= FH || tf > floorT) return mesh;
  if (side && a > TX0 && a < TX1) {
    if (a < TX0 + 0.15 || a > TX1 - 0.15 || zf > FH - 0.12) return 1;
    return mesh;
  }
  if (fract(a / 4.0) < 0.03 || zf > FH - 0.08) return 1;
  float cellPx = CELL * (focal / tf);
  if (cellPx < 4.0) return 2;
  float lineW = max(1.2, cellPx * 0.16) / cellPx;
  float d1 = fract((a + zf) / CELL);
  float d2 = fract((a - zf) / CELL);
  if (exactFence) return d1 < lineW || d2 < lineW ? 3 : mesh;
  // \`fw\`: quantas células cabem num píxel do ecrã, em cada direção dos fios. Em píxeis da imagem (sem a aproximação, que
  // assim mostra a malha de perto), a malha passa a véu entre 1/0,4 e 1/0,65 píxeis por célula.
  float pixel = res.y / artSize.y;
  float veil = smoothstep(0.4, 0.65, max(fw.x, fw.y) * pixel);
  float cover = max(wireCover(d1, lineW, fw.x), wireCover(d2, lineW, fw.y));
  if (cover <= 0.0 && veil <= 0.0) return mesh;
  meshCover = cover;
  veilMix = veil;
  return 3;
}

void main() {
  vec2 frag = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / res * artSize;
  vec2 p = (frag - shift) / zoom;
  float vx = p.x - artSize.x * 0.5;
  float vy = artSize.y * 0.5 - p.y;
  float dirX = fwdV.x * focal + upV.x * vy + rightV.x * vx;
  float dirY = fwdV.y * focal + upV.y * vy + rightV.y * vx;
  float rz = fwdV.z * focal + upV.z * vy + rightV.z * vx;
  float cx = eye.x;
  float cy = eye.y;
  float cz = eye.z;
  float floorT = rz < 0.0 ? -cz / rz : INF;
  float hitX = cx + dirX * floorT;
  float hitY = cy + dirY * floorT;
  // As três redes, contadas em todos os píxeis antes de qualquer ramo ou discard, para as derivadas no ecrã valerem.
  float tS = (WALL_Y - cy) / dirY;
  float aS = cx + dirX * tS;
  float tN = (NEAR_X - cx) / dirX;
  float aN = cy + dirY * tN;
  float tF = (FAR_X - cx) / dirX;
  float aF = cy + dirY * tF;
  vec2 fwS = footprint(vec2(aS + cz + rz * tS, aS - cz - rz * tS) / CELL);
  vec2 fwN = footprint(vec2(aN + cz + rz * tN, aN - cz - rz * tN) / CELL);
  vec2 fwF = footprint(vec2(aF + cz + rz * tF, aF - cz - rz * tF) / CELL);
  // O chão do campo fica para a malha do chão; a rede também não passa por cima dele.
  if (rz < 0.0 && hitX > NEAR_X && hitX < FAR_X && hitY > WALL_Y) discard;

  if (fencePass) {
    int mesh = 0;
    // A distância da rede que se vê, para a profundidade: quem está do lado de fora fica atrás dela, quem está dentro à frente.
    float tMesh = 0.0;
    int was = 0;
    if (dirY < 0.0 && aS >= NEAR_X && aS <= FAR_X) { mesh = fenceAt(mesh, tS, aS, true, cz, rz, floorT, fwS); if (mesh != was) tMesh = tS; was = mesh; }
    if (dirX < 0.0) {
      if (aN >= WALL_Y) { mesh = fenceAt(mesh, tN, aN, false, cz, rz, floorT, fwN); if (mesh != was) tMesh = tN; }
    } else if (dirX > 0.0) {
      if (aF >= WALL_Y) { mesh = fenceAt(mesh, tF, aF, false, cz, rz, floorT, fwF); if (mesh != was) tMesh = tF; }
    }
    if (mesh == 0) discard;
    vec4 c = mesh == 1 ? vec4(postColor.rgb * postColor.a, postColor.a) : mesh == 2 ? vec4(veilColor.rgb * veilColor.a, veilColor.a)
      : mix(vec4(fenceColor.rgb, 1.0) * fenceColor.a * meshCover, vec4(veilColor.rgb, 1.0) * veilColor.a, veilMix);
    if (c.a <= 0.0) discard;
    // Numa tela à parte (\`drawFence\`), a transparência vai pré-multiplicada; por cima do mundo, a mistura da placa fá-lo.
    gl_FragColor = blendFence ? vec4(c.rgb / c.a, c.a) : c;
    vec4 clip = viewProj * vec4(vec3(cx, cy, cz) + vec3(dirX, dirY, rz) * tMesh, 1.0);
    gl_FragDepth = clamp(0.5 * clip.z / clip.w + 0.5, 0.0, 1.0);
    return;
  }

  float backY = WALL_Y - BACKDROP;
  float backNearX = NEAR_X - BACKDROP;
  float backFarX = FAR_X + BACKDROP;
  float back = INF;
  float along = 0.0;
  if (dirY < 0.0) {
    float tb = (backY - cy) / dirY;
    if (cz + rz * tb >= 0.0) { back = tb; along = cx + dirX * tb - backNearX; }
  }
  if (dirX < 0.0) {
    float tb = (backNearX - cx) / dirX;
    if (tb < back && cz + rz * tb >= 0.0) { back = tb; along = SIDE_SPAN + (cy + dirY * tb - backY); }
  } else if (dirX > 0.0) {
    float tb = (backFarX - cx) / dirX;
    if (tb < back && cz + rz * tb >= 0.0) { back = tb; along = SIDE_SPAN + (cy + dirY * tb - backY); }
  }
  vec3 color = sky;
  float t = INF;
  if (rz < 0.0 && floorT < back) {
    float outside = max(max(WALL_Y - hitY, NEAR_X - hitX), hitX - FAR_X);
    color = outside < PAVEMENT ? ground0 : mod(floor((hitX + hitY) / STRIPE), 2.0) == 0.0 ? ground1 : ground2;
    t = floorT;
  } else if (back < INF) {
    color = wallColor(along, cz + rz * back).rgb;
    t = back;
  }
  gl_FragColor = vec4(color, 1.0);
  if (t >= INF) gl_FragDepth = 1.0;
  else {
    vec4 clip = viewProj * vec4(vec3(cx, cy, cz) + vec3(dirX, dirY, rz) * t, 1.0);
    gl_FragDepth = clamp(0.5 * clip.z / clip.w + 0.5, 0.0, 1.0);
  }
}`;

/** As texturas e os números do campo de rua para o shader. */
export function openUniforms(t: CourtTextures): { uniforms: Record<string, { value: unknown }>; walls: Texture[]; dispose(): void } {
  const walls = [packedTexture(t.walls[0]!, t.wallW, t.wallH)];
  const rgba = (p: number): Vector4 => new Vector4((p & 255) / 255, ((p >>> 8) & 255) / 255, ((p >>> 16) & 255) / 255, ((p >>> 24) & 255) / 255);
  const uniforms: Record<string, { value: unknown }> = {
    eye: { value: new Vector3() },
    fwdV: { value: new Vector3() },
    rightV: { value: new Vector3() },
    upV: { value: new Vector3() },
    focal: { value: 1 },
    artSize: { value: new Vector2(1, 1) },
    res: { value: new Vector2(1, 1) },
    zoom: { value: 1 },
    shift: { value: new Vector2() },
    viewProj: { value: new Matrix4() },
    wallMap: { value: walls[0] },
    exactFence: { value: false },
    sky: { value: rgb(t.sky) },
    ground0: { value: rgb(t.ground[0]) },
    ground1: { value: rgb(t.ground[1]) },
    ground2: { value: rgb(t.ground[2]) },
    fenceColor: { value: rgba(OPEN_SHAPE.fence) },
    postColor: { value: rgba(OPEN_SHAPE.post) },
    veilColor: { value: rgba(OPEN_SHAPE.veil) },
    fencePass: { value: false },
    blendFence: { value: false },
  };
  return {
    uniforms,
    walls,
    dispose() {
      for (const w of walls) w.dispose();
    },
  };
}
