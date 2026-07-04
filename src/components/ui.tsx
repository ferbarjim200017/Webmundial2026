"use client";
// =====================================================================
//  Primitivas de interfaz reutilizables
// =====================================================================
import { cn } from "@/lib/helpers";
import { pairColor } from "@/lib/helpers";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
      <div className="flex items-start gap-2.5">
        <span className="mt-1 block h-8 w-1 rounded-full bg-gradient-to-b from-brand-300 to-brand-600" />
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-white">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl text-slate-400 ring-1 ring-white/10">
          {icon}
        </div>
      )}
      <p className="font-display text-base font-bold text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-sm leading-relaxed text-slate-400">{hint}</p>}
    </div>
  );
}

/** Avatar circular: foto de la pareja si la tiene, o iniciales con gradiente. */
export function PairBadge({
  colorKey,
  initials,
  size = 40,
  rank,
  photoUrl,
}: {
  colorKey?: string;
  initials: string;
  size?: number;
  rank?: number;
  photoUrl?: string | null;
}) {
  const c = pairColor(colorKey);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold text-white shadow-md ring-2"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        backgroundImage: photoUrl ? undefined : `linear-gradient(135deg, ${c.from}, ${c.to})`,
        // @ts-expect-error css var
        "--tw-ring-color": `${c.ring}66`,
      }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
      {rank && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
          {rank}
        </span>
      )}
    </span>
  );
}

/** Avatar circular de un jugador (inicial + color). */
export function PlayerBadge({
  name,
  size = 40,
  rank,
  colorKey,
}: {
  name: string;
  size?: number;
  rank?: number;
  colorKey?: string;
}) {
  const c = pairColor(colorKey);
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white shadow-md ring-2"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundImage: `linear-gradient(135deg, ${c.from}, ${c.to})`,
        // @ts-expect-error css var
        "--tw-ring-color": `${c.ring}66`,
      }}
    >
      {(name || "?").charAt(0).toUpperCase()}
      {rank && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-900 text-[10px] font-bold text-slate-200 ring-1 ring-white/10">
          {rank}
        </span>
      )}
    </span>
  );
}

/** Visor de foto a pantalla completa (estilo WhatsApp). */
export function PhotoLightbox({
  open,
  onClose,
  src,
  title,
  subtitle,
}: {
  open: boolean;
  onClose: () => void;
  src?: string | null;
  title?: string;
  subtitle?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted || !src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4">
        <div className="min-w-0">
          {title && <p className="truncate text-base font-bold text-white">{title}</p>}
          {subtitle && <p className="truncate text-xs text-slate-400">{subtitle}</p>}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-2 text-2xl leading-none text-white/80 hover:bg-white/10"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title ?? ""}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[80vh] w-auto max-w-full animate-pop-in rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </div>,
    document.body
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
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Bloquea el scroll del fondo mientras el modal está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

  // Portal a <body> para escapar de cualquier ancestro con transform/filter
  // (las animaciones de página dejan un transform que rompería el position:fixed).
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ink-850 shadow-2xl animate-fade-up sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h3 className="font-display text-base font-bold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 safe-bottom">{children}</div>
      </div>
    </div>,
    document.body
  );
}
