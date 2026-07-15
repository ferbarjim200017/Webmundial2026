"use client";
// =====================================================================
//  Componentes de un deporte: tarjeta, fase de grupos y cuadro final
// =====================================================================
import { useState } from "react";
import Link from "next/link";
import { Pencil, ChevronRight, Crown, Trophy, Sparkles } from "lucide-react";
import type { Pair, Player, Sport, SportStatus, GroupMatch } from "@/lib/types";
import {
  byId,
  cn,
  pairColor,
  pairInitials,
  pairMembers,
  playerName,
} from "@/lib/helpers";
import {
  computeGroupTable,
  computeSportResult,
  computeIndividualGeneral,
  grandFinalPairing,
  resolveBracket,
  resolveKnockout,
  normalizeKnockout,
  pairMatchesInSport,
  type BracketMatch,
  type BracketView,
} from "@/lib/tournament";
import {
  setGroupResult,
  setKnockoutResult,
  useGrandFinal,
  setGrandFinalKnockoutResult,
} from "@/lib/db";
import { PairBadge, Modal, PhotoLightbox } from "./ui";

// ---------- Estado visual ----------
export function statusBadge(status: SportStatus) {
  const map: Record<SportStatus, { text: string; cls: string }> = {
    setup: { text: "Sin configurar", cls: "bg-slate-500/15 text-slate-300" },
    group: { text: "Fase de grupos", cls: "bg-sky-500/15 text-sky-300" },
    knockout: { text: "Eliminatorias", cls: "bg-amber-500/15 text-amber-300" },
    finished: { text: "Finalizado", cls: "bg-brand-500/15 text-brand-300" },
  };
  return map[status];
}

// ---------- Tarjeta de deporte (listado) ----------
export function SportCard({
  sport,
  pairs,
  players,
}: {
  sport: Sport;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
}) {
  const pairIds = [...pairs.keys()];
  const res = computeSportResult(sport, pairIds);
  const badge = statusBadge(res.status);
  const champ = res.championPairId ? pairs.get(res.championPairId) : null;

  return (
    <Link
      href={`/deportes/${sport.id}`}
      className="card group flex items-center gap-3.5 p-4 transition hover:border-brand-400/40"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] text-[28px] ring-1 ring-white/10 transition group-hover:scale-105 group-hover:ring-brand-400/40">
        {sport.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-bold text-white">{sport.name}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn("chip", badge.cls)}>{badge.text}</span>
          {champ && (
            <span className="flex items-center gap-1 truncate text-xs text-slate-400">
              <Crown className="h-3 w-3 text-gold" /> {champ.name}
            </span>
          )}
        </div>
      </div>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 transition group-hover:bg-brand-500/15 group-hover:ring-brand-400/40">
        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-brand-300" />
      </span>
    </Link>
  );
}

// ---------- Etiqueta de pareja ----------
function PairTag({
  pairId,
  pairs,
  players,
  reverse,
  dim,
}: {
  pairId: string | null;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  reverse?: boolean;
  dim?: boolean;
}) {
  const pair = pairId ? pairs.get(pairId) : undefined;
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        reverse && "flex-row-reverse text-right",
        dim && "opacity-45"
      )}
    >
      <PairBadge colorKey={pair?.color} initials={pair ? pairInitials(pair, players) : "?"} size={30} photoUrl={pair?.photo} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{pair?.name ?? "Pendiente"}</p>
        <p className="truncate text-[10px] text-slate-400">{pair ? pairMembers(pair, players) : "—"}</p>
      </div>
    </div>
  );
}

