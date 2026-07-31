import type {
  ClinicalFactDefinition,
  ClinicalFactRegistry,
} from '../facts/types';
import type {
  ClinicalSignificanceDefinition,
  ClinicalSignificanceFactCondition,
} from './types';

export type SignificanceDefinitionValidationIssue = {
  readonly definitionId: string;
  readonly factId: string;
  readonly message: string;
};

const numericOperators = new Set([
  'greater-than',
  'greater-than-or-equal',
  'less-than',
  'less-than-or-equal',
]);

function validateCondition(
  definition: ClinicalSignificanceDefinition,
  condition: ClinicalSignificanceFactCondition,
  factDefinition: ClinicalFactDefinition | undefined,
): SignificanceDefinitionValidationIssue[] {
  if (!factDefinition) {
    return [{
      definitionId: definition.id,
      factId: condition.factId,
      message:
        `Clinical significance "${definition.id}" references ` +
        `unregistered fact "${condition.factId}".`,
    }];
  }

  if (
    numericOperators.has(condition.operator) &&
    factDefinition.valueType !== 'number'
  ) {
    return [{
      definitionId: definition.id,
      factId: condition.factId,
      message:
        `Clinical significance "${definition.id}" uses numeric operator ` +
        `"${condition.operator}" with non-numeric fact "${condition.factId}".`,
    }];
  }

  if (
    condition.operator === 'includes' &&
    factDefinition.valueType !== 'string-list'
  ) {
    return [{
      definitionId: definition.id,
      factId: condition.factId,
      message:
        `Clinical significance "${definition.id}" uses "includes" with ` +
        `non-list fact "${condition.factId}".`,
    }];
  }

  return [];
}

export function validateClinicalSignificanceDefinitions(
  definitions: readonly ClinicalSignificanceDefinition[],
  factRegistry: ClinicalFactRegistry,
): readonly SignificanceDefinitionValidationIssue[] {
  return Object.freeze(
    definitions.flatMap((definition) =>
      definition.conditions.flatMap((condition) =>
        validateCondition(
          definition,
          condition,
          factRegistry.get(condition.factId),
        ),
      ),
    ),
  );
}

export function assertValidClinicalSignificanceDefinitions(
  definitions: readonly ClinicalSignificanceDefinition[],
  factRegistry: ClinicalFactRegistry,
): void {
  const issues = validateClinicalSignificanceDefinitions(
    definitions,
    factRegistry,
  );

  if (issues.length > 0) {
    throw new Error([
      'Invalid clinical significance definitions:',
      ...issues.map((issue) => `- ${issue.message}`),
    ].join('\n'));
  }
}
