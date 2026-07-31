import type { ClinicalFact } from '../facts/types';
import type {
  ClinicalIntelligenceContext,
  ClinicalIntelligenceEngine,
  ClinicalIntelligenceEngineDependencies,
  ClinicalIntelligenceResult,
} from './types';

function assertUniqueClinicalFactIds(
  facts: readonly ClinicalFact[],
): void {
  const seenFactIds = new Set<string>();

  facts.forEach((fact) => {
    if (seenFactIds.has(fact.id)) {
      throw new Error(
        `Clinical intelligence context contains duplicate fact "${fact.id}".`,
      );
    }

    seenFactIds.add(fact.id);
  });
}

/**
 * Coordinates the deterministic clinical significance and narrative fragment
 * registries against the same documented clinical-fact snapshot.
 *
 * This engine contains no patient-specific rules and does not assemble a final
 * narrative. It only returns the independent, traceable results produced by
 * the configured registries.
 */
export function createClinicalIntelligenceEngine(
  dependencies: ClinicalIntelligenceEngineDependencies,
): ClinicalIntelligenceEngine {
  const {
    significanceRegistry,
    narrativeFragmentRegistry,
  } = dependencies;

  return Object.freeze({
    evaluate(
      context: ClinicalIntelligenceContext,
    ): ClinicalIntelligenceResult {
      assertUniqueClinicalFactIds(context.facts);

      const significances = significanceRegistry.evaluate({
        facts: context.facts,
      });
      const narrativeFragments =
        narrativeFragmentRegistry.evaluate({
          facts: context.facts,
        });

      return Object.freeze({
        significances: Object.freeze([...significances]),
        narrativeFragments: Object.freeze([
          ...narrativeFragments,
        ]),
      });
    },
  });
}
