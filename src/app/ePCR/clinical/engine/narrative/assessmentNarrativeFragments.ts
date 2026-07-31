import { createNarrativeFragmentRegistry } from './narrativeFragmentRegistry';
import type { NarrativeFragmentDefinition } from './types';

/**
 * Traceable Assessment narrative fragments.
 *
 * Each fragment repeats only documented facts. This registry does not assemble
 * a final PCR narrative or infer undocumented findings.
 */
export const assessmentNarrativeFragmentDefinitions = [
  {
    id: 'assessment.primary.general-impression',
    section: 'assessment',
    priority: 'routine',
    template:
      'General impression: {{fact:assessment.primary.general-impression}}.',
    conditions: [{
      factId: 'assessment.primary.general-impression',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.primary.airway',
    section: 'assessment',
    priority: 'important',
    template: 'Airway: {{fact:assessment.primary.airway}}.',
    conditions: [{
      factId: 'assessment.primary.airway',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.primary.breathing',
    section: 'assessment',
    priority: 'important',
    template: 'Breathing: {{fact:assessment.primary.breathing}}.',
    conditions: [{
      factId: 'assessment.primary.breathing',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.primary.circulation',
    section: 'assessment',
    priority: 'important',
    template: 'Circulation: {{fact:assessment.primary.circulation}}.',
    conditions: [{
      factId: 'assessment.primary.circulation',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.primary.disability',
    section: 'assessment',
    priority: 'important',
    template: 'Disability: {{fact:assessment.primary.disability}}.',
    conditions: [{
      factId: 'assessment.primary.disability',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.primary.exposure',
    section: 'assessment',
    priority: 'routine',
    template: 'Exposure: {{fact:assessment.primary.exposure}}.',
    conditions: [{
      factId: 'assessment.primary.exposure',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.consciousness.avpu',
    section: 'assessment',
    priority: 'important',
    template: 'AVPU: {{fact:assessment.consciousness.avpu}}.',
    conditions: [{
      factId: 'assessment.consciousness.avpu',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.consciousness.orientation',
    section: 'assessment',
    priority: 'routine',
    template:
      'Orientation: {{fact:assessment.consciousness.orientation}}.',
    conditions: [{
      factId: 'assessment.consciousness.orientation',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.gcs.total',
    section: 'assessment',
    priority: 'important',
    template:
      'Glasgow Coma Scale total: {{fact:assessment.gcs.total}}.',
    conditions: [{
      factId: 'assessment.gcs.total',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.gfast.score',
    section: 'assessment',
    priority: 'critical',
    template: 'GFAST score: {{fact:assessment.gfast.score}}.',
    conditions: [{
      factId: 'assessment.gfast.score',
      operator: 'exists',
    }],
  },
  {
    id: 'assessment.pain.score',
    section: 'assessment',
    priority: 'important',
    template:
      'Pain score: {{fact:assessment.pain.score}} using the ' +
      '{{fact:assessment.pain.scale-type}} scale.',
    conditions: [
      {
        factId: 'assessment.pain.score',
        operator: 'exists',
      },
      {
        factId: 'assessment.pain.scale-type',
        operator: 'exists',
      },
    ],
  },
] as const satisfies readonly NarrativeFragmentDefinition[];

export const assessmentNarrativeFragmentRegistry =
  createNarrativeFragmentRegistry(
    assessmentNarrativeFragmentDefinitions,
  );
