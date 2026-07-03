import type {
  ClinicalConsideration,
  ProviderScope,
} from '../types/clinical';

export type ClinicalContext = {
  providerScope?: ProviderScope;
  category?: string;
  impression?: string;
  symptoms?: string[];
  possibleTrauma?: boolean;
  suspectedStroke?: boolean;
  cardiacArrest?: boolean;
  protocolUncertainty?: boolean;
};

const baseConsiderations: ClinicalConsideration[] = [
  {
    id: 'medical-control-uncertainty',
    type: 'medical-control',
    title: 'Contact Medical Control if Uncertain',
    message:
      'If treatment direction, protocol interpretation, scope of practice, or destination decision is uncertain, contact Base Hospital / Medical Control per agency policy.',
    rationale:
      'Apollo Clinical Intelligence is a reference and documentation partner. It does not replace medical direction.',
  },
  {
    id: 'trauma-neuro-reassessment',
    type: 'documentation',
    title: 'Trauma Neurological Reassessment',
    message:
      'Consider documenting neurological findings before and after movement when trauma or spinal concern is present.',
    rationale:
      'Serial neurological documentation can help show whether patient status changed during care.',
    categories: ['Injury', 'Trauma', 'Musculoskeletal'],
  },
  {
    id: 'stroke-last-known-well',
    type: 'documentation',
    title: 'Stroke Last Known Well',
    message:
      'Consider documenting last known well, stroke symptoms, and whether symptoms resolved.',
    rationale:
      'Stroke documentation often depends heavily on timeline and symptom progression.',
  },
  {
    id: 'cardiac-reassessment',
    type: 'documentation',
    title: 'Cardiac Reassessment',
    message:
      'Consider documenting repeat vital signs, pain reassessment, and response to interventions when cardiac symptoms are present.',
    rationale:
      'Cardiac-related complaints often require clear reassessment documentation.',
    categories: ['Cardiovascular'],
  },
];

export function getClinicalConsiderations(
  context: ClinicalContext,
): ClinicalConsideration[] {
  const considerations = [...baseConsiderations];

  return considerations.filter((consideration) => {
    const scopeMatches =
      !consideration.providerScopes ||
      !context.providerScope ||
      consideration.providerScopes.includes(context.providerScope);

    const categoryMatches =
      !consideration.categories ||
      !context.category ||
      consideration.categories.includes(context.category);

    return scopeMatches && categoryMatches;
  });
}
