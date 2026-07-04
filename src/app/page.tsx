"use client";
import { useState } from "react";
import Link from "next/link";
import { Info, Trophy, ChevronRight } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, EmptyState, FullScreenLoader, SectionTitle } from "@/components/ui";
import { Podium, GeneralTable } from "@/components/standings";
import { GrandFinal, PlayerSportsModal } from "@/components/sport";
import { useAuth } from "@/lib/auth";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId } from "@/lib/helpers";
import { computeIndividualGeneral, computeSportResult } from "@/lib/tournament";

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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  if (lpairs || lpl || ls) return <FullScreenLoader />;

  const playerIds = players.map((p) => p.id);
  const playersMap = byId(players);
  const general = computeIndividualGeneral(sports, pairs, playerIds);

  const finished = sports.filter((s) => {
    const sportPairIds = pairs.filter((p) => p.sportId === s.id).map((p) => p.id);
    return computeSportResult(s, sportPairIds).status === "finished";
  }).length;
  const hasScores = general.some((r) => r.points > 0);

  if (players.length === 0) {
    return (
      <div className="space-y-4">
        <SectionTitle title="Clasificación general" subtitle="Puntos individuales por jugador" />
        <EmptyState
          icon={<Trophy />}
          title="Aún no hay jugadores"
          hint="Un administrador debe inicializar el torneo desde la pestaña Admin."
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 stagger">
      <div>
        <p className="section-label">Clasificación individual</p>
        <h1 className="mt-0.5 font-display text-[28px] font-extrabold leading-tight tracking-tight text-white">
          Tabla <span className="text-gradient">General</span>
        </h1>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="chip border border-white/10 bg-white/5 text-slate-300">
            🏟️ {sports.length} deporte{sports.length === 1 ? "" : "s"}
          </span>
          <span className="chip border border-brand-400/20 bg-brand-500/10 text-brand-300">
            ✅ {finished} finalizado{finished === 1 ? "" : "s"}
          </span>
          <span className="chip border border-white/10 bg-white/5 text-slate-300">
            👥 {players.length} jugadores
          </span>
        </div>
      </div>

      {hasScores ? (
        <Card className="bg-gradient-to-b from-white/[0.06] to-transparent">
          <Podium rows={general} players={playersMap} />
        </Card>
      ) : (
        <EmptyState
          icon={<Trophy />}
          title="El torneo aún no ha empezado"
          hint="Cuando se decidan los primeros deportes, aquí verás el podio."
        />
      )}

      <GeneralTable rows={general} players={playersMap} onPlayerClick={setSelectedPlayerId} />
      <p className="-mt-3 text-center text-[11px] text-slate-500">Toca un jugador para ver su resumen por deportes</p>

      <GrandFinal sports={sports} pairs={pairs} players={playersMap} isAdmin={isAdmin} />

      <Link href="/deportes" className="card flex items-center justify-between p-4 transition hover:border-brand-400/40 hover:bg-white/5">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm font-semibold text-white">Ver deportes</p>
            <p className="text-xs text-slate-400">Parejas, grupos y eliminatorias</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-500" />
      </Link>

      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p>
          En cada deporte, cada jugador de la pareja suma:{" "}
          <span className="font-semibold text-gold">campeón 3 pts</span>,{" "}
          <span className="font-semibold text-silver">subcampeón 2 pts</span> y{" "}
          <span className="font-semibold text-bronze">3er puesto 1 pt</span>.
        </p>
      </div>

      <PlayerSportsModal
        open={selectedPlayerId !== null}
        onClose={() => setSelectedPlayerId(null)}
        sports={sports}
        pairs={pairs}
        playerId={selectedPlayerId}
        players={playersMap}
      />
    </div>
  );
}
