import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';

export type ApolloClinicalOverlayType =
  | 'finding'
  | 'pain'
  | 'burn'
  | 'cms'
  | 'procedure'
  | 'treatment'
  | 'deficit'
  | 'device'
  | 'landmark';

export type ApolloClinicalOverlayColor =
  | 'blue'
  | 'amber'
  | 'red'
  | 'green';

export type ApolloClinicalOverlay = {
  id: string;
  region: ApolloBodyRegionKey;
  type: ApolloClinicalOverlayType;
  label: string;
  value?: string;
  severity?: number;
  laterality?: 'left' | 'right' | 'bilateral' | 'midline';
  color?: ApolloClinicalOverlayColor;
  metadata?: Record<string, string | number | boolean>;
};
