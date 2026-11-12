// O three.js (~130 KB comprimidos) chega à parte, depois do primeiro desenho: até lá, e sem WebGL 2, o cenário sai do
// traçador de raios, a reserva de sempre. Quem desenha pede a placa aqui, e nunca a court-gpu.ts diretamente.
import type { CourtGpu } from './court-gpu.ts';

let loaded: typeof import('./court-gpu.ts') | null = null;
let loading: Promise<void> | null = null;
let wanted: boolean | 'force' = true;

/** Começa a carregar a placa gráfica (uma vez); resolve quando estiver pronta ou não houver. Nos testes (node) não carrega. */
export function loadCourtGpu(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  loading ??= import('./court-gpu.ts').then(
    module => {
      loaded = module;
      module.useCourtGpu(wanted);
    },
    // Sem o módulo (rede em baixo, por exemplo), o jogo continua no traçador.
    () => {},
  );
  return loading;
}

/** A placa gráfica, se já chegou e houver WebGL 2; senão `null` (e começa a carregá-la). */
export function courtGpu(): CourtGpu | null {
  if (!wanted) return null;
  if (!loaded) {
    void loadCourtGpu();
    return null;
  }
  return loaded.courtGpu();
}

/** Ver `useCourtGpu` em court-gpu.ts: liga, desliga ou força a placa gráfica. */
export function useCourtGpu(on: boolean | 'force'): void {
  wanted = on;
  loaded?.useCourtGpu(on);
}
