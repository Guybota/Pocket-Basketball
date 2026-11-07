import { describe, expect, it } from 'vitest';
import { simulateMatch } from '../sim/match.ts';
import { GUEST_RIVAL, TEAM_FILE_FORMAT, TEAM_FILE_VERSION, guestTeam, parseTeamFile, teamFile } from './airport.ts';
import { clubTeam, currentFixture, finishMatch, newClub, parseClub, rivalTeam } from './club.ts';

const club = newClub(5);
const file = (change: (data: Record<string, any>) => void = () => {}): string => {
  const data = JSON.parse(teamFile(club));
  change(data);
  return JSON.stringify(data);
};

describe('ficheiro da equipa', () => {
  it('leva só a equipa, e volta igual', () => {
    const text = teamFile(club);
    expect(text.length).toBeLessThan(16 * 1024);
    const data = JSON.parse(text);
    expect(Object.keys(data).sort()).toEqual(['emblem', 'format', 'kits', 'name', 'roster', 'short', 'tactics', 'version']);
    expect(data.format).toBe(TEAM_FILE_FORMAT);
    expect(data.version).toBe(TEAM_FILE_VERSION);
    const guest = parseTeamFile(text);
    expect(guest.name).toBe(club.team.name);
    expect(guest.short).toBe(club.team.short);
    expect(guest.emblem).toEqual(club.emblem);
    expect(guest.kits).toEqual(club.kits);
    expect(guest.tactics).toEqual(club.tactics);
    expect(guest.roster.map(p => p.name)).toEqual(club.team.roster.map(p => p.name));
    expect(guest.roster[0]!.attributes).toEqual(club.team.roster[0]!.attributes);
  });

  it('recusa ficheiros estranhos sem partir', () => {
    const bad = [
      'isto não é json',
      'null',
      '[]',
      JSON.stringify({ format: 'outro-jogo', version: 1 }),
      JSON.stringify(club),
      file(d => { d.roster = d.roster.slice(0, 4); }),
      file(d => { d.roster = [...d.roster, ...d.roster]; }),
      file(d => { d.roster[1].name = d.roster[0].name; }),
      file(d => { d.roster[0].attributes.shooting = 200; }),
      file(d => { d.roster[0].attributes.speed = '50'; }),
      file(d => { delete d.roster[0].attributes; }),
      file(d => { d.roster[0].moves = ['voar']; }),
      file(d => { d.roster[0].height = 4; }),
      file(d => { d.roster[0].name = '<img src=x onerror=alert(1)>'; }),
      file(d => { d.name = '"><script>'; }),
      file(d => { d.name = 'x'.repeat(200); }),
      file(d => { d.short = 'muito comprida'; }),
      file(d => { d.emblem.symbol = 'constructor'; }),
      file(d => { d.emblem.primary = 'red'; }),
      file(d => { d.kits = []; }),
      file(d => { d.kits[0].jersey = 'url(x)'; }),
      file(d => { d.tactics.pressure = 5; }),
      file(d => { d.tactics = null; }),
      file(d => { d.pad = 'x'.repeat(70 * 1024); }),
    ];
    for (const text of bad) expect(() => parseTeamFile(text), text.slice(0, 80)).toThrow();
  });

  it('diz quando a equipa vem de outra versão', () => {
    expect(() => parseTeamFile(file(d => { d.version = 2; }))).toThrow('outra versão');
    expect(() => parseTeamFile(file(d => { delete d.version; }))).toThrow('outra versão');
  });

  it('aceita campos a mais, mas não os guarda', () => {
    const guest = parseTeamFile(file(d => {
      d.money = 999;
      d.cards = { shooting: 99 };
      d.roster[0].secret = 'x';
      d.roster[0].injuryWeeks = 5;
      d.roster[0].fatigue = 0.9;
      d.emblem.extra = 1;
      d.kits[0].extra = 1;
      d.tactics.extra = 1;
    }));
    expect(guest).not.toHaveProperty('money');
    expect(guest).not.toHaveProperty('cards');
    expect(guest.roster[0]).not.toHaveProperty('secret');
    expect(guest.roster[0]).not.toHaveProperty('injuryWeeks');
    expect(guest.roster[0]!.fatigue).toBe(0);
    expect(guest.emblem).not.toHaveProperty('extra');
    expect(guest.kits[0]).not.toHaveProperty('extra');
    expect(guest.tactics).not.toHaveProperty('extra');
  });

  it('a nossa própria equipa, em campo contra nós, leva um «II» nos nomes', () => {
    const name = club.team.roster[0]!.name;
    const guest = parseTeamFile(file(d => { d.tactics.options = [name]; }));
    const team = guestTeam(guest, club.team);
    expect(team.roster[0]!.name).toBe(`${name} II`);
    expect(team.tactics!.options).toEqual([`${name} II`]);
    expect(new Set([...team.roster, ...club.team.roster].map(p => p.name)).size).toBe(team.roster.length + club.team.roster.length);
  });
});

describe('amigável do Aeroporto', () => {
  const guest = parseTeamFile(teamFile(newClub(77)));
  const withGuest = { ...club, guest };

  it('fica guardado no clube e sobrevive a guardar e ler', () => {
    const loaded = parseClub(JSON.stringify(withGuest))!;
    expect(loaded.guest).toEqual(guest);
    expect(rivalTeam(loaded, GUEST_RIVAL).name).toBe(guest.name);
    expect(parseClub(JSON.stringify({ ...withGuest, guest: { ...guest, roster: [] } }))).toBeNull();
    expect(parseClub(JSON.stringify({ ...withGuest, guestGames: [{ name: 'X' }] }))).toBeNull();
  });

  it('um clube da versão 14 passa à 15 sem equipa de fora', () => {
    const { guest: _, guestGames: __, ...old } = club;
    const migrated = parseClub(JSON.stringify({ ...old, version: 14 }))!;
    expect(migrated.version).toBe(15);
    expect(migrated.guest).toBeNull();
    expect(migrated.guestGames).toEqual([]);
  });

  it('dá cartas como um particular, não mexe na confiança e fica no histórico', () => {
    expect(currentFixture(withGuest)).toBeNull();
    const s = simulateMatch(clubTeam(withGuest), rivalTeam(withGuest, GUEST_RIVAL), 11);
    const result = finishMatch(withGuest, s, [], [], true);
    const friendly = finishMatch(withGuest, s, []);
    expect(result.round).toBeNull();
    expect(result.cards).toEqual(friendly.cards);
    expect(result.confidenceDelta).toBe(0);
    expect(result.club.confidence).toBe(withGuest.confidence);
    expect(result.club.week).toBe(withGuest.week + 1);
    expect(result.club.guestGames).toEqual([{ name: guest.name, score: [s.score[0], s.score[1]], season: club.season, week: club.week }]);
    expect(friendly.club.guestGames).toEqual([]);
  });
});
