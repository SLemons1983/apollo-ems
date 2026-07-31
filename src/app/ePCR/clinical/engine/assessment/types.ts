import type { ClinicalFact } from '../facts/types';

export type AssessmentMode =
  | 'medical'
  | 'trauma'
  | 'cardiac-arrest'
  | 'stroke'
  | 'behavioral'
  | 'ob'
  | 'pediatric';

export type AssessmentFindingType =
  | 'positive'
  | 'pertinent-negative';

export type AssessmentTask = {
  id: string;
  title: string;
  mode: AssessmentMode[];
  alwaysShow?: boolean;
  triggeredBy?: {
    categories?: string[];
    suspectedStroke?: boolean;
    possibleTrauma?: boolean;
    behavioralHold?: boolean;
    cardiacArrest?: boolean;
  };
};

export type AssessmentFindingOption = {
  id: string;
  label: string;
  type: AssessmentFindingType;
  bodySystem: string;
  categories?: string[];
};

export type AssessmentContext = {
  clinicalCategory?: string;
  possibleTrauma?: boolean;
  suspectedStroke?: boolean;
  behavioralHold?: boolean;
  cardiacArrest?: boolean;
};

/**
 * Complete deterministic output produced by the Assessment Engine.
 *
 * This snapshot gives downstream Apollo systems one stable result containing
 * assessment workflow guidance and the documented clinical facts extracted
 * from the Assessment form.
 */
export type AssessmentEngineResult = {
  readonly mode: AssessmentMode;
  readonly suggestedTasks: readonly AssessmentTask[];
  readonly additionalTasks: readonly AssessmentTask[];
  readonly availableFindings: readonly AssessmentFindingOption[];
  readonly clinicalFacts: readonly ClinicalFact[];
};