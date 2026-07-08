'use client';

import { calculateRevisedTraumaScore } from '../../../engine/scores/rts';

export type RevisedTraumaScoreForm = {
  respiratoryRate: string;
  systolicBloodPressure: string;
  notes: string;
};

type RevisedTraumaScoreCardProps = {
  gcs: number;
  value: RevisedTraumaScoreForm;
  onChange: (
    field: keyof RevisedTraumaScoreForm,
    value: string,
  ) => void;
};

function getCategory(score: number) {
  if (score >= 7.0) return 'Minor Trauma';
  if (score >= 5.0) return 'Moderate Trauma';
  return 'Severe Trauma';
}

export default function RevisedTraumaScoreCard({
  gcs,
  value,
  onChange,
}: RevisedTraumaScoreCardProps) {
  const rr = Number(value.respiratoryRate) || 0;
  const sbp = Number(value.systolicBloodPressure) || 0;

  const rts = calculateRevisedTraumaScore({
    gcs,
    respiratoryRate: rr,
    systolicBloodPressure: sbp,
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Calculated Revised Trauma Score
        </div>

        <div className="mt-2 text-5xl font-black text-slate-900">
          {rts.score.toFixed(2)}
        </div>

        <div className="mt-2 text-sm font-semibold text-slate-600">
          {getCategory(rts.score)}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label>
          <div className="mb-2 text-sm font-bold text-slate-700">
            Glasgow Coma Scale
          </div>

          <input
            value={gcs || ''}
            readOnly
            className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 font-semibold"
          />
        </label>

        <label>
          <div className="mb-2 text-sm font-bold text-slate-700">
            Respiratory Rate
          </div>

          <input
            type="number"
            value={value.respiratoryRate}
            onChange={(e) =>
              onChange('respiratoryRate', e.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>

        <label>
          <div className="mb-2 text-sm font-bold text-slate-700">
            Systolic BP
          </div>

          <input
            type="number"
            value={value.systolicBloodPressure}
            onChange={(e) =>
              onChange('systolicBloodPressure', e.target.value)
            }
            className="w-full rounded-xl border border-slate-300 px-4 py-3"
          />
        </label>
      </div>

      <label>
        <div className="mb-2 text-sm font-bold text-slate-700">
          Trauma Notes
        </div>

        <textarea
          rows={4}
          value={value.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3"
        />
      </label>
    </div>
  );
}

