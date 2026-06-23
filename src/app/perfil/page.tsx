"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Shield, Mail, Hash, Camera } from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, FullScreenLoader, PairBadge, PhotoLightbox, SectionTitle, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { usePairs, usePlayers, useSports, setPairPhoto, removePairPhoto } from "@/lib/db";
import { fileToAvatarDataUrl } from "@/lib/image";
import { byId, pairColor, pairInitials, pairMembers, playerName } from "@/lib/helpers";
import { computeGeneral } from "@/lib/tournament";
import type { GeneralRow, Pair, Player } from "@/lib/types";

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
        <MyPairCard pair={myPair} players={playersMap} row={myRow} canEdit />
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

function MyPairCard({
  pair,
  players,
  row,
  canEdit,
}: {
  pair: Pair;
  players: Map<string, Player>;
  row?: GeneralRow;
  canEdit?: boolean;
}) {
  const c = pairColor(pair.color);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await setPairPhoto(pair.id, dataUrl);
    } catch {
      setErr("No se pudo subir la foto. Prueba con otra imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Tu pareja</p>
      <div
        className="card flex items-center gap-3"
        style={{ backgroundImage: `linear-gradient(135deg, ${c.from}20, transparent)` }}
      >
        <button
          type="button"
          onClick={() => (pair.photo ? setViewer(true) : fileRef.current?.click())}
          className="relative shrink-0"
          aria-label={pair.photo ? "Ver foto" : "Subir foto"}
        >
          <PairBadge colorKey={pair.color} initials={pairInitials(pair, players)} size={56} photoUrl={pair.photo} />
          {canEdit && (
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-ink-950 ring-2 ring-ink-850">
              {busy ? <Spinner className="h-3 w-3" /> : <Camera className="h-3.5 w-3.5" />}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-white">{pair.name}</p>
          <p className="truncate text-xs text-slate-400">{pairMembers(pair, players)}</p>
          {canEdit && (
            <div className="mt-1 flex items-center gap-3 text-[11px] font-semibold">
              <button onClick={() => fileRef.current?.click()} className="text-brand-300 hover:text-brand-200">
                {pair.photo ? "Cambiar foto" : "Subir foto"}
              </button>
              {pair.photo && (
                <button onClick={() => removePairPhoto(pair.id)} className="text-slate-500 hover:text-slate-300">
                  Quitar
                </button>
              )}
            </div>
          )}
        </div>

        {row && (
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs text-slate-400">
              <Hash className="h-3 w-3" />
              {row.rank}º
            </div>
            <p className="text-xl font-extrabold tabular text-white">
              {row.points}
              <span className="ml-1 text-xs font-normal text-slate-500">pts</span>
            </p>
          </div>
        )}
      </div>

      {err && <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <PhotoLightbox
        open={viewer}
        onClose={() => setViewer(false)}
        src={pair.photo}
        title={pair.name}
        subtitle={pairMembers(pair, players)}
      />
    </div>
  );
}
