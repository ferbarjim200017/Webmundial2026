// =====================================================================
//  Lógica del torneo: generación de partidos, clasificaciones y cuadro
// =====================================================================
import type {
  GroupMatch,
  GroupRow,
  Knockout,
  KnockoutMatch,
  MatchOutcome,
  Pair,
  PlayerProfile,
  PlayerRow,
  PlayerSportStat,
  Sport,
  SportResult,
  SportStatus,
} from "./types";
import { SPORT_POINTS } from "./constants";
import { pairPlayerIds } from "./helpers";

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
    // Solo partidos de eliminatoria YA jugados: los cruces provisionales (que
    // se calculan según la clasificación actual aunque no se hayan disputado)
    // repetirían rivales de la fase de grupos y confundirían.
    if (!m.played) continue;
    if (m.homePairId !== pairId && m.awayPairId !== pairId) continue;
    const isHome = m.homePairId === pairId;
    out.push({
      phase: label,
      opponentPairId: isHome ? m.awayPairId : m.homePairId,
      ownScore: isHome ? m.homeScore : m.awayScore,
      oppScore: isHome ? m.awayScore : m.homeScore,
      played: true,
      outcome: m.winnerPairId === pairId ? "win" : "loss",
    });
  }

  return out;
}

// ---------- Clasificación general (individual, por jugador) ----------

/**
 * Clasificación general por JUGADOR. En cada deporte, TODOS los jugadores de la
 * pareja campeona suman 3 (oro), la subcampeona 2 (plata) y la tercera 1
 * (bronce) — incluido el tercer integrante (comodín) de la pareja que sea trío.
 * Como las parejas son por deporte, se pasan todas las parejas.
 */
export function computeIndividualGeneral(
  sports: Sport[],
  pairs: Pair[],
  playerIds: string[]
): PlayerRow[] {
  const rows = new Map<string, PlayerRow>();
  playerIds.forEach((playerId) =>
    rows.set(playerId, { playerId, points: 0, gold: 0, silver: 0, bronze: 0, played: 0, rank: 0 })
  );

  const award = (
    pairId: string | null,
    byPairId: Map<string, Pair>,
    pts: number,
    medal: "gold" | "silver" | "bronze"
  ) => {
    if (!pairId) return;
    const pair = byPairId.get(pairId);
    if (!pair) return;
    for (const pid of [pair.player1Id, pair.player2Id, pair.player3Id]) {
      if (!pid) continue;
      const row = rows.get(pid);
      if (!row) continue;
      row.points += pts;
      row[medal] += 1;
    }
  };

  for (const sport of sports) {
    const sportPairs = pairs.filter((p) => p.sportId === sport.id);
    const pairIds = sportPairs.map((p) => p.id);
    const byPairId = new Map(sportPairs.map((p) => [p.id, p]));
    const res = computeSportResult(sport, pairIds);
    award(res.championPairId, byPairId, SPORT_POINTS.champion, "gold");
    award(res.runnerUpPairId, byPairId, SPORT_POINTS.runnerUp, "silver");
    award(res.thirdPairId, byPairId, SPORT_POINTS.third, "bronze");
  }

  const order = new Map(playerIds.map((id, i) => [id, i]));
  const sorted = [...rows.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gold !== a.gold) return b.gold - a.gold;
    if (b.silver !== a.silver) return b.silver - a.silver;
    if (b.bronze !== a.bronze) return b.bronze - a.bronze;
    return (order.get(a.playerId) ?? 0) - (order.get(b.playerId) ?? 0);
  });

  sorted.forEach((r, i) => {
    r.played = r.gold + r.silver + r.bronze;
    r.rank = i + 1;
  });

  return sorted;
}

// ---------- Perfil individual de un jugador ----------

/**
 * Reúne todas las estadísticas de un jugador a lo largo de los deportes: puntos
 * por deporte y acumulados (para la gráfica de evolución), medallas, balance de
 * partidos (PJ/G/E/P), % de victorias, mejor deporte, forma reciente y racha.
 * Cuenta también al jugador cuando es el tercer integrante (comodín) de un trío.
 */
