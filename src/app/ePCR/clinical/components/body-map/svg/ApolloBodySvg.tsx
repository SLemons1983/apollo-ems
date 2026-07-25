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
          <linearGradient id={`body-rest-${props.view}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="600" height="900" rx="32" fill="#f8fafc" />
        <ellipse cx="300" cy="887" rx="104" ry="9" fill="#cbd5e1" opacity="0.45" />

        <g filter={`url(#body-shadow-${props.view})`}>
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
                      : `url(#body-rest-${props.view})`;

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
              style={{
                transition: 'fill 160ms ease, stroke 160ms ease, stroke-width 160ms ease',
                outline: 'none',
              }}
            />
          );
        })}
        </g>

        <g
          aria-hidden="true"
          fill="none"
          stroke="#94a3b8"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
          opacity="0.52"
          pointerEvents="none"
        >
          {props.view === 'front' ? (
            <>
              <path d="M270 126 C279 121 288 121 296 125 M304 125 C312 121 321 121 330 126" />
              <path d="M300 132 L297 164 L304 166" />
              <path d="M283 187 C294 193 306 193 317 187" />
              <path d="M241 318 C270 303 330 303 359 318" />
              <path d="M300 307 L300 422" />
              <path d="M272 448 C281 459 319 459 328 448" />
              <circle cx="300" cy="491" r="3" fill="#94a3b8" stroke="none" />
              <path d="M257 665 C270 649 285 644 300 646 C315 644 330 649 343 665" />
              <path d="M222 785 C239 793 259 793 281 787 M319 787 C341 793 361 793 378 785" />
            </>
          ) : (
            <>
              <path d="M258 111 C275 96 325 96 342 111" />
              <path d="M300 292 L300 568" />
              <path d="M239 324 C262 304 281 298 300 300 C319 298 338 304 361 324" />
              <path d="M246 379 C269 392 331 392 354 379" />
              <path d="M250 520 C271 507 329 507 350 520" />
              <path d="M257 665 C270 649 285 644 300 646 C315 644 330 649 343 665" />
              <path d="M222 785 C239 793 259 793 281 787 M319 787 C341 793 361 793 378 785" />
            </>
          )}
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
