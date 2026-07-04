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
  /** Género, para formar parejas mixtas ("M" | "F"). */
  gender?: "M" | "F";
}

/** Pareja de un deporte concreto (las parejas varían entre deportes). */
export interface Pair {
  id: string;
  /** Deporte al que pertenece esta pareja. */
  sportId: string;
  name: string;
  player1Id: string;
  player2Id: string;
  /** Color identificativo (clave de PAIR_COLORS). */
  color: string;
  order: number;
  /** Foto de perfil (data URL JPEG comprimido). Opcional. */
  photo?: string | null;
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
 * Gran Final: las 4 parejas se forman con los 8 mejores de la general
 * individual (1º+2º, 3º+4º, 5º+6º, 7º+8º) y disputan el cuadro por el gran
 * título. Documento único en config/grandFinal (solo guarda el cuadro).
 */
export interface GrandFinal {
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

/** Fila de la clasificación general individual (por jugador). */
export interface PlayerRow {
  playerId: string;
  points: number;
  gold: number;
  silver: number;
  bronze: number;
  /** Número de podios (oro+plata+bronce). */
  played: number;
  rank: number;
}
