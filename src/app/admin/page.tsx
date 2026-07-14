"use client";
import { useRef, useState } from "react";
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
  Camera,
  Shuffle,
} from "lucide-react";
import { Protected } from "@/components/AppShell";
import { Card, EmptyState, FullScreenLoader, Modal, PairBadge, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  usePlayers,
  usePairs,
  useSports,
  useUsers,
  seedPlayers,
  seedSports,
  updatePlayerName,
  savePair,
  setPairPhoto,
  removePairPhoto,
  addSport,
  updateSportMeta,
  deleteSport,
  resetTournamentScores,
  regenerateGroup,
  regeneratePairs,
  setUserRole,
  setUserPlayer,
} from "@/lib/db";
import { fileToAvatarDataUrl } from "@/lib/image";
import {
  PAIR_COLORS,
  PAIR_COLOR_KEYS,
  PLAYER_NAMES,
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
      <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">Administración</h1>

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
            <p className="font-semibold text-white">1 · Jugadores</p>
            <p className="mb-3 text-sm text-slate-400">
              Crea los {PLAYER_NAMES.length} jugadores. Las parejas se definen luego dentro de cada deporte.
              {players.length > 0 && players.length < PLAYER_NAMES.length && (
                <>
                  {" "}
                  <b className="text-slate-200">
                    Faltan {PLAYER_NAMES.length - players.length} por añadir (p. ej. Alberto)
                  </b>
                  ; pulsa el botón para incorporarlos sin borrar nada.
                </>
              )}
            </p>
            <button
              disabled={busy !== null || players.length >= PLAYER_NAMES.length}
              onClick={() => run("pp", () => seedPlayers().then(() => undefined))}
              className="btn-primary w-full"
            >
              {busy === "pp" ? (
                <Spinner className="h-5 w-5" />
              ) : players.length >= PLAYER_NAMES.length ? (
                `✓ ${players.length} jugadores ya creados`
              ) : players.length > 0 ? (
                `Añadir jugadores que faltan (${PLAYER_NAMES.length - players.length})`
              ) : (
                "Crear jugadores"
              )}
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
              Crea Tenis, Bádminton, Vóley y Fútbol. Cada deporte forma sus 5 parejas <b className="text-slate-200">mixtas al azar</b> (un chico y una chica), distintas en cada deporte, y una de ellas será un <b className="text-slate-200">trío con el comodín</b> (Alberto).
            </p>
            <button
              disabled={busy !== null || players.length < 2 || sports.length > 0}
              onClick={() => run("sp", () => seedSports(players))}
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
              Borra <b className="text-slate-200">todos los deportes y sus parejas</b> y deja la
              clasificación general a cero. Los <b className="text-slate-200">jugadores se
              conservan</b>.
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
  const { data: sports, loading: ls } = useSports();
  const { data: pairs, loading: lp } = usePairs();
  const { data: players, loading: lpl } = usePlayers();
  const [sportId, setSportId] = useState<string>("");
  const [editing, setEditing] = useState<Pair | null>(null);
  const [busy, setBusy] = useState(false);

  if (ls || lp || lpl) return <FullScreenLoader />;
  if (sports.length === 0)
    return <EmptyState icon={<UsersRound />} title="Sin deportes" hint="Crea deportes desde la pestaña Inicio; cada uno trae sus 5 parejas." />;

  const currentSportId = sports.some((s) => s.id === sportId) ? sportId : sports[0].id;
  const sport = sports.find((s) => s.id === currentSportId)!;
  const playersMap = byId(players);
  const sportPairs = pairs.filter((p) => p.sportId === currentSportId).sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-3">
      {/* Selector de deporte */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {sports.map((s) => (
          <button
            key={s.id}
            onClick={() => setSportId(s.id)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
              currentSportId === s.id ? "bg-gradient-to-br from-brand-400 to-brand-600 text-ink-950" : "border border-white/10 bg-white/5 text-slate-300"
            )}
          >
            <span>{s.emoji}</span> {s.name}
          </button>
        ))}
      </div>

      <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200">
        Parejas de <b>{sport.name}</b>. Cada deporte tiene sus propias parejas. Tras cambiar quién va con quién, pulsa <b>Regenerar fase de grupos</b>.
      </p>

      <div className="space-y-2">
        {sportPairs.map((pair) => (
          <div key={pair.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-850/60 p-3">
            <PairBadge colorKey={pair.color} initials={pairInitials(pair, playersMap)} size={40} photoUrl={pair.photo} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate font-semibold text-white">
                {pair.name}
                {pair.player3Id && (
                  <span className="chip shrink-0 bg-amber-500/15 text-[10px] text-amber-300">Trío</span>
                )}
              </p>
              <p className="truncate text-xs text-slate-400">{pairMembers(pair, playersMap)}</p>
            </div>
            <button onClick={() => setEditing(pair)} className="btn-ghost px-2.5 py-2">
              <Pencil className="h-4 w-4" />
            </button>
          </div>
        ))}
        {sportPairs.length === 0 && <p className="text-sm text-slate-400">Este deporte no tiene parejas.</p>}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirm("¿Volver a sortear las parejas de este deporte? Se formarán parejas mixtas nuevas al azar y se borrarán sus resultados.")) return;
            setBusy(true);
            try {
              await regeneratePairs(currentSportId, players);
            } finally {
              setBusy(false);
            }
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-400/25 bg-brand-500/10 py-2 text-xs font-semibold text-brand-200 transition hover:bg-brand-500/15 disabled:opacity-50"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <Shuffle className="h-3.5 w-3.5" />}
          Sortear parejas mixtas de nuevo
        </button>

        <button
          disabled={busy || sportPairs.length < 2}
          onClick={async () => {
            if (!confirm("¿Regenerar la fase de grupos de este deporte? Se borrarán sus resultados (las parejas se mantienen).")) return;
            setBusy(true);
            try {
              await regenerateGroup(currentSportId, sportPairs.map((p) => p.id));
            } finally {
              setBusy(false);
            }
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
        >
          {busy ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerar solo el calendario
        </button>
      </div>

      <PairEditor open={editing !== null} onClose={() => setEditing(null)} pair={editing} players={players} />
    </div>
  );
}

function PairEditor({
  open,
  onClose,
  pair,
  players,
}: {
  open: boolean;
  onClose: () => void;
  pair: Pair | null;
  players: Player[];
}) {
  const [name, setName] = useState(pair?.name ?? "");
  const [color, setColor] = useState(pair?.color ?? PAIR_COLOR_KEYS[0]);
  const [p1, setP1] = useState(pair?.player1Id ?? "");
  const [p2, setP2] = useState(pair?.player2Id ?? "");
  const [p3, setP3] = useState(pair?.player3Id ?? "");
  const [photo, setPhoto] = useState<string | null>(pair?.photo ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reinicia el formulario cuando cambia la pareja editada
  const key = pair?.id ?? "new";
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setName(pair?.name ?? "");
    setColor(pair?.color ?? PAIR_COLOR_KEYS[0]);
    setP1(pair?.player1Id ?? "");
    setP2(pair?.player2Id ?? "");
    setP3(pair?.player3Id ?? "");
    setPhoto(pair?.photo ?? null);
    setErr(null);
  }

  const onPhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !pair) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      await setPairPhoto(pair.id, dataUrl);
      setPhoto(dataUrl);
    } catch {
      setErr("No se pudo subir la foto.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const onPhotoRemove = async () => {
    if (!pair) return;
    setPhotoBusy(true);
    try {
      await removePairPhoto(pair.id);
      setPhoto(null);
    } finally {
      setPhotoBusy(false);
    }
  };

  const save = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Ponle un nombre a la pareja.");
    if (!p1 || !p2) return setErr("Selecciona los dos jugadores.");
    if (p1 === p2) return setErr("Los dos jugadores deben ser distintos.");
    if (p3 && (p3 === p1 || p3 === p2)) return setErr("El tercer jugador debe ser distinto de los otros dos.");
    if (!pair) return;
    setBusy(true);
    try {
      await savePair(pair.id, {
        sportId: pair.sportId,
        name: name.trim(),
        player1Id: p1,
        player2Id: p2,
        player3Id: p3 || null,
        color,
        order: pair.order,
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
        {pair && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-ink-900/50 p-3">
            <PairBadge colorKey={color} initials={pairInitials(pair, byId(players))} size={48} photoUrl={photo} />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Foto de la pareja</p>
              <div className="mt-1 flex gap-3 text-[11px] font-semibold">
                <button onClick={() => fileRef.current?.click()} className="text-brand-300 hover:text-brand-200">
                  {photoBusy ? "Subiendo…" : photo ? "Cambiar" : "Subir"}
                </button>
                {photo && (
                  <button onClick={onPhotoRemove} className="text-slate-500 hover:text-slate-300">
                    Quitar
                  </button>
                )}
              </div>
            </div>
            {photoBusy && <Spinner className="h-4 w-4 text-brand-300" />}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPhotoFile} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-400">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Los Cracks" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PlayerSelect label="Jugador 1" value={p1} onChange={setP1} players={players} exclude={[p2, p3]} />
          <PlayerSelect label="Jugador 2" value={p2} onChange={setP2} players={players} exclude={[p1, p3]} />
        </div>

        <PlayerSelect
          label="Jugador 3 (opcional · comodín)"
          value={p3}
          onChange={setP3}
          players={players}
          exclude={[p1, p2]}
          allowEmpty
        />
        <p className="-mt-2 text-[11px] text-slate-500">
          Deja el tercer jugador vacío para una pareja normal de dos. Asígnalo (p. ej. Alberto) para convertirla en un trío.
        </p>

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
  allowEmpty,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  players: Player[];
  /** Uno o varios ids que no deben poder elegirse (los ya usados en la pareja). */
  exclude?: string | Array<string | undefined>;
  /** Muestra la opción "Sin asignar" (para el tercer jugador opcional). */
  allowEmpty?: boolean;
}) {
  const excluded = new Set(
    (Array.isArray(exclude) ? exclude : [exclude]).filter(Boolean) as string[]
  );
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-400">{label}</label>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{allowEmpty ? "Sin asignar" : "—"}</option>
        {players
          .filter((p) => p.id === value || !excluded.has(p.id))
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
  const { data: players, loading: lpl } = usePlayers();
  const [editing, setEditing] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (ls || lp || lpl) return <FullScreenLoader />;

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
              disabled={busy !== null}
              onClick={async () => {
                if (!confirm("¿Regenerar la fase de grupos? Se borrarán los resultados de este deporte.")) return;
                const sportPairIds = pairs.filter((p) => p.sportId === s.id).map((p) => p.id);
                if (sportPairIds.length < 2) return;
                setBusy(s.id);
                try {
                  await regenerateGroup(s.id, sportPairIds);
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
        players={players}
      />
    </div>
  );
}

function SportEditor({
  open,
  onClose,
  sport,
  order,
  players,
}: {
  open: boolean;
  onClose: () => void;
  sport: { id: string; name: string; emoji: string } | null;
  order: number;
  players: Player[];
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
      else await addSport(name.trim(), emoji, order, players);
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
            Se crearán 5 parejas mixtas al azar (chico + chica), una de ellas un trío con el comodín (Alberto), y su fase de grupos. Podrás ajustarlas en Parejas.
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
