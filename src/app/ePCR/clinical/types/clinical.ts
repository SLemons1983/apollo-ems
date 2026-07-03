export type ProviderScope = 'EMT' | 'AEMT' | 'Paramedic' | 'Critical Care';

export type ConsiderationType =
  | 'documentation'
  | 'clinical'
  | 'protocol'
  | 'tool'
  | 'medical-control';

export type ClinicalConsideration = {
  id: string;
  type: ConsiderationType;
  title: string;
  message: string;
  rationale?: string;
  providerScopes?: ProviderScope[];
  categories?: string[];
  relatedKeywords?: string[];
};
