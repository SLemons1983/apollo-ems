'use client';

import { useState } from 'react';

type AlocAssessmentForm = {
  currentMentalStatus: string;
  orientation: string;
  speech: string;
  pupils: string;
  bloodGlucose: string;
  alcohol: string;
  epilepsy: string;
  insulin: string;
  overdose: string;
  uremia: string;
  trauma: string;
  infection: string;
  psych: string;
  stroke: string;
  notes: string;
};

type AlocAssessmentCardProps = {
  value: AlocAssessmentForm;
  onChange: (field: keyof AlocAssessmentForm, value: string) => void;
};

const sections: {
  id: string;
  title: string;
  fields: {
    field: keyof AlocAssessmentForm;
    label: string;
    options: string[];
  }[];
}[] = [
  {
    id: 'mental-status',
    title: 'Mental Status Exam',
    fields: [
      {
        field: 'currentMentalStatus',
        label: 'Current Mental Status',
        options: ['Alert', 'Confused', 'Lethargic', 'Combative', 'Unresponsive'],
      },
      {
        field: 'orientation',
        label: 'Orientation',
        options: ['Oriented x4', 'Oriented x3', 'Oriented x2', 'Oriented x1', 'Not Oriented'],
      },
      {
        field: 'speech',
        label: 'Speech',
        options: ['Clear', 'Slurred', 'Inappropriate', 'Aphasic', 'Unable to Assess'],
      },
      {
        field: 'pupils',
        label: 'Pupils',
        options: ['PERRLA', 'Unequal', 'Pinpoint', 'Dilated', 'Fixed', 'Unable to Assess'],
      },
      {
        field: 'bloodGlucose',
        label: 'Blood Glucose Consideration',
        options: ['Normal', 'Low', 'High', 'Not Checked Yet', 'Unable to Check'],
      },
    ],
  },
  {
    id: 'aeiou',
    title: 'AEIOU-TIPS Differential Prompts',
    fields: [
      {
        field: 'alcohol',
        label: 'A - Alcohol / Acidosis',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'epilepsy',
        label: 'E - Epilepsy / Seizure',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'insulin',
        label: 'I - Insulin / Glucose',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'overdose',
        label: 'O - Overdose / Oxygen',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'uremia',
        label: 'U - Uremia / Metabolic',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'trauma',
        label: 'T - Trauma / Temperature',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'infection',
        label: 'I - Infection',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'psych',
        label: 'P - Psychiatric / Poisoning',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
      {
        field: 'stroke',
        label: 'S - Stroke / Shock',
        options: ['Possible', 'Unlikely', 'Confirmed', 'Unknown'],
      },
    ],
  },
];

const totalFields = 15;

function getCompletedFields(value: AlocAssessmentForm) {
  return Object.values(value).filter(Boolean).length;
}

function getCompletionPercent(value: AlocAssessmentForm) {
  return Math.round((getCompletedFields(value) / totalFields) * 100);
}

function isComplete(value: AlocAssessmentForm) {
  return getCompletedFields(value) >= totalFields - 1;
}

function getBadgeStyle(value: AlocAssessmentForm) {
  if (isComplete(value)) {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (getCompletedFields(value) > 0) {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-slate-100 text-slate-600';
}

function getProgressColor(value: AlocAssessmentForm) {
  if (isComplete(value)) {
    return 'bg-emerald-500';
  }

  if (getCompletedFields(value) > 0) {
    return 'bg-amber-500';
  }

  return 'bg-slate-300';
}

function getStatusLabel(value: AlocAssessmentForm) {
  if (isComplete(value)) {
    return 'Complete';
  }

  if (getCompletedFields(value) > 0) {
    return 'In Progress';
  }

  return 'Not Started';
}

export default function AlocAssessmentCard({
  value,
  onChange,
}: AlocAssessmentCardProps) {
  const [expandedSection, setExpandedSection] = useState(sections[0].id);
  const completedFields = getCompletedFields(value);
  const completionPercent = getCompletionPercent(value);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Altered Level of Consciousness / AEIOU-TIPS
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Document mental status findings and structured AEIOU-TIPS clinical
          considerations. Apollo does not diagnose; contact Base Hospital /
          Medical Control when clinical guidance is needed.
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpandedSection(sections[0].id)}
        className="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-4 text-left"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-black text-blue-950">
              ALOC Summary
            </div>
            <div className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black uppercase ${getBadgeStyle(value)}`}>
              {getStatusLabel(value)}
            </div>
          </div>

          <div className="text-sm font-black text-slate-600">
            {completedFields}/{totalFields}
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${getProgressColor(value)}`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>

        <div className="mt-3 text-xs font-bold text-slate-500">
          {completionPercent}% complete
        </div>
      </button>

      <div className="space-y-3">
        {sections.map((section) => {
          const expanded = expandedSection === section.id;
          const sectionCompleted = section.fields.filter((item) => value[item.field]).length;
          const sectionTotal = section.fields.length;

          return (
            <div key={section.id} className="rounded-xl border border-slate-300 bg-white">
              <button
                type="button"
                onClick={() =>
                  setExpandedSection((current) =>
                    current === section.id ? '' : section.id,
                  )
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-base font-black text-slate-900">
                      {expanded ? '▼' : '▶'} {section.title}
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                        sectionCompleted === sectionTotal
                          ? 'bg-emerald-100 text-emerald-800'
                          : sectionCompleted > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sectionCompleted === sectionTotal
                        ? 'Complete'
                        : sectionCompleted > 0
                          ? 'In Progress'
                          : 'Not Started'}
                    </div>
                  </div>

                  <div className="mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        sectionCompleted === sectionTotal
                          ? 'bg-emerald-500'
                          : sectionCompleted > 0
                            ? 'bg-amber-500'
                            : 'bg-slate-300'
                      }`}
                      style={{
                        width: `${Math.round((sectionCompleted / sectionTotal) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {sectionCompleted} / {sectionTotal} Completed
                  </div>
                </div>
              </button>

              {expanded && (
                <div className="border-t border-slate-200 px-4 py-4">
                  {section.fields.map((field) => (
                    <div key={field.field} className="mb-4">
                      <h5 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                        {field.label}
                      </h5>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {field.options.map((option) => {
                          const selected = value[field.field] === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                onChange(field.field, selected ? '' : option)
                              }
                              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                selected
                                  ? 'border-2 border-blue-500 bg-blue-50 text-blue-950'
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

                  {section.id === 'aeiou' && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
                        ALOC Notes
                      </span>
                      <textarea
                        value={value.notes}
                        onChange={(event) => onChange('notes', event.target.value)}
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type { AlocAssessmentForm };
