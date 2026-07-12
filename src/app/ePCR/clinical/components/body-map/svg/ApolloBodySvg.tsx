'use client';

import ApolloBodyFigure from '../ApolloBodyFigure';
import type {
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
  ApolloBodyView,
} from '../bodyMapTypes';
import { bodySvgFront } from './bodySvgFront';
import { bodySvgBack } from './bodySvgBack';

type ApolloBodySvgProps = {
  view: ApolloBodyView;
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  regionStatuses: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>;
  activeRegion: ApolloBodyRegionKey | null;
  onRegionClick: (region: ApolloBodyRegionKey) => void;
  onFocusRegion: (region: ApolloBodyRegionKey) => void;
  onBlurRegion: () => void;
};

export default function ApolloBodySvg(props: ApolloBodySvgProps) {
  const regions = props.view === 'front' ? bodySvgFront : bodySvgBack;

  if (regions.length === 0) {
    return <ApolloBodyFigure {...props} />;
  }

  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label={`Apollo body map ${props.view} view`}
        className="mx-auto h-auto w-full max-w-md"
      >
        <rect x="0" y="0" width="600" height="900" rx="32" fill="#f8fafc" />

        {regions.map((region) => {
          const selected = props.selectedRegions[region.id];
          const status = props.regionStatuses[region.id];
          const hasClinicalData =
            (status?.findingCount ?? 0) > 0 ||
            Boolean(status?.note) ||
            Boolean(status?.overlays?.length);
          const active = props.activeRegion === region.id;
          const assessmentState = status?.assessmentState;

          const fill =
            assessmentState === 'unremarkable'
              ? '#dcfce7'
              : assessmentState === 'abnormal'
                ? '#fee2e2'
                : assessmentState === 'noted'
                  ? '#fef3c7'
                  : selected
                    ? '#dbeafe'
                    : hasClinicalData
                      ? '#fffbeb'
                      : '#ffffff';

          const stroke =
            active
              ? '#0f172a'
              : assessmentState === 'unremarkable'
                ? '#16a34a'
                : assessmentState === 'abnormal'
                  ? '#dc2626'
                  : assessmentState === 'noted'
                    ? '#d97706'
                    : selected
                      ? '#2563eb'
                      : '#64748b';

          return (
            <path
              key={region.id}
              d={region.path}
              fill={fill}
              stroke={stroke}
              strokeWidth={
                active || assessmentState || selected ? 4 : 2
              }
              onClick={() => props.onRegionClick(region.id)}
              onMouseEnter={() => props.onFocusRegion(region.id)}
              onMouseLeave={props.onBlurRegion}
              onFocus={() => props.onFocusRegion(region.id)}
              onBlur={props.onBlurRegion}
              tabIndex={0}
              role="button"
              aria-pressed={selected}
              aria-label={region.label}
              className="cursor-pointer transition"
            />
          );
        })}

        {regions.map((region) => {
          const status = props.regionStatuses[region.id];
          const count = status?.overlays?.length ?? status?.findingCount ?? 0;

          if (!count) {
            return null;
          }

          return (
            <text
              key={`${region.id}-count`}
              x="300"
              y="40"
              className="hidden"
            >
              {region.label}: {count}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
