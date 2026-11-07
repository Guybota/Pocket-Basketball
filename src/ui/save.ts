// Guardar e carregar o clube no browser, e passá-lo para um ficheiro e de volta.
import { parseClub, type ClubState } from './club.ts';

const SAVE_KEY = 'pocket-basketball-clube';

/** O que correu mal ao guardar ou ao ler: o browser não deixa guardar, ou o clube guardado não se consegue ler. */
export interface SaveStatus {
  failed: boolean;
  unreadable: boolean;
}

export function saveClub(club: ClubState | null, status: SaveStatus): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(club));
    status.failed = false;
  } catch {
    status.failed = true;
  }
}

export function loadClub(status: SaveStatus): ClubState | null {
  try {
    const text = localStorage.getItem(SAVE_KEY);
    const loaded = parseClub(text);
    status.unreadable = text !== null && loaded === null;
    return loaded;
  } catch {
    status.failed = true;
    return null;
  }
}

/** Guarda o clube num ficheiro. No telemóvel abre a folha de partilha, para o ficheiro poder ir para Ficheiros ou para outro aparelho. */
export function exportClub(current: ClubState): void {
  const name = `pocket-basketball-${current.team.short.replace(/[^\w-]/g, '') || 'clube'}-epoca-${current.season}.json`;
  const file = new File([JSON.stringify(current)], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/**
 * Lê um clube de um ficheiro exportado. Passa pelas mesmas verificações e conversões que o clube guardado.
 * Pergunta antes de substituir o clube atual, e só chama `loaded` se o jogador aceitar.
 */
export function importClub(current: () => ClubState | null, status: SaveStatus, loaded: (club: ClubState) => void): void {
  // No iPad, o ficheiro escolhido só chega ao jogo se o campo estiver na página. Sem filtro de tipo, porque o iOS
  // às vezes deixa os .json a cinzento; o parseClub recusa o que não for um clube.
  document.getElementById('importFile')?.remove();
  const input = document.createElement('input');
  input.type = 'file';
  input.id = 'importFile';
  input.hidden = true;
  document.body.append(input);
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    const club = parseClub(await file.text().catch(() => null));
    if (!club) {
      alert('Este ficheiro não tem um clube que o jogo consiga ler.');
      return;
    }
    const now = current();
    const question = now
      ? `Substituir ${now.team.name}, época ${now.season}, por ${club.team.name}, época ${club.season}? O clube atual perde-se, a não ser que o tenhas exportado.`
      : status.unreadable ? `O clube guardado que não se consegue ler vai ser substituído por ${club.team.name}. Continuar?` : null;
    if (question && !confirm(question)) return;
    loaded(club);
  });
  input.click();
}
