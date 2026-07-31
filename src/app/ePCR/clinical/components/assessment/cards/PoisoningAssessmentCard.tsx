'use client';

export type PoisoningAssessmentForm = { salivation: string; lacrimation: string; urination: string; defecation: string; gastrointestinalDistress: string; emesis: string; miosis: string; muscleActivity: string; notes: string };
type Props = { value: PoisoningAssessmentForm; onChange: (field: keyof PoisoningAssessmentForm, value: string) => void };
const findings: { field: keyof PoisoningAssessmentForm; label: string }[] = [
  { field: 'salivation', label: 'S — Salivation' }, { field: 'lacrimation', label: 'L — Lacrimation' },
  { field: 'urination', label: 'U — Urination' }, { field: 'defecation', label: 'D — Defecation / Diarrhea' },
  { field: 'gastrointestinalDistress', label: 'G — Gastrointestinal Distress' }, { field: 'emesis', label: 'E — Emesis' },
  { field: 'miosis', label: 'M — Miosis' }, { field: 'muscleActivity', label: 'Muscle Activity / Fasciculations' },
];
export default function PoisoningAssessmentCard({ value, onChange }: Props) { return <div className="space-y-4"><p className="text-sm text-slate-600">Document each cholinergic toxidrome finding as present, absent, or unable to assess.</p><div className="grid gap-4 md:grid-cols-2">{findings.map(({field,label}) => <label key={field} className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span><select value={value[field]} onChange={e=>onChange(field,e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"><option value="">Select</option><option>Absent</option><option>Present</option><option>Unable to Assess</option></select></label>)}</div><label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Exposure / Additional Notes (Optional)</span><textarea value={value.notes} onChange={e=>onChange('notes',e.target.value)} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" /></label></div> }
