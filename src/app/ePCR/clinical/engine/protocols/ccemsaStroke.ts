export type CcemsaGfastInput = {
  gaze: string;
  face: string;
  arms: string;
  speech: string;
  lastKnownNormal: string;
  bloodGlucose: string;
};

export function calculateCcemsaGfastScore(input: CcemsaGfastInput) {
  return [
    input.gaze === 'Abnormal',
    input.face === 'Abnormal',
    input.arms === 'Abnormal',
    input.speech === 'Abnormal',
  ].filter(Boolean).length;
}

export function getCcemsaGfastConsiderations(input: CcemsaGfastInput) {
  const score = calculateCcemsaGfastScore(input);
  const glucose = Number(input.bloodGlucose);
  const considerations: string[] = [];

  if (!input.bloodGlucose) {
    considerations.push(
      'Blood glucose should be documented before relying on GFAST interpretation.',
    );
  } else if (!Number.isNaN(glucose) && glucose < 80) {
    considerations.push(
      'Blood glucose is below 80. CCEMSA Policy 547 notes glucose should be corrected and the patient reassessed before relying on GFAST.',
    );
  }

  if (!input.lastKnownNormal) {
    considerations.push('Document time last seen normal / last known well.');
  }

  if (score === 0) {
    considerations.push(
      'GFAST score is 0. If clinical suspicion remains, transport should still follow provider assessment and protocol.',
    );
  } else if (score <= 3) {
    considerations.push(
      'GFAST score is 1–3. CCEMSA Policy 547 indicates transport to the closest stroke center.',
    );
  } else {
    considerations.push(
      'GFAST score is 4. CCEMSA Policy 547 indicates considering a Comprehensive Stroke Center if within 45 minutes and last known normal is under 24 hours.',
    );
  }

  considerations.push(
    'Contact Base Hospital / Medical Control if destination, protocol interpretation, or clinical guidance is uncertain.',
  );

  return considerations;
}
