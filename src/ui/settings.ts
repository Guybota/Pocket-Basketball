// As definições do jogador: som, letra, contraste e movimento. Ficam neste aparelho, à parte do clube guardado.
import type { GameAudio } from './audio.ts';

const SETTINGS_KEY = 'pocket-basketball-settings';
/** A letra maior: cada tamanho da interface fica 1,2 vezes maior, arredondado ao píxel. A arte não muda. */
const BIG_TEXT_SCALE = 1.2;

export type Motion = 'auto' | 'reduce' | 'full';
export interface Settings {
  master: number;
  effects: number;
  music: number;
  muted: boolean;
  bigText: boolean;
  highContrast: boolean;
  motion: Motion;
}

const DEFAULTS: Settings = { master: 1, effects: 1, music: 1, muted: false, bigText: false, highContrast: false, motion: 'auto' };

/** Lê as definições guardadas. O que faltar ou vier estragado fica com o valor de origem. */
export function parseSettings(text: string | null): Settings {
  const out = { ...DEFAULTS };
  let raw: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(text ?? '{}');
    if (parsed && typeof parsed === 'object') raw = parsed as Record<string, unknown>;
  } catch { /* fica tudo de origem */ }
  for (const key of ['master', 'effects', 'music'] as const) {
    const value = raw[key];
    if (typeof value === 'number' && value >= 0 && value <= 1) out[key] = value;
  }
  for (const key of ['muted', 'bigText', 'highContrast'] as const) if (typeof raw[key] === 'boolean') out[key] = raw[key];
  if (raw.motion === 'reduce' || raw.motion === 'full') out.motion = raw.motion;
  return out;
}

function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(SETTINGS_KEY));
  } catch {
    return { ...DEFAULTS };
  }
}

let settings = load();

export function currentSettings(): Readonly<Settings> {
  return settings;
}

/** Muda e guarda. Se o browser não deixar guardar, vale até fechar a página. */
export function updateSettings(change: Partial<Settings>, audio: GameAudio): void {
  settings = { ...settings, ...change };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* sem armazenamento: fica só nesta sessão */ }
  applySettings(audio);
}

/** Menos movimento: o que o jogador escolheu, ou o que o sistema pede. */
export function reducedMotion(): boolean {
  if (settings.motion !== 'auto') return settings.motion === 'reduce';
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// A letra de origem de cada regra (o `font` inteiro, ou só o `font-size`), para a letra maior se poder ligar e desligar sem
// os tamanhos se irem acumulando. Com `var()` no `font`, o browser não separa o tamanho: muda-se o texto do `font` todo.
let fontRules: [CSSStyleDeclaration, 'font' | 'font-size', string][] | null = null;

function collectFontRules(rules: CSSRuleList, into: NonNullable<typeof fontRules>): void {
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      for (const property of ['font', 'font-size'] as const) {
        const value = rule.style.getPropertyValue(property);
        if (value.includes('px')) into.push([rule.style, property, value]);
      }
    }
    if ('cssRules' in rule) collectFontRules((rule as CSSGroupingRule).cssRules, into);
  }
}

/** Muda só os tamanhos de letra (e as alturas de linha em px) das folhas de estilo: as imagens e o campo mantêm a escala inteira dos píxeis. */
function scaleText(scale: number): void {
  if (!fontRules) {
    fontRules = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        collectFontRules(sheet.cssRules, fontRules);
      } catch { /* folhas de outro sítio (as letras do Google) não se deixam ler */ }
    }
  }
  for (const [style, property, value] of fontRules) {
    style.setProperty(property, value.replace(/(\d*\.?\d+)px/g, (_, size: string) => `${Math.round(parseFloat(size) * scale)}px`));
  }
}

export function applySettings(audio: GameAudio): void {
  audio.setMasterVolume(settings.master);
  audio.setEffectsVolume(settings.effects);
  audio.setMusicVolume(settings.music);
  audio.setMuted(settings.muted);
  const root = document.documentElement.classList;
  root.toggle('high-contrast', settings.highContrast);
  root.toggle('big-text', settings.bigText);
  root.toggle('reduce-motion', reducedMotion());
  if (settings.bigText || fontRules) scaleText(settings.bigText ? BIG_TEXT_SCALE : 1);
}

/** Com «Como o sistema», a classe do movimento acompanha o sistema se ele mudar com o jogo aberto. */
export function watchSystemMotion(audio: GameAudio): void {
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => applySettings(audio));
}

const MOTION_LABEL: Record<Motion, string> = { auto: 'Como o sistema', reduce: 'Sim', full: 'Não' };
const NEXT_MOTION: Record<Motion, Motion> = { auto: 'reduce', reduce: 'full', full: 'auto' };

/** O ecrã de Definições, numa janela por cima de tudo. */
export function openSettings(audio: GameAudio, onClose?: () => void): void {
  document.getElementById('settings')?.remove();
  const dialog = document.createElement('dialog');
  dialog.id = 'settings';
  dialog.setAttribute('aria-labelledby', 'settingsTitle');
  const slider = (key: 'master' | 'effects' | 'music', label: string): string =>
    `<label class="set-row"><span>${label}</span><input type="range" id="set-${key}" min="0" max="100" step="5" value="${Math.round(settings[key] * 100)}"></label>`;
  const toggle = (id: string, label: string, on: boolean, text = on ? 'Sim' : 'Não'): string =>
    `<div class="set-row"><span id="${id}-label">${label}</span><button type="button" id="${id}" aria-labelledby="${id}-label" aria-pressed="${on}">${text}</button></div>`;
  const render = (): void => {
    dialog.innerHTML = `<form method="dialog">
      <h2 id="settingsTitle">Definições</h2>
      ${toggle('set-sound', 'Som', !settings.muted, settings.muted ? 'Desligado' : 'Ligado')}
      ${slider('master', 'Volume geral')}
      ${slider('effects', 'Efeitos')}
      ${slider('music', 'Música')}
      ${toggle('set-big', 'Letra maior', settings.bigText)}
      ${toggle('set-contrast', 'Alto contraste', settings.highContrast)}
      <div class="set-row"><span id="set-motion-label">Menos movimento</span><button type="button" id="set-motion" aria-labelledby="set-motion-label">${MOTION_LABEL[settings.motion]}</button></div>
      <p class="hint">Ficam guardadas neste aparelho, à parte do clube.</p>
      <button type="submit" class="primary" id="settingsClose">Fechar</button>
    </form>`;
    for (const key of ['master', 'effects', 'music'] as const) {
      dialog.querySelector<HTMLInputElement>(`#set-${key}`)!.addEventListener('input', event => {
        updateSettings({ [key]: Number((event.target as HTMLInputElement).value) / 100 }, audio);
      });
    }
    const flip = (id: string, change: () => Partial<Settings>): void => {
      dialog.querySelector(`#${id}`)!.addEventListener('click', () => {
        updateSettings(change(), audio);
        render();
        dialog.querySelector<HTMLElement>(`#${id}`)!.focus();
      });
    };
    flip('set-sound', () => ({ muted: !settings.muted }));
    flip('set-big', () => ({ bigText: !settings.bigText }));
    flip('set-contrast', () => ({ highContrast: !settings.highContrast }));
    flip('set-motion', () => ({ motion: NEXT_MOTION[settings.motion] }));
  };
  render();
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });
  document.body.append(dialog);
  dialog.showModal();
}
