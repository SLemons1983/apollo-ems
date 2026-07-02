'use client';

import { useMemo, useState } from 'react';

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

const dispatchedPriorities = [
  '1 - Immediate Response - Life Threatening',
  '2 - Immediate Response - Emergency Condition',
  '3 - Immediate Response - Urgent Condition',
  '4 - Immediate Response - Urgent Transfer',
  '5 - Scheduled Ambulance Transport',
  '6 - Scheduled Long Distance Ambulance Transport',
  '7 - Special Event or Standby',
];

const serviceTypes = [
  '911 Response',
  'Interfacility Transport',
  'Standby',
];

const responseModes = [
  'Code-3',
  'Code-2',
];

type CallForm = {
  emsResponseNumber: string;
  dispatchedPriority: string;
  respondingUnitNumber: string;
  respondingCrew: string;
  pcrDocumentedBy: string;
  dispatchedNatureOfCall: string;
  typeOfServiceRequested: string;
  responseModeToScene: string;
};

function createEmsResponseNumber() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = String(Math.floor(Math.random() * 100)).padStart(2, '0');

  return `${datePart}-${randomPart}`;
}

export default function EPCRPage() {
  const [expandedSection, setExpandedSection] = useState<string>('Call');

  const [callForm, setCallForm] = useState<CallForm>(() => ({
    emsResponseNumber: createEmsResponseNumber(),
    dispatchedPriority: '',
    respondingUnitNumber: '',
    respondingCrew: '',
    pcrDocumentedBy: '',
    dispatchedNatureOfCall: '',
    typeOfServiceRequested: '',
    responseModeToScene: '',
  }));

  const callComplete = useMemo(
    () =>
      Boolean(
        callForm.emsResponseNumber &&
          callForm.dispatchedPriority &&
          callForm.respondingUnitNumber &&
          callForm.respondingCrew &&
          callForm.pcrDocumentedBy &&
          callForm.dispatchedNatureOfCall &&
          callForm.typeOfServiceRequested &&
          callForm.responseModeToScene,
      ),
    [callForm],
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
                      {complete
                        ? 'Complete'
                        : 'Required information missing'}
                    </p>
                  </div>

                  <span className="text-2xl text-slate-700">
                    {expandedSection === section ? '−' : '+'}
                  </span>
                </button>

                {expandedSection === section && (
                  <div className="border-t bg-white p-6">
                    {section === 'Call' ? (
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            EMS Response Number
                          </span>
                          <input
                            type="text"
                            value={callForm.emsResponseNumber}
                            readOnly
                            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 shadow-sm"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Dispatched Priority
                          </span>
                          <select
                            value={callForm.dispatchedPriority}
                            onChange={(event) =>
                              updateCallForm(
                                'dispatchedPriority',
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                          >
                            <option value="">Select priority...</option>
                            {dispatchedPriorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Responding Unit Number
                          </span>
                          <div className="flex rounded-lg shadow-sm">
                            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-100 px-3 text-slate-600">
                              Medic-
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={callForm.respondingUnitNumber}
                              onChange={(event) =>
                                updateCallForm(
                                  'respondingUnitNumber',
                                  event.target.value.replace(/\D/g, ''),
                                )
                              }
                              placeholder="310"
                              className="w-full rounded-r-lg border border-slate-300 px-3 py-2 text-slate-900"
                            />
                          </div>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            PCR Documented By
                          </span>
                          <input
                            type="text"
                            value={callForm.pcrDocumentedBy}
                            onChange={(event) =>
                              updateCallForm(
                                'pcrDocumentedBy',
                                event.target.value,
                              )
                            }
                            placeholder="Report author name"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Responding Crew
                          </span>
                          <input
                            type="text"
                            value={callForm.respondingCrew}
                            onChange={(event) =>
                              updateCallForm(
                                'respondingCrew',
                                event.target.value,
                              )
                            }
                            placeholder="Crew names"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                          />
                        </label>

                        <label className="block md:col-span-2">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Dispatched Nature of Call
                          </span>
                          <input
                            type="text"
                            value={callForm.dispatchedNatureOfCall}
                            onChange={(event) =>
                              updateCallForm(
                                'dispatchedNatureOfCall',
                                event.target.value,
                              )
                            }
                            placeholder="Dispatched complaint or call nature"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Type of Service Requested
                          </span>
                          <select
                            value={callForm.typeOfServiceRequested}
                            onChange={(event) =>
                              updateCallForm(
                                'typeOfServiceRequested',
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                          >
                            <option value="">Select service type...</option>
                            {serviceTypes.map((serviceType) => (
                              <option key={serviceType} value={serviceType}>
                                {serviceType}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            Response Mode to Scene
                          </span>
                          <select
                            value={callForm.responseModeToScene}
                            onChange={(event) =>
                              updateCallForm(
                                'responseModeToScene',
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                          >
                            <option value="">Select response mode...</option>
                            {responseModes.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
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
