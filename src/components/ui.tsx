"use client";
// =====================================================================
//  Primitivas de interfaz reutilizables
// =====================================================================
import { cn } from "@/lib/helpers";
import { pairColor } from "@/lib/helpers";
import type { ReactNode } from "react";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className ?? "h-5 w-5"
      )}
      aria-hidden
    />
  );
}

export function FullScreenLoader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-400">
      <Spinner className="h-8 w-8 text-brand-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("card p-4", className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      {icon && <div className="text-3xl opacity-80">{icon}</div>}
      <p className="font-semibold text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

/** Avatar circular con gradiente del color de la pareja. */
export function PairBadge({
  colorKey,
  initials,
  size = 40,
  rank,
}: {
  colorKey?: string;
  initials: string;
  size?: number;
  rank?: number;
}) {
  const c = pairColor(colorKey);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-md ring-2"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        // @ts-expect-error css var
        "--tw-ring-color": `${c.ring}66`,
      }}
    >
      {initials}
      {rank && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
          {rank}
        </span>
      )}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[88vh] w-full max-w-md animate-fade-up overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-850 p-5 shadow-2xl sm:rounded-3xl safe-bottom">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
