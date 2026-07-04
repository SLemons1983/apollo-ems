'use client';

import { useState } from 'react';
import ApolloBodyFigure from './ApolloBodyFigure';
import { apolloBodyRegions } from './bodyMapData';
import type {
  ApolloBodyMapMode,
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
  ApolloBodyView,
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
  const [view, setView] = useState<ApolloBodyView>('front');

  const selectedRegionList = apolloBodyRegions.filter(
    (region) => selectedRegions[region.field],
  );

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Apollo Body Map
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Select body regions using the map or the region buttons below.
          </p>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-slate-300 bg-white text-sm font-bold">
          {(['front', 'back'] satisfies ApolloBodyView[]).map((bodyView) => (
            <button
              key={bodyView}
              type="button"
              onClick={() => setView(bodyView)}
              className={`px-4 py-2 capitalize transition ${
                view === bodyView
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {bodyView}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <ApolloBodyFigure
          view={view}
          selectedRegions={selectedRegions}
          regionStatuses={regionStatuses}
          onRegionClick={onRegionClick}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-black text-slate-900">
            Selected Regions ({selectedRegionList.length})
          </div>

          {selectedRegionList.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedRegionList.map((region) => (
                <button
                  key={region.field}
                  type="button"
                  onClick={() => onRegionClick(region.field)}
                  className="flex w-full items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-left text-sm font-semibold text-blue-950 hover:bg-blue-50"
                >
                  <span>{region.label}</span>
                  <span>✓</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-4 text-sm font-semibold text-slate-500">
              No regions selected yet.
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="text-xs font-black uppercase tracking-wide text-slate-600">
              Mode
            </div>
            <div className="mt-1 rounded-full bg-white px-3 py-2 text-sm font-bold capitalize text-slate-800">
              {mode}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
            Tip: select all regions examined, even if no abnormalities were found.
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
