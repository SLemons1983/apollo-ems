import type { ApolloBodyRegionKey } from './bodyMapTypes';

export type ApolloBodyRegionDefinition = {
  field: ApolloBodyRegionKey;
  label: string;
  gridClass: string;
  view: 'front' | 'back' | 'both';
};

export const apolloBodyRegions: ApolloBodyRegionDefinition[] = [
  { field: 'head', label: 'Head', gridClass: 'col-start-2 row-start-1', view: 'front' },
  { field: 'face', label: 'Face', gridClass: 'col-start-2 row-start-2', view: 'front' },
  { field: 'neck', label: 'Neck', gridClass: 'col-start-2 row-start-3', view: 'front' },
  { field: 'leftArm', label: 'Left Arm', gridClass: 'col-start-1 row-start-4 row-span-2', view: 'both' },
  { field: 'chest', label: 'Chest', gridClass: 'col-start-2 row-start-4', view: 'front' },
  { field: 'rightArm', label: 'Right Arm', gridClass: 'col-start-3 row-start-4 row-span-2', view: 'both' },
  { field: 'abdomen', label: 'Abdomen', gridClass: 'col-start-2 row-start-5', view: 'front' },
  { field: 'pelvis', label: 'Pelvis', gridClass: 'col-start-2 row-start-6', view: 'front' },
  { field: 'leftLeg', label: 'Left Leg', gridClass: 'col-start-1 row-start-7 row-span-2', view: 'both' },
  { field: 'back', label: 'Back', gridClass: 'col-start-2 row-start-7', view: 'back' },
  { field: 'rightLeg', label: 'Right Leg', gridClass: 'col-start-3 row-start-7 row-span-2', view: 'both' },
];
