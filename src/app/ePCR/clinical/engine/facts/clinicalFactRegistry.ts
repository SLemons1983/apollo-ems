import type {
  ClinicalFact,
  ClinicalFactDefinition,
  ClinicalFactRegistry,
  ClinicalFactRegistryFilter,
  ClinicalFactValidationResult,
  ClinicalFactValue,
  ClinicalFactValueType,
} from './types';

function isValueType(
  value: ClinicalFactValue,
  expectedType: ClinicalFactValueType,
): boolean {
  switch (expectedType) {
    case 'string-list':
      return (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
      );

    case 'number':
      return typeof value === 'number' && Number.isFinite(value);

    case 'boolean':
      return typeof value === 'boolean';

    case 'string':
      return typeof value === 'string';

    default:
      return false;
  }
}

function matchesFilter(
  definition: ClinicalFactDefinition,
  filter: ClinicalFactRegistryFilter,
): boolean {
  return (
    (!filter.source || definition.source === filter.source) &&
    (!filter.category || definition.category === filter.category) &&
    (!filter.valueType || definition.valueType === filter.valueType)
  );
}

function validateDefinition(definition: ClinicalFactDefinition): void {
  if (!definition.id.trim()) {
    throw new Error('Clinical fact definitions must have a non-empty ID.');
  }

  if (!definition.label.trim()) {
    throw new Error(
      `Clinical fact "${definition.id}" must have a non-empty label.`,
    );
  }

  if (!definition.category.trim()) {
    throw new Error(
      `Clinical fact "${definition.id}" must have a non-empty category.`,
    );
  }
}

/**
 * Creates an immutable registry of recognized clinical fact definitions.
 *
 * The registry fails immediately when duplicate or invalid definitions are
 * supplied so configuration errors cannot silently alter clinical behavior.
 */
export function createClinicalFactRegistry(
  definitions: readonly ClinicalFactDefinition[],
): ClinicalFactRegistry {
  const definitionsById = new Map<ClinicalFactDefinition['id'], ClinicalFactDefinition>();

  for (const definition of definitions) {
    validateDefinition(definition);

    if (definitionsById.has(definition.id)) {
      throw new Error(
        `Duplicate clinical fact definition: "${definition.id}".`,
      );
    }

    definitionsById.set(
      definition.id,
      Object.freeze({ ...definition }),
    );
  }

  function validate(fact: ClinicalFact): ClinicalFactValidationResult {
    const definition = definitionsById.get(fact.id);

    if (!definition) {
      return {
        valid: false,
        reason: 'unknown-fact',
        message: `Clinical fact "${fact.id}" is not registered.`,
      };
    }

    if (!isValueType(fact.value, definition.valueType)) {
      return {
        valid: false,
        reason: 'invalid-value',
        message:
          `Clinical fact "${fact.id}" requires a value of type ` +
          `"${definition.valueType}".`,
      };
    }

    return {
      valid: true,
      definition,
    };
  }

  return Object.freeze({
    get(id: string) {
      return definitionsById.get(id);
    },

    has(id: string) {
      return definitionsById.has(id);
    },

    list(filter: ClinicalFactRegistryFilter = {}) {
      return Array.from(definitionsById.values()).filter((definition) =>
        matchesFilter(definition, filter),
      );
    },

    validate,
  });
}