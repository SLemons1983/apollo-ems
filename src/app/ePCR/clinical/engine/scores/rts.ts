export type RevisedTraumaScoreInput = {
  gcs: number;
  respiratoryRate: number;
  systolicBloodPressure: number;
};

function codedGcs(gcs: number) {
  if (gcs >= 13) return 4;
  if (gcs >= 9) return 3;
  if (gcs >= 6) return 2;
  if (gcs >= 4) return 1;
  return 0;
}

function codedRespiratoryRate(rr: number) {
  if (rr >= 10 && rr <= 29) return 4;
  if (rr > 29) return 3;
  if (rr >= 6) return 2;
  if (rr >= 1) return 1;
  return 0;
}

function codedSystolicBloodPressure(sbp: number) {
  if (sbp > 89) return 4;
  if (sbp >= 76) return 3;
  if (sbp >= 50) return 2;
  if (sbp >= 1) return 1;
  return 0;
}

export function calculateRevisedTraumaScore(
  input: RevisedTraumaScoreInput,
) {
  const gcsCode = codedGcs(input.gcs);
  const rrCode = codedRespiratoryRate(input.respiratoryRate);
  const sbpCode = codedSystolicBloodPressure(
    input.systolicBloodPressure,
  );

  const score =
    (0.9368 * gcsCode) +
    (0.7326 * sbpCode) +
    (0.2908 * rrCode);

  return {
    score: Number(score.toFixed(2)),
    codedGcs: gcsCode,
    codedRespiratoryRate: rrCode,
    codedSystolicBloodPressure: sbpCode,
  };
}
