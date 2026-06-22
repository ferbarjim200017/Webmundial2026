"use client";
import Link from "next/link";
import { LogOut, Shield, Mail, Hash } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, FullScreenLoader, PairBadge, SectionTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { usePairs, usePlayers, useSports } from "@/lib/db";
import { byId, pairColor, pairInitials, pairMembers, playerName } from "@/lib/helpers";
import { computeGeneral } from "@/lib/tournament";

export default function PerfilPage() {
  return (
    <Protected>
      <Perfil />
    </Protected>
  );
}

function Perfil() {
  const { user, isAdmin, logout } = useAuth();
  const { data: players, loading: lpl } = usePlayers();
  const { data: pairs, loading: lpairs } = usePairs();
  const { data: sports, loading: ls } = useSports();

  if (lpl || lpairs || ls || !user) return <FullScreenLoader />;

  const playersMap = byId(players);
  const myName = playerName(playersMap, user.playerId);
  const myPair = pairs.find(
    (p) => p.player1Id === user.playerId || p.player2Id === user.playerId
  );
  const general = computeGeneral(sports, pairs.map((p) => p.id));
  const myRow = myPair ? general.find((r) => r.pairId === myPair.id) : undefined;
  const c = pairColor(myPair?.color);

  return (
    <div className="space-y-5 animate-fade-up">
      <SectionTitle title="Mi perfil" />

      {/* Tarjeta de cuenta */}
      <Card className="flex items-center gap-4">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-white/10" />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-2xl font-bold text-ink-950">
            {(user.displayName || myName || "?").charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-white">{user.displayName || myName}</p>
          <p className="flex items-center gap-1 truncate text-xs text-slate-400">
            <Mail className="h-3 w-3" /> {user.email}
          </p>
          {isAdmin && (
            <span className="chip mt-1.5 bg-brand-500/15 text-brand-300">
              <Shield className="h-3 w-3" /> Administrador
            </span>
          )}
        </div>
      </Card>

      {/* Jugador vinculado */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Tu jugador
        </p>
        <Card className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-white">
            {myName.charAt(0)}
          </span>
          <div className="flex-1">
            <p className="font-semibold text-white">{myName}</p>
            <p className="text-xs text-slate-400">
              Vinculado a tu cuenta {isAdmin ? "" : "· solo un admin puede cambiarlo"}
            </p>
          </div>
        </Card>
      </div>

      {/* Mi pareja */}
      {myPair && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tu pareja</p>
          <div
            className="card flex items-center gap-3"
            style={{ backgroundImage: `linear-gradient(135deg, ${c.from}20, transparent)` }}
          >
            <PairBadge colorKey={myPair.color} initials={pairInitials(myPair, playersMap)} size={48} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-white">{myPair.name}</p>
              <p className="truncate text-xs text-slate-400">{pairMembers(myPair, playersMap)}</p>
            </div>
            {myRow && (
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
                  <Hash className="h-3 w-3" />
                  {myRow.rank}º
                </div>
                <p className="text-xl font-extrabold tabular text-white">
                  {myRow.points}
                  <span className="ml-1 text-xs font-normal text-slate-500">pts</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {isAdmin && (
        <Link href="/admin" className="btn-ghost w-full">
          <Shield className="h-4 w-4" /> Panel de administración
        </Link>
      )}

      <button onClick={logout} className="btn-danger w-full">
        <LogOut className="h-4 w-4" /> Cerrar sesión
      </button>
    </div>
  );
}
