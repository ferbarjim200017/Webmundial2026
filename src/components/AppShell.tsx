"use client";
// =====================================================================
//  Estructura general protegida: guard de sesión, onboarding y navegación
// =====================================================================
import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Trophy, LayoutGrid, Shield, User2, Check, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { usePlayers, useUsers, linkOwnPlayer, seedPlayersAndPairs } from "@/lib/db";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/helpers";
import { FullScreenLoader, Spinner } from "./ui";

// ---------------------------------------------------------------------
//  Aviso si faltan las variables de Firebase
// ---------------------------------------------------------------------
function FirebaseNotConfigured() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-5xl">🔧</div>
      <h1 className="text-xl font-bold text-white">Falta configurar Firebase</h1>
      <p className="text-sm text-slate-400">
        Define las variables <code className="text-brand-300">NEXT_PUBLIC_FIREBASE_*</code> en
        tu archivo <code className="text-brand-300">.env.local</code> (o en Vercel) y vuelve a
        cargar. Tienes la plantilla en <code className="text-brand-300">.env.example</code>.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Onboarding: vincular tu cuenta a un jugador
// ---------------------------------------------------------------------
function Onboarding() {
  const { user, isAdmin, logout } = useAuth();
  const { data: players, loading: lp } = usePlayers();
  const { data: users, loading: lu } = useUsers();
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  if (lp || lu) return <FullScreenLoader label="Preparando jugadores…" />;

  const initTournament = async () => {
    setSeeding(true);
    try {
      await seedPlayersAndPairs();
    } catch (e) {
      console.error(e);
      alert("No se pudo inicializar. ¿Tienes permisos de administrador?");
    } finally {
      setSeeding(false);
    }
  };

  const takenBy = new Map<string, string>();
  users.forEach((u) => {
    if (u.playerId && u.id !== user?.uid) takenBy.set(u.playerId, u.displayName || u.email || "alguien");
  });

  const choose = async (playerId: string) => {
    if (!user) return;
    setSaving(playerId);
    try {
      await linkOwnPlayer(user.uid, playerId);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 py-10">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
          <Link2 className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">¿Quién eres?</h1>
        <p className="mt-1 text-sm text-slate-400">
          Vincula tu cuenta a tu jugador. Quedará fijado salvo que un admin lo cambie.
        </p>
      </div>

      {players.length === 0 ? (
        isAdmin ? (
          <div className="card space-y-3 p-5 text-center">
            <p className="text-sm text-slate-300">
              Todavía no hay jugadores. Como administrador, crea los 10 jugadores y las 5
              parejas iniciales para empezar.
            </p>
            <button onClick={initTournament} disabled={seeding} className="btn-primary w-full">
              {seeding ? <Spinner className="h-5 w-5" /> : "Inicializar torneo"}
            </button>
            <p className="text-xs text-slate-500">Luego podrás crear los deportes desde Admin.</p>
          </div>
        ) : (
          <div className="card p-5 text-center text-sm text-slate-400">
            Todavía no hay jugadores. Pide a un administrador que inicialice el torneo.
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {players.map((p) => {
            const taken = takenBy.get(p.id);
            const blocked = Boolean(taken) && !isAdmin;
            return (
              <button
                key={p.id}
                disabled={blocked || saving !== null}
                onClick={() => choose(p.id)}
                className={cn(
                  "card flex flex-col items-center gap-1 p-4 text-center transition active:scale-[0.98]",
                  blocked ? "opacity-40" : "hover:border-brand-400/40 hover:bg-white/5"
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-lg font-bold text-ink-950">
                  {p.name.charAt(0)}
                </span>
                <span className="font-semibold text-white">{p.name}</span>
                {saving === p.id ? (
                  <Spinner className="h-4 w-4 text-brand-300" />
                ) : taken ? (
                  <span className="text-[11px] text-slate-500">{taken}</span>
                ) : (
                  <span className="text-[11px] text-brand-300">Disponible</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <button onClick={logout} className="mx-auto mt-8 block text-sm text-slate-500 hover:text-slate-300">
        Cerrar sesión
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
//  Navegación inferior (estilo app móvil)
// ---------------------------------------------------------------------
function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const items = [
    { href: "/", label: "General", icon: Trophy, exact: true },
    { href: "/deportes", label: "Deportes", icon: LayoutGrid },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
    { href: "/perfil", label: "Perfil", icon: User2 },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-900/90 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-2">
        {items.map((it) => {
          const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition",
                active ? "text-brand-300" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]")} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/70 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
        <span className="text-xl">🏆</span>
        <span className="bg-gradient-to-r from-brand-300 to-sky-300 bg-clip-text text-base font-extrabold tracking-tight text-transparent">
          {APP_NAME}
        </span>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------
//  Guard principal
// ---------------------------------------------------------------------
export function Protected({ children }: { children: ReactNode }) {
  const { user, loading, configured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (configured && !loading && !user) router.replace("/login");
  }, [configured, loading, user, router]);

  if (!configured) return <FirebaseNotConfigured />;
  if (loading) return <FullScreenLoader />;
  if (!user) return <FullScreenLoader label="Redirigiendo…" />;
  if (!user.playerId) return <Onboarding />;

  return (
    <div className="mx-auto min-h-screen max-w-md">
      <Header />
      <main className="px-4 pb-nav pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
