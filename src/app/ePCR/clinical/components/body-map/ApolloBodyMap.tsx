'use client';

import ApolloBodyRegion from './ApolloBodyRegion';
import { apolloBodyRegions } from './bodyMapData';
import type {
  ApolloBodyMapMode,
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
} from './bodyMapTypes';

type ApolloBodyMapProps = {
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  onRegionClick: (region: ApolloBodyRegionKey) => void;
  mode?: ApolloBodyMapMode;
  regionStatuses?: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>;
};

export default function ApolloBodyMap({
  selectedRegions,
  onRegionClick,
  mode = 'assessment',
  regionStatuses = {},
}: ApolloBodyMapProps) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Apollo Body Map
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Select body regions using the map or the region buttons below.
          </p>
        </div>

        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
          {mode}
        </div>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-3 grid-rows-8 gap-2">
        {apolloBodyRegions.map((region) => (
          <ApolloBodyRegion
            key={region.field}
            region={region.field}
            label={region.label}
            gridClass={region.gridClass}
            status={{
              ...regionStatuses[region.field],
              selected: selectedRegions[region.field],
            }}
            onClick={onRegionClick}
          />
        ))}
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
