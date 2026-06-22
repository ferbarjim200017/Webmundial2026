// =====================================================================
//  Utilidades de presentación
// =====================================================================
import { PAIR_COLORS } from "./constants";
import type { Pair, Player } from "./types";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function byId<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((i) => [i.id, i]));
}

export function playerName(players: Map<string, Player>, id?: string | null): string {
  if (!id) return "—";
  return players.get(id)?.name ?? "—";
}

export function pairColor(key?: string) {
  return PAIR_COLORS[key ?? "emerald"] ?? PAIR_COLORS.emerald;
}

/** Nombres de los dos jugadores de una pareja. */
export function pairMembers(pair: Pair | undefined, players: Map<string, Player>): string {
  if (!pair) return "";
  const a = playerName(players, pair.player1Id);
  const b = playerName(players, pair.player2Id);
  return `${a} & ${b}`;
}

/** Iniciales para el avatar de la pareja. */
export function pairInitials(pair: Pair | undefined, players: Map<string, Player>): string {
  if (!pair) return "??";
  const a = playerName(players, pair.player1Id).charAt(0);
  const b = playerName(players, pair.player2Id).charAt(0);
  return `${a}${b}`.toUpperCase();
}

export const ordinal = (n: number) => `${n}º`;
