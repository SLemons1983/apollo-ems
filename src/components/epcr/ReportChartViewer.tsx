import Image from 'next/image';

const sectionOrder = ['call', 'patient', 'complaint', 'assessment', 'vitals', 'treatments', 'billing', 'narrative', 'signature'];

function label(value: string) {
  const special: Record<string, string> = { ems: 'EMS', pcr: 'PCR', dob: 'DOB', gcs: 'GCS', spo2: 'SpO₂', etco2: 'ETCO₂', spco: 'SpCO' };
  const words = value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').split(' ');
  return words.map((word) => special[word.toLowerCase()] ?? word.replace(/^./, (letter) => letter.toUpperCase())).join(' ');
}

function meaningful(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.some(meaningful);
  if (typeof value === 'object') return Object.values(value as Record<string, unknown>).some(meaningful);
  return true;
}

function primitive(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function ClinicalValue({ name, value, depth = 0 }: { name: string; value: unknown; depth?: number }) {
  if (!meaningful(value) || name === 'draft' || name === 'sourceFingerprint') return null;
  if (name === 'imageData' && typeof value === 'string' && value.startsWith('data:image/')) {
    return <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">Signature</div><Image src={value} alt="Documented signature" width={700} height={220} unoptimized className="h-auto max-h-48 w-auto max-w-full rounded-lg border bg-white" /></div>;
  }
  if (Array.isArray(value)) {
    return <div className={depth ? 'rounded-xl border border-slate-200 bg-slate-50 p-3' : ''}>
      <h4 className="mb-2 text-xs font-black uppercase tracking-wide text-blue-700">{label(name)}</h4>
      <div className="space-y-3">{value.filter(meaningful).map((item, index) => typeof item === 'object' && item !== null
        ? <div key={index} className="rounded-xl border border-slate-200 bg-white p-4"><p className="mb-3 text-xs font-black uppercase text-slate-500">{label(name).replace(/s$/, '')} {index + 1}</p>{Object.entries(item as Record<string, unknown>).map(([key, nested]) => <ClinicalValue key={key} name={key} value={nested} depth={depth + 1} />)}</div>
        : <p key={index} className="text-sm text-slate-800">{primitive(item)}</p>)}</div>
    </div>;
  }
  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key, nested]) => key !== 'draft' && meaningful(nested));
    if (!entries.length) return null;
    return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
      <h4 className="mb-3 text-sm font-black text-slate-900">{label(name)}</h4>
      <div className="grid gap-3 sm:grid-cols-2">{entries.map(([key, nested]) => <ClinicalValue key={key} name={key} value={nested} depth={depth + 1} />)}</div>
    </div>;
  }
  return <div className="min-w-0 rounded-lg bg-white p-3">
    <dt className="text-xs font-black uppercase tracking-wide text-blue-700">{label(name)}</dt>
    <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{primitive(value)}</dd>
  </div>;
}

export default function ReportChartViewer({ chart }: { chart: Record<string, unknown> }) {
  const sections = Object.entries(chart).sort(([a], [b]) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));
  return <div className="space-y-4">
    {sections.filter(([, value]) => meaningful(value)).map(([section, raw]) => {
      const fields: Array<[string, unknown]> = raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.entries(raw as Record<string, unknown>) : [['value', raw]];
      return <details key={section} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg" open={section === 'call' || section === 'patient'}>
        <summary className="cursor-pointer bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-5 py-4 text-lg font-black text-white">{label(section)}</summary>
        <dl className="grid gap-3 bg-slate-100 p-4 sm:grid-cols-2">{fields.map(([key, value]) => <ClinicalValue key={key} name={key} value={value} />)}</dl>
      </details>;
    })}
  </div>;
}
