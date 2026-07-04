"use client";
import { LayoutGrid } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { EmptyState, FullScreenLoader, SectionTitle } from "@/components/ui";
import { SportCard } from "@/components/sport";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId } from "@/lib/helpers";

export default function DeportesPage() {
  return (
    <Protected>
      <SportsList />
    </Protected>
  );
}

function SportsList() {
  const { data: sports, loading: ls } = useSports();
  const { data: pairs, loading: lpairs } = usePairs();
  const { data: players, loading: lpl } = usePlayers();

  if (ls || lpairs || lpl) return <FullScreenLoader />;

  const playersMap = byId(players);

  return (
    <div className="space-y-4 animate-fade-up">
      <SectionTitle title="Deportes" subtitle="Cada deporte tiene sus propias parejas" />

      {sports.length === 0 ? (
        <EmptyState
          icon={<LayoutGrid />}
          title="No hay deportes todavía"
          hint="Un administrador puede inicializar el torneo o añadir deportes desde la pestaña Admin."
        />
      ) : (
        <div className="space-y-2.5">
          {sports.map((s) => (
            <SportCard
              key={s.id}
              sport={s}
              pairs={byId(pairs.filter((p) => p.sportId === s.id))}
              players={playersMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
