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
    <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
            Physical Assessment
          </div>
          <h4 className="mt-1 text-lg font-black text-slate-950">
            {modeConfig.title}
          </h4>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Tap the patient where you found a problem or need to document the exam.
          </p>
        </div>
      </div>
      </div>

      <div className="p-3 sm:p-5">
      <div className="grid grid-cols-2 gap-2 sm:gap-6">
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

      <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
        <span><span className="text-blue-600">●</span> Selected</span>
        <span><span className="text-amber-500">●</span> In Progress</span>
        <span><span className="text-emerald-600">●</span> Unremarkable</span>
        <span><span className="text-red-600">●</span> Abnormal</span>
      </div>
      <div className="mt-3 text-center text-[11px] font-semibold text-slate-500">
        Tap any highlighted region again to review or update its findings.
      </div>
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
