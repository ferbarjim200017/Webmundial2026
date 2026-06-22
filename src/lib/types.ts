// =====================================================================
//  Modelo de datos del torneo
// =====================================================================

export type Role = "admin" | "member";

/** Documento de usuario autenticado (Firebase Auth + perfil en Firestore). */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: Role;
  /** Jugador vinculado a esta cuenta (uno de los 10). */
  playerId: string | null;
  createdAt?: number;
}

/** Uno de los 10 jugadores fijos. */
export interface Player {
  id: string;
  name: string;
  order: number;
}

/** Pareja fija que compite en todos los deportes. */
export interface Pair {
  id: string;
  name: string;
  player1Id: string;
  player2Id: string;
  /** Color identificativo (clave de PAIR_COLORS). */
  color: string;
  order: number;
}

/** Partido de la fase de grupos (todos contra todos). */
export interface GroupMatch {
  id: string;
  homePairId: string;
  awayPairId: string;
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
}

/** Partido de eliminatoria. Los participantes se resuelven por siembra. */
export interface KnockoutMatch {
  homeScore: number | null;
  awayScore: number | null;
  played: boolean;
  /** Lado ganador en caso de empate (penaltis, etc.): 'home' | 'away'. */
  winnerSide?: "home" | "away" | null;
}

export interface Knockout {
  sf1: KnockoutMatch; // 1º vs 4º
  sf2: KnockoutMatch; // 2º vs 3º
  final: KnockoutMatch;
  third: KnockoutMatch;
}

/** Un deporte = un torneo completo (grupos + eliminatorias). */
export interface Sport {
  id: string;
  name: string;
  emoji: string;
  order: number;
  createdAt?: number;
  group: { matches: GroupMatch[] };
  knockout: Knockout;
}

/**
 * Gran Final: las 4 mejores parejas de la clasificación general luchan por el
 * gran título. Documento único en config/grandFinal.
 */
export interface GrandFinal {
  /** Desempate cuando hay empate a puntos en el corte (4º). */
  tiebreak: {
    pairIds: string[];
    spots: number;
    matches: GroupMatch[];
  } | null;
  knockout: Knockout;
}

// ---------- Tipos derivados (calculados, no se guardan) ----------

export interface GroupRow {
  pairId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  scored: number;
  conceded: number;
  diff: number;
  points: number;
  /** Posición 1..5; la 5 queda eliminada. */
  rank: number;
  qualified: boolean;
}

export type SportStatus = "setup" | "group" | "knockout" | "finished";

export interface SportResult {
  status: SportStatus;
  groupComplete: boolean;
  championPairId: string | null;
  runnerUpPairId: string | null;
  thirdPairId: string | null;
}

export interface GeneralRow {
  pairId: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  /** Deportes en los que ha participado con resultado. */
  played: number;
  rank: number;
}
