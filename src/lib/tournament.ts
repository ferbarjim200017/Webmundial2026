// =====================================================================
//  Lógica del torneo: generación de partidos, clasificaciones y cuadro
// =====================================================================
import type {
  GeneralRow,
  GroupMatch,
  GroupRow,
  Knockout,
  KnockoutMatch,
  Sport,
  SportResult,
  SportStatus,
} from "./types";
import { SPORT_POINTS } from "./constants";

// ---------- Fábricas ----------

export function emptyKnockoutMatch(): KnockoutMatch {
  return { homeScore: null, awayScore: null, played: false, winnerSide: null };
}

export function emptyKnockout(): Knockout {
  return {
    sf1: emptyKnockoutMatch(),
    sf2: emptyKnockoutMatch(),
    final: emptyKnockoutMatch(),
    third: emptyKnockoutMatch(),
  };
}

let _seq = 0;
function uid(prefix: string) {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq}`;
}

const BYE = "__bye__";

/**
 * Genera la liga (solo ida: cada pareja juega una vez contra cada otra) usando
 * el "método del círculo". Los partidos se ordenan por jornadas, de forma que
 * dentro de cada jornada una pareja juega como mucho una vez → se evita, en la
 * medida de lo posible, que una pareja juegue dos partidos seguidos.
 */
export function roundRobin(pairIds: string[]): GroupMatch[] {
  const ids = [...pairIds];
  if (ids.length < 2) return [];
  if (ids.length % 2 !== 0) ids.push(BYE); // descanso si son impares
  const n = ids.length;
  const half = n / 2;

  let arr = [...ids];
  const matches: GroupMatch[] = [];
  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // Alternar local/visitante por jornada para repartir
      const [home, away] = round % 2 === 0 ? [a, b] : [b, a];
      matches.push({
        id: uid("gm"),
        homePairId: home,
        awayPairId: away,
        homeScore: null,
        awayScore: null,
        played: false,
      });
    }
    // Rotación: se fija el primer elemento y se rota el resto
    arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
  }
  return matches;
}

// ---------- Fase de grupos ----------

export function isGroupMatchPlayed(m: GroupMatch): boolean {
  return m.played && m.homeScore !== null && m.awayScore !== null;
}

export function groupComplete(sport: Sport): boolean {
  const matches = sport.group?.matches ?? [];
  return matches.length > 0 && matches.every(isGroupMatchPlayed);
}

/**
 * Calcula una clasificación a partir de una lista de partidos (liga).
 * @param qualifyTop nº de parejas que se marcan como clasificadas (qualified)
 */
export function computeStandings(
  matches: GroupMatch[],
  pairIds: string[],
  qualifyTop = 4
): GroupRow[] {
  const rows = new Map<string, GroupRow>();
  pairIds.forEach((pairId) => {
    rows.set(pairId, {
      pairId,
      played: 0, won: 0, drawn: 0, lost: 0,
      scored: 0, conceded: 0, diff: 0, points: 0,
      rank: 0, qualified: false,
    });
  });

  for (const m of matches) {
    if (!isGroupMatchPlayed(m)) continue;
    const home = rows.get(m.homePairId);
    const away = rows.get(m.awayPairId);
    if (!home || !away) continue;
    const hs = m.homeScore as number;
    const as = m.awayScore as number;

    home.played++; away.played++;
    home.scored += hs; home.conceded += as;
    away.scored += as; away.conceded += hs;

    if (hs > as) { home.won++; home.points += 3; away.lost++; }
    else if (hs < as) { away.won++; away.points += 3; home.lost++; }
    else { home.drawn++; away.drawn++; home.points += 1; away.points += 1; }
  }

  const order = new Map(pairIds.map((id, i) => [id, i]));
  const sorted = [...rows.values()].sort((a, b) => {
    a.diff = a.scored - a.conceded;
    b.diff = b.scored - b.conceded;
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.scored !== a.scored) return b.scored - a.scored;
    if (b.won !== a.won) return b.won - a.won;
    return (order.get(a.pairId) ?? 0) - (order.get(b.pairId) ?? 0);
  });

  sorted.forEach((row, i) => {
    row.diff = row.scored - row.conceded;
    row.rank = i + 1;
    row.qualified = i < qualifyTop;
  });

  return sorted;
}

/** Tabla de la fase de grupos de un deporte (4 clasifican, el 5º eliminado). */
export function computeGroupTable(sport: Sport, pairIds: string[]): GroupRow[] {
  return computeStandings(sport.group?.matches ?? [], pairIds, 4);
}

/** Las 4 parejas clasificadas, ordenadas por siembra (1º..4º). */
export function seeds(sport: Sport, pairIds: string[]): string[] {
  return computeGroupTable(sport, pairIds)
    .filter((r) => r.qualified)
    .map((r) => r.pairId);
}

// ---------- Eliminatorias ----------

export function knockoutWinnerSide(m: KnockoutMatch): "home" | "away" | null {
  if (!m.played) return null;
  if (m.winnerSide) return m.winnerSide;
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return "home";
  if (m.homeScore < m.awayScore) return "away";
  return null; // empate sin ganador definido
}

export interface BracketMatch {
  key: "sf1" | "sf2" | "final" | "third";
  homePairId: string | null;
  awayPairId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  winnerSide: "home" | "away" | null;
  winnerPairId: string | null;
  loserPairId: string | null;
}

export interface BracketView {
  sf1: BracketMatch;
  sf2: BracketMatch;
  final: BracketMatch;
  third: BracketMatch;
}

function build(
  key: BracketMatch["key"],
  m: KnockoutMatch,
  homePairId: string | null,
  awayPairId: string | null
): BracketMatch {
  const winnerSide = knockoutWinnerSide(m);
  let winnerPairId: string | null = null;
  let loserPairId: string | null = null;
  if (winnerSide === "home") { winnerPairId = homePairId; loserPairId = awayPairId; }
  else if (winnerSide === "away") { winnerPairId = awayPairId; loserPairId = homePairId; }
  return {
    key,
    homePairId,
    awayPairId,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    played: m.played,
    winnerSide,
    winnerPairId,
    loserPairId,
  };
}

/** Garantiza que un cuadro tenga las 4 llaves (rellena las que falten). */
export function normalizeKnockout(ko?: Partial<Knockout> | null): Knockout {
  return {
    sf1: ko?.sf1 ?? emptyKnockoutMatch(),
    sf2: ko?.sf2 ?? emptyKnockoutMatch(),
    final: ko?.final ?? emptyKnockoutMatch(),
    third: ko?.third ?? emptyKnockoutMatch(),
  };
}

/** Resuelve un cuadro eliminatorio a partir de la siembra [1º,2º,3º,4º]. */
export function resolveKnockout(ko: Knockout, s: string[]): BracketView {
  const sf1 = build("sf1", ko.sf1, s[0] ?? null, s[3] ?? null);
  const sf2 = build("sf2", ko.sf2, s[1] ?? null, s[2] ?? null);
  const final = build("final", ko.final, sf1.winnerPairId, sf2.winnerPairId);
  const third = build("third", ko.third, sf1.loserPairId, sf2.loserPairId);
  return { sf1, sf2, final, third };
}

/** Resuelve participantes y resultados del cuadro de un deporte. */
export function resolveBracket(sport: Sport, pairIds: string[]): BracketView {
  return resolveKnockout(sport.knockout ?? emptyKnockout(), seeds(sport, pairIds));
}

// ---------- Estado / resultado de un deporte ----------

export function computeSportResult(sport: Sport, pairIds: string[]): SportResult {
  const hasMatches = (sport.group?.matches?.length ?? 0) > 0;
  const gComplete = groupComplete(sport);
  const bracket = resolveBracket(sport, pairIds);

  let status: SportStatus = "setup";
  if (!hasMatches) status = "setup";
  else if (!gComplete) status = "group";
  else if (bracket.final.played && bracket.third.played) status = "finished";
  else status = "knockout";

  return {
    status,
    groupComplete: gComplete,
    championPairId: bracket.final.winnerPairId,
    runnerUpPairId: bracket.final.loserPairId,
    thirdPairId: bracket.third.winnerPairId,
  };
}

// ---------- Partidos de una pareja en un deporte ----------

export interface PairMatchSummary {
  phase: string; // "Grupos" | "Semifinal" | "Final" | "3er puesto"
  opponentPairId: string | null;
  ownScore: number | null;
  oppScore: number | null;
  played: boolean;
  outcome: "win" | "loss" | "draw" | "pending";
}

/** Todos los partidos (grupos + eliminatoria) de una pareja en un deporte. */
export function pairMatchesInSport(
  sport: Sport,
  pairId: string,
  pairIds: string[]
): PairMatchSummary[] {
  const out: PairMatchSummary[] = [];

  // Fase de grupos
  for (const m of sport.group?.matches ?? []) {
    if (m.homePairId !== pairId && m.awayPairId !== pairId) continue;
    const isHome = m.homePairId === pairId;
    const own = isHome ? m.homeScore : m.awayScore;
    const oth = isHome ? m.awayScore : m.homeScore;
    const played = isGroupMatchPlayed(m);
    let outcome: PairMatchSummary["outcome"] = "pending";
    if (played) {
      outcome = (own as number) > (oth as number) ? "win" : (own as number) < (oth as number) ? "loss" : "draw";
    }
    out.push({
      phase: "Grupos",
      opponentPairId: isHome ? m.awayPairId : m.homePairId,
      ownScore: own,
      oppScore: oth,
      played,
      outcome,
    });
  }

  // Eliminatorias
  const b = resolveBracket(sport, pairIds);
  const ko: { label: string; m: BracketMatch }[] = [
    { label: "Semifinal", m: b.sf1 },
    { label: "Semifinal", m: b.sf2 },
    { label: "Final", m: b.final },
    { label: "3er puesto", m: b.third },
  ];
  for (const { label, m } of ko) {
    if (m.homePairId !== pairId && m.awayPairId !== pairId) continue;
    const isHome = m.homePairId === pairId;
    out.push({
      phase: label,
      opponentPairId: isHome ? m.awayPairId : m.homePairId,
      ownScore: isHome ? m.homeScore : m.awayScore,
      oppScore: isHome ? m.awayScore : m.homeScore,
      played: m.played,
      outcome: m.played ? (m.winnerPairId === pairId ? "win" : "loss") : "pending",
    });
  }

  return out;
}

// ---------- Clasificación general ----------

export function computeGeneral(sports: Sport[], pairIds: string[]): GeneralRow[] {
  const rows = new Map<string, GeneralRow>();
  pairIds.forEach((pairId) =>
    rows.set(pairId, { pairId, points: 0, gold: 0, silver: 0, bronze: 0, played: 0, rank: 0 })
  );

  for (const sport of sports) {
    const res = computeSportResult(sport, pairIds);
    if (res.championPairId && rows.has(res.championPairId)) {
      const r = rows.get(res.championPairId)!;
      r.points += SPORT_POINTS.champion;
      r.gold += 1;
    }
    if (res.runnerUpPairId && rows.has(res.runnerUpPairId)) {
      const r = rows.get(res.runnerUpPairId)!;
      r.points += SPORT_POINTS.runnerUp;
      r.silver += 1;
    }
    if (res.thirdPairId && rows.has(res.thirdPairId)) {
      const r = rows.get(res.thirdPairId)!;
      r.points += SPORT_POINTS.third;
      r.bronze += 1;
    }
  }

  const order = new Map(pairIds.map((id, i) => [id, i]));
  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return (order.get(a.pairId) ?? 0) - (order.get(b.pairId) ?? 0);
  });

  sorted.forEach((r, i) => {
    r.played = r.gold + r.silver + r.bronze;
    r.rank = i + 1;
  });

  return sorted;
}

// ---------- Gran Final ----------

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

export interface GrandFinalTiebreak {
  pairIds: string[];
  spots: number;
  matches: GroupMatch[];
}

export interface GrandFinalQual {
  /** Parejas con plaza asegurada (más puntos que el corte). */
  secured: string[];
  /** Parejas empatadas justo en el corte que se disputan las plazas restantes. */
  boundary: string[];
  spotsForBoundary: number;
  needsTiebreak: boolean;
  tiebreakReady: boolean;
  /** Siembra final [1º,2º,3º,4º] si está resuelta; null si falta desempate. */
  qualifiers: string[] | null;
  hasPoints: boolean;
}

/**
 * Determina las 4 parejas que pasan a la Gran Final a partir de la
 * clasificación general. Si hay empate a puntos en el corte (4º puesto),
 * marca que hace falta un desempate (un partido si son 2, mini-liga si más).
 */
export function computeGrandFinalQual(
  general: GeneralRow[],
  tiebreak: GrandFinalTiebreak | null
): GrandFinalQual {
  const ranked = [...general];
  const hasPoints = ranked.some((r) => r.points > 0);
  const totalSpots = Math.min(4, ranked.length);

  const base: GrandFinalQual = {
    secured: [],
    boundary: [],
    spotsForBoundary: 0,
    needsTiebreak: false,
    tiebreakReady: false,
    qualifiers: null,
    hasPoints,
  };

  if (ranked.length <= totalSpots) {
    return {
      ...base,
      secured: ranked.map((r) => r.pairId),
      qualifiers: ranked.slice(0, totalSpots).map((r) => r.pairId),
    };
  }

  const cutoffPoints = ranked[totalSpots - 1].points;
  const secured = ranked.filter((r) => r.points > cutoffPoints).map((r) => r.pairId);
  const boundary = ranked.filter((r) => r.points === cutoffPoints).map((r) => r.pairId);
  const spotsForBoundary = totalSpots - secured.length;

  if (boundary.length === spotsForBoundary) {
    return { ...base, secured, qualifiers: [...secured, ...boundary] };
  }

  // Empate en el corte → desempate
  let qualifiers: string[] | null = null;
  let tiebreakReady = false;
  if (
    tiebreak &&
    sameSet(tiebreak.pairIds, boundary) &&
    tiebreak.matches.length > 0 &&
    tiebreak.matches.every(isGroupMatchPlayed)
  ) {
    tiebreakReady = true;
    const table = computeStandings(tiebreak.matches, tiebreak.pairIds, spotsForBoundary);
    qualifiers = [...secured, ...table.slice(0, spotsForBoundary).map((r) => r.pairId)];
  }

  return {
    secured,
    boundary,
    spotsForBoundary,
    needsTiebreak: true,
    tiebreakReady,
    qualifiers,
    hasPoints,
  };
}
