import type { ClinicalFactRegistry } from '../facts/types';
import type { NarrativeFragmentDefinition } from './types';

export type NarrativeDefinitionValidationIssue = {
  readonly definitionId: string;
  readonly factId: string;
  readonly message: string;
};

function templateFactIds(template: string): string[] {
  return Array.from(
    template.matchAll(/\{\{fact:([^}]+)\}\}/g),
    (match) => match[1].trim(),
  );
}

export function validateNarrativeFragmentDefinitions(
  definitions: readonly NarrativeFragmentDefinition[],
  factRegistry: ClinicalFactRegistry,
): readonly NarrativeDefinitionValidationIssue[] {
  const issues: NarrativeDefinitionValidationIssue[] = [];

  definitions.forEach((definition) => {
    const conditionFactIds = new Set(
      definition.conditions.map((condition) => condition.factId),
    );

    conditionFactIds.forEach((factId) => {
      if (!factRegistry.has(factId)) {
        issues.push({
          definitionId: definition.id,
          factId,
          message:
            `Narrative fragment "${definition.id}" references ` +
            `unregistered fact "${factId}".`,
        });
      }
    });

    templateFactIds(definition.template).forEach((factId) => {
      if (!factRegistry.has(factId)) {
        issues.push({
          definitionId: definition.id,
          factId,
          message:
            `Narrative fragment "${definition.id}" template references ` +
            `unregistered fact "${factId}".`,
        });
      }

      if (!conditionFactIds.has(factId)) {
        issues.push({
          definitionId: definition.id,
          factId,
          message:
            `Narrative fragment "${definition.id}" renders fact ` +
            `"${factId}" without requiring it in the fragment conditions.`,
        });
      }
    });
  });

  return Object.freeze(issues);
}

export function assertValidNarrativeFragmentDefinitions(
  definitions: readonly NarrativeFragmentDefinition[],
  factRegistry: ClinicalFactRegistry,
): void {
  const issues = validateNarrativeFragmentDefinitions(
    definitions,
    factRegistry,
  );

  if (issues.length > 0) {
    throw new Error([
      'Invalid narrative fragment definitions:',
      ...issues.map((issue) => `- ${issue.message}`),
    ].join('\n'));
  }
}
