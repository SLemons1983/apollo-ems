import type { AssessmentResult } from './types';

export type StrokeAssessmentInput = {
  glucose?: number;
  gaze: boolean;
  face: boolean;
  arm: boolean;
  speech: boolean;
  lastKnownNormal?: string;
};

export function evaluateCCEMSAStrokeAssessment(
  input: StrokeAssessmentInput,
): AssessmentResult {

  const score =
    Number(input.gaze) +
    Number(input.face) +
    Number(input.arm) +
    Number(input.speech);

  const result: AssessmentResult = {
    findings: [
      {
        id: 'gfast-score',
        category: 'Stroke',
        label: 'GFAST Score',
        value: score,
      },
    ],
    considerations: [],
    recommendations: [],
  };

  if (
    typeof input.glucose === 'number' &&
    input.glucose < 80
  ) {
    result.considerations.push({
      id: 'glucose',
      severity: 'warning',
      title: 'Hypoglycemia Consideration',
      description:
        'CCEMSA recommends correcting hypoglycemia and reassessing before relying on the GFAST assessment.',
    });
  }

  if (score > 0) {
    result.considerations.push({
      id: 'possible-stroke',
      severity: 'critical',
      title: 'Possible Acute Stroke',
      description:
        'Positive GFAST assessment. Continue stroke evaluation.',
    });
  }

  if (score <= 3) {
    result.recommendations.push({
      id: 'destination-primary',
      protocol: 'CCEMSA Policy 547',
      recommendation:
        'Consider transport to the closest Primary Stroke Center.',
    });
  }

  if (score === 4) {
    result.recommendations.push({
      id: 'destination-comprehensive',
      protocol: 'CCEMSA Policy 547',
      recommendation:
        'Consider Comprehensive Stroke Center if within 45 minutes and clinically appropriate.',
    });
  }

  result.recommendations.push({
    id: 'base-contact',
    protocol: 'Apollo Clinical Intelligence',
    recommendation:
      'Contact Base Hospital whenever clinical guidance or destination clarification is needed.',
  });

  return result;
}
