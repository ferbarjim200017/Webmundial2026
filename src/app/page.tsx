"use client";
import { useState } from "react";
import Link from "next/link";
import { Info, Trophy, ChevronRight } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, EmptyState, FullScreenLoader, SectionTitle } from "@/components/ui";
import { Podium, GeneralTable } from "@/components/standings";
import { GrandFinal, PairSportsModal } from "@/components/sport";
import { useAuth } from "@/lib/auth";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId } from "@/lib/helpers";
import { computeGeneral, computeSportResult } from "@/lib/tournament";

export default function HomePage() {
  return (
    <Protected>
      <GeneralStandings />
    </Protected>
  );
}

function GeneralStandings() {
  const { isAdmin } = useAuth();
  const { data: pairs, loading: lpairs } = usePairs();
  const { data: players, loading: lpl } = usePlayers();
  const { data: sports, loading: ls } = useSports();
  const [selectedPairId, setSelectedPairId] = useState<string | null>(null);

  if (lpairs || lpl || ls) return <FullScreenLoader />;

  const pairIds = pairs.map((p) => p.id);
  const pairsMap = byId(pairs);
  const playersMap = byId(players);
  const general = computeGeneral(sports, pairIds);

  const finished = sports.filter((s) => computeSportResult(s, pairIds).status === "finished").length;
  const hasScores = general.some((r) => r.points > 0);

  if (pairs.length === 0) {
    return (
      <div className="space-y-4">
        <SectionTitle title="Clasificación general" subtitle="Puntos acumulados por pareja" />
        <EmptyState
          icon={<Trophy />}
          title="Aún no hay parejas"
          hint="Un administrador debe inicializar el torneo desde la pestaña Admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Clasificación general</h1>
          <p className="text-xs text-slate-400">
            {sports.length} deporte{sports.length === 1 ? "" : "s"} · {finished} finalizado{finished === 1 ? "" : "s"}
          </p>
        </div>
        <div className="rounded-full bg-brand-500/15 px-3 py-1.5 text-xs font-semibold text-brand-300">
          {pairs.length} parejas
        </div>
      </div>

      {hasScores ? (
        <Card className="bg-gradient-to-b from-white/[0.06] to-transparent">
          <Podium rows={general} pairs={pairsMap} players={playersMap} />
        </Card>
      ) : (
        <EmptyState
          icon={<Trophy />}
          title="El torneo aún no ha empezado"
          hint="Cuando se decidan los primeros deportes, aquí verás el podio."
        />
      )}

      <GeneralTable rows={general} pairs={pairsMap} players={playersMap} onPairClick={setSelectedPairId} />
      <p className="-mt-3 text-center text-[11px] text-slate-500">Toca una pareja para ver su resumen por deportes</p>

      <GrandFinal sports={sports} pairs={pairs} players={playersMap} isAdmin={isAdmin} />

      <Link href="/deportes" className="card flex items-center justify-between p-4 transition hover:border-brand-400/40 hover:bg-white/5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-semibold text-white">Ver deportes</p>
            <p className="text-xs text-slate-400">Grupos, eliminatorias y resultados</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500" />
      </Link>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p>
          En cada deporte: <span className="font-semibold text-gold">campeón 3 pts</span>,{" "}
          <span className="font-semibold text-silver">subcampeón 2 pts</span> y{" "}
          <span className="font-semibold text-bronze">3er puesto 1 pt</span>.
        </p>
      </div>

      <PairSportsModal
        open={selectedPairId !== null}
        onClose={() => setSelectedPairId(null)}
        sports={sports}
        pairId={selectedPairId}
        pairs={pairsMap}
        players={playersMap}
      />
    </div>
  );
}
