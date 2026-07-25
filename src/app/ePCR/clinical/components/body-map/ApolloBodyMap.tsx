'use client';

import { useState } from 'react';
import ApolloBodySvg from './svg/ApolloBodySvg';
import { apolloBodyMapModeConfig } from './bodyMapModeConfig';
import {
  buildBodyRegionStatusesFromClinicalOverlays,
  mergeBodyRegionStatuses,
} from '../../body-map/renderer';
import type { ApolloClinicalOverlay } from '../../body-map/types';
import type {
  ApolloBodyMapMode,
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
} from './bodyMapTypes';

type ApolloBodyMapProps = {
  patientSex?: string;
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  focusedRegion?: ApolloBodyRegionKey | '';
  onRegionClick: (region: ApolloBodyRegionKey) => void;
  mode?: ApolloBodyMapMode;
  regionStatuses?: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>;
  clinicalOverlays?: ApolloClinicalOverlay[];
};

export default function ApolloBodyMap({
  patientSex = '',
  selectedRegions,
  focusedRegion = '',
  onRegionClick,
  mode = 'assessment',
  regionStatuses = {},
  clinicalOverlays = [],
}: ApolloBodyMapProps) {
  const [hoveredRegion, setHoveredRegion] =
    useState<ApolloBodyRegionKey | null>(null);

  const modeConfig = apolloBodyMapModeConfig[mode];
  const combinedRegionStatuses = mergeBodyRegionStatuses(
    regionStatuses,
    buildBodyRegionStatusesFromClinicalOverlays(clinicalOverlays),
  );

  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
            {modeConfig.title}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Tap the area you need to assess on the front or back view.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        {(['front', 'back'] as const).map((view) => (
          <div key={view} className="min-w-0">
            <div className="mb-2 text-center text-xs font-black uppercase tracking-wide text-slate-600">
              {view}
            </div>
            <ApolloBodySvg
              view={view}
              patientSex={patientSex}
              selectedRegions={selectedRegions}
              regionStatuses={combinedRegionStatuses}
              activeRegion={hoveredRegion || focusedRegion || null}
              onRegionClick={onRegionClick}
              onFocusRegion={setHoveredRegion}
              onBlurRegion={() => setHoveredRegion(null)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        <span><span className="text-blue-600">●</span> Selected</span>
        <span><span className="text-amber-500">●</span> In Progress</span>
        <span><span className="text-emerald-600">●</span> Unremarkable</span>
        <span><span className="text-red-600">●</span> Abnormal</span>
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
