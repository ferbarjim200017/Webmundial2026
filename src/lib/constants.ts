// =====================================================================
//  Constantes y valores por defecto
// =====================================================================

/** Los 11 jugadores fijos, en orden. */
export const PLAYER_NAMES = [
  "Fernando",
  "Gonzalo",
  "Jaime",
  "Elena G",
  "Elena B",
  "Lucia",
  "Miguel",
  "Juan",
  "Ana",
  "Maria",
  "Alberto",
] as const;

/**
 * Jugador "comodín": no entra en el sorteo de parejas mixtas, sino que se une
 * como TERCER integrante a una pareja elegida al azar en cada deporte. Así se
 * mantienen 5 parejas por deporte (un chico + una chica), pero una de ellas es
 * un trío. Si su trío gana, los tres suman puntos en la general.
 */
export const EXTRA_PLAYER_NAME = "Alberto";

/** Nombres femeninos entre los jugadores (el resto son masculinos). */
export const FEMALE_PLAYER_NAMES = new Set([
  "Elena G",
  "Elena B",
  "Lucia",
  "Ana",
  "Maria",
]);

/** Género de un jugador según su nombre (para formar parejas mixtas). */
export function genderOf(name: string): "M" | "F" {
  return FEMALE_PLAYER_NAMES.has(name) ? "F" : "M";
}

/** Deportes que se crean al inicializar el torneo. */
export const DEFAULT_SPORTS: { name: string; emoji: string }[] = [
  { name: "Tenis", emoji: "🎾" },
  { name: "Bádminton", emoji: "🏸" },
  { name: "Vóley", emoji: "🏐" },
  { name: "Fútbol", emoji: "⚽" },
];

/** Sugerencias de emoji al crear un deporte nuevo. */
export const SPORT_EMOJIS = [
  "🎾", "🏸", "🏐", "⚽", "🏀", "🏓", "🏏", "🏑", "🥎", "⚾",
  "🥏", "🎱", "🏉", "🥅", "🏌️", "🤾", "🏊", "🚴", "🏃", "🎯",
  "🥊", "🤺", "🛹", "⛳", "🏆",
];

/** Colores de pareja (clave -> gradiente / sólido). */
export const PAIR_COLORS: Record<
  string,
  { name: string; from: string; to: string; ring: string; text: string }
> = {
  emerald: { name: "Esmeralda", from: "#10b981", to: "#059669", ring: "#34d399", text: "#d1fae5" },
  sky: { name: "Cielo", from: "#0ea5e9", to: "#0369a1", ring: "#38bdf8", text: "#e0f2fe" },
  violet: { name: "Violeta", from: "#8b5cf6", to: "#6d28d9", ring: "#a78bfa", text: "#ede9fe" },
  rose: { name: "Rosa", from: "#f43f5e", to: "#be123c", ring: "#fb7185", text: "#ffe4e6" },
  amber: { name: "Ámbar", from: "#f59e0b", to: "#b45309", ring: "#fbbf24", text: "#fef3c7" },
  cyan: { name: "Cian", from: "#06b6d4", to: "#0e7490", ring: "#22d3ee", text: "#cffafe" },
  lime: { name: "Lima", from: "#84cc16", to: "#4d7c0f", ring: "#a3e635", text: "#ecfccb" },
  fuchsia: { name: "Fucsia", from: "#d946ef", to: "#a21caf", ring: "#e879f9", text: "#fae8ff" },
};

export const PAIR_COLOR_KEYS = Object.keys(PAIR_COLORS);

/** Color por defecto para las 5 parejas iniciales. */
export const DEFAULT_PAIR_COLORS = ["emerald", "sky", "violet", "rose", "amber"];

/** Puntos por posición final en un deporte. */
export const SPORT_POINTS = { champion: 3, runnerUp: 2, third: 1 } as const;

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Mundial 2026";

// Si no se define NEXT_PUBLIC_ADMIN_EMAILS, el dueño del proyecto queda como
// administrador por defecto para que pueda inicializar el torneo.
export const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS || "ferbarjim2000@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
