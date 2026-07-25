'use client';

type EcgAssessmentForm = {
  notIndicated: boolean;
  fourLeadInterpretation: string;
  twelveLeadInterpretation: string;
  abnormalFindings: string;
};

type EcgAssessmentCardProps = {
  value: EcgAssessmentForm;
  onChange: (
    field: keyof EcgAssessmentForm,
    value: EcgAssessmentForm[keyof EcgAssessmentForm],
  ) => void;
};

const fourLeadRhythms = [
  'Normal Sinus Rhythm',
  'Sinus Bradycardia',
  'Sinus Tachycardia',
  'Atrial Fibrillation',
  'Atrial Flutter',
  'Supraventricular Tachycardia',
  'Junctional Rhythm',
  'Idioventricular Rhythm',
  'Ventricular Tachycardia',
  'Ventricular Fibrillation',
  'Asystole',
  'First-Degree AV Block',
  'Second-Degree AV Block Type I',
  'Second-Degree AV Block Type II',
  'Third-Degree AV Block',
  'Paced Rhythm',
  'Pulseless Electrical Activity',
  'Other',
];

const twelveLeadInterpretations = [
  'Normal 12-Lead ECG',
  'STEMI',
  'ST Elevation - Non-STEMI Criteria',
  'ST Depression',
  'T-Wave Abnormality',
  'Left Bundle Branch Block',
  'Right Bundle Branch Block',
  'Left Ventricular Hypertrophy',
  'Right Ventricular Strain',
  'Prolonged QT',
  'Paced Rhythm',
  'Artifact / Uninterpretable',
  'Other',
];

export default function EcgAssessmentCard({
  value,
  onChange,
}: EcgAssessmentCardProps) {
  const hasDocumentedInterpretation = Boolean(
    value.fourLeadInterpretation || value.twelveLeadInterpretation,
  );

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
          value.notIndicated
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div>
          <div className="text-sm font-black uppercase tracking-wide text-slate-800">
            ECG Assessment Applicability
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            Use this when neither cardiac monitoring nor a 12-lead ECG is
            clinically indicated.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onChange('notIndicated', !value.notIndicated)}
          disabled={hasDocumentedInterpretation}
          className={`rounded-lg border px-4 py-2 text-xs font-black uppercase tracking-wide transition ${
            value.notIndicated
              ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
              : hasDocumentedInterpretation
                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                : 'border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50'
          }`}
        >
          {value.notIndicated
            ? '✓ ECG Assessment Not Indicated'
            : 'ECG Assessment Not Indicated'}
        </button>
      </div>

      {value.notIndicated && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          ECG assessment documented as not indicated. Select the button again
          to document an ECG.
        </div>
      )}

      <fieldset disabled={value.notIndicated} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            4-Lead Interpretation
          </span>
          <select
            value={value.fourLeadInterpretation}
            onChange={(event) =>
              onChange('fourLeadInterpretation', event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
          >
            <option value="">Select rhythm</option>
            {fourLeadRhythms.map((rhythm) => (
              <option key={rhythm} value={rhythm}>
                {rhythm}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">
            12-Lead Interpretation
          </span>
          <select
            value={value.twelveLeadInterpretation}
            onChange={(event) =>
              onChange('twelveLeadInterpretation', event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
          >
            <option value="">Select interpretation</option>
            {twelveLeadInterpretations.map((interpretation) => (
              <option key={interpretation} value={interpretation}>
                {interpretation}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Other Abnormal Findings
        </span>
        <textarea
          value={value.abnormalFindings}
          onChange={(event) => onChange('abnormalFindings', event.target.value)}
          rows={4}
          placeholder="Document ectopy, interval changes, axis deviation, morphology, artifact, serial changes, or other findings."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
        />
      </label>
      </fieldset>
    </div>
  );
}

export type { EcgAssessmentForm };
