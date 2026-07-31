import type {
  ClinicalFact,
  ClinicalFactValue,
} from '../facts/types';
import type {
  ClinicalSignificance,
  ClinicalSignificanceContext,
  ClinicalSignificanceDefinition,
  ClinicalSignificanceFactCondition,
  ClinicalSignificanceRegistry,
  ClinicalSignificanceSeverity,
} from './types';

const severityPriority: Readonly<
  Record<ClinicalSignificanceSeverity, number>
> = Object.freeze({
  critical: 0,
  urgent: 1,
  important: 2,
  informational: 3,
});

function valuesEqual(
  firstValue: ClinicalFactValue,
  secondValue: ClinicalFactValue,
): boolean {
  if (Array.isArray(firstValue) || Array.isArray(secondValue)) {
    return (
      Array.isArray(firstValue) &&
      Array.isArray(secondValue) &&
      firstValue.length === secondValue.length &&
      firstValue.every(
        (item, index) => item === secondValue[index],
      )
    );
  }

  return firstValue === secondValue;
}

function factMatchesCondition(
  fact: ClinicalFact | undefined,
  condition: ClinicalSignificanceFactCondition,
): boolean {
  if (condition.operator === 'exists') {
    return fact !== undefined;
  }

  if (!fact || condition.value === undefined) {
    return false;
  }

  switch (condition.operator) {
    case 'equals':
      return valuesEqual(fact.value, condition.value);

    case 'not-equals':
      return !valuesEqual(fact.value, condition.value);

    case 'includes':
      return (
        Array.isArray(fact.value) &&
        typeof condition.value === 'string' &&
        fact.value.includes(condition.value)
      );

    case 'greater-than':
      return (
        typeof fact.value === 'number' &&
        typeof condition.value === 'number' &&
        fact.value > condition.value
      );

    case 'greater-than-or-equal':
      return (
        typeof fact.value === 'number' &&
        typeof condition.value === 'number' &&
        fact.value >= condition.value
      );

    case 'less-than':
      return (
        typeof fact.value === 'number' &&
        typeof condition.value === 'number' &&
        fact.value < condition.value
      );

    case 'less-than-or-equal':
      return (
        typeof fact.value === 'number' &&
        typeof condition.value === 'number' &&
        fact.value <= condition.value
      );

    default:
      return false;
  }
}

function validateDefinition(
  definition: ClinicalSignificanceDefinition,
): void {
  if (!definition.id.trim()) {
    throw new Error(
      'Clinical significance definitions must have a non-empty ID.',
    );
  }

  if (!definition.title.trim()) {
    throw new Error(
      `Clinical significance "${definition.id}" must have a title.`,
    );
  }

  if (!definition.description.trim()) {
    throw new Error(
      `Clinical significance "${definition.id}" must have a description.`,
    );
  }

  if (definition.conditions.length === 0) {
    throw new Error(
      `Clinical significance "${definition.id}" must have at least one condition.`,
    );
  }

  definition.conditions.forEach((condition) => {
    if (!condition.factId.trim()) {
      throw new Error(
        `Clinical significance "${definition.id}" contains an empty fact ID.`,
      );
    }

    if (
      condition.operator !== 'exists' &&
      condition.value === undefined
    ) {
      throw new Error(
        `Clinical significance "${definition.id}" condition ` +
          `"${condition.factId}" requires a comparison value.`,
      );
    }
  });
}

/**
 * Creates an immutable registry of deterministic clinical significance rules.
 *
 * Definitions contain no patient data. Evaluation returns only significance
 * results whose conditions all match the documented clinical facts.
 */
export function createClinicalSignificanceRegistry(
  definitions: readonly ClinicalSignificanceDefinition[],
): ClinicalSignificanceRegistry {
  const definitionsById = new Map<
    ClinicalSignificanceDefinition['id'],
    ClinicalSignificanceDefinition
  >();

  definitions.forEach((definition) => {
    validateDefinition(definition);

    if (definitionsById.has(definition.id)) {
      throw new Error(
        `Duplicate clinical significance definition: "${definition.id}".`,
      );
    }

    definitionsById.set(
      definition.id,
      Object.freeze({
        ...definition,
        conditions: Object.freeze(
          definition.conditions.map((condition) =>
            Object.freeze({ ...condition }),
          ),
        ),
      }),
    );
  });

  function evaluate(
    context: ClinicalSignificanceContext,
  ): ClinicalSignificance[] {
    const factsById = new Map(
      context.facts.map((fact) => [fact.id, fact]),
    );

    return Array.from(definitionsById.values())
      .filter((definition) =>
        definition.conditions.every((condition) =>
          factMatchesCondition(
            factsById.get(condition.factId),
            condition,
          ),
        ),
      )
      .map((definition) => ({
        id: definition.id,
        category: definition.category,
        severity: definition.severity,
        title: definition.title,
        description: definition.description,
        supportingFactIds: [
          ...new Set(
            definition.conditions.map(
              (condition) => condition.factId,
            ),
          ),
        ],
      }))
      .sort(
        (first, second) =>
          severityPriority[first.severity] -
          severityPriority[second.severity],
      );
  }

  return Object.freeze({
    get(id: string) {
      return definitionsById.get(id);
    },

    has(id: string) {
      return definitionsById.has(id);
    },

    list() {
      return Array.from(definitionsById.values());
    },

    evaluate,
  });
}
