'use client';

import type { ApolloBodyRegionKey, ApolloBodyRegionStatus } from './bodyMapTypes';

type ApolloBodyRegionProps = {
  region: ApolloBodyRegionKey;
  label: string;
  gridClass: string;
  status: ApolloBodyRegionStatus;
  onClick: (region: ApolloBodyRegionKey) => void;
};

export default function ApolloBodyRegion({
  region,
  label,
  gridClass,
  status,
  onClick,
}: ApolloBodyRegionProps) {
  const selected = Boolean(status.selected);
  const disabled = Boolean(status.disabled);
  const findingCount = status.findingCount ?? 0;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(region)}
      aria-pressed={selected}
      className={`${gridClass} rounded-2xl border px-3 py-4 text-center text-xs font-black uppercase tracking-wide transition ${
        selected
          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
          : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="block">{selected ? `✓ ${label}` : label}</span>

      {findingCount > 0 && (
        <span className="mt-1 block text-[10px] font-bold opacity-80">
          {findingCount} finding{findingCount === 1 ? '' : 's'}
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
