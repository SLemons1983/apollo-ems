'use client';

import { useState } from 'react';

type RespiratoryAssessmentForm = {
  respiratoryEffort: string;
  airwayPatency: string;
  breathSoundsLeft: string;
  breathSoundsRight: string;
  accessoryMuscleUse: string;
  cough: string;
  currentRespiratorySupport: string;
  observedResponse: string;
  pastmedProvocation: string;
  pastmedAssociatedSymptoms: string;
  pastmedSputum: string;
  pastmedTriggers: string;
  pastmedMedicalHistory: string;
  pastmedExerciseTolerance: string;
  pastmedDuration: string;
  notes: string;
};

type RespiratoryAssessmentCardProps = {
  value: RespiratoryAssessmentForm;
  onChange: (field: keyof RespiratoryAssessmentForm, value: string) => void;
};

const sections: {
  id: string;
  title: string;
  fields: {
    field: keyof RespiratoryAssessmentForm;
    label: string;
    options: string[];
  }[];
}[] = [
  {
    id: 'primary-respiratory',
    title: 'Respiratory Exam',
    fields: [
      {
        field: 'respiratoryEffort',
        label: 'Respiratory Effort',
        options: ['Normal', 'Mild Distress', 'Moderate Distress', 'Severe Distress', 'Apneic'],
      },
      {
        field: 'airwayPatency',
        label: 'Airway Patency',
        options: ['Patent', 'Maintained', 'Partially Obstructed', 'Obstructed', 'Advanced Airway'],
      },
      {
        field: 'accessoryMuscleUse',
        label: 'Accessory Muscle Use',
        options: ['None', 'Mild', 'Moderate', 'Severe', 'Unable to Assess'],
      },
      {
        field: 'cough',
        label: 'Cough',
        options: ['None', 'Dry', 'Productive', 'Weak', 'Unable to Assess'],
      },
    ],
  },
  {
    id: 'lung-sounds',
    title: 'Lung Sounds',
    fields: [
      {
        field: 'breathSoundsLeft',
        label: 'Left Lung Sounds',
        options: ['Clear', 'Diminished', 'Wheezes', 'Rales / Crackles', 'Rhonchi', 'Absent'],
      },
      {
        field: 'breathSoundsRight',
        label: 'Right Lung Sounds',
        options: ['Clear', 'Diminished', 'Wheezes', 'Rales / Crackles', 'Rhonchi', 'Absent'],
      },
    ],
  },
  {
    id: 'treatment-response',
    title: 'Support / Response Considerations',
    fields: [
      {
        field: 'currentRespiratorySupport',
        label: 'Current Respiratory Support',
        options: ['Room Air', 'Nasal Cannula', 'Non-Rebreather', 'BVM', 'CPAP', 'Advanced Airway'],
      },
      {
        field: 'observedResponse',
        label: 'Observed Respiratory Trend',
        options: ['Improving', 'Unchanged', 'Worsening', 'Unable to Determine'],
      },
    ],
  },
  {
    id: 'pastmed',
    title: 'PASTMED History',
    fields: [
      {
        field: 'pastmedProvocation',
        label: 'P - Provocation / Palliation',
        options: ['Exertion', 'Position', 'Allergen / Exposure', 'Medication Helped', 'No Clear Trigger'],
      },
      {
        field: 'pastmedAssociatedSymptoms',
        label: 'A - Associated Symptoms',
        options: ['Chest Pain', 'Fever', 'Cough', 'Weakness', 'Syncope / Near Syncope'],
      },
      {
        field: 'pastmedSputum',
        label: 'S - Sputum',
        options: ['None', 'Clear', 'Yellow / Green', 'Bloody', 'Unable to Assess'],
      },
      {
        field: 'pastmedTriggers',
        label: 'T - Triggers',
        options: ['Smoke', 'Dust', 'Food', 'Medication', 'Unknown'],
      },
      {
        field: 'pastmedMedicalHistory',
        label: 'M - Medical History',
        options: ['Asthma', 'COPD', 'CHF', 'Pneumonia', 'No Known History'],
      },
      {
        field: 'pastmedExerciseTolerance',
        label: 'E - Exercise Tolerance',
        options: ['Normal', 'Reduced', 'Unable to Walk', 'Bedbound', 'Unable to Assess'],
      },
      {
        field: 'pastmedDuration',
        label: 'D - Duration',
        options: ['Sudden Onset', 'Minutes', 'Hours', 'Days', 'Chronic / Ongoing'],
      },
    ],
  },
];

const requiredFields = sections.flatMap((section) =>
  section.fields.map((item) => item.field),
);
const totalFields = requiredFields.length;

function getCompletedFields(value: RespiratoryAssessmentForm) {
  return requiredFields.filter((field) => value[field]).length;
}

function getCompletionPercent(value: RespiratoryAssessmentForm) {
  return Math.round((getCompletedFields(value) / totalFields) * 100);
}

function isComplete(value: RespiratoryAssessmentForm) {
  return getCompletedFields(value) >= totalFields - 1;
}

function getBadgeStyle(value: RespiratoryAssessmentForm) {
  if (isComplete(value)) {
    return 'bg-emerald-100 text-emerald-800';
  }

  if (getCompletedFields(value) > 0) {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-slate-100 text-slate-600';
}

function getProgressColor(value: RespiratoryAssessmentForm) {
  if (isComplete(value)) {
    return 'bg-emerald-500';
  }

  if (getCompletedFields(value) > 0) {
    return 'bg-amber-500';
  }

  return 'bg-slate-300';
}

function getStatusLabel(value: RespiratoryAssessmentForm) {
  if (isComplete(value)) {
    return 'Complete';
  }

  if (getCompletedFields(value) > 0) {
    return 'In Progress';
  }

  return 'Not Started';
}

export default function RespiratoryAssessmentCard({
  value,
  onChange,
}: RespiratoryAssessmentCardProps) {
  const [expandedSection, setExpandedSection] = useState(sections[0].id);
  const completedFields = getCompletedFields(value);
  const completionPercent = getCompletionPercent(value);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Respiratory Assessment / PASTMED
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Document respiratory exam findings, current respiratory support,
          observed respiratory trend, and PASTMED respiratory history.
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
              Respiratory Summary
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

                  {section.id === 'pastmed' && (
                    <label className="block">
                      <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
                        Respiratory Notes
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

export type { RespiratoryAssessmentForm };
