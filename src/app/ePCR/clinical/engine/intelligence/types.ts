import type { ClinicalFact } from '../facts/types';
import type {
  NarrativeFragment,
  NarrativeFragmentRegistry,
} from '../narrative/types';
import type {
  ClinicalSignificance,
  ClinicalSignificanceRegistry,
} from '../significance/types';

export type ClinicalIntelligenceContext = {
  readonly facts: readonly ClinicalFact[];
};

export type ClinicalIntelligenceResult = {
  readonly significances: readonly ClinicalSignificance[];
  readonly narrativeFragments: readonly NarrativeFragment[];
};

export type ClinicalIntelligenceEngineDependencies = {
  readonly significanceRegistry: ClinicalSignificanceRegistry;
  readonly narrativeFragmentRegistry: NarrativeFragmentRegistry;
};

export type ClinicalIntelligenceEngine = {
  evaluate(
    context: ClinicalIntelligenceContext,
  ): ClinicalIntelligenceResult;
};
