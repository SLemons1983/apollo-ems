'use client';

import { gfastFields } from '../../../engine/assessment/gfast';

type GfastAssessmentForm = {
  gaze: string;
  face: string;
  arms: string;
  speech: string;
  time: string;
};

type GfastAssessmentCardProps = {
  value: GfastAssessmentForm;
  onChange: (field: keyof GfastAssessmentForm, value: string) => void;
};

export default function GfastAssessmentCard({
  value,
  onChange,
}: GfastAssessmentCardProps) {
  return (
    <div className="space-y-5">
      {gfastFields.map((field) => (
        <div key={field.id}>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            {field.label}
          </h4>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {field.options.map((option) => {
              const selected = value[field.id as keyof GfastAssessmentForm] === option;

              return (
                <button
                  key={`${field.id}-${option}`}
                  type="button"
                  onClick={() =>
                    onChange(field.id as keyof GfastAssessmentForm, option)
                  }
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

export type { GfastAssessmentForm };
