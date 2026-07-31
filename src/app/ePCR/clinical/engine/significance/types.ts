import type {
  ClinicalFact,
  ClinicalFactId,
  ClinicalFactValue,
} from '../facts/types';

export type ClinicalSignificanceId = string;

export type ClinicalSignificanceSeverity =
  | 'informational'
  | 'important'
  | 'urgent'
  | 'critical';

export type ClinicalSignificanceCategory =
  | 'assessment'
  | 'vitals'
  | 'treatments'
  | 'outcome'
  | 'consistency'
  | 'documentation';

export type ClinicalSignificanceFactOperator =
  | 'exists'
  | 'equals'
  | 'not-equals'
  | 'includes'
  | 'greater-than'
  | 'greater-than-or-equal'
  | 'less-than'
  | 'less-than-or-equal';

export type ClinicalSignificanceFactCondition = {
  readonly factId: ClinicalFactId;
  readonly operator: ClinicalSignificanceFactOperator;
  readonly value?: ClinicalFactValue;
};

export type ClinicalSignificanceDefinition = {
  readonly id: ClinicalSignificanceId;
  readonly category: ClinicalSignificanceCategory;
  readonly severity: ClinicalSignificanceSeverity;
  readonly title: string;
  readonly description: string;
  readonly conditions: readonly ClinicalSignificanceFactCondition[];
};

export type ClinicalSignificance = {
  readonly id: ClinicalSignificanceId;
  readonly category: ClinicalSignificanceCategory;
  readonly severity: ClinicalSignificanceSeverity;
  readonly title: string;
  readonly description: string;
  readonly supportingFactIds: readonly ClinicalFactId[];
};

export type ClinicalSignificanceContext = {
  readonly facts: readonly ClinicalFact[];
};

export type ClinicalSignificanceRegistry = {
  get(
    id: ClinicalSignificanceId,
  ): ClinicalSignificanceDefinition | undefined;
  has(id: ClinicalSignificanceId): boolean;
  list(): ClinicalSignificanceDefinition[];
  evaluate(
    context: ClinicalSignificanceContext,
  ): ClinicalSignificance[];
};
