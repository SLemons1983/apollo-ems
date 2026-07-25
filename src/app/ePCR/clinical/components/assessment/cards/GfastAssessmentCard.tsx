'use client';

import {
  calculateCcemsaGfastScore,
} from '../../../engine/protocols/ccemsaStroke';

type GfastAssessmentForm = {
  gaze: string;
  face: string;
  arms: string;
  speech: string;
  time: string;
  bloodGlucose: string;
};

type GfastAssessmentCardProps = {
  value: GfastAssessmentForm;
  onChange: (field: keyof GfastAssessmentForm, value: string) => void;
};

const scoredFields: {
  field: keyof Pick<GfastAssessmentForm, 'gaze' | 'face' | 'arms' | 'speech'>;
  label: string;
  howTested: string;
  normal: string;
  abnormal: string;
}[] = [
  {
    field: 'gaze',
    label: 'Gaze',
    howTested: 'Have the patient look left and right without moving their head.',
    normal: 'Patient can gaze fully to both sides.',
    abnormal: 'Patient only looks in one direction.',
  },
  {
    field: 'face',
    label: 'Facial Droop',
    howTested: 'Have the patient show their teeth or smile.',
    normal: 'Both sides of the face move equally.',
    abnormal: 'One side of the face does not move as well as the other.',
  },
  {
    field: 'arms',
    label: 'Arm Drift',
    howTested:
      'Have the patient close their eyes and extend arms straight out for 10 seconds.',
    normal: 'Both arms move about the same, or do not move at all.',
    abnormal:
      'One arm does not move, or one arm drifts downward compared to the other.',
  },
  {
    field: 'speech',
    label: 'Speech',
    howTested: 'Have the patient repeat: “You can’t teach an old dog new tricks.”',
    normal: 'Correct words with no slurring.',
    abnormal: 'Slurred words, wrong words, or unable to speak.',
  },
];

export default function GfastAssessmentCard({
  value,
  onChange,
}: GfastAssessmentCardProps) {
  const score = calculateCcemsaGfastScore({
    gaze: value.gaze,
    face: value.face,
    arms: value.arms,
    speech: value.speech,
    lastKnownNormal: value.time,
    bloodGlucose: value.bloodGlucose,
  });

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          GFAST Score
        </div>
        <div className="mt-1 text-4xl font-black text-slate-900">{score}</div>
        <p className="mt-2 text-sm text-slate-600">
          Gaze, Face, Arm, and Speech score 0 for normal and 1 for abnormal.
          Time last seen normal is documented but does not add points.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Blood Glucose
        </span>
        <div className="flex rounded-lg shadow-sm">
          <input
            type="text"
            inputMode="numeric"
            value={value.bloodGlucose}
            onChange={(event) =>
              onChange(
                'bloodGlucose',
                event.target.value.replace(/\D/g, '').slice(0, 3),
              )
            }
            className="w-full rounded-l-lg border border-slate-300 px-3 py-2 text-slate-900"
          />
          <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-100 px-3 text-slate-600">
            mg/dL
          </span>
        </div>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Time Last Seen Normal / Last Known Well
        </span>
        <input
          type="datetime-local"
          value={value.time}
          onChange={(event) => onChange('time', event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
        />
      </label>

      {scoredFields.map((field) => (
        <div key={field.field} className="rounded-xl border border-slate-200 p-4">
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-600">
            {field.label}
          </h4>

          <p className="mt-2 text-sm text-slate-600">{field.howTested}</p>

          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              ['Normal', `0 - ${field.normal}`],
              ['Abnormal', `1 - ${field.abnormal}`],
            ].map(([option, description]) => {
              const selected = value[field.field] === option;

              return (
                <button
                  key={`${field.field}-${option}`}
                  type="button"
                  onClick={() => onChange(field.field, option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  {selected ? `✓ ${description}` : description}
                </button>
              );
            })}
          </div>
        </div>
      ))}

    </div>
  );
}

export type { GfastAssessmentForm };
