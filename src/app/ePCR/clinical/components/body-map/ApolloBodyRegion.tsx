'use client';

import type { ApolloBodyRegionKey, ApolloBodyRegionStatus } from './bodyMapTypes';

type ApolloBodyRegionProps = {
  region: ApolloBodyRegionKey;
  label: string;
  status: ApolloBodyRegionStatus;
  onClick: (region: ApolloBodyRegionKey) => void;
  onFocusRegion?: (region: ApolloBodyRegionKey) => void;
  onBlurRegion?: () => void;
  active?: boolean;
  gridClass?: string;
  layoutClass?: string;
};

export default function ApolloBodyRegion({
  region,
  label,
  status,
  onClick,
  onFocusRegion,
  onBlurRegion,
  active = false,
  gridClass = '',
  layoutClass = '',
}: ApolloBodyRegionProps) {
  const selected = Boolean(status.selected);
  const disabled = Boolean(status.disabled);
  const findingCount = status.findingCount ?? 0;
  const hasClinicalData = findingCount > 0 || Boolean(status.note);
  const placementClass = layoutClass || gridClass;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(region)}
      onMouseEnter={() => onFocusRegion?.(region)}
      onMouseLeave={() => onBlurRegion?.()}
      onFocus={() => onFocusRegion?.(region)}
      onBlur={() => onBlurRegion?.()}
      aria-pressed={selected}
      aria-label={`${label}${selected ? ', selected' : ''}${
        hasClinicalData ? ', has documented clinical data' : ''
      }`}
      className={`${placementClass} ${
        layoutClass ? 'absolute flex items-center justify-center' : ''
      } border px-3 py-3 text-center text-[11px] font-black uppercase tracking-wide transition ${
        selected
          ? hasClinicalData
            ? 'border-amber-500 bg-amber-100/90 text-amber-950 shadow-md ring-2 ring-amber-300'
            : 'border-blue-500 bg-blue-100/90 text-blue-950 shadow-md ring-2 ring-blue-300'
          : hasClinicalData
            ? 'border-amber-300 bg-amber-50/90 text-amber-950 hover:bg-amber-100'
            : 'border-blue-300 bg-white/70 text-blue-900 hover:bg-blue-50'
      } ${
        active ? 'scale-[1.03] ring-4 ring-slate-300' : ''
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      <span className="block leading-tight">{selected ? `✓ ${label}` : label}</span>

      {findingCount > 0 && (
        <span className="ml-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-black text-amber-950">
          {findingCount}
        </span>
      )}
    </button>
  );
}
