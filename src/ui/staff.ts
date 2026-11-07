// As pessoas do clube: a secretária, o adjunto e o presidente. Têm cara, e a cara nem sempre diz o mesmo que a frase.
import { teamRating } from '../sim/teamgen.ts';
import type { Team } from '../sim/types.ts';
import { portraitImage, type Mood } from './art/portrait.ts';
import type { Look } from './art/sprites.ts';
import { surplus, type ClubState, type FacilityId, type Objective, type SeasonRecord } from './club.ts';
import { escapeHtml } from './panel.ts';

export type StaffId = 'secretary' | 'assistant' | 'president';

/** Os traços do retrato, bit a bit: forma da cara, sobrancelhas, olhos, nariz, barba, boca, cabelo comprido, carrapito, óculos e sobrancelhas grossas. */
const face = (shape: number, brow: number, eyes: number, nose: number, beard: number, mouth: number, longHair: boolean, extras: { bun?: boolean; glasses?: boolean; thickBrows?: boolean } = {}): number =>
  shape | (brow << 4) | (eyes << 6) | (nose << 8) | (beard << 10) | (mouth << 12) | ((extras.bun ? 1 : 0) << 16) | ((longHair ? 0 : 1) << 18) | ((extras.glasses ? 0 : 1) << 20) | ((extras.thickBrows ? 1 : 0) << 21) | (1 << 5);

export const STAFF: Record<StaffId, { name: string; look: Look }> = {
  // Caras fixas: a secretária de carrapito, o adjunto de sobrancelhas grossas e bigode, o presidente careca, de óculos e barba cheia.
  secretary: { name: 'Secretária', look: { kit: 'blouse', skin: 1, hair: 3, style: 0, legs: 7, torso: 7, build: 'slim', face: face(3, 0, 2, 1, 0, 2, true, { bun: true }) } },
  assistant: { name: 'Adjunto', look: { kit: 'coach', skin: 2, hair: 0, style: 1, legs: 8, torso: 8, build: 'athletic', face: face(2, 0, 0, 0, 1, 0, false, { thickBrows: true }) } },
  president: { name: 'Presidente', look: { kit: 'suit', skin: 0, hair: 4, style: 3, legs: 7, torso: 8, build: 'heavy', face: face(0, 1, 1, 2, 3, 1, false, { glasses: true }) } },
};

/** Um balão com o retrato de quem fala. */
export function say(who: StaffId, mood: Mood, line: string, id = ''): string {
  const { name, look } = STAFF[who];
  return `<div class="say"${id ? ` id="${id}"` : ''}><img alt="" src="${portraitImage(look, mood)}"><div><b>${name}</b><span class="t">${escapeHtml(line)}</span></div></div>`;
}

export const secretaryMood = (club: ClubState, line: string): Mood =>
  club.confidence < 15 ? 'worried' : line.includes('rastos') ? 'worried' : line.includes('subida') ? 'happy' : line.includes('descida') ? 'sad' : 'neutral';

/** Antes do jogo: o adjunto compara as equipas e repara em quem chegou cansado. */
export function assistantPreGame(club: ClubState, rival: Team): [Mood, string] {
  const tired = club.team.roster.slice(0, 5).find(p => p.fatigue >= 0.35);
  if (tired) return ['worried', `O ${tired.name} chegou de rastos. Eu punha-o no banco, mas o treinador és tu.`];
  const gap = teamRating(rival) - teamRating(club.team);
  if (gap > 6) return ['worried', 'No papel, eles são mais fortes. O papel não joga.'];
  if (gap < -6) return ['happy', 'No papel, ganhamos. Já vi o papel perder.'];
  return ['neutral', 'Jogo partido. Ganha quem tiver as pernas mais frescas no último período.'];
}

/** Ao intervalo: a cara conta mais do que a frase. */
export function assistantHalf(ours: number, theirs: number): [Mood, string] {
  const lead = ours - theirs;
  if (lead >= 10) return ['happy', 'Está ganho. Não digas isto a ninguém.'];
  if (lead > 0) return ['neutral', 'Estamos a ganhar. Mudar agora é dar-lhes ideias.'];
  if (lead === 0) return ['neutral', 'Tudo em aberto. É para isto que se treina.'];
  if (lead > -10) return ['worried', 'Está mal, mas não está perdido. Uma pressão mais alta?'];
  // A cara diz o contrário da frase (docs/05); a dica é a sério, para quem não sabe porque está a perder.
  return ['sad', 'Não está tão mau como parece. Vê quem está cansado e quem anda a falhar.'];
}

