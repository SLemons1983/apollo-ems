'use client';

type ReassessmentForm = {
  assessedAt: string;
  reason: string;
  patientCondition: string;
  mentalStatus: string;
  airwayBreathing: string;
  circulation: string;
  painChange: string;
  interventionsResponse: string;
  transportPriority: string;
  notes: string;
};

type ReassessmentRecord = ReassessmentForm & {
  id: string;
  createdAt: string;
};

type ReassessmentCardProps = {
  value: ReassessmentForm;
  onChange: (field: keyof ReassessmentForm, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveDisabled?: boolean;
};

const reassessmentGroups: {
  field: keyof ReassessmentForm;
  label: string;
  options: string[];
}[] = [
  {
    field: 'reason',
    label: 'Reason for Reassessment',
    options: ['Routine Reassessment', 'After Intervention', 'Change in Condition', 'Before Transfer of Care'],
  },
  {
    field: 'patientCondition',
    label: 'Patient Condition',
    options: ['Improved', 'Unchanged', 'Worsened', 'Unable to Determine'],
  },
  {
    field: 'mentalStatus',
    label: 'Mental Status',
    options: ['Alert', 'Verbal', 'Painful', 'Unresponsive', 'Unable to Assess'],
  },
  {
    field: 'airwayBreathing',
    label: 'Airway / Breathing',
    options: ['Patent / Normal', 'Patent / Labored', 'Assisted Ventilation', 'Airway Concern'],
  },
  {
    field: 'circulation',
    label: 'Circulation',
    options: ['Stable', 'Bleeding Controlled', 'Signs of Shock', 'Cardiac Arrest'],
  },
  {
    field: 'painChange',
    label: 'Pain Change',
    options: ['Improved', 'Unchanged', 'Worsened', 'No Pain Reported', 'Unable to Assess'],
  },
  {
    field: 'interventionsResponse',
    label: 'Response to Interventions',
    options: ['Positive Response', 'No Change', 'Negative Response', 'No Interventions Since Last Assessment'],
  },
  {
    field: 'transportPriority',
    label: 'Transport Priority',
    options: ['Low', 'Moderate', 'High', 'Immediate'],
  },
];

export default function ReassessmentCard({
  value,
  onChange,
  onSave,
  onCancel,
  saveDisabled = false,
}: ReassessmentCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          Reassessment
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Document patient condition changes, treatment response, and updated priority.
        </div>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
          Reassessment Date and Time
        </span>
        <input
          type="datetime-local"
          value={value.assessedAt}
          onChange={(event) => onChange('assessedAt', event.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
        />
      </label>

      {reassessmentGroups.map((group) => (
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
                  onClick={() => onChange(group.field, selected ? '' : option)}
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

      <label className="block">
        <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
          Reassessment Notes
        </span>
        <textarea
          value={value.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
        />
      </label>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saveDisabled}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Save Reassessment
        </button>
      </div>
    </div>
  );
}

export function createEmptyReassessmentForm(
  assessedAt = '',
): ReassessmentForm {
  return {
    assessedAt,
    reason: '',
    patientCondition: '',
    mentalStatus: '',
    airwayBreathing: '',
    circulation: '',
    painChange: '',
    interventionsResponse: '',
    transportPriority: '',
    notes: '',
  };
}

export type { ReassessmentForm, ReassessmentRecord };
