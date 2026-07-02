'use client';

import { useState } from 'react';

const sections = [
  'Call',
  'Patient',
  'Complaint',
  'Assessment',
  'Vitals',
  'Treatments',
  'Outcome',
  'Billing Information',
  'Narrative',
  'Signatures',
];

export default function EPCRPage() {
  const [expandedSection, setExpandedSection] = useState<string>('Call');

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-slate-900">
          ApolloEMS ePCR
        </h1>

        <p className="mb-8 text-slate-600">
          Mock Electronic Patient Care Report Demonstration
        </p>

        <div className="space-y-4">
          {sections.map((section) => {
            const complete = false;

            return (
              <section
                key={section}
                className="overflow-hidden rounded-xl border bg-white shadow"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedSection(
                      expandedSection === section ? '' : section,
                    )
                  }
                  className={`flex w-full items-center justify-between px-6 py-5 text-left transition ${
                    complete
                      ? 'border-l-8 border-emerald-600'
                      : 'border-l-8 border-red-600 bg-red-50'
                  }`}
                >
                  <div>
                    <h2 className="text-xl font-semibold">{section}</h2>

                    <p className="text-sm text-slate-500">
                      {complete
                        ? 'Complete'
                        : 'Required information missing'}
                    </p>
                  </div>

                  <span className="text-2xl">
                    {expandedSection === section ? '−' : '+'}
                  </span>
                </button>

                {expandedSection === section && (
                  <div className="border-t bg-white p-6">
                    <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                      {section} cards will be added here.
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
