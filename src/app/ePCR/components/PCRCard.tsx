type PCRCardProps = {
  title: string;
  required?: boolean;
  children: React.ReactNode;
};

export default function PCRCard({
  title,
  required = true,
  children,
}: PCRCardProps) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {required && (
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            Required
          </span>
        )}
      </div>

      {children}
    </div>
  );
}
