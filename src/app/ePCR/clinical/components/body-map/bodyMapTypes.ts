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

export type ApolloBodyOverlayColor =
  | 'blue'
  | 'amber'
  | 'red'
  | 'green';

export type ApolloBodyOverlay = {
  type: ApolloBodyOverlayType;
  label: string;
  value?: string;
  count?: number;
  severityLabel?: string;
  color?: ApolloBodyOverlayColor;
};

export type ApolloBodyAssessmentState =
  | 'pending'
  | 'unremarkable'
  | 'abnormal'
  | 'noted';

export type ApolloBodyRegionStatus = {
  selected?: boolean;
  disabled?: boolean;
  highlighted?: boolean;
  assessmentState?: ApolloBodyAssessmentState;
  findingCount?: number;
  note?: string;
  overlays?: ApolloBodyOverlay[];
};


export type ApolloBodyView = 'front' | 'back';
