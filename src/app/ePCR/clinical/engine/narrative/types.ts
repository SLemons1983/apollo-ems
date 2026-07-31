import type {
  ClinicalFact,
  ClinicalFactId,
  ClinicalFactValue,
} from '../facts/types';

export type NarrativeFragmentId = string;

export type NarrativeFragmentSection =
  | 'assessment'
  | 'vitals'
  | 'treatments'
  | 'outcome';

export type NarrativeFragmentPriority =
  | 'routine'
  | 'important'
  | 'critical';

export type NarrativeFactOperator =
  | 'exists'
  | 'equals'
  | 'not-equals'
  | 'includes'
  | 'greater-than'
  | 'greater-than-or-equal'
  | 'less-than'
  | 'less-than-or-equal';

export type NarrativeFactCondition = {
  readonly factId: ClinicalFactId;
  readonly operator: NarrativeFactOperator;
  readonly value?: ClinicalFactValue;
};

export type NarrativeFragmentDefinition = {
  readonly id: NarrativeFragmentId;
  readonly section: NarrativeFragmentSection;
  readonly priority: NarrativeFragmentPriority;
  readonly template: string;
  readonly conditions: readonly NarrativeFactCondition[];
};

export type NarrativeFragment = {
  readonly id: NarrativeFragmentId;
  readonly section: NarrativeFragmentSection;
  readonly priority: NarrativeFragmentPriority;
  readonly text: string;
  readonly supportingFactIds: readonly ClinicalFactId[];
};

export type NarrativeFragmentContext = {
  readonly facts: readonly ClinicalFact[];
};

export type NarrativeFragmentRegistry = {
  get(id: NarrativeFragmentId): NarrativeFragmentDefinition | undefined;
  has(id: NarrativeFragmentId): boolean;
  list(): NarrativeFragmentDefinition[];
  evaluate(context: NarrativeFragmentContext): NarrativeFragment[];
};
