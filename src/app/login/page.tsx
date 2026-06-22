"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User2, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { APP_NAME } from "@/lib/constants";
import { Spinner } from "@/components/ui";

function translateError(code?: string): string {
  switch (code) {
    case "auth/invalid-email": return "El correo no es válido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Correo o contraseña incorrectos.";
    case "auth/email-already-in-use": return "Ese correo ya está registrado. Inicia sesión.";
    case "auth/weak-password": return "La contraseña debe tener al menos 6 caracteres.";
    case "auth/popup-closed-by-user": return "Has cerrado la ventana de Google.";
    case "auth/popup-blocked": return "El navegador bloqueó la ventana emergente.";
    case "auth/operation-not-allowed": return "Método no habilitado en Firebase.";
    default: return "No se pudo completar. Inténtalo de nuevo.";
  }
}

export default function LoginPage() {
  const { user, loading, configured, signInGoogle, signInEmail, signUpEmail } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  if (!configured) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-5xl">🔧</div>
        <h1 className="text-xl font-bold text-white">Falta configurar Firebase</h1>
        <p className="text-sm text-slate-400">
          Define las variables <code className="text-brand-300">NEXT_PUBLIC_FIREBASE_*</code> en Vercel o en tu <code>.env.local</code>.
        </p>
      </div>
    );
  }

  const google = async () => {
    setError(null);
    setBusy("google");
    try {
      await signInGoogle();
    } catch (e: any) {
      setError(translateError(e?.code));
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy("email");
    try {
      if (mode === "login") await signInEmail(email.trim(), password);
      else await signUpEmail(name.trim(), email.trim(), password);
    } catch (e: any) {
      setError(translateError(e?.code));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center animate-fade-up">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-4xl shadow-glow">
          🏆
        </div>
        <h1 className="bg-gradient-to-r from-brand-300 to-sky-300 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {APP_NAME}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Inicia sesión para ver y seguir el torneo.
        </p>
      </div>

      <div className="card space-y-4 p-5 animate-fade-up">
        <button onClick={google} disabled={busy !== null} className="btn-ghost w-full">
          {busy === "google" ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <>
              <GoogleIcon />
              Continuar con Google
            </>
          )}
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="h-px flex-1 bg-white/10" />
          o con tu correo
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "register" && (
            <Field icon={<User2 className="h-4 w-4" />}>
              <input
                className="input pl-10"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </Field>
          )}
          <Field icon={<Mail className="h-4 w-4" />}>
            <input
              className="input pl-10"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          <Field icon={<Lock className="h-4 w-4" />}>
            <input
              className="input pl-10"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>
          )}

          <button type="submit" disabled={busy !== null} className="btn-primary w-full">
            {busy === "email" ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <>
                {mode === "login" ? "Entrar" : "Crear cuenta"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400">
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="font-semibold text-brand-300 hover:text-brand-200"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        {icon}
      </span>
      {children}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 8.1 29.3 6 24 6 11.8 6 2 15.8 2 28s9.8 22 22 22 22-9.8 22-22c0-1.5-.2-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" transform="translate(0 2)" />
      <path fill="#4CAF50" d="M24 50c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 45.6 16.2 50 24 50z" transform="translate(0 -2)" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.2 5.2c-.4.4 6.6-4.8 6.6-14.6 0-1.5-.2-2.6-.4-4z" />
    </svg>
  );
}
