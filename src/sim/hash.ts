import type { MatchState } from './match.ts';

/** Impressão digital de um jogo (FNV-1a). Serve para comparar o mesmo jogo em browsers diferentes. */
export function matchHash(s: MatchState): string {
  const text = JSON.stringify([s.score, s.tick, s.events]);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}
