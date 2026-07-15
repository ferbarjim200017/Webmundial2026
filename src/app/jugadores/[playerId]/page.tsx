"use client";
import { use, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Flame, Snowflake, Trophy } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { FullScreenLoader, EmptyState, PlayerBadge } from "@/components/ui";
import { PlayerProgressChart } from "@/components/player";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId, cn, playerName } from "@/lib/helpers";
import { PAIR_COLOR_KEYS } from "@/lib/constants";
import { computeIndividualGeneral, computePlayerProfile } from "@/lib/tournament";
import type { MatchOutcome } from "@/lib/types";

export default function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = use(params);
  return (
    <Protected>
      <PlayerProfileView playerId={playerId} />
    </Protected>
  );
}

function PlayerProfileView({ playerId }: { playerId: string }) {
  const { data: players, loading: lpl } = usePlayers();
  const { data: pairs, loading: lpairs } = usePairs();
  const { data: sports, loading: ls } = useSports();

  if (lpl || lpairs || ls) return <FullScreenLoader />;

  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Jugador no encontrado" hint="Puede que ya no exista." />
      </div>
    );
  }

  const playersMap = byId(players);
  const general = computeIndividualGeneral(sports, pairs, players.map((p) => p.id));
  const rank = general.find((r) => r.playerId === playerId)?.rank ?? 0;
  const profile = computePlayerProfile(sports, pairs, playerId);
  const colorKey = PAIR_COLOR_KEYS[(player.order ?? 0) % PAIR_COLOR_KEYS.length];

  return (
    <div className="space-y-4 animate-fade-up">
      <BackLink />

      {/* Cabecera */}
      <div className="card flex items-center gap-4 p-4">
        <div className="relative">
          <PlayerBadge name={player.name} colorKey={colorKey} size={64} />
          {rank === 1 && profile.totalPoints > 0 && (
            <Crown className="absolute -top-3 left-1/2 h-5 w-5 -translate-x-1/2 text-gold drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-white">
            {player.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {rank > 0 && (
              <span className="chip bg-white/5 text-slate-300">#{rank} general</span>
            )}
            {profile.gold > 0 && <span className="chip bg-gold/10 text-gold">🥇 {profile.gold}</span>}
            {profile.silver > 0 && <span className="chip bg-white/5 text-slate-200">🥈 {profile.silver}</span>}
            {profile.bronze > 0 && <span className="chip bg-bronze/10 text-bronze">🥉 {profile.bronze}</span>}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-display text-3xl font-extrabold tabular text-white">{profile.totalPoints}</p>
          <p className="text-[10px] uppercase tracking-wide text-slate-500">puntos</p>
        </div>
      </div>

      {/* Tiles de estadísticas */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Partidos" value={profile.played} hint={`${profile.won}G · ${profile.drawn}E · ${profile.lost}P`} />
        <StatTile label="Victorias" value={`${profile.winRate}%`} hint={`${profile.won} de ${profile.played}`} accent />
        <StatTile label="Podios" value={profile.podiums} hint={`en ${profile.perSport.length} deporte${profile.perSport.length === 1 ? "" : "s"}`} />
        <StatTile
          label="Mejor deporte"
          value={profile.bestSport ? profile.bestSport.emoji : "—"}
          hint={profile.bestSport ? `${profile.bestSport.name} · +${profile.bestSport.points}` : "sin podios aún"}
        />
      </div>

      {/* Racha + forma reciente */}
      {profile.played > 0 && (
        <div className="card flex items-center gap-3 p-3.5">
          <StreakBadge streak={profile.streak} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-300">Forma reciente</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {profile.form.slice(-10).map((o, i) => (
                <FormChip key={i} outcome={o} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gráfica de evolución */}
      <div className="card p-4">
        <div className="mb-1 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-brand-300" />
          <h2 className="font-display text-base font-bold text-white">Evolución de puntos</h2>
        </div>
        <p className="mb-3 text-xs text-slate-400">Puntos acumulados a lo largo de los deportes.</p>
        <PlayerProgressChart data={profile.perSport} />
      </div>

      {/* Desglose por deporte (hace de tabla accesible de la gráfica) */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Deporte a deporte
        </p>
        {profile.perSport.length === 0 ? (
          <div className="card p-4 text-center text-sm text-slate-400">Aún no hay deportes.</div>
        ) : (
          <div className="space-y-2">
            {profile.perSport.map((s) => {
              const medalEmoji = s.medal === "gold" ? "🥇" : s.medal === "silver" ? "🥈" : s.medal === "bronze" ? "🥉" : "";
              return (
                <Link
                  key={s.sportId}
                  href={`/deportes/${s.sportId}`}
                  className="card flex items-center gap-3 p-3 transition hover:border-brand-400/40 hover:bg-white/5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                    {s.sportEmoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{s.sportName}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {s.partnerIds.length
                        ? `con ${s.partnerIds.map((id) => playerName(playersMap, id)).join(" y ")}`
                        : "no participa"}
                      {s.played > 0 && <span className="text-slate-500"> · {s.won}G · {s.drawn}E · {s.lost}P</span>}
                    </p>
                  </div>
                  {medalEmoji && <span className="text-lg">{medalEmoji}</span>}
                  <span
                    className={cn(
                      "w-9 text-right font-display text-base font-bold tabular",
                      s.points > 0 ? "text-brand-300" : "text-slate-600"
                    )}
                  >
                    +{s.points}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-0.5 font-display text-2xl font-extrabold tabular", accent ? "text-brand-300" : "text-white")}>
        {value}
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function StreakBadge({ streak }: { streak: { type: MatchOutcome | null; count: number } }) {
  if (!streak.type || streak.count === 0) {
    return (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-500">
        —
      </span>
    );
  }
  const map: Record<MatchOutcome, { icon: ReactNode; cls: string; word: string }> = {
    win: { icon: <Flame className="h-4 w-4" />, cls: "bg-brand-500/15 text-brand-300", word: streak.count === 1 ? "victoria" : "victorias" },
    loss: { icon: <Snowflake className="h-4 w-4" />, cls: "bg-rose-500/15 text-rose-300", word: streak.count === 1 ? "derrota" : "derrotas" },
    draw: { icon: null, cls: "bg-slate-500/20 text-slate-300", word: streak.count === 1 ? "empate" : "empates" },
  };
  const c = map[streak.type];
  return (
    <div className={cn("flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5", c.cls)}>
      <span className="flex items-center gap-1 font-display text-lg font-extrabold leading-none tabular">
        {c.icon}
        {streak.count}
      </span>
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">{c.word}</span>
    </div>
  );
}

function FormChip({ outcome }: { outcome: MatchOutcome }) {
  const map: Record<MatchOutcome, { t: string; cls: string }> = {
    win: { t: "G", cls: "bg-brand-500/20 text-brand-300" },
    loss: { t: "P", cls: "bg-rose-500/20 text-rose-300" },
    draw: { t: "E", cls: "bg-slate-500/25 text-slate-300" },
  };
  const c = map[outcome];
  return (
    <span className={cn("flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold", c.cls)}>
      {c.t}
    </span>
  );
}

function BackLink() {
  return (
    <Link href="/" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" /> Clasificación
    </Link>
  );
}
