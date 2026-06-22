"use client";
// =====================================================================
//  Podio y tabla de clasificación general
// =====================================================================
import { Crown } from "lucide-react";
import type { GeneralRow, Pair, Player } from "@/lib/types";
import { cn, pairColor, pairInitials, pairMembers } from "@/lib/helpers";
import { PairBadge } from "./ui";

const MEDAL = ["#fbbf24", "#cbd5e1", "#d97706"]; // oro, plata, bronce

export function Podium({
  rows,
  pairs,
  players,
}: {
  rows: GeneralRow[];
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
}) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  // Orden visual: 2º, 1º, 3º
  const order = [top[1], top[0], top[2]].filter(Boolean) as GeneralRow[];
  const heights: Record<number, string> = { 1: "h-28", 2: "h-20", 3: "h-16" };

  return (
    <div className="mb-2 flex items-end justify-center gap-2.5">
      {order.map((row) => {
        const pair = pairs.get(row.pairId);
        const c = pairColor(pair?.color);
        const isFirst = row.rank === 1;
        return (
          <div key={row.pairId} className="flex flex-1 flex-col items-center">
            {isFirst && <Crown className="mb-1 h-5 w-5 text-gold drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />}
            <PairBadge
              colorKey={pair?.color}
              initials={pairInitials(pair, players)}
              size={isFirst ? 60 : 46}
            />
            <p className="mt-1.5 line-clamp-1 text-center text-xs font-bold text-white">
              {pair?.name ?? "—"}
            </p>
            <p className="line-clamp-1 text-center text-[10px] text-slate-400">
              {pairMembers(pair, players)}
            </p>
            <div
              className={cn(
                "mt-1.5 flex w-full items-start justify-center rounded-t-xl pt-2 font-extrabold tabular",
                heights[row.rank]
              )}
              style={{
                backgroundImage: `linear-gradient(180deg, ${c.from}40, ${c.from}10)`,
                borderTop: `2px solid ${MEDAL[row.rank - 1]}`,
              }}
            >
              <div className="text-center">
                <div className="text-lg" style={{ color: MEDAL[row.rank - 1] }}>
                  {row.rank}º
                </div>
                <div className="text-xs text-slate-300">{row.points} pts</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function GeneralTable({
  rows,
  pairs,
  players,
}: {
  rows: GeneralRow[];
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
}) {
  return (
    <div className="card divide-y divide-white/5 overflow-hidden p-0">
      {rows.map((row) => {
        const pair = pairs.get(row.pairId);
        const podium = row.rank <= 3 && row.points > 0;
        return (
          <div
            key={row.pairId}
            className={cn(
              "flex items-center gap-3 px-3.5 py-3",
              podium && "bg-white/[0.03]"
            )}
          >
            <span
              className="w-5 shrink-0 text-center text-sm font-bold tabular"
              style={{ color: podium ? MEDAL[row.rank - 1] : "#64748b" }}
            >
              {row.rank}
            </span>
            <PairBadge colorKey={pair?.color} initials={pairInitials(pair, players)} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{pair?.name ?? "—"}</p>
              <p className="truncate text-xs text-slate-400">{pairMembers(pair, players)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {row.gold > 0 && <Medal emoji="🥇" n={row.gold} />}
              {row.silver > 0 && <Medal emoji="🥈" n={row.silver} />}
              {row.bronze > 0 && <Medal emoji="🥉" n={row.bronze} />}
            </div>
            <div className="ml-1 w-12 shrink-0 text-right">
              <span className="text-xl font-extrabold tabular text-white">{row.points}</span>
              <span className="block text-[10px] uppercase tracking-wide text-slate-500">pts</span>
            </div>
          </div>
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
