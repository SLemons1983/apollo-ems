'use client';

import type { ApolloBodyRegionKey, ApolloBodyRegionStatus } from './bodyMapTypes';

type ApolloBodyRegionProps = {
  region: ApolloBodyRegionKey;
  label: string;
  status: ApolloBodyRegionStatus;
  onClick: (region: ApolloBodyRegionKey) => void;
  gridClass?: string;
  layoutClass?: string;
};

export default function ApolloBodyRegion({
  region,
  label,
  status,
  onClick,
  gridClass = '',
  layoutClass = '',
}: ApolloBodyRegionProps) {
  const selected = Boolean(status.selected);
  const disabled = Boolean(status.disabled);
  const findingCount = status.findingCount ?? 0;
  const placementClass = layoutClass || gridClass;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(region)}
      aria-pressed={selected}
      className={`${placementClass} ${
        layoutClass ? 'absolute flex items-center justify-center' : ''
      } border px-3 py-3 text-center text-[11px] font-black uppercase tracking-wide transition ${
        selected
          ? 'border-blue-500 bg-blue-100/90 text-blue-950 shadow-md ring-2 ring-blue-300'
          : 'border-blue-300 bg-white/70 text-blue-900 hover:bg-blue-50'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="block leading-tight">{selected ? `✓ ${label}` : label}</span>

      {findingCount > 0 && (
        <span className="ml-1 rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-950">
          {findingCount}
        </span>
      )}

      {status.note && (
        <span className="mt-1 block text-[10px] font-semibold opacity-80">
          {status.note}
        </span>
      )}
    </button>
  );
}