/** No fim do jogo. */
export function assistantResult(won: boolean, diff: number, practice: boolean): [Mood, string] {
  if (practice) return ['neutral', 'Foi um treino. Ninguém se lembra de treinos, mas as pernas lembram-se.'];
  if (won && diff >= 12) return ['happy', 'Isto foi um passeio. Amanhã treina-se na mesma.'];
  if (won && diff >= 6) return ['happy', 'Ganhámos com tempo para respirar. Pouco, mas algum.'];
  if (won) return ['happy', 'Sofremos, mas ganhámos. É a única coisa que conta à segunda-feira.'];
  if (diff > -6) return ['worried', 'Perdemos por um fio. Fio é o que nos falta, não é talento.'];
  return ['sad', 'Não foi tão mau como pareceu.'];
}

export function presidentBoard(club: ClubState): [Mood, string] {
  if (club.confidence < 15) return ['sad', 'Vamos ser francos: ou isto muda já, ou muda o treinador.'];
  if (club.confidence < 40) return ['worried', 'Estamos a ver alguns sinais. Acabe no meio da tabela e ninguém faz perguntas.'];
  if (club.confidence < 70) return ['neutral', 'Bom trabalho. Continue a dar-me razões para confiar em si.'];
  return ['happy', 'Já ando a falar de si aos meus amigos. Continue assim.'];
}

export function presidentSeason(record: SeasonRecord): [Mood, string] {
  if (record.outcome === 'champion') return ['happy', 'Campeões! Já encomendei uma vitrina maior.'];
  if (record.outcome === 'promoted') return ['happy', 'Subimos. O orçamento sobe, e as exigências também.'];
  if (record.outcome === 'relegated') return ['sad', 'Descemos. Não quero explicações, quero subidas.'];
  if (record.position < 4) return ['neutral', 'Boa época. Para o ano quero melhor, e o senhor também.'];
  return ['worried', 'Ficámos. Já ficámos pior, o que não é consolo nenhum.'];
}

export function presidentRenewals(club: ClubState): [Mood, string] {
  return surplus(club) < 60 ? ['worried', 'O dinheiro é este, e não há mais. Faça contas antes de assinar.'] : ['neutral', 'Está aqui o orçamento. Gaste-o bem, que depois não me venha pedir.'];
}

export const presidentFired = (): [Mood, string] => ['sad', 'A direção agradece os serviços e pede as chaves do pavilhão.'];

export function secretaryFarewell(names: readonly string[]): [Mood, string] {
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} e ${names.at(-1)}`;
  return ['sad', `Hoje despedimo-nos de ${list}. Levou o cacifo e deixou o café.`];
}

/** O presidente explica o objetivo da época. */
export function presidentObjective(objective: Objective): [Mood, string] {
  if (objective.kind === 'federation') return ['neutral', 'Este ano a cidade quer a taça. Não lhe peço que a ganhe, peço que não nos envergonhe nela.'];
  if (objective.target <= 2) return ['neutral', 'Com este plantel, quero-nos lá em cima. Não aceito desculpas com o calendário.'];
  if (objective.target >= 8) return ['worried', 'Sejamos realistas: não descer já era uma boa notícia.'];
  return ['neutral', 'Fiz as contas ao plantel e aos outros. O objetivo é justo, e eu sou um homem justo.'];
}

/** No fim da época, o que o presidente diz do objetivo. */
export function presidentObjectiveResult(met: boolean): [Mood, string] {
  return met ? ['happy', 'Objetivo cumprido. A direção cumpre a sua parte, como prometido.'] : ['sad', 'O objetivo ficou por cumprir. Isso também se paga.'];
}

/** O adjunto comenta as instalações: a que falta é a que mais o preocupa. */
export function assistantFacilities(facilities: Record<FacilityId, number>): [Mood, string] {
  const { gym, medical, scouts } = facilities;
  if (gym + medical + scouts === 0) return ['worried', 'Treinamos num ginásio emprestado, o médico é o primo do roupeiro e os olheiros somos nós ao domingo.'];
  if (medical === 0) return ['worried', 'Sem médico, cada entorse dura um mês. Um departamento médico pagava-se sozinho.'];
  if (gym === 0) return ['neutral', 'Com máquinas a sério, cada carta de treino rendia mais. Os garrafões de água já deram o que tinham a dar.'];
  if (scouts === 0) return ['neutral', 'Sem olheiros, o mercado é o que nos aparece à porta. Com eles, aparecia gente melhor.'];
  if (gym + medical + scouts >= 9) return ['happy', 'Instalações de primeira. Agora já não há desculpas, nem para mim.'];
  return ['happy', 'Isto já parece um clube a sério. Mais uma obra e nem nos reconhecem.'];
}