// =====================================================================
//  Fase de grupos
// =====================================================================
export function GroupStandings({
  sport,
  pairs,
  players,
  onPairClick,
}: {
  sport: Sport;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  onPairClick?: (pairId: string) => void;
}) {
  const pairIds = [...pairs.keys()];
  const table = computeGroupTable(sport, pairIds);

  return (
    <div className="card overflow-hidden p-0">
      <div className="grid grid-cols-[1.4rem_1fr_repeat(4,1.6rem)_2rem] items-center gap-1 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="text-center">#</span>
        <span>Pareja</span>
        <span className="text-center">PJ</span>
        <span className="text-center">G</span>
        <span className="text-center">P</span>
        <span className="text-center">DG</span>
        <span className="text-center text-slate-300">Pts</span>
      </div>
      {table.map((row) => {
        const pair = pairs.get(row.pairId);
        return (
          <button
            key={row.pairId}
            type="button"
            onClick={() => onPairClick?.(row.pairId)}
            className={cn(
              "grid w-full grid-cols-[1.4rem_1fr_repeat(4,1.6rem)_2rem] items-center gap-1 border-b border-white/5 px-3 py-2.5 text-left text-xs transition last:border-0 hover:bg-white/[0.04] active:bg-white/[0.06]",
              row.qualified ? "bg-brand-500/[0.06]" : "bg-rose-500/[0.05]"
            )}
          >
            <span
              className={cn(
                "text-center font-bold tabular",
                row.qualified ? "text-brand-300" : "text-rose-300"
              )}
            >
              {row.rank}
            </span>
            <div className="flex min-w-0 items-center gap-2">
              <PairBadge colorKey={pair?.color} initials={pair ? pairInitials(pair, players) : "?"} size={26} photoUrl={pair?.photo} />
              <span className="truncate font-semibold text-white">{pair?.name ?? "—"}</span>
            </div>
            <span className="text-center tabular text-slate-300">{row.played}</span>
            <span className="text-center tabular text-slate-300">{row.won}</span>
            <span className="text-center tabular text-slate-300">{row.lost}</span>
            <span className="text-center tabular text-slate-300">
              {row.diff > 0 ? `+${row.diff}` : row.diff}
            </span>
            <span className="text-center font-extrabold tabular text-white">{row.points}</span>
          </button>
        );
      })}
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-400" /> Clasifican (4)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-400" /> Eliminada
        </span>
      </div>
    </div>
  );
}

export function GroupMatches({
  sport,
  pairs,
  players,
  isAdmin,
}: {
  sport: Sport;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  isAdmin: boolean;
}) {
  const matches = sport.group?.matches ?? [];
  if (matches.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
        Aún no se ha generado la fase de grupos.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <LeagueMatchRow
          key={m.id}
          match={m}
          pairs={pairs}
          players={players}
          isAdmin={isAdmin}
          onSave={(h, a) => setGroupResult(sport, m.id, h, a)}
          onClear={() => setGroupResult(sport, m.id, null, null)}
        />
      ))}
    </div>
  );
}

/** Fila de partido de liga (grupos o desempate) con edición de admin. */
export function LeagueMatchRow({
  match,
  pairs,
  players,
  isAdmin,
  onSave,
  onClear,
}: {
  match: GroupMatch;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  isAdmin: boolean;
  onSave: (h: number, a: number) => Promise<void> | void;
  onClear: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const home = pairs.get(match.homePairId);
  const away = pairs.get(match.awayPairId);
  const homeWin = match.played && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWin = match.played && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <>
      <button
        disabled={!isAdmin}
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl border border-white/10 bg-ink-850/60 px-3 py-2.5",
          isAdmin && "transition hover:border-brand-400/40 hover:bg-white/5"
        )}
      >
        <div className={cn("flex flex-1 justify-end", !homeWin && match.played && "opacity-60")}>
          <PairTag pairId={match.homePairId} pairs={pairs} players={players} reverse />
        </div>
        <div className="flex w-[68px] shrink-0 items-center justify-center gap-1">
          {match.played ? (
            <span className="tabular text-base font-extrabold text-white">
              <span className={cn(homeWin && "text-brand-300")}>{match.homeScore}</span>
              <span className="mx-1 text-slate-500">·</span>
              <span className={cn(awayWin && "text-brand-300")}>{match.awayScore}</span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500">vs</span>
          )}
        </div>
        <div className={cn("flex flex-1 justify-start", !awayWin && match.played && "opacity-60")}>
          <PairTag pairId={match.awayPairId} pairs={pairs} players={players} />
        </div>
        {isAdmin && <Pencil className="ml-1 h-3.5 w-3.5 shrink-0 text-slate-500" />}
      </button>

      {isAdmin && (
        <ScoreEditor
          open={open}
          onClose={() => setOpen(false)}
          title={`${home?.name ?? "?"} vs ${away?.name ?? "?"}`}
          homeName={home?.name ?? "Local"}
          awayName={away?.name ?? "Visitante"}
          homeColor={home?.color}
          awayColor={away?.color}
          initialHome={match.homeScore}
          initialAway={match.awayScore}
          onSave={async (h, a) => {
            await onSave(h, a);
          }}
          onClear={async () => {
            await onClear();
          }}
        />
      )}
    </>
  );
}

