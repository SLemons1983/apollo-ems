'use client';

import type { ApolloBodyOverlay } from './bodyMapTypes';

type ApolloBodyOverlayBadgeProps = {
  overlay: ApolloBodyOverlay;
};

const overlayLabels: Record<ApolloBodyOverlay['type'], string> = {
  finding: 'Findings',
  cms: 'CMS',
  pain: 'Pain',
  burn: 'Burn',
  deficit: 'Deficit',
  procedure: 'Procedure',
  treatment: 'Treatment',
};

const colorClasses: Record<NonNullable<ApolloBodyOverlay['color']>, string> = {
  blue: 'border-blue-300 bg-blue-50 text-blue-950',
  amber: 'border-amber-300 bg-amber-50 text-amber-950',
  red: 'border-red-300 bg-red-50 text-red-950',
  green: 'border-emerald-300 bg-emerald-50 text-emerald-950',
};

export default function ApolloBodyOverlayBadge({
  overlay,
}: ApolloBodyOverlayBadgeProps) {
  const colorClass = colorClasses[overlay.color ?? 'amber'];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${colorClass}`}
    >
      <span>{overlay.label || overlayLabels[overlay.type]}</span>
      {overlay.severityLabel && (
        <span className="rounded-full bg-white/80 px-1.5 py-0.5">
          {overlay.severityLabel}
        </span>
      )}
      {!overlay.severityLabel &&
        overlay.count !== undefined &&
        overlay.count > 0 && (
          <span className="rounded-full bg-white/80 px-1.5 py-0.5">
            {overlay.count}
          </span>
        )}
    </span>
  );
}
