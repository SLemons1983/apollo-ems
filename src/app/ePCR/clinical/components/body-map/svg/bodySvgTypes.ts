import type { ApolloBodyRegionKey } from '../bodyMapTypes';

export type ApolloBodySvgRegion = {
  id: ApolloBodyRegionKey;
  path: string;
  label: string;
};

export type ApolloBodySvgSex = 'male' | 'female';
