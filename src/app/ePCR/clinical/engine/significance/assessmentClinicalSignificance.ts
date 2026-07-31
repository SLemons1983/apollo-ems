import { createClinicalSignificanceRegistry } from './clinicalSignificanceRegistry';
import type { ClinicalSignificanceDefinition } from './types';

/**
 * Deterministic Assessment significance rules.
 *
 * These rules identify documented findings that deserve attention. They do
 * not diagnose a condition, select a protocol, or direct treatment.
 */
export const assessmentClinicalSignificanceDefinitions = [
  {
    id: 'assessment.gcs.severely-reduced',
    category: 'assessment',
    severity: 'critical',
    title: 'Severely reduced GCS documented',
    description:
      'The documented Glasgow Coma Scale total is 8 or less.',
    conditions: [
      {
        factId: 'assessment.gcs.total',
        operator: 'less-than-or-equal',
        value: 8,
      },
    ],
  },
  {
    id: 'assessment.gcs.reduced',
    category: 'assessment',
    severity: 'important',
    title: 'Reduced GCS documented',
    description:
      'The documented Glasgow Coma Scale total is between 9 and 14.',
    conditions: [
      {
        factId: 'assessment.gcs.total',
        operator: 'greater-than',
        value: 8,
      },
      {
        factId: 'assessment.gcs.total',
        operator: 'less-than',
        value: 15,
      },
    ],
  },
  {
    id: 'assessment.gfast.positive',
    category: 'assessment',
    severity: 'urgent',
    title: 'Positive GFAST findings documented',
    description:
      'The documented GFAST score contains one or more positive findings.',
    conditions: [
      {
        factId: 'assessment.gfast.score',
        operator: 'greater-than',
        value: 0,
      },
    ],
  },
  {
    id: 'assessment.pain.severe',
    category: 'assessment',
    severity: 'important',
    title: 'Severe pain documented',
    description:
      'The documented numeric pain score is 7 or greater.',
    conditions: [
      {
        factId: 'assessment.pain.score',
        operator: 'greater-than-or-equal',
        value: 7,
      },
    ],
  },
] as const satisfies readonly ClinicalSignificanceDefinition[];

export const assessmentClinicalSignificanceRegistry =
  createClinicalSignificanceRegistry(
    assessmentClinicalSignificanceDefinitions,
  );
