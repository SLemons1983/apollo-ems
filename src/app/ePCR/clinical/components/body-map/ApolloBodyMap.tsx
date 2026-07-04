'use client';

import { useState } from 'react';
import ApolloBodyFigure from './ApolloBodyFigure';
import { apolloBodyRegions } from './bodyMapData';
import ApolloBodyOverlayBadge from './ApolloBodyOverlayBadge';
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
  const [activeRegion, setActiveRegion] = useState<ApolloBodyRegionKey | null>(
    null,
  );

  const selectedRegionList = apolloBodyRegions.filter(
    (region) => selectedRegions[region.field],
  );

  const activeRegionDefinition = activeRegion
    ? apolloBodyRegions.find((region) => region.field === activeRegion)
    : null;

  const activeStatus = activeRegion ? regionStatuses[activeRegion] : undefined;

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
          activeRegion={activeRegion}
          onRegionClick={onRegionClick}
          onFocusRegion={setActiveRegion}
          onBlurRegion={() => setActiveRegion(null)}
        />

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">
              Current Focus
            </div>
            <div className="mt-1 text-sm font-black text-slate-900">
              {activeRegionDefinition?.label || 'None'}
            </div>
            {activeStatus?.note && (
              <div className="mt-1 text-xs font-bold text-amber-700">
                {activeStatus.note}
              </div>
            )}

            {activeStatus?.overlays && activeStatus.overlays.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {activeStatus.overlays.map((overlay) => (
                  <ApolloBodyOverlayBadge
                    key={`${activeRegion}-${overlay.type}-${overlay.label}`}
                    overlay={overlay}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 text-sm font-black text-slate-900">
            Selected Regions ({selectedRegionList.length})
          </div>

          {selectedRegionList.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selectedRegionList.map((region) => {
                const status = regionStatuses[region.field];
                const findingCount = status?.findingCount ?? 0;

                return (
                  <button
                    key={region.field}
                    type="button"
                    onMouseEnter={() => setActiveRegion(region.field)}
                    onMouseLeave={() => setActiveRegion(null)}
                    onFocus={() => setActiveRegion(region.field)}
                    onBlur={() => setActiveRegion(null)}
                    onClick={() => onRegionClick(region.field)}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-left text-sm font-semibold hover:bg-blue-50 ${
                      findingCount > 0
                        ? 'border-amber-300 text-amber-950'
                        : 'border-blue-200 text-blue-950'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span>{region.label}</span>
                      <span>✓</span>
                    </span>

                    {status?.note && (
                      <span className="mt-1 block text-xs font-bold text-slate-600">
                        {status.note}
                      </span>
                    )}

                    {status?.overlays && status.overlays.length > 0 && (
                      <span className="mt-2 flex flex-wrap gap-1">
                        {status.overlays.map((overlay) => (
                          <ApolloBodyOverlayBadge
                            key={`${region.field}-${overlay.type}-${overlay.label}`}
                            overlay={overlay}
                          />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
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

          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-blue-500 bg-blue-100" />
              <span>Blue = selected / examined region</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full border border-amber-500 bg-amber-100" />
              <span>Amber = documented findings or CMS</span>
            </div>
            <div className="pt-2 text-slate-500">
              Tip: select all regions examined, even if no abnormalities were found.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
