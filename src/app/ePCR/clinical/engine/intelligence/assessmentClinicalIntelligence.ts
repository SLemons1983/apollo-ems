import {
  assertValidAssessmentEngineResult,
} from '../assessment/assessmentEngineValidation';
import type { AssessmentEngineResult } from '../assessment/types';
import { assessmentClinicalFactRegistry } from '../facts/assessmentFacts';
import {
  assessmentNarrativeFragmentDefinitions,
  assessmentNarrativeFragmentRegistry,
} from '../narrative/assessmentNarrativeFragments';
import {
  assertValidNarrativeFragmentDefinitions,
} from '../narrative/narrativeDefinitionValidation';
import {
  assessmentClinicalSignificanceDefinitions,
  assessmentClinicalSignificanceRegistry,
} from '../significance/assessmentClinicalSignificance';
import {
  assertValidClinicalSignificanceDefinitions,
} from '../significance/significanceDefinitionValidation';
import { createClinicalIntelligenceEngine } from './clinicalIntelligenceEngine';
import type { ClinicalIntelligenceResult } from './types';

assertValidClinicalSignificanceDefinitions(
  assessmentClinicalSignificanceDefinitions,
  assessmentClinicalFactRegistry,
);

assertValidNarrativeFragmentDefinitions(
  assessmentNarrativeFragmentDefinitions,
  assessmentClinicalFactRegistry,
);

/**
 * Ready-to-use deterministic ACI engine for Assessment facts.
 *
 * Definition integrity is checked when this module loads so an invalid rule or
 * fragment cannot silently reach patient-specific evaluation.
 */
export const assessmentClinicalIntelligenceEngine =
  createClinicalIntelligenceEngine({
    significanceRegistry: assessmentClinicalSignificanceRegistry,
    narrativeFragmentRegistry: assessmentNarrativeFragmentRegistry,
  });

/**
 * Validates one Assessment Engine snapshot and evaluates its facts through the
 * configured Assessment ACI registries.
 */
export function evaluateAssessmentClinicalIntelligence(
  assessment: AssessmentEngineResult,
): ClinicalIntelligenceResult {
  const validAssessment =
    assertValidAssessmentEngineResult(assessment);

  return assessmentClinicalIntelligenceEngine.evaluate({
    facts: validAssessment.clinicalFacts,
  });
}
