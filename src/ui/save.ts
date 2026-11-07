// Guardar e carregar o clube no browser, e passá-lo para um ficheiro e de volta.
import { parseClub, type ClubState } from './club.ts';

const SAVE_KEY = 'pocket-basketball-clube';
// Fica fora do clube guardado: é do aparelho, não do jogo, e um clube importado não deve trazer a data de outro.
const EXPORT_KEY = 'pocket-basketball-ultima-copia';
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface LastExport {
  at: number;
  team: string;
  season: number;
  week: number;
}

function markExported(club: ClubState): void {
  try {
    localStorage.setItem(EXPORT_KEY, JSON.stringify({ at: Date.now(), team: club.team.name, season: club.season, week: club.week } satisfies LastExport));
  } catch {
    // Sem armazenamento, a Torre continua a dizer que não há cópia: é o aviso certo.
  }
}

/** A linha da Torre sobre a última cópia deste clube, e se já é velha: mais de 7 dias ou de uma semana de jogo. */
export function lastExportNote(club: ClubState, now = Date.now()): { text: string; stale: boolean } {
  let last: LastExport | null = null;
  try {
    const value = JSON.parse(localStorage.getItem(EXPORT_KEY) ?? 'null') as LastExport | null;
    if (typeof value?.at === 'number' && value.team === club.team.name) last = value;
  } catch {
    last = null;
  }
  if (!last) return { text: 'Ainda não fizeste nenhuma cópia.', stale: true };
  const d = new Date(last.at);
  const time = `${d.getDate()} ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const stale = now - last.at > WEEK_MS || club.season !== last.season || club.week - last.week > 1;
  return { text: stale ? `Última cópia: ${time}. Tem mais de uma semana: exporta outra.` : `Última cópia: ${time}`, stale };
}

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
export function exportClub(current: ClubState, done: () => void): void {
  const name = `pocket-basketball-${current.team.short.replace(/[^\w-]/g, '') || 'clube'}-epoca-${current.season}.json`;
  const file = new File([JSON.stringify(current)], name, { type: 'application/json' });
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    navigator.share({ files: [file] }).then(() => {
      markExported(current);
      done();
    }, () => {});
    return;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = name;
  link.click();
  markExported(current);
  done();
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
