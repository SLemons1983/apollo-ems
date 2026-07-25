import type { ApolloBodyRegionKey } from '../bodyMapTypes';

export type ApolloBodySvgRegion = {
  id: ApolloBodyRegionKey;
  path: string;
  label: string;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export type ApolloBodySvgSex = 'male' | 'female';

export type ApolloBodySvgLayout = {
  canvasWidth: number;
  canvasHeight: number;
  viewBox: string;
};
