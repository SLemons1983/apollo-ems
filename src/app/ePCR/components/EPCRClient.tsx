'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import CallSection from '../sections/CallSection';
import type { CallForm } from '../types';
import { createDefaultCallForm, getCallRequiredFields } from '../utils';

const sections = [
  'Call',
  'Patient',
  'Complaint',
  'Assessment',
  'Vitals',
  'Treatments',
  'Billing Information',
  'Narrative',
  'Signatures',
];

export default function EPCRClient() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('Call');
  const [fileStatus, setFileStatus] = useState('');

  const [callForm, setCallForm] = useState<CallForm>(() =>
    createDefaultCallForm(),
  );

  const callRequiredFields = useMemo(
    () => getCallRequiredFields(callForm),
    [callForm],
  );

  const callCompletedRequiredFields = callRequiredFields.filter(Boolean).length;
  const callTotalRequiredFields = callRequiredFields.length;
  const callComplete = callCompletedRequiredFields === callTotalRequiredFields;
  const callCompletionPercentage = Math.round(
    (callCompletedRequiredFields / callTotalRequiredFields) * 100,
  );

  function updateCallForm(field: keyof CallForm, value: string) {
    setCallForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getSectionComplete(section: string) {
    if (section === 'Call') {
      return callComplete;
    }

    return false;
  }

  function savePCRToFile() {
    const savedPCR = {
      fileType: 'ApolloEMS Mock ePCR',
      fileVersion: 1,
      savedAt: new Date().toISOString(),
      expandedSection,
      chart: {
        call: callForm,
      },
    };

    const blob = new Blob([JSON.stringify(savedPCR, null, 2)], {
      type: 'application/json',
    });

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = `ApolloEMS-ePCR-${callForm.emsResponseNumber}.apolloepcr`;
    downloadLink.click();

    URL.revokeObjectURL(downloadUrl);
    setFileStatus('PCR saved to local file.');
  }

  async function uploadPCRFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as {
        fileType?: string;
        fileVersion?: number;
        expandedSection?: string;
        chart?: {
          call?: CallForm;
        };
        callForm?: CallForm;
      };

      const uploadedCallForm = parsed.chart?.call ?? parsed.callForm;

      if (
        parsed.fileType !== 'ApolloEMS Mock ePCR' ||
        parsed.fileVersion !== 1 ||
        !uploadedCallForm
      ) {
        throw new Error('Invalid ApolloEMS ePCR file.');
      }

      setCallForm(uploadedCallForm);
      setExpandedSection(parsed.expandedSection || 'Call');
      setFileStatus('PCR uploaded successfully.');
    } catch (error) {
      console.error(error);
      setFileStatus(
        'Unable to upload PCR file. Please select a valid ApolloEMS ePCR save file.',
      );
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-slate-900">
          ApolloEMS ePCR
        </h1>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-slate-600">
            Mock Electronic Patient Care Report Demonstration
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={savePCRToFile}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
            >
              Save PCR
            </button>

            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50"
            >
              Upload PCR
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              accept=".apolloepcr,application/json"
              onChange={uploadPCRFromFile}
              className="hidden"
            />
          </div>
        </div>

        {fileStatus && (
          <div className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            {fileStatus}
          </div>
        )}

        <div className="space-y-4">
          {sections.map((section) => {
            const complete = getSectionComplete(section);

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
                    <h2 className="text-xl font-semibold text-slate-900">
                      {section}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {section === 'Call'
                        ? `${callCompletedRequiredFields} / ${callTotalRequiredFields} Required Fields Complete`
                        : complete
                          ? 'Complete'
                          : 'Required information missing'}
                    </p>

                    {section === 'Call' && (
                      <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${
                            callComplete ? 'bg-emerald-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${callCompletionPercentage}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <span className="text-2xl text-slate-700">
                    {expandedSection === section ? '−' : '+'}
                  </span>
                </button>

                {expandedSection === section && (
                  <div className="border-t bg-white p-6">
                    {section === 'Call' ? (
                      <CallSection
                        callForm={callForm}
                        setCallForm={setCallForm}
                        updateCallForm={updateCallForm}
                      />
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                        {section} cards will be added here.
                      </div>
                    )}
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
