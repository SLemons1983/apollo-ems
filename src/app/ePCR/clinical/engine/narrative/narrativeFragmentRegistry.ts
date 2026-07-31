import type {
  ClinicalFact,
  ClinicalFactValue,
} from '../facts/types';
import type {
  NarrativeFactCondition,
  NarrativeFragment,
  NarrativeFragmentContext,
  NarrativeFragmentDefinition,
  NarrativeFragmentRegistry,
} from './types';

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
  condition: NarrativeFactCondition,
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

function formatFactValue(value: ClinicalFactValue): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return String(value);
}

function renderTemplate(
  template: string,
  factsById: ReadonlyMap<string, ClinicalFact>,
): string {
  return template.replace(
    /\{\{fact:([^}]+)\}\}/g,
    (placeholder, factId: string) => {
      const fact = factsById.get(factId.trim());

      return fact
        ? formatFactValue(fact.value)
        : placeholder;
    },
  );
}

function validateDefinition(
  definition: NarrativeFragmentDefinition,
): void {
  if (!definition.id.trim()) {
    throw new Error(
      'Narrative fragment definitions must have a non-empty ID.',
    );
  }

  if (!definition.template.trim()) {
    throw new Error(
      `Narrative fragment "${definition.id}" must have a template.`,
    );
  }

  if (definition.conditions.length === 0) {
    throw new Error(
      `Narrative fragment "${definition.id}" must have at least one condition.`,
    );
  }

  definition.conditions.forEach((condition) => {
    if (!condition.factId.trim()) {
      throw new Error(
        `Narrative fragment "${definition.id}" contains an empty fact ID.`,
      );
    }

    if (
      condition.operator !== 'exists' &&
      condition.value === undefined
    ) {
      throw new Error(
        `Narrative fragment "${definition.id}" condition ` +
          `"${condition.factId}" requires a comparison value.`,
      );
    }
  });
}

/**
 * Creates an immutable registry of deterministic narrative fragment rules.
 *
 * Definitions contain no patient data. The registry evaluates documented
 * clinical facts and returns only fragments whose conditions all match.
 */
export function createNarrativeFragmentRegistry(
  definitions: readonly NarrativeFragmentDefinition[],
): NarrativeFragmentRegistry {
  const definitionsById = new Map<
    NarrativeFragmentDefinition['id'],
    NarrativeFragmentDefinition
  >();

  definitions.forEach((definition) => {
    validateDefinition(definition);

    if (definitionsById.has(definition.id)) {
      throw new Error(
        `Duplicate narrative fragment definition: "${definition.id}".`,
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
    context: NarrativeFragmentContext,
  ): NarrativeFragment[] {
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
        section: definition.section,
        priority: definition.priority,
        text: renderTemplate(definition.template, factsById),
        supportingFactIds: [
          ...new Set(
            definition.conditions.map(
              (condition) => condition.factId,
            ),
          ),
        ],
      }));
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
