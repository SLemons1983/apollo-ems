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

export default function ApolloBodyOverlayBadge({
  overlay,
}: ApolloBodyOverlayBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950">
      <span>{overlay.label || overlayLabels[overlay.type]}</span>
      {overlay.count !== undefined && overlay.count > 0 && (
        <span className="rounded-full bg-white px-1.5 py-0.5">
          {overlay.count}
        </span>
      )}
    </span>
  );
}
