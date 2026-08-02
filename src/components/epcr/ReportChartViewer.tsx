function display(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'Not documented';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.length ? value.map(display).join(', ') : 'None documented';
  return JSON.stringify(value, null, 2);
}

function label(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

export default function ReportChartViewer({ chart }: { chart: Record<string, unknown> }) {
  return <div className="space-y-4">
    {Object.entries(chart).map(([section, raw]) => {
      const fields: Array<[string, unknown]> = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? Object.entries(raw as Record<string, unknown>)
        : [['value', raw]];
      return <details key={section} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg" open={section === 'call' || section === 'patient'}>
        <summary className="cursor-pointer bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-5 py-4 text-lg font-black text-white">{label(section)}</summary>
        <dl className="grid gap-px bg-slate-200 sm:grid-cols-2">
          {fields.map(([key, value]) => <div key={key} className="min-w-0 bg-white p-4">
            <dt className="text-xs font-black uppercase tracking-wide text-blue-700">{label(key)}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{display(value)}</dd>
          </div>)}
        </dl>
      </details>;
    })}
  </div>;
}
