export type ClinicalListType = 'impression' | 'symptom' | 'conditionCode';

export type ClinicalOption = {
  code: string;
  category: string;
  sourceLabel: string;
  suggestedLabel: string;
  note: string;
};
