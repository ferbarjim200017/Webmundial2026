"use client";
import { useState } from "react";
import {
  Rocket,
  Users,
  UsersRound,
  Dumbbell,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Check,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, EmptyState, FullScreenLoader, Modal, PairBadge, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  usePlayers,
  usePairs,
  useSports,
  useUsers,
  seedPlayersAndPairs,
  seedSports,
  updatePlayerName,
  savePair,
  deletePair,
  addSport,
  updateSportMeta,
  deleteSport,
  resetTournamentScores,
  regenerateGroup,
  setUserRole,
  setUserPlayer,
} from "@/lib/db";
import {
  PAIR_COLORS,
  PAIR_COLOR_KEYS,
  SPORT_EMOJIS,
} from "@/lib/constants";
import { byId, cn, pairColor, pairInitials, pairMembers, playerName } from "@/lib/helpers";
import type { Pair, Player } from "@/lib/types";

const TABS = [
  { id: "setup", label: "Inicio", icon: Rocket },
  { id: "players", label: "Jugadores", icon: Users },
  { id: "pairs", label: "Parejas", icon: UsersRound },
  { id: "sports", label: "Deportes", icon: Dumbbell },
  { id: "users", label: "Usuarios", icon: ShieldCheck },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function AdminPage() {
  return (
    <Protected>
      <AdminGuard />
    </Protected>
  );
}

function AdminGuard() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<TabId>("setup");

  if (!isAdmin) {
    return <EmptyState icon={<ShieldCheck />} title="Acceso restringido" hint="Solo los administradores pueden entrar aquí." />;
  }

  return (
    <div className="space-y-4 animate-fade-up">
      <h1 className="text-xl font-extrabold tracking-tight text-white">Administración</h1>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                active ? "bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950" : "border border-white/10 bg-white/5 text-slate-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "setup" && <SetupSection />}
      {tab === "players" && <PlayersSection />}
      {tab === "pairs" && <PairsSection />}
      {tab === "sports" && <SportsSection />}
      {tab === "users" && <UsersSection />}
    </div>
  );
}