export function computePlayerProfile(
  sports: Sport[],
  pairs: Pair[],
  playerId: string
): PlayerProfile {
  const ordered = [...sports].sort((a, b) => a.order - b.order);
  const perSport: PlayerSportStat[] = [];
  const form: MatchOutcome[] = [];

  let cumulative = 0;
  let gold = 0, silver = 0, bronze = 0;
  let played = 0, won = 0, drawn = 0, lost = 0;

  for (const sport of ordered) {
    const sportPairs = pairs.filter((p) => p.sportId === sport.id);
    const pairIds = sportPairs.map((p) => p.id);
    const myPair = sportPairs.find((p) => pairPlayerIds(p).includes(playerId));

    let medal: PlayerSportStat["medal"] = null;
    let points = 0;
    let partnerIds: string[] = [];
    let sPlayed = 0, sWon = 0, sDrawn = 0, sLost = 0;

    if (myPair) {
      partnerIds = pairPlayerIds(myPair).filter((id) => id !== playerId);
      const res = computeSportResult(sport, pairIds);
      if (res.championPairId === myPair.id) { medal = "gold"; points = SPORT_POINTS.champion; }
      else if (res.runnerUpPairId === myPair.id) { medal = "silver"; points = SPORT_POINTS.runnerUp; }
      else if (res.thirdPairId === myPair.id) { medal = "bronze"; points = SPORT_POINTS.third; }

      for (const m of pairMatchesInSport(sport, myPair.id, pairIds)) {
        if (!m.played) continue;
        sPlayed++;
        if (m.outcome === "win") { sWon++; form.push("win"); }
        else if (m.outcome === "loss") { sLost++; form.push("loss"); }
        else if (m.outcome === "draw") { sDrawn++; form.push("draw"); }
      }
    }

    cumulative += points;
    if (medal === "gold") gold++;
    else if (medal === "silver") silver++;
    else if (medal === "bronze") bronze++;
    played += sPlayed; won += sWon; drawn += sDrawn; lost += sLost;

    perSport.push({
      sportId: sport.id,
      sportName: sport.name,
      sportEmoji: sport.emoji,
      pairId: myPair?.id ?? null,
      partnerIds,
      medal,
      points,
      cumulative,
      played: sPlayed,
      won: sWon,
      drawn: sDrawn,
      lost: sLost,
    });
  }

  // Mejor deporte: el de más puntos (el primero en caso de empate).
  let bestSport: PlayerProfile["bestSport"] = null;
  for (const s of perSport) {
    if (s.points > 0 && (!bestSport || s.points > bestSport.points)) {
      bestSport = { name: s.sportName, emoji: s.sportEmoji, points: s.points };
    }
  }

  // Racha actual: cuántos últimos resultados iguales seguidos hay.
  const streak: PlayerProfile["streak"] = { type: null, count: 0 };
  for (let i = form.length - 1; i >= 0; i--) {
    if (streak.type === null) { streak.type = form[i]; streak.count = 1; }
    else if (form[i] === streak.type) { streak.count++; }
    else break;
  }

  return {
    playerId,
    totalPoints: cumulative,
    gold, silver, bronze,
    podiums: gold + silver + bronze,
    played, won, drawn, lost,
    winRate: played > 0 ? Math.round((won / played) * 100) : 0,
    bestSport,
    form,
    streak,
    perSport,
  };
}

// ---------- Gran Final ----------

/**
 * Empareja a los 8 mejores de la general individual en 4 duplas automáticas:
 * (1º,2º) (3º,4º) (5º,6º) (7º,8º). Devuelve hasta 4 parejas de jugadores.
 */
export function grandFinalPairing(rows: PlayerRow[]): [string, string][] {
  const top = rows.slice(0, 8).map((r) => r.playerId);
  const pairs: [string, string][] = [];
  for (let i = 0; i + 1 < top.length; i += 2) {
    pairs.push([top[i], top[i + 1]]);
  }
  return pairs;
}
