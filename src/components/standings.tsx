"use client";
// =====================================================================
//  Podio y tabla de clasificación general (individual, por jugador)
// =====================================================================
import { Crown } from "lucide-react";
import type { Player, PlayerRow } from "@/lib/types";
import { cn, pairColor, playerName } from "@/lib/helpers";
import { PAIR_COLOR_KEYS } from "@/lib/constants";
import { PlayerBadge } from "./ui";

const MEDAL = ["#fbbf24", "#cbd5e1", "#d97706"]; // oro, plata, bronce

/** Color estable para cada jugador según su orden. */
function playerColorKey(players: Map<string, Player>, id: string): string {
  const order = players.get(id)?.order ?? 0;
  return PAIR_COLOR_KEYS[order % PAIR_COLOR_KEYS.length];
}

export function Podium({
  rows,
  players,
  onPlayerClick,
}: {
  rows: PlayerRow[];
  players: Map<string, Player>;
  onPlayerClick?: (playerId: string) => void;
}) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  const order = [top[1], top[0], top[2]].filter(Boolean) as PlayerRow[];
  const heights: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" };

  return (
    <div className="mb-2 flex items-end justify-center gap-2.5">
      {order.map((row) => {
        const c = pairColor(playerColorKey(players, row.playerId));
        const isFirst = row.rank === 1;
        return (
          <button
            key={row.playerId}
            type="button"
            disabled={!onPlayerClick}
            onClick={() => onPlayerClick?.(row.playerId)}
            className="flex flex-1 flex-col items-center transition enabled:hover:-translate-y-0.5 disabled:cursor-default"
          >
            {isFirst && (
              <Crown className="mb-1 h-6 w-6 animate-float text-gold drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            )}
            <div className={cn("relative", isFirst && "drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]")}>
              <PlayerBadge
                name={playerName(players, row.playerId)}
                colorKey={playerColorKey(players, row.playerId)}
                size={isFirst ? 64 : 46}
              />
            </div>
            <p className="mt-1.5 line-clamp-1 text-center text-xs font-bold text-white">
              {playerName(players, row.playerId)}
            </p>
            <div
              className={cn(
                "relative mt-1.5 flex w-full items-start justify-center overflow-hidden rounded-t-xl pt-2 font-extrabold tabular",
                heights[row.rank],
                isFirst && "shine"
              )}
              style={{
                backgroundImage: `linear-gradient(180deg, ${c.from}4d, ${c.from}0d)`,
                borderTop: `2px solid ${MEDAL[row.rank - 1]}`,
                boxShadow: isFirst ? "0 -12px 30px -12px rgba(251,191,36,0.35)" : undefined,
              }}
            >
              <div className="text-center">
                <div className="font-display text-xl leading-none" style={{ color: MEDAL[row.rank - 1] }}>
                  {row.rank}º
                </div>
                <div className="mt-1 font-display text-sm text-white">
                  {row.points}
                  <span className="ml-0.5 text-[10px] font-semibold text-slate-400">pts</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function GeneralTable({
  rows,
  players,
  onPlayerClick,
}: {
  rows: PlayerRow[];
  players: Map<string, Player>;
  onPlayerClick?: (playerId: string) => void;
}) {
  return (
    <div className="card divide-y divide-white/5 overflow-hidden p-0">
      {rows.map((row) => {
        const podium = row.rank <= 3 && row.points > 0;
        return (
          <button
            key={row.playerId}
            type="button"
            onClick={() => onPlayerClick?.(row.playerId)}
            className={cn(
              "flex w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.05] active:bg-white/[0.07]",
              podium && "bg-white/[0.03]"
            )}
            style={podium ? { boxShadow: `inset 3px 0 0 ${MEDAL[row.rank - 1]}` } : undefined}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular",
                podium ? "bg-white/5 font-display" : ""
              )}
              style={{ color: podium ? MEDAL[row.rank - 1] : "#64748b" }}
            >
              {row.rank}
            </span>
            <PlayerBadge
              name={playerName(players, row.playerId)}
              colorKey={playerColorKey(players, row.playerId)}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {playerName(players, row.playerId)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {row.gold > 0 && <Medal emoji="🥇" n={row.gold} />}
              {row.silver > 0 && <Medal emoji="🥈" n={row.silver} />}
              {row.bronze > 0 && <Medal emoji="🥉" n={row.bronze} />}
            </div>
            <div className="ml-1 w-12 shrink-0 text-right">
              <span className="font-display text-xl font-extrabold tabular text-white">{row.points}</span>
              <span className="block text-[10px] uppercase tracking-wide text-slate-500">pts</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Medal({ emoji, n }: { emoji: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <span>{emoji}</span>
      <span className="tabular text-slate-300">{n}</span>
    </span>
  );
}