// =====================================================================
//  Inicialización
// =====================================================================
function SetupSection() {
  const { data: players } = usePlayers();
  const { data: pairs } = usePairs();
  const { data: sports } = useSports();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert("No se pudo completar la acción.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚀</span>
          <div className="flex-1">
            <p className="font-semibold text-white">1 · Jugadores y parejas</p>
            <p className="mb-3 text-sm text-slate-400">
              Crea los 10 jugadores y 5 parejas iniciales. Luego puedes renombrar y reorganizar.
            </p>
            <button
              disabled={busy !== null || players.length > 0}
              onClick={() => run("pp", seedPlayersAndPairs)}
              className="btn-primary w-full"
            >
              {busy === "pp" ? <Spinner className="h-5 w-5" /> : players.length > 0 ? `✓ ${players.length} jugadores ya creados` : "Crear jugadores y parejas"}
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏟️</span>
          <div className="flex-1">
            <p className="font-semibold text-white">2 · Deportes</p>
            <p className="mb-3 text-sm text-slate-400">
              Crea Tenis, Bádminton, Vóley y Fútbol con su fase de grupos lista. Necesita las parejas creadas.
            </p>
            <button
              disabled={busy !== null || pairs.length < 2 || sports.length > 0}
              onClick={() => run("sp", () => seedSports(pairs.map((p) => p.id)))}
              className="btn-primary w-full"
            >
              {busy === "sp" ? <Spinner className="h-5 w-5" /> : sports.length > 0 ? `✓ ${sports.length} deportes ya creados` : "Crear deportes por defecto"}
            </button>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
        Estado: {players.length} jugadores · {pairs.length} parejas · {sports.length} deportes.
      </div>

      {/* Zona de reinicio */}
      <Card className="border-rose-500/25 bg-rose-500/[0.04]">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🧨</span>
          <div className="flex-1">
            <p className="font-semibold text-white">Reiniciar a cero</p>
            <p className="mb-3 text-sm text-slate-400">
              Borra <b className="text-slate-200">todos los deportes y resultados</b> y deja la
              clasificación general a cero. Los <b className="text-slate-200">jugadores y parejas
              se conservan</b>.
            </p>
            <button
              disabled={busy !== null || sports.length === 0}
              onClick={() => {
                if (
                  confirm(
                    "¿Reiniciar a cero?\n\nSe eliminarán TODOS los deportes y sus resultados, y la clasificación general volverá a cero.\n\nLas parejas y los jugadores NO se tocan.\n\nEsta acción no se puede deshacer."
                  )
                ) {
                  run("reset", resetTournamentScores);
                }
              }}
              className="btn-danger w-full"
            >
              {busy === "reset" ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  {sports.length === 0 ? "No hay deportes que reiniciar" : "Reiniciar deportes y marcadores"}
                </>
              )}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// =====================================================================
//  Jugadores
// =====================================================================
function PlayersSection() {
  const { data: players, loading } = usePlayers();
  if (loading) return <FullScreenLoader />;
  if (players.length === 0)
    return <EmptyState icon={<Users />} title="Sin jugadores" hint="Créalos desde la pestaña Inicio." />;
  return (
    <div className="space-y-2">
      {players.map((p) => (
        <PlayerRow key={p.id} player={p} />
      ))}
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  const [name, setName] = useState(player.name);
  const [busy, setBusy] = useState(false);
  const changed = name.trim() !== player.name && name.trim().length > 0;

  const save = async () => {
    setBusy(true);
    try {
      await updatePlayerName(player.id, name.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-850/60 p-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-bold text-white">
        {name.charAt(0) || "?"}
      </span>
      <input className="input flex-1 py-2" value={name} onChange={(e) => setName(e.target.value)} />
      <button
        disabled={!changed || busy}
        onClick={save}
        className={cn("btn px-3 py-2", changed ? "btn-primary" : "btn-ghost opacity-50")}
      >
        {busy ? <Spinner className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </button>
    </div>
  );
}

// =====================================================================
//  Parejas
// =====================================================================
function PairsSection() {
  const { data: pairs, loading: lp } = usePairs();
  const { data: players, loading: lpl } = usePlayers();
  const [editing, setEditing] = useState<Pair | null>(null);
  const [creating, setCreating] = useState(false);

  if (lp || lpl) return <FullScreenLoader />;
  const playersMap = byId(players);

  return (
    <div className="space-y-3">
      <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
        Cambiar nombre, color o miembros es seguro. Si <b>añades o eliminas</b> parejas, regenera la fase de grupos de cada deporte.
      </p>

      <div className="space-y-2">
        {pairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-850/60 p-3">
            <PairBadge colorKey={pair.color} initials={pairInitials(pair, playersMap)} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{pair.name}</p>
              <p className="truncate text-xs text-slate-400">{pairMembers(pair, playersMap)}</p>
            </div>
            <button onClick={() => setEditing(pair)} className="btn-ghost px-2.5 py-2">
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`¿Eliminar "${pair.name}"? Recuerda regenerar los grupos.`)) deletePair(pair.id);
              }}
              className="btn-danger px-2.5 py-2"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setCreating(true)} className="btn-ghost w-full">
        <Plus className="h-4 w-4" /> Añadir pareja
      </button>

      <PairEditor
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        pair={editing}
        players={players}
        nextOrder={pairs.length}
      />
    </div>
  );
}

function PairEditor({
  open,
  onClose,
  pair,
  players,
  nextOrder,
}: {
  open: boolean;
  onClose: () => void;
  pair: Pair | null;
  players: Player[];
  nextOrder: number;
}) {
  const [name, setName] = useState(pair?.name ?? "");
  const [color, setColor] = useState(pair?.color ?? PAIR_COLOR_KEYS[0]);
  const [p1, setP1] = useState(pair?.player1Id ?? "");
  const [p2, setP2] = useState(pair?.player2Id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Reinicia el formulario cuando cambia la pareja editada
  const key = pair?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(pair?.name ?? "");
    setColor(pair?.color ?? PAIR_COLOR_KEYS[0]);
    setP1(pair?.player1Id ?? "");
    setP2(pair?.player2Id ?? "");
    setErr(null);
  }

  const save = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Ponle un nombre a la pareja.");
    if (!p1 || !p2) return setErr("Selecciona los dos jugadores.");
    if (p1 === p2) return setErr("Los dos jugadores deben ser distintos.");
    setBusy(true);
    try {
      await savePair(pair?.id ?? null, {
        name: name.trim(),
        player1Id: p1,
        player2Id: p2,
        color,
        order: pair?.order ?? nextOrder,
      });
      onClose();
    } catch (e) {
      setErr("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={pair ? "Editar pareja" : "Nueva pareja"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Los Cracks" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PlayerSelect label="Jugador 1" value={p1} onChange={setP1} players={players} exclude={p2} />
          <PlayerSelect label="Jugador 2" value={p2} onChange={setP2} players={players} exclude={p1} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">Color</label>
          <div className="flex flex-wrap gap-2">
            {PAIR_COLOR_KEYS.map((k) => {
              const c = PAIR_COLORS[k];
              return (
                <button
                  key={k}
                  onClick={() => setColor(k)}
                  className={cn(
                    "h-9 w-9 rounded-full ring-2 transition",
                    color === k ? "ring-white scale-110" : "ring-transparent"
                  )}
                  style={{ backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  aria-label={c.name}
                />
              );
            })}
          </div>
        </div>

        {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}

        <button onClick={save} disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner className="h-5 w-5" /> : "Guardar pareja"}
        </button>
      </div>
    </Modal>
  );
}

function PlayerSelect({
  label,
  value,
  onChange,
  players,
  exclude,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: Player[];
  exclude?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {players
          .filter((p) => p.id !== exclude)
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
    </div>
  );
}

// =====================================================================
//  Deportes
// =====================================================================
function SportsSection() {
  const { data: sports, loading: ls } = useSports();
  const { data: pairs, loading: lp } = usePairs();
  const [editing, setEditing] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (ls || lp) return <FullScreenLoader />;
  const pairIds = pairs.map((p) => p.id);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {sports.map((s) => (
          <div key={s.id} className="rounded-xl border border-white/10 bg-ink-850/60 p-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.emoji}</span>
              <p className="flex-1 font-semibold text-white">{s.name}</p>
              <button onClick={() => setEditing({ id: s.id, name: s.name, emoji: s.emoji })} className="btn-ghost px-2.5 py-2">
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`¿Eliminar "${s.name}" y todos sus resultados?`)) deleteSport(s.id);
                }}
                className="btn-danger px-2.5 py-2"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <button
              disabled={busy !== null || pairIds.length < 2}
              onClick={async () => {
                if (!confirm("¿Regenerar la fase de grupos? Se borrarán los resultados de este deporte.")) return;
                setBusy(s.id);
                try {
                  await regenerateGroup(s.id, pairIds);
                } finally {
                  setBusy(null);
                }
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              {busy === s.id ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Regenerar fase de grupos
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setCreating(true)} className="btn-ghost w-full">
        <Plus className="h-4 w-4" /> Añadir deporte
      </button>

      <SportEditor
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        sport={editing}
        order={sports.length}
        pairIds={pairIds}
      />
    </div>
  );
}

function SportEditor({
  open,
  onClose,
  sport,
  order,
  pairIds,
}: {
  open: boolean;
  onClose: () => void;
  sport: { id: string; name: string; emoji: string } | null;
  order: number;
  pairIds: string[];
}) {
  const [name, setName] = useState(sport?.name ?? "");
  const [emoji, setEmoji] = useState(sport?.emoji ?? "🏆");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const key = sport?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(sport?.name ?? "");
    setEmoji(sport?.emoji ?? "🏆");
    setErr(null);
  }

  const save = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Escribe el nombre del deporte.");
    setBusy(true);
    try {
      if (sport) await updateSportMeta(sport.id, { name: name.trim(), emoji });
      else await addSport(name.trim(), emoji, order, pairIds);
      onClose();
    } catch (e) {
      setErr("No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={sport ? "Editar deporte" : "Nuevo deporte"}>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Pádel" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-400">
            Icono <span className="text-slate-500">({emoji})</span>
          </label>
          <div className="grid grid-cols-6 gap-2">
            {SPORT_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl text-2xl transition",
                  emoji === e ? "bg-brand-500/25 ring-2 ring-brand-400" : "bg-white/5 hover:bg-white/10"
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        {!sport && (
          <p className="text-xs text-slate-500">
            Se generará la fase de grupos con las {pairIds.length} parejas actuales.
          </p>
        )}
        {err && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{err}</p>}
        <button onClick={save} disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner className="h-5 w-5" /> : "Guardar deporte"}
        </button>
      </div>
    </Modal>
  );
}

// =====================================================================
//  Usuarios
// =====================================================================
function UsersSection() {
  const { data: users, loading: lu } = useUsers();
  const { data: players, loading: lpl } = usePlayers();
  const { user: me } = useAuth();

  if (lu || lpl) return <FullScreenLoader />;
  const playersMap = byId(players);

  if (users.length === 0)
    return <EmptyState icon={<ShieldCheck />} title="Sin usuarios" hint="Aparecerán cuando inicien sesión." />;

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <div key={u.id} className="rounded-xl border border-white/10 bg-ink-850/60 p-3">
          <div className="flex items-center gap-3">
            {u.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.photoURL} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-white">
                {(u.displayName || u.email || "?").charAt(0)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">
                {u.displayName || playerName(playersMap, u.playerId)}
                {u.id === me?.uid && <span className="ml-1 text-xs text-brand-300">(tú)</span>}
              </p>
              <p className="truncate text-xs text-slate-400">{u.email}</p>
            </div>
            <span className={cn("chip", u.role === "admin" ? "bg-brand-500/15 text-brand-300" : "bg-slate-500/15 text-slate-300")}>
              {u.role === "admin" ? "Admin" : "Miembro"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Jugador</label>
              <select
                className="input py-2 text-sm"
                value={u.playerId ?? ""}
                onChange={(e) => setUserPlayer(u.id, e.target.value || null)}
              >
                <option value="">Sin asignar</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rol</label>
              <select
                className="input py-2 text-sm"
                value={u.role}
                disabled={u.id === me?.uid}
                onChange={(e) => setUserRole(u.id, e.target.value as "admin" | "member")}
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