// =====================================================================
//  Cuadro eliminatorio
// =====================================================================
export function BracketSection({
  sport,
  pairs,
  players,
  isAdmin,
  onPairClick,
}: {
  sport: Sport;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  isAdmin: boolean;
  onPairClick?: (pairId: string) => void;
}) {
  const pairIds = [...pairs.keys()];
  const bracket = resolveBracket(sport, pairIds);
  const res = computeSportResult(sport, pairIds);

  return (
    <div className="space-y-4">
      {res.status === "finished" && (
        <ChampionBanner pairId={res.championPairId} title={`Campeón de ${sport.name}`} pairs={pairs} players={players} />
      )}
      <KnockoutBoard
        bracket={bracket}
        pairs={pairs}
        players={players}
        isAdmin={isAdmin}
        onPairClick={onPairClick}
        onSave={(key, h, a, w) => setKnockoutResult(sport.id, key, h, a, w)}
        onClear={(key) => setKnockoutResult(sport.id, key, null, null, null)}
      />
    </div>
  );
}

/** Cuadro eliminatorio genérico (deportes y Gran Final). */
export function KnockoutBoard({
  bracket,
  pairs,
  players,
  isAdmin,
  onPairClick,
  onSave,
  onClear,
}: {
  bracket: BracketView;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  isAdmin: boolean;
  onPairClick?: (pairId: string) => void;
  onSave: (
    key: "sf1" | "sf2" | "final" | "third",
    h: number,
    a: number,
    w: "home" | "away" | null
  ) => Promise<void> | void;
  onClear: (key: "sf1" | "sf2" | "final" | "third") => Promise<void> | void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semifinales</p>
        <KnockoutRow label="SF1 · 1º vs 4º" match={bracket.sf1} pairs={pairs} players={players} isAdmin={isAdmin} onPairClick={onPairClick} onSave={(h, a, w) => onSave("sf1", h, a, w)} onClear={() => onClear("sf1")} />
        <KnockoutRow label="SF2 · 2º vs 3º" match={bracket.sf2} pairs={pairs} players={players} isAdmin={isAdmin} onPairClick={onPairClick} onSave={(h, a, w) => onSave("sf2", h, a, w)} onClear={() => onClear("sf2")} />
      </div>
      <div className="grid grid-cols-1 gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Final y 3er puesto</p>
        <KnockoutRow label="🏆 Final" match={bracket.final} pairs={pairs} players={players} isAdmin={isAdmin} onPairClick={onPairClick} onSave={(h, a, w) => onSave("final", h, a, w)} onClear={() => onClear("final")} highlight />
        <KnockoutRow label="🥉 3er puesto" match={bracket.third} pairs={pairs} players={players} isAdmin={isAdmin} onPairClick={onPairClick} onSave={(h, a, w) => onSave("third", h, a, w)} onClear={() => onClear("third")} />
      </div>
    </div>
  );
}

