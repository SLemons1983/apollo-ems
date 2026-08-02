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
    return <div className="border-t border-slate-200 py-3 first:border-t-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Signature</p>
      <Image src={value} alt="Documented signature" width={700} height={220} unoptimized className="mt-2 h-auto max-h-40 w-auto max-w-full rounded border border-slate-200 bg-white" />
    </div>;
  }

  if (Array.isArray(value)) {
    const items = value.filter(meaningful);
    if (!items.length) return null;
    return <div className="border-t border-slate-200 py-3 first:border-t-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label(name)}</p>
      <div className="space-y-3">{items.map((item, index) =>
        typeof item === 'object' && item !== null
          ? <div key={index} className="border-l-2 border-slate-200 pl-3">
              <p className="mb-1 text-sm font-bold text-slate-700">{label(name).replace(/s$/, '')} {index + 1}</p>
              {Object.entries(item as Record<string, unknown>).map(([key, nested]) => <ClinicalValue key={key} name={key} value={nested} depth={depth + 1} />)}
            </div>
          : <p key={index} className="text-sm leading-6 text-slate-800">{primitive(item)}</p>
      )}</div>
    </div>;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([key, nested]) => key !== 'draft' && meaningful(nested));
    if (!entries.length) return null;
    return <div className="border-t border-slate-200 py-3 first:border-t-0">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label(name)}</p>
      <div className={depth ? 'border-l-2 border-slate-200 pl-3' : ''}>
        {entries.map(([key, nested]) => <ClinicalValue key={key} name={key} value={nested} depth={depth + 1} />)}
      </div>
    </div>;
  }

  return <div className="grid gap-1 border-t border-slate-200 py-3 first:border-t-0 sm:grid-cols-[13rem_1fr] sm:gap-5">
    <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label(name)}</dt>
    <dd className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-900">{primitive(value)}</dd>
  </div>;
}

export default function ReportChartViewer({ chart }: { chart: Record<string, unknown> }) {
  const sections = Object.entries(chart).sort(([a], [b]) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b));
  return <div className="space-y-3">
    {sections.filter(([, value]) => meaningful(value)).map(([section, raw]) => {
      const fields: Array<[string, unknown]> = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? Object.entries(raw as Record<string, unknown>)
        : [['value', raw]];
      return <details key={section} className="overflow-hidden rounded-xl border border-slate-200 bg-white" open={section === 'call'}>
        <summary className="cursor-pointer px-5 py-4 text-base font-black text-slate-900 hover:bg-slate-50">{label(section)}</summary>
        <dl className="border-t border-slate-200 px-5 pb-2">{fields.map(([key, value]) => <ClinicalValue key={key} name={key} value={value} />)}</dl>
      </details>;
    })}
  </div>;
}
