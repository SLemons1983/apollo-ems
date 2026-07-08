export type GcsAssessmentValues = {
  gcsEyes: string;
  gcsVerbal: string;
  gcsMotor: string;
};

function scoreFromOption(option: string) {
  const score = Number(option.split(' - ')[0]);

  return Number.isNaN(score) ? 0 : score;
}

export function calculateGcsScore(value: GcsAssessmentValues) {
  const scores = [
    scoreFromOption(value.gcsEyes),
    scoreFromOption(value.gcsVerbal),
    scoreFromOption(value.gcsMotor),
  ];

  return scores.every((score) => score > 0)
    ? scores.reduce((total, score) => total + score, 0)
    : 0;
}
