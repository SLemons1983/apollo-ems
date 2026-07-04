import type { ApolloBodyMapMode } from './bodyMapTypes';

export type ApolloBodyMapModeConfig = {
  title: string;
  instructions: string;
  selectedLegend: string;
  clinicalDataLegend: string;
  emptyState: string;
  tip: string;
};

export const apolloBodyMapModeConfig: Record<
  ApolloBodyMapMode,
  ApolloBodyMapModeConfig
> = {
  assessment: {
    title: 'Apollo Body Map',
    instructions: 'Select body regions relevant to this assessment.',
    selectedLegend: 'Blue = selected / assessed region',
    clinicalDataLegend: 'Amber = documented clinical data',
    emptyState: 'No regions selected yet.',
    tip: 'Tip: select regions that were assessed or are clinically relevant.',
  },
  trauma: {
    title: 'Trauma Body Map',
    instructions:
      'Select all body regions examined, then document DCAP-BTLS findings and CMS where appropriate.',
    selectedLegend: 'Blue = selected / examined region',
    clinicalDataLegend: 'Amber = documented findings or CMS',
    emptyState: 'No trauma regions selected yet.',
    tip: 'Tip: select all regions examined, even if no abnormalities were found.',
  },
  pain: {
    title: 'Pain Location Map',
    instructions: 'Select the region where pain is present or radiates.',
    selectedLegend: 'Blue = selected pain location',
    clinicalDataLegend: 'Amber = documented pain details',
    emptyState: 'No pain locations selected yet.',
    tip: 'Tip: pain location can later support OPQRST and narrative generation.',
  },
  burn: {
    title: 'Burn Map',
    instructions: 'Select burned regions for burn size and depth documentation.',
    selectedLegend: 'Blue = selected burn region',
    clinicalDataLegend: 'Amber = documented burn details',
    emptyState: 'No burn regions selected yet.',
    tip: 'Tip: burn overlays will later support TBSA and depth documentation.',
  },
  stroke: {
    title: 'Stroke / Neuro Deficit Map',
    instructions: 'Select regions affected by weakness, numbness, or deficits.',
    selectedLegend: 'Blue = selected deficit region',
    clinicalDataLegend: 'Amber = documented neuro findings',
    emptyState: 'No deficit regions selected yet.',
    tip: 'Tip: stroke mapping will later support side-specific neuro reassessments.',
  },
  procedure: {
    title: 'Procedure Location Map',
    instructions: 'Select where procedures, treatments, or devices were placed.',
    selectedLegend: 'Blue = selected procedure region',
    clinicalDataLegend: 'Amber = documented procedures or treatments',
    emptyState: 'No procedure regions selected yet.',
    tip: 'Tip: this map will later support IV, IO, splint, dressing, and tourniquet locations.',
  },
};
