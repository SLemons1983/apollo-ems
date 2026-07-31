'use client';
import { useState } from 'react';
import type { NarrativeForm, NarrativeFormat } from '../clinical/narrative/narrative';

export default function NarrativeSection({ value, onChange, onGenerate, sourceChanged }: { value: NarrativeForm; onChange: (value: NarrativeForm) => void; onGenerate: (format: Exclude<NarrativeFormat, ''>) => void; sourceChanged: boolean }) {
  const [choosing, setChoosing] = useState(false);
  return <div className="space-y-4">
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">ACI uses only information documented in this PCR. It does not infer findings or diagnoses. Generated text is optional and must be reviewed and edited by the clinician.</div>
    <div className="flex flex-wrap gap-3"><button type="button" onClick={() => setChoosing(true)} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">{value.text ? 'Regenerate Narrative' : 'Generate Narrative'}</button>{value.text && <button type="button" onClick={() => onChange({ ...value, text: '', format: '', generatedAt: '', sourceFingerprint: '' })} className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold">Clear Narrative</button>}</div>
    {choosing && <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm"><div className="mb-3 font-bold">Choose narrative format</div><div className="flex gap-3"><button type="button" onClick={() => { onGenerate('Chronological'); setChoosing(false); }} className="rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white">Chronological</button><button type="button" onClick={() => { onGenerate('SOAP'); setChoosing(false); }} className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white">SOAP</button><button type="button" onClick={() => setChoosing(false)} className="rounded-lg border px-4 py-2 font-semibold">Cancel</button></div></div>}
    {sourceChanged && value.text && <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">The PCR changed after this narrative was generated. Review the edits or regenerate the narrative before signing.</div>}
    <label className="block"><span className="mb-2 block font-bold">PCR Narrative</span><textarea rows={18} value={value.text} onChange={(event) => onChange({ ...value, text: event.target.value })} placeholder="Enter a narrative manually or select Generate Narrative." className="w-full rounded-xl border border-slate-300 p-4 leading-7 text-slate-900" /></label>
    {value.generatedAt && <p className="text-xs text-slate-500">Generated in {value.format} format at {new Date(value.generatedAt).toLocaleString()}. Narrative remains editable.</p>}
  </div>;
}
