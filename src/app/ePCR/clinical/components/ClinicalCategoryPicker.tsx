'use client';

import { getClinicalCategories } from '../engine';
import type { ClinicalListType } from '../engine';

type ClinicalCategoryPickerProps = {
  label: string;
  listType: ClinicalListType;
  value: string;
  recommendedValues?: string[];
  onChange: (value: string) => void;
};

export default function ClinicalCategoryPicker({
  label,
  listType,
  value,
  recommendedValues = [],
  onChange,
}: ClinicalCategoryPickerProps) {
  const categories = getClinicalCategories(listType);
  const recommended = recommendedValues.filter((category) => categories.includes(category));
  const remaining = categories.filter((category) => !recommended.includes(category));

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      >
        <option value="">Select clinical impression...</option>
        {recommended.length > 0 && (
          <optgroup label="Recommended for chief complaint">
            {recommended.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </optgroup>
        )}
        <optgroup label={recommended.length > 0 ? 'All clinical impressions' : 'Clinical impressions'}>
          {remaining.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
