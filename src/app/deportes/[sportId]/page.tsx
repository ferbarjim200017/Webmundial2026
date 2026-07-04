"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { FullScreenLoader, EmptyState } from "@/components/ui";
import {
  GroupStandings,
  GroupMatches,
  BracketSection,
  PairResultsModal,
  statusBadge,
} from "@/components/sport";
import { useAuth } from "@/lib/auth";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId, cn } from "@/lib/helpers";
import { computeSportResult } from "@/lib/tournament";

export default function SportDetailPage({
  params,
}: {
  params: Promise<{ sportId: string }>;
}) {
  const { sportId } = use(params);
  return (
    <Protected>
      <SportDetail sportId={sportId} />
    </Protected>
  );
}

function SportDetail({ sportId }: { sportId: string }) {
  const { isAdmin } = useAuth();
  const { data: sports, loading: ls } = useSports();
  const { data: pairs, loading: lpairs } = usePairs();
  const { data: players, loading: lpl } = usePlayers();
  const [tab, setTab] = useState<"group" | "ko">("group");
  const [resultsPairId, setResultsPairId] = useState<string | null>(null);

  if (ls || lpairs || lpl) return <FullScreenLoader />;

  const sport = sports.find((s) => s.id === sportId);
  if (!sport) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState title="Deporte no encontrado" hint="Puede que se haya eliminado." />
      </div>
    );
  }

  const sportPairs = pairs.filter((p) => p.sportId === sport.id);
  const pairsMap = byId(sportPairs);
  const playersMap = byId(players);
  const pairIds = sportPairs.map((p) => p.id);
  const res = computeSportResult(sport, pairIds);
  const badge = statusBadge(res.status);

  return (
    <div className="space-y-4 animate-fade-up">
      <BackLink />

      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl">
          {sport.emoji}
        </span>
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">{sport.name}</h1>
          <span className={cn("chip mt-1", badge.cls)}>{badge.text}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-ink-900 p-1">
        <TabButton active={tab === "group"} onClick={() => setTab("group")}>
          Fase de grupos
        </TabButton>
        <TabButton active={tab === "ko"} onClick={() => setTab("ko")}>
          Eliminatorias
        </TabButton>
      </div>

      {tab === "group" ? (
        <div className="space-y-4">
          <GroupStandings sport={sport} pairs={pairsMap} players={playersMap} onPairClick={setResultsPairId} />
          <p className="-mt-2 text-center text-[11px] text-slate-500">
            Toca una pareja para ver sus partidos
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Partidos del grupo
            </p>
            <GroupMatches sport={sport} pairs={pairsMap} players={playersMap} isAdmin={isAdmin} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!res.groupComplete && (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
              La fase de grupos no ha terminado: los cruces son provisionales según la clasificación actual.
            </p>
          )}
          <BracketSection sport={sport} pairs={pairsMap} players={playersMap} isAdmin={isAdmin} onPairClick={setResultsPairId} />
          <p className="text-center text-[11px] text-slate-500">Toca una pareja para ver sus partidos</p>
        </div>
      )}

      <PairResultsModal
        open={resultsPairId !== null}
        onClose={() => setResultsPairId(null)}
        sport={sport}
        pairId={resultsPairId}
        pairs={pairsMap}
        players={playersMap}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/deportes" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
      <ArrowLeft className="h-4 w-4" /> Deportes
    </Link>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg py-2 text-sm font-semibold transition",
        active ? "bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950" : "text-slate-400 hover:text-white"
      )}
    >
      {children}
    </button>
  );
}