function KnockoutRow({
  label,
  match,
  pairs,
  players,
  isAdmin,
  onPairClick,
  onSave,
  onClear,
  highlight,
}: {
  label: string;
  match: BracketMatch;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
  isAdmin: boolean;
  onPairClick?: (pairId: string) => void;
  onSave: (h: number, a: number, w: "home" | "away" | null) => Promise<void> | void;
  onClear: () => Promise<void> | void;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ready = Boolean(match.homePairId && match.awayPairId);
  const home = match.homePairId ? pairs.get(match.homePairId) : undefined;
  const away = match.awayPairId ? pairs.get(match.awayPairId) : undefined;
  const homeWin = match.winnerSide === "home";
  const awayWin = match.winnerSide === "away";

  return (
    <>
      <div
        className={cn(
          "rounded-xl border px-3 py-2.5",
          highlight ? "border-gold/30 bg-gold/[0.05]" : "border-white/10 bg-ink-850/60"
        )}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
          {isAdmin && ready && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-brand-300 transition hover:bg-white/10"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!match.homePairId}
            onClick={() => match.homePairId && onPairClick?.(match.homePairId)}
            className={cn(
              "flex flex-1 justify-end rounded-lg p-0.5 transition disabled:cursor-default",
              match.homePairId && "hover:bg-white/5 active:bg-white/10",
              match.played && !homeWin && "opacity-55"
            )}
          >
            <PairTag pairId={match.homePairId} pairs={pairs} players={players} reverse dim={!match.homePairId} />
          </button>
          <div className="flex w-[68px] shrink-0 items-center justify-center">
            {match.played ? (
              <span className="tabular text-base font-extrabold text-white">
                <span className={cn(homeWin && "text-brand-300")}>{match.homeScore}</span>
                <span className="mx-1 text-slate-500">·</span>
                <span className={cn(awayWin && "text-brand-300")}>{match.awayScore}</span>
              </span>
            ) : (
              <span className="text-xs font-semibold text-slate-500">vs</span>
            )}
          </div>
          <button
            type="button"
            disabled={!match.awayPairId}
            onClick={() => match.awayPairId && onPairClick?.(match.awayPairId)}
            className={cn(
              "flex flex-1 justify-start rounded-lg p-0.5 transition disabled:cursor-default",
              match.awayPairId && "hover:bg-white/5 active:bg-white/10",
              match.played && !awayWin && "opacity-55"
            )}
          >
            <PairTag pairId={match.awayPairId} pairs={pairs} players={players} dim={!match.awayPairId} />
          </button>
        </div>
      </div>

      {isAdmin && ready && (
        <ScoreEditor
          open={open}
          onClose={() => setOpen(false)}
          title={label.replace(/^[^\w]+\s?/, "")}
          homeName={home?.name ?? "Local"}
          awayName={away?.name ?? "Visitante"}
          homeColor={home?.color}
          awayColor={away?.color}
          initialHome={match.homeScore}
          initialAway={match.awayScore}
          allowWinnerPick
          initialWinner={match.winnerSide ?? null}
          onSave={async (h, a, w) => {
            await onSave(h, a, w);
          }}
          onClear={async () => {
            await onClear();
          }}
        />
      )}
    </>
  );
}

function ChampionBanner({
  pairId,
  title,
  big,
  pairs,
  players,
}: {
  pairId: string | null;
  title: string;
  big?: boolean;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
}) {
  const champ = pairId ? pairs.get(pairId) : null;
  if (!champ) return null;
  const c = pairColor(champ.color);
  return (
    <div
      className="shine relative overflow-hidden rounded-2xl border border-gold/40 p-4 text-center shadow-gold"
      style={{ backgroundImage: `linear-gradient(135deg, ${c.from}30, rgba(251,191,36,0.06))` }}
    >
      <Trophy className={cn("mx-auto mb-1 animate-float text-gold drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]", big ? "h-10 w-10" : "h-7 w-7")} />
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gold">{title}</p>
      <p className={cn("mt-1 font-display font-extrabold", big ? "text-3xl text-gradient-gold" : "text-xl text-white")}>{champ.name}</p>
      <p className="mt-0.5 text-xs text-slate-300">{pairMembers(champ, players)}</p>
    </div>
  );
}

// =====================================================================
//  Modal con los partidos de una pareja en un deporte
// =====================================================================
export function PairResultsModal({
  open,
  onClose,
  sport,
  pairId,
  pairs,
  players,
}: {
  open: boolean;
  onClose: () => void;
  sport: Sport | null;
  pairId: string | null;
  pairs: Map<string, Pair>;
  players: Map<string, Player>;
}) {
  const pair = pairId ? pairs.get(pairId) : undefined;
  const pairIds = [...pairs.keys()];
  const matches = sport && pairId ? pairMatchesInSport(sport, pairId, pairIds) : [];
  const wins = matches.filter((m) => m.outcome === "win").length;
  const losses = matches.filter((m) => m.outcome === "loss").length;
  const played = matches.filter((m) => m.played).length;
  const [viewer, setViewer] = useState(false);

  return (
    <Modal open={open && !!pair} onClose={onClose} title={pair?.name ?? "Pareja"}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => pair?.photo && setViewer(true)} className="shrink-0" disabled={!pair?.photo}>
            <PairBadge colorKey={pair?.color} initials={pair ? pairInitials(pair, players) : "?"} size={44} photoUrl={pair?.photo} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{pairMembers(pair, players)}</p>
            <p className="text-xs text-slate-400">
              {sport?.emoji} {sport?.name}
              {played > 0 && <span className="ml-1">· {wins}G · {losses}P</span>}
            </p>
          </div>
        </div>
        <PhotoLightbox open={viewer} onClose={() => setViewer(false)} src={pair?.photo} title={pair?.name} subtitle={pairMembers(pair, players)} />

        <div className="space-y-2">
          {matches.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
              Esta pareja no tiene partidos en este deporte.
            </p>
          ) : (
            matches.map((m, i) => {
              const opp = m.opponentPairId ? pairs.get(m.opponentPairId) : undefined;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2.5"
                >
                  <span className="chip shrink-0 bg-white/5 text-[10px] text-slate-300">{m.phase}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                    vs <span className="font-semibold text-white">{opp?.name ?? "Pendiente"}</span>
                  </span>
                  {m.played ? (
                    <span className="tabular text-sm font-extrabold text-white">
                      {m.ownScore} · {m.oppScore}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                  <OutcomeChip outcome={m.outcome} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

function OutcomeChip({ outcome }: { outcome: "win" | "loss" | "draw" | "pending" }) {
  if (outcome === "pending") return <span className="w-5 shrink-0" />;
  const map = {
    win: { t: "G", cls: "bg-brand-500/15 text-brand-300" },
    loss: { t: "P", cls: "bg-rose-500/15 text-rose-300" },
    draw: { t: "E", cls: "bg-slate-500/20 text-slate-300" },
  } as const;
  const c = map[outcome];
  return (
    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", c.cls)}>
      {c.t}
    </span>
  );
}

// =====================================================================
//  Editor de resultado (modal)
// =====================================================================
function ScoreEditor({
  open,
  onClose,
  title,
  homeName,
  awayName,
  homeColor,
  awayColor,
  initialHome,
  initialAway,
  allowWinnerPick,
  initialWinner,
  onSave,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  initialHome: number | null;
  initialAway: number | null;
  allowWinnerPick?: boolean;
  initialWinner?: "home" | "away" | null;
  onSave: (home: number, away: number, winner: "home" | "away" | null) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [home, setHome] = useState(initialHome?.toString() ?? "");
  const [away, setAway] = useState(initialAway?.toString() ?? "");
  const [winner, setWinner] = useState<"home" | "away" | null>(initialWinner ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hc = pairColor(homeColor);
  const ac = pairColor(awayColor);

  const tie = home !== "" && away !== "" && Number(home) === Number(away);
  const needWinner = Boolean(allowWinnerPick) && tie;

  const save = async () => {
    setErr(null);
    if (home === "" || away === "") {
      setErr("Rellena ambos marcadores.");
      return;
    }
    const h = Math.max(0, Math.floor(Number(home)));
    const a = Math.max(0, Math.floor(Number(away)));
    if (Number.isNaN(h) || Number.isNaN(a)) {
      setErr("Marcadores no válidos.");
      return;
    }
    if (needWinner && !winner) {
      setErr("En caso de empate, marca quién pasa.");
      return;
    }
    setBusy(true);
    try {
      await onSave(h, a, tie ? winner : null);
      onClose();
    } catch (e) {
      setErr("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      await onClear();
      setHome("");
      setAway("");
      setWinner(null);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <ScoreInput name={homeName} color={hc} value={home} onChange={setHome} />
          <span className="pt-6 text-2xl font-bold text-slate-500">·</span>
          <ScoreInput name={awayName} color={ac} value={away} onChange={setAway} align="right" />
        </div>

        {needWinner && (
          <div>
            <p className="mb-2 text-center text-xs text-amber-300">Empate — ¿quién pasa de ronda?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWinner("home")}
                className={cn("btn-ghost", winner === "home" && "border-brand-400 bg-brand-500/15 text-brand-200")}
              >
                {homeName}
              </button>
              <button
                onClick={() => setWinner("away")}
                className={cn("btn-ghost", winner === "away" && "border-brand-400 bg-brand-500/15 text-brand-200")}
              >
                {awayName}
              </button>
            </div>
          </div>
        )}

        {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}

        <div className="flex gap-2">
          <button onClick={clear} disabled={busy} className="btn-danger flex-1">
            Limpiar
          </button>
          <button onClick={save} disabled={busy} className="btn-primary flex-[2]">
            Guardar resultado
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ScoreInput({
  name,
  color,
  value,
  onChange,
  align,
}: {
  name: string;
  color: { from: string; to: string };
  value: string;
  onChange: (v: string) => void;
  align?: "right";
}) {
  return (
    <div className={cn("flex-1", align === "right" && "text-right")}>
      <p className="mb-1 line-clamp-1 text-xs font-semibold text-slate-300">{name}</p>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-ink-900 py-3 text-center text-2xl font-extrabold tabular text-white outline-none focus:ring-2 focus:ring-brand-500/40"
        style={{ caretColor: color.from }}
        placeholder="0"
      />
    </div>
  );
}

// =====================================================================
//  Gran Final
// =====================================================================
export function GrandFinal({
  sports,
  pairs,
  players,
  isAdmin,
}: {
  sports: Sport[];
  pairs: Pair[];
  players: Map<string, Player>;
  isAdmin: boolean;
}) {
  const { data: gf, loading } = useGrandFinal();

  const playerIds = [...players.keys()];
  const general = computeIndividualGeneral(sports, pairs, playerIds);
  const hasPoints = general.some((r) => r.points > 0);
  const allFinished =
    sports.length > 0 &&
    sports.every((s) => {
      const sp = pairs.filter((p) => p.sportId === s.id).map((p) => p.id);
      return computeSportResult(s, sp).status === "finished";
    });

  // 4 parejas automáticas con los 8 mejores: (1º,2º)(3º,4º)(5º,6º)(7º,8º)
  const gfColors = ["emerald", "sky", "violet", "amber"];
  const gfPairs: Pair[] = grandFinalPairing(general).map((duo, i) => ({
    id: `gf${i}`,
    sportId: "grandFinal",
    name: `${playerName(players, duo[0])} & ${playerName(players, duo[1])}`,
    player1Id: duo[0],
    player2Id: duo[1],
    color: gfColors[i] ?? "emerald",
    order: i,
  }));
  const gfMap = byId(gfPairs);
  const bracket = resolveKnockout(
    normalizeKnockout(gf?.knockout),
    gfPairs.map((p) => p.id)
  );

  if (loading) return null;

  const Header = (
    <div className="mb-1 flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-gold" />
      <h2 className="text-lg font-extrabold tracking-tight text-white">Gran Final</h2>
    </div>
  );

  if (!hasPoints) {
    return (
      <div>
        {Header}
        <div className="card mt-2 p-4 text-center">
          <div className="mb-1 text-3xl">👑</div>
          <p className="text-sm text-slate-400">
            Cuando los deportes repartan puntos, los 8 mejores formarán 4 parejas y lucharán aquí por el gran título.
          </p>
        </div>
      </div>
    );
  }

  if (!allFinished) {
    return (
      <div>
        {Header}
        <p className="mb-2 text-xs text-slate-400">
          La Gran Final se juega al terminar todos los deportes. Con la clasificación actual, las parejas serían:
        </p>
        <GfPairsList pairs={gfPairs} players={players} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Header}
      <p className="text-xs text-slate-400">
        Parejas formadas con los 8 mejores de la general: 1º+2º, 3º+4º, 5º+6º y 7º+8º.
      </p>
      {gfPairs.length < 4 ? (
        <div className="card p-4 text-center text-sm text-slate-400">
          Hacen falta al menos 8 jugadores con puntos para formar las parejas.
        </div>
      ) : (
        <>
          <GfPairsList pairs={gfPairs} players={players} />
          {bracket.final.winnerPairId && (
            <ChampionBanner pairId={bracket.final.winnerPairId} title="🏆 Gran Campeón" big pairs={gfMap} players={players} />
          )}
          <KnockoutBoard
            bracket={bracket}
            pairs={gfMap}
            players={players}
            isAdmin={isAdmin}
            onSave={(key, h, a, w) => setGrandFinalKnockoutResult(key, h, a, w)}
            onClear={(key) => setGrandFinalKnockoutResult(key, null, null, null)}
          />
        </>
      )}
    </div>
  );
}

function GfPairsList({ pairs, players }: { pairs: Pair[]; players: Map<string, Player> }) {
  return (
    <div className="card p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Parejas de la Gran Final
      </p>
      <div className="space-y-1.5">
        {pairs.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-center text-xs font-bold text-gold">{i + 1}º</span>
            <PairBadge colorKey={p.color} initials={pairInitials(p, players)} size={26} />
            <span className="truncate text-sm font-semibold text-white">{pairMembers(p, players)}</span>
          </div>
        ))}
        {pairs.length === 0 && <p className="text-xs text-slate-500">Aún no hay clasificación.</p>}
      </div>
    </div>
  );
}
