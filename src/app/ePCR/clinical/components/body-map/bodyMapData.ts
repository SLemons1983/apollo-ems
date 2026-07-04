import type { ApolloBodyRegionKey } from './bodyMapTypes';

export type ApolloBodyRegionDefinition = {
  field: ApolloBodyRegionKey;
  label: string;
  shortLabel: string;
  gridClass: string;
  view: 'front' | 'back' | 'both';
  laterality: 'midline' | 'left' | 'right' | 'bilateral';
  clinicalGroup:
    | 'head-neck'
    | 'torso'
    | 'abdomen-pelvis'
    | 'upper-extremity'
    | 'lower-extremity'
    | 'posterior';
};

export const apolloBodyRegions: ApolloBodyRegionDefinition[] = [
  {
    field: 'head',
    label: 'Head',
    shortLabel: 'Head',
    gridClass: 'col-start-2 row-start-1',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'head-neck',
  },
  {
    field: 'face',
    label: 'Face',
    shortLabel: 'Face',
    gridClass: 'col-start-2 row-start-2',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'head-neck',
  },
  {
    field: 'neck',
    label: 'Neck',
    shortLabel: 'Neck',
    gridClass: 'col-start-2 row-start-3',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'head-neck',
  },
  {
    field: 'leftArm',
    label: 'Left Arm',
    shortLabel: 'L Arm',
    gridClass: 'col-start-1 row-start-4 row-span-2',
    view: 'both',
    laterality: 'left',
    clinicalGroup: 'upper-extremity',
  },
  {
    field: 'chest',
    label: 'Chest',
    shortLabel: 'Chest',
    gridClass: 'col-start-2 row-start-4',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'torso',
  },
  {
    field: 'rightArm',
    label: 'Right Arm',
    shortLabel: 'R Arm',
    gridClass: 'col-start-3 row-start-4 row-span-2',
    view: 'both',
    laterality: 'right',
    clinicalGroup: 'upper-extremity',
  },
  {
    field: 'abdomen',
    label: 'Abdomen',
    shortLabel: 'Abd',
    gridClass: 'col-start-2 row-start-5',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'abdomen-pelvis',
  },
  {
    field: 'pelvis',
    label: 'Pelvis',
    shortLabel: 'Pelvis',
    gridClass: 'col-start-2 row-start-6',
    view: 'front',
    laterality: 'midline',
    clinicalGroup: 'abdomen-pelvis',
  },
  {
    field: 'leftLeg',
    label: 'Left Leg',
    shortLabel: 'L Leg',
    gridClass: 'col-start-1 row-start-7 row-span-2',
    view: 'both',
    laterality: 'left',
    clinicalGroup: 'lower-extremity',
  },
  {
    field: 'back',
    label: 'Back',
    shortLabel: 'Back',
    gridClass: 'col-start-2 row-start-7',
    view: 'back',
    laterality: 'midline',
    clinicalGroup: 'posterior',
  },
  {
    field: 'rightLeg',
    label: 'Right Leg',
    shortLabel: 'R Leg',
    gridClass: 'col-start-3 row-start-7 row-span-2',
    view: 'both',
    laterality: 'right',
    clinicalGroup: 'lower-extremity',
  },
];
