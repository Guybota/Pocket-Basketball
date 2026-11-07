/** Guarda um valor numa cache com limite: passado o limite, sai o mais antigo (um `Map` lembra a ordem de entrada).
 * Sem isto, as caches de imagens cresciam a cada jogador, equipamento ou pavilhão novo, época após época. */
export function remember<K, V>(map: Map<K, V>, key: K, value: V, limit: number): V {
  map.set(key, value);
  if (map.size > limit) map.delete(map.keys().next().value as K);
  return value;
}
