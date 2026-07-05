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

  // Until the anatomical SVG is populated, continue using the
  // current renderer so nothing regresses.
  if (regions.length === 0) {
    return <ApolloBodyFigure {...props} />;
  }

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4">
      <svg
        viewBox="0 0 600 900"
        className="mx-auto h-auto w-full max-w-md"
      >
        {regions.map((region) => (
          <path
            key={region.id}
            d={region.path}
            fill={
              props.selectedRegions[region.id]
                ? '#3b82f6'
                : '#f8fafc'
            }
            stroke="#475569"
            strokeWidth="2"
            onClick={() => props.onRegionClick(region.id)}
            onMouseEnter={() => props.onFocusRegion(region.id)}
            onMouseLeave={props.onBlurRegion}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </svg>
    </div>
  );
}
