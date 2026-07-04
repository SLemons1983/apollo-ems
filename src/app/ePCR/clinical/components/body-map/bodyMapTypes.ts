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

export type ApolloBodyRegionStatus = {
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  findingCount?: number;
  note?: string;
};


export type ApolloBodyView = 'front' | 'back';
