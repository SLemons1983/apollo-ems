'use client';

type PainAssessmentForm = {
  painPresent: string;
  painScaleType: string;
  numericPainScore: string;
  facesPainScore: string;
  onset: string;
  provocation: string;
  quality: string;
  radiation: string;
  time: string;
};

type PainAssessmentCardProps = {
  value: PainAssessmentForm;
  onChange: (field: keyof PainAssessmentForm, value: string) => void;
};

const numericScores = Array.from({ length: 11 }, (_, index) => String(index));

const facesScores = [
  { score: '0', label: 'No Hurt' },
  { score: '2', label: 'Hurts Little Bit' },
  { score: '4', label: 'Hurts Little More' },
  { score: '6', label: 'Hurts Even More' },
  { score: '8', label: 'Hurts Whole Lot' },
  { score: '10', label: 'Hurts Worst' },
];

const provocationOptions = ['Nothing', 'Exertion', 'Movement', 'Position', 'Palpation', 'Inspiration', 'Eating', 'Rest Improves', 'Medication Improves', 'Other'];
const qualityOptions = ['Pressure', 'Tightness', 'Crushing', 'Sharp', 'Stabbing', 'Dull', 'Aching', 'Burning', 'Tearing', 'Throbbing', 'Cramping', 'Other'];
const radiationOptions = ['No Radiation', 'Left Arm', 'Right Arm', 'Both Arms', 'Jaw', 'Neck', 'Back', 'Shoulder', 'Abdomen', 'Groin', 'Leg', 'Other'];

function splitDuration(value: string) {
  const match = value.match(/^(\d+(?:\.\d+)?)\s+(Minutes?|Hours?)$/i);
  return { amount: match?.[1] ?? '', unit: match?.[2] ?? 'Minutes' };
}

export default function PainAssessmentCard({
  value,
  onChange,
}: PainAssessmentCardProps) {
  const severity = value.painScaleType === '0-10 Numeric' ? value.numericPainScore : value.facesPainScore;
  const duration = splitDuration(value.time);
  const updateDuration = (amount: string, unit: string) =>
    onChange('time', amount ? `${amount} ${unit}` : '');
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          Pain Present
        </h4>

        <div className="grid gap-2 sm:grid-cols-3">
          {['Yes', 'No', 'Unable to Assess'].map((option) => {
            const selected = value.painPresent === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange('painPresent', option)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {selected ? `✓ ${option}` : option}
              </button>
            );
          })}
        </div>
      </div>

      {value.painPresent === 'Yes' && (
        <>
          <div>
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
              Pain Scale
            </h4>

            <div className="grid gap-2 sm:grid-cols-2">
              {['0-10 Numeric', 'Wong-Baker Faces'].map((option) => {
                const selected = value.painScaleType === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange('painScaleType', option)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                      selected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {selected ? `✓ ${option}` : option}
                  </button>
                );
              })}
            </div>
          </div>

          {value.painScaleType === '0-10 Numeric' && (
            <div>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                Numeric Pain Score
              </h4>

              <div className="grid grid-cols-6 gap-2 md:grid-cols-11">
                {numericScores.map((score) => {
                  const selected = value.numericPainScore === score;

                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => onChange('numericPainScore', score)}
                      className={`rounded-xl border px-3 py-3 text-center text-lg font-black transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {score}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {value.painScaleType === 'Wong-Baker Faces' && (
            <div>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                Wong-Baker Faces Pain Score
              </h4>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {facesScores.map((item) => {
                  const selected = value.facesPainScore === item.score;

                  return (
                    <button
                      key={item.score}
                      type="button"
                      onClick={() => onChange('facesPainScore', item.score)}
                      className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      <span className="block text-2xl font-black">
                        {item.score}
                      </span>
                      <span className="block">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
              OPQRST
            </h4>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">O - Onset</span>
                <textarea value={value.onset} onChange={(event) => onChange('onset', event.target.value)} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm" />
              </label>

              {([
                ['provocation', 'P - Provocation / Palliation', provocationOptions],
                ['quality', 'Q - Quality', qualityOptions],
                ['radiation', 'R - Radiation', radiationOptions],
              ] as const).map(([field, label, options]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span>
                  <select value={value[field]} onChange={(event) => onChange(field, event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <option value=""></option>
                    {options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              ))}

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">S - Severity</span>
                <input value={severity} readOnly aria-label="Severity carried from pain scale" className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 font-bold text-slate-900 shadow-sm" />
              </label>

              <div>
                <span className="mb-1 block text-sm font-semibold text-slate-700">T - Time / Duration</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" min="0" step="1" value={duration.amount} onChange={(event) => updateDuration(event.target.value, duration.unit)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm" />
                  <select value={duration.unit} onChange={(event) => updateDuration(duration.amount, event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm">
                    <option value="Minutes">Minutes</option>
                    <option value="Hours">Hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export type { PainAssessmentForm };
