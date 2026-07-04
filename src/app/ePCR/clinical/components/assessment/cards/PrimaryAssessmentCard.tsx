'use client';

type PrimaryAssessmentForm = {
  generalImpression: string;
  levelOfConsciousness: string;
  airway: string;
  breathing: string;
  circulation: string;
  disability: string;
  exposure: string;
  gcsEyes: string;
  gcsVerbal: string;
  gcsMotor: string;
  pupils: string;
  skinColor: string;
  skinTemperature: string;
  skinCondition: string;
  lifeThreats: string;
  transportPriority: string;
};

type PrimaryAssessmentCardProps = {
  value: PrimaryAssessmentForm;
  onChange: (field: keyof PrimaryAssessmentForm, value: string) => void;
};

const groups: {
  field: keyof PrimaryAssessmentForm;
  label: string;
  options: string[];
}[] = [
  {
    field: 'generalImpression',
    label: 'General Impression',
    options: ['Stable', 'Ill', 'Critical', 'Unable to Determine'],
  },
  {
    field: 'levelOfConsciousness',
    label: 'Level of Consciousness',
    options: ['Alert', 'Verbal', 'Painful', 'Unresponsive'],
  },
  {
    field: 'airway',
    label: 'A - Airway',
    options: ['Patent', 'Maintained', 'Obstructed', 'Advanced Airway'],
  },
  {
    field: 'breathing',
    label: 'B - Breathing',
    options: ['Normal', 'Labored', 'Assisted', 'Apneic'],
  },
  {
    field: 'circulation',
    label: 'C - Circulation',
    options: ['Adequate', 'Major Bleeding', 'Shock Signs', 'Cardiac Arrest'],
  },
  {
    field: 'disability',
    label: 'D - Disability',
    options: ['No Deficit Noted', 'Altered LOC', 'Focal Deficit', 'Seizure Activity'],
  },
  {
    field: 'exposure',
    label: 'E - Exposure',
    options: ['No Major Findings', 'Fully Assessed', 'Limited Assessment', 'Environmental Concern'],
  },
  {
    field: 'gcsEyes',
    label: 'GCS - Eye Opening',
    options: ['4 - Spontaneous', '3 - To Speech', '2 - To Pain', '1 - None'],
  },
  {
    field: 'gcsVerbal',
    label: 'GCS - Verbal Response',
    options: ['5 - Oriented', '4 - Confused', '3 - Inappropriate Words', '2 - Incomprehensible Sounds', '1 - None'],
  },
  {
    field: 'gcsMotor',
    label: 'GCS - Motor Response',
    options: ['6 - Obeys Commands', '5 - Localizes Pain', '4 - Withdraws From Pain', '3 - Flexion To Pain', '2 - Extension To Pain', '1 - None'],
  },
  {
    field: 'pupils',
    label: 'PERRLA',
    options: ['PERRLA', 'Unequal', 'Sluggish', 'Fixed', 'Unable to Assess'],
  },
  {
    field: 'skinColor',
    label: 'Skin Color',
    options: ['Normal', 'Pale', 'Flushed', 'Cyanotic', 'Jaundiced'],
  },
  {
    field: 'skinTemperature',
    label: 'Skin Temperature',
    options: ['Warm', 'Cool', 'Hot', 'Cold'],
  },
  {
    field: 'skinCondition',
    label: 'Skin Condition',
    options: ['Dry', 'Diaphoretic', 'Moist', 'Poor Turgor'],
  },
  {
    field: 'lifeThreats',
    label: 'Life Threats',
    options: ['None Apparent', 'Airway', 'Breathing', 'Circulation', 'Trauma'],
  },
  {
    field: 'transportPriority',
    label: 'Transport Priority',
    options: ['Low', 'Moderate', 'High', 'Immediate'],
  },
];

function getGcsScore(value: PrimaryAssessmentForm) {
  const scores = [value.gcsEyes, value.gcsVerbal, value.gcsMotor]
    .map((item) => Number(item.split(' - ')[0]))
    .filter((score) => !Number.isNaN(score));

  return scores.length === 3
    ? scores.reduce((total, score) => total + score, 0)
    : 0;
}

export default function PrimaryAssessmentCard({
  value,
  onChange,
}: PrimaryAssessmentCardProps) {
  const gcsScore = getGcsScore(value);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          Calculated GCS
        </div>
        <div className="mt-1 text-4xl font-black text-slate-900">
          {gcsScore || '—'}
        </div>
      </div>
      {groups.map((group) => (
        <div key={group.field}>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            {group.label}
          </h4>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {group.options.map((option) => {
              const selected = value[group.field] === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(group.field, option)}
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
      ))}
    </div>
  );
}

export type { PrimaryAssessmentForm };
