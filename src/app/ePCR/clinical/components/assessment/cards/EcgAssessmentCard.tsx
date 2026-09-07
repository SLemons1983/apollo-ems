'use client';

type EcgAssessmentForm = {
  notIndicated: boolean;
  ecgPerformed: '' | '4-lead' | '12-lead' | 'both';
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
  'ST Elevation',
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
  const performed =
    value.ecgPerformed ||
    (value.fourLeadInterpretation && value.twelveLeadInterpretation
      ? 'both'
      : value.fourLeadInterpretation
        ? '4-lead'
        : value.twelveLeadInterpretation
          ? '12-lead'
          : '');

  const showFourLead = performed === '4-lead' || performed === 'both';
  const showTwelveLead = performed === '12-lead' || performed === 'both';
  const hasDocumentedInterpretation = Boolean(
    value.fourLeadInterpretation || value.twelveLeadInterpretation,
  );

  function selectPerformed(next: EcgAssessmentForm['ecgPerformed']) {
    onChange('notIndicated', false);
    onChange('ecgPerformed', next);

    if (next === '4-lead') onChange('twelveLeadInterpretation', '');
    if (next === '12-lead') onChange('fourLeadInterpretation', '');
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-black text-slate-950">ECG performed</div>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">
          Select the study obtained.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['4-lead', '4-Lead'],
            ['12-lead', '12-Lead'],
            ['both', 'Both'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectPerformed(key as EcgAssessmentForm['ecgPerformed'])}
              className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
                performed === key && !value.notIndicated
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => {
              onChange('notIndicated', true);
              onChange('ecgPerformed', '');
              onChange('fourLeadInterpretation', '');
              onChange('twelveLeadInterpretation', '');
            }}
            disabled={hasDocumentedInterpretation && !value.notIndicated}
            className={`rounded-xl border px-3 py-3 text-sm font-black transition ${
              value.notIndicated
                ? 'border-emerald-600 bg-emerald-600 text-white'
                : hasDocumentedInterpretation
                  ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            Not Indicated
          </button>
        </div>
      </div>

      {value.notIndicated && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
          Cardiac ECG assessment documented as not indicated.
        </div>
      )}

      {!value.notIndicated && performed && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {showFourLead && (
            <label className="block">
              <span className="mb-1 block text-sm font-black text-slate-800">
                4-Lead Rhythm
              </span>
              <select
                value={value.fourLeadInterpretation}
                onChange={(event) =>
                  onChange('fourLeadInterpretation', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm"
              >
                <option value="">Select rhythm</option>
                {fourLeadRhythms.map((rhythm) => (
                  <option key={rhythm} value={rhythm}>
                    {rhythm}
                  </option>
                ))}
              </select>
            </label>
          )}

          {showTwelveLead && (
            <label className="block">
              <span className="mb-1 block text-sm font-black text-slate-800">
                12-Lead Interpretation
              </span>
              <select
                value={value.twelveLeadInterpretation}
                onChange={(event) =>
                  onChange('twelveLeadInterpretation', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm"
              >
                <option value="">Select interpretation</option>
                {twelveLeadInterpretations.map((interpretation) => (
                  <option key={interpretation} value={interpretation}>
                    {interpretation}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-black text-slate-800">
              Additional ECG Findings
            </span>
            <textarea
              value={value.abnormalFindings}
              onChange={(event) => onChange('abnormalFindings', event.target.value)}
              rows={3}
              placeholder="Optional: ectopy, interval changes, serial changes, artifact, or other pertinent findings."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 shadow-sm"
            />
          </label>
        </div>
      )}

      {!value.notIndicated && !performed && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-500">
          Select an ECG option above.
        </div>
      )}
    </div>
  );
}

export type { EcgAssessmentForm };
