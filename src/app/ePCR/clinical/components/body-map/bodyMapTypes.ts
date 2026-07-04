export type ApolloBodyRegionKey =
  | 'head'
  | 'face'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'back'
  | 'rightArm'
  | 'leftArm'
  | 'rightLeg'
  | 'leftLeg';

export type ApolloBodyMapMode =
  | 'assessment'
  | 'trauma'
  | 'pain'
  | 'burn'
  | 'stroke'
  | 'procedure';

export type ApolloBodyOverlayType =
  | 'finding'
  | 'cms'
  | 'pain'
  | 'burn'
  | 'deficit'
  | 'procedure'
  | 'treatment';

export type ApolloBodyOverlay = {
  type: ApolloBodyOverlayType;
  label: string;
  count?: number;
};

export type ApolloBodyRegionStatus = {
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  findingCount?: number;
  note?: string;
  overlays?: ApolloBodyOverlay[];
};


export type ApolloBodyView = 'front' | 'back';
