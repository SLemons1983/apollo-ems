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
  patientSex?: string;
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  regionStatuses: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>;
  activeRegion: ApolloBodyRegionKey | null;
  onRegionClick: (region: ApolloBodyRegionKey) => void;
  onFocusRegion: (region: ApolloBodyRegionKey) => void;
  onBlurRegion: () => void;
};

export default function ApolloBodySvg(props: ApolloBodySvgProps) {
  const isFemale = props.patientSex?.trim().toLowerCase() === 'female';
  const illustrationSex = isFemale ? 'female' : 'male';
  const regions =
    props.view === 'front'
      ? bodySvgFront[illustrationSex]
      : bodySvgBack[illustrationSex];
  const imageHref = isFemale
    ? '/epcr/body-map/apollo-body-female.png'
    : '/epcr/body-map/apollo-body-male.png';
  const imagePlacement = isFemale
    ? props.view === 'front'
      ? { x: -3, y: 0, width: 1264, height: 900 }
      : { x: -643, y: 0, width: 1264, height: 900 }
    : props.view === 'front'
      ? { x: -95, y: 0, width: 1350, height: 900 }
      : { x: -684, y: 0, width: 1350, height: 900 };

  if (regions.length === 0) {
    return <ApolloBodyFigure {...props} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300 bg-gradient-to-b from-white to-slate-50 p-2 shadow-inner sm:p-4">
      <svg
        viewBox="0 0 600 900"
        role="img"
        aria-label={`Apollo body map ${props.view} view`}
        className="mx-auto h-auto w-full max-w-md"
      >
        <defs>
          <filter id={`body-shadow-${props.view}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.10" />
          </filter>
        </defs>

        <rect x="0" y="0" width="600" height="900" rx="32" fill="#ffffff" />
        <image
          href={imageHref}
          x={imagePlacement.x}
          y={imagePlacement.y}
          width={imagePlacement.width}
          height={imagePlacement.height}
          preserveAspectRatio="none"
          aria-hidden="true"
          pointerEvents="none"
        />

        <g>
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
              ? 'rgba(34, 197, 94, 0.30)'
              : assessmentState === 'abnormal'
                ? 'rgba(239, 68, 68, 0.30)'
                : assessmentState === 'noted'
                  ? 'rgba(245, 158, 11, 0.30)'
                  : selected
                    ? 'rgba(59, 130, 246, 0.28)'
                    : hasClinicalData
                      ? 'rgba(245, 158, 11, 0.22)'
                      : 'rgba(255, 255, 255, 0.001)';

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
                      : 'transparent';

          return (
            <path
              key={region.id}
              d={region.path}
              fill={fill}
              stroke={stroke}
              strokeWidth={
                active || assessmentState || selected ? 4 : 0
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
              style={{
                transition: 'fill 160ms ease, stroke 160ms ease, stroke-width 160ms ease',
                outline: 'none',
              }}
            />
          );
        })}
        </g>

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
