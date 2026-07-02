'use client';

import { Dispatch, SetStateAction } from 'react';
import type { CallForm } from '../types';

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

const incidentLocationTypes = [
  'Private Residence',
  'Commercial Building/Area',
  'Healthcare Facility',
  'Government Facility',
  'Educational Facility',
  'Street/Road/Highway',
  'Public Area',
  'Other',
];

const yesNoOptions = ['Yes', 'No'];

const exposureTypes = [
  'None',
  'Airborne Exposure',
  'Body Fluid Exposure',
  'Needle Stick Exposure',
  'Toxin Exposure',
  'Chemical Exposure',
  'Hazmat Exposure',
  'Other Exposure',
];

const ppeOptions = [
  'Eye Protection',
  'Gloves',
  'Gown',
  'N95 mask',
  'Surgical Mask',
  'Reflective Vest',
  'Other',
];

type CallSectionProps = {
  callForm: CallForm;
  setCallForm: Dispatch<SetStateAction<CallForm>>;
  updateCallForm: (field: keyof CallForm, value: string) => void;
};

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export default function CallSection({
  callForm,
  setCallForm,
  updateCallForm,
}: CallSectionProps) {
  return (
                      <div className="space-y-6">
                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              Dispatch Information
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Required
                            </span>
                          </div>

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

                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              Crew Information
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Required
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
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

                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              Response Information
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Required
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
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
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              Location Information
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Required
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Incident Location Type
                              </span>
                              <select
                                value={callForm.incidentLocationType}
                                onChange={(event) =>
                                  updateCallForm(
                                    'incidentLocationType',
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                              >
                                <option value="">Select location type...</option>
                                {incidentLocationTypes.map((locationType) => (
                                  <option key={locationType} value={locationType}>
                                    {locationType}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {callForm.incidentLocationType === 'Other' && (
                              <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                  Other Location Explanation
                                </span>
                                <input
                                  type="text"
                                  value={callForm.incidentLocationTypeOther}
                                  onChange={(event) =>
                                    updateCallForm(
                                      'incidentLocationTypeOther',
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              </label>
                            )}

                            <label className="block md:col-span-2">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Street Number and Street
                              </span>
                              <input
                                type="text"
                                value={callForm.incidentStreet}
                                onChange={(event) =>
                                  updateCallForm('incidentStreet', event.target.value)
                                }
                                placeholder="123 Main Street"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Apartment / Unit #
                              </span>
                              <input
                                type="text"
                                value={callForm.incidentApartment}
                                onChange={(event) =>
                                  updateCallForm(
                                    'incidentApartment',
                                    event.target.value,
                                  )
                                }
                                placeholder="Optional"
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                City
                              </span>
                              <input
                                type="text"
                                value={callForm.incidentCity}
                                onChange={(event) =>
                                  updateCallForm('incidentCity', event.target.value)
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                ZIP Code
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={callForm.incidentZip}
                                onChange={(event) =>
                                  updateCallForm(
                                    'incidentZip',
                                    event.target.value.replace(/\D/g, '').slice(0, 5),
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Number of Patients at Scene
                              </span>
                              <input
                                type="number"
                                min="1"
                                value={callForm.numberOfPatientsAtScene}
                                onChange={(event) =>
                                  updateCallForm(
                                    'numberOfPatientsAtScene',
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                First EMS Unit on Scene
                              </span>
                              <select
                                value={callForm.firstEmsUnitOnScene}
                                onChange={(event) =>
                                  updateCallForm(
                                    'firstEmsUnitOnScene',
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                              >
                                <option value="">Select...</option>
                                {yesNoOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <div className="block md:col-span-2">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Other Agencies on Scene
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCallForm((current) => ({
                                      ...current,
                                      otherAgenciesMode: 'None',
                                      otherAgenciesOnScene: '',
                                    }))
                                  }
                                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                                    callForm.otherAgenciesMode === 'None'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-300 bg-white text-slate-700'
                                  }`}
                                >
                                  None
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateCallForm('otherAgenciesMode', 'Add')
                                  }
                                  className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                                    callForm.otherAgenciesMode === 'Add'
                                      ? 'border-slate-900 bg-slate-900 text-white'
                                      : 'border-slate-300 bg-white text-slate-700'
                                  }`}
                                >
                                  + Add
                                </button>
                              </div>

                              {callForm.otherAgenciesMode === 'Add' && (
                                <textarea
                                  value={callForm.otherAgenciesOnScene}
                                  onChange={(event) =>
                                    updateCallForm(
                                      'otherAgenciesOnScene',
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Enter agency names..."
                                  className="mt-3 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              )}
                            </div>

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Hazardous / Health Exposures
                              </span>
                              <select
                                value={callForm.hazardousHealthExposures}
                                onChange={(event) =>
                                  updateCallForm(
                                    'hazardousHealthExposures',
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                              >
                                <option value="">Select exposure...</option>
                                {exposureTypes.map((exposure) => (
                                  <option key={exposure} value={exposure}>
                                    {exposure}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {callForm.hazardousHealthExposures ===
                              'Other Exposure' && (
                              <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                  Other Exposure Explanation
                                </span>
                                <input
                                  type="text"
                                  value={callForm.hazardousHealthExposuresOther}
                                  onChange={(event) =>
                                    updateCallForm(
                                      'hazardousHealthExposuresOther',
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              </label>
                            )}

                            <label className="block">
                              <span className="mb-1 block text-sm font-semibold text-slate-700">
                                Personal Protective Equipment Used
                              </span>
                              <select
                                value={callForm.personalProtectiveEquipmentUsed}
                                onChange={(event) =>
                                  updateCallForm(
                                    'personalProtectiveEquipmentUsed',
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                              >
                                <option value="">Select PPE...</option>
                                {ppeOptions.map((ppe) => (
                                  <option key={ppe} value={ppe}>
                                    {ppe}
                                  </option>
                                ))}
                              </select>
                            </label>

                            {callForm.personalProtectiveEquipmentUsed === 'Other' && (
                              <label className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                  Other PPE Explanation
                                </span>
                                <input
                                  type="text"
                                  value={callForm.personalProtectiveEquipmentOther}
                                  onChange={(event) =>
                                    updateCallForm(
                                      'personalProtectiveEquipmentOther',
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-300 bg-slate-50 p-5 shadow-sm">
                          <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">
                              Times
                            </h3>
                            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              Required
                            </span>
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            {[
                              ['callReceived', 'Call Received'],
                              ['callDispatched', 'Call Dispatched'],
                              ['unitEnRoute', 'Unit En Route'],
                              ['unitOnScene', 'Unit on Scene'],
                              ['patientContact', 'Patient Contact'],
                              ['departScene', 'Depart Scene'],
                              ['arrivedAtDestination', 'Arrived at Destination'],
                              ['transferOfCare', 'Transfer of Care'],
                              ['unitBackInService', 'Unit Back in Service'],
                            ].map(([field, label]) => (
                              <label key={field} className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                  {label}
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={callForm[field as keyof CallForm]}
                                  onChange={(event) =>
                                    updateCallForm(
                                      field as keyof CallForm,
                                      normalizeTimeInput(event.target.value),
                                    )
                                  }
                                  placeholder="HH:MM"
                                  maxLength={5}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
  );
}
