"use client";
// =====================================================================
//  Gráfica de evolución de puntos de un jugador (SVG a medida)
// =====================================================================
import { useState } from "react";
import type { PlayerSportStat } from "@/lib/types";

// Colores tomados de la marca del proyecto (tailwind.config.ts)
const LINE = "#34d399"; // brand-400
const SURFACE = "#0b1220"; // ink-900 (anillo de los marcadores)
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "#64748b"; // slate-500
const VALUE = "#e2e8f0"; // slate-200
const MEDAL_COLOR: Record<string, string> = {
  gold: "#fbbf24",
  silver: "#cbd5e1",
  bronze: "#d97706",
};

/**
 * Serie única: puntos acumulados del jugador a lo largo de los deportes.
 * Área + línea, un marcador por deporte coloreado según la medalla lograda, y
 * un tooltip al pasar el ratón o tocar. Al ser una sola serie no lleva leyenda:
 * el título de la tarjeta ya la nombra, y el desglose de debajo hace de "tabla".
 */
export function PlayerProgressChart({ data }: { data: PlayerSportStat[] }) {
  const [active, setActive] = useState<number | null>(null);

  const n = data.length;
  const maxCum = Math.max(0, ...data.map((d) => d.cumulative));

  if (n < 2 || maxCum === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-slate-400">
        {n < 2
          ? "Hará falta más de un deporte para ver la evolución."
          : "Cuando sume puntos, aquí verás su evolución."}
      </div>
    );
  }

  const W = 340;
  const H = 200;
  const padL = 28;
  const padR = 14;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const baseY = padT + plotH;

  const niceMax = maxCum <= 4 ? 4 : Math.ceil(maxCum / 2) * 2;
  const x = (i: number) => padL + (plotW * i) / (n - 1);
  const y = (v: number) => baseY - (v / niceMax) * plotH;

  const pts = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.cumulative) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.cx.toFixed(1)},${p.cy.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${pts[n - 1].cx.toFixed(1)},${baseY} L${pts[0].cx.toFixed(1)},${baseY} Z`;
  const ticks = [0, niceMax / 2, niceMax];
  const bandW = plotW / (n - 1);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        className="block touch-pan-y"
        role="img"
        aria-label="Evolución de puntos acumulados por deporte"
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id="ppArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity="0.35" />
            <stop offset="100%" stopColor={LINE} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Líneas guía + etiquetas del eje Y */}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill={AXIS}>
              {t}
            </text>
          </g>
        ))}

        {/* Área y línea */}
        <path d={areaPath} fill="url(#ppArea)" />
        <path
          d={linePath}
          fill="none"
          stroke={LINE}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Línea vertical del punto activo */}
        {active !== null && (
          <line
            x1={pts[active].cx}
            y1={padT}
            x2={pts[active].cx}
            y2={baseY}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {/* Marcadores, valores y emojis de cada deporte */}
        {pts.map((p, i) => {
          const color = p.medal ? MEDAL_COLOR[p.medal] : LINE;
          const isActive = active === i;
          return (
            <g key={p.sportId}>
              <text x={p.cx} y={p.cy - 9} textAnchor="middle" fontSize="11" fontWeight="700" fill={VALUE}>
                {p.cumulative}
              </text>
              <circle
                cx={p.cx}
                cy={p.cy}
                r={isActive ? 6 : 4}
                fill={color}
                stroke={SURFACE}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
              <text x={p.cx} y={baseY + 17} textAnchor="middle" fontSize="13">
                {p.sportEmoji}
              </text>
              {/* Zona sensible (hover / tap) que cubre toda la columna */}
              <rect
                x={p.cx - bandW / 2}
                y={padT}
                width={bandW}
                height={plotH}
                fill="transparent"
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {active !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-ink-800/95 px-2.5 py-1.5 text-center shadow-lg backdrop-blur"
          style={{
            left: `${Math.min(85, Math.max(15, (pts[active].cx / W) * 100))}%`,
            top: `${(pts[active].cy / H) * 100}%`,
            marginTop: -10,
          }}
        >
          <p className="whitespace-nowrap text-xs font-bold text-white">
            {pts[active].sportEmoji} {pts[active].sportName}
          </p>
          <p className="whitespace-nowrap text-[11px] text-slate-300">
            {pts[active].points > 0 ? `+${pts[active].points} pts` : "sin puntos"} · {pts[active].cumulative} acum.
          </p>
        </div>
      )}
    </div>
  );
}
