'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import PCRCard from '../components/PCRCard';
import type { CallForm, CrewMember } from '../types';

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

const crewCertificationOptions: CrewMember['certification'][] = [
  'EMT',
  'Paramedic',
  'Trainee/Student',
];

const crewRoleOptions: CrewMember['role'][] = [
  'Primary Care Giver',
  'Secondary Care Giver',
  'Observer-Non Care Giver',
];

type CallSectionProps = {
  callForm: CallForm;
  setCallForm: Dispatch<SetStateAction<CallForm>>;
  updateCallForm: (field: keyof CallForm, value: string | string[]) => void;
};

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function togglePpeSelection(
  selectedPpe: string[],
  value: string,
  updateCallForm: (field: keyof CallForm, value: string[]) => void,
) {
  const nextSelection = selectedPpe.includes(value)
    ? selectedPpe.filter((item) => item !== value)
    : [...selectedPpe, value];

  updateCallForm('personalProtectiveEquipmentUsed', nextSelection);
}

function createCrewMember(): CrewMember {
  return {
    id: globalThis.crypto?.randomUUID?.() ?? `crew-${Date.now()}`,
    name: '',
    certification: 'EMT',
    role: 'Secondary Care Giver',
    isDocumentingPcr: false,
  };
}

export default function CallSection({
  callForm,
  setCallForm,
  updateCallForm,
}: CallSectionProps) {
  const [expandedCard, setExpandedCard] = useState('Dispatch Information');

  function toggleCard(cardTitle: string) {
    setExpandedCard((current) => (current === cardTitle ? '' : cardTitle));
  }

  function syncLegacyCrewFields(crewMembers: CrewMember[]) {
    const documentingMember =
      crewMembers.find((member) => member.isDocumentingPcr) ?? crewMembers[0];

    return {
      pcrDocumentedBy: documentingMember?.name ?? '',
      respondingCrew: crewMembers
        .map((member) => member.name)
        .filter(Boolean)
        .join(', '),
    };
  }

  function updateCrewMember(
    memberId: string,
    updates: Partial<Omit<CrewMember, 'id' | 'isDocumentingPcr'>>,
  ) {
    setCallForm((currentForm) => {
      const crewMembers = currentForm.crewMembers.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      );

      return {
        ...currentForm,
        ...syncLegacyCrewFields(crewMembers),
        crewMembers,
      };
    });
  }

  function setDocumentingCrewMember(memberId: string) {
    setCallForm((currentForm) => {
      const crewMembers = currentForm.crewMembers.map((member) => ({
        ...member,
        isDocumentingPcr: member.id === memberId,
      }));

      return {
        ...currentForm,
        ...syncLegacyCrewFields(crewMembers),
        crewMembers,
      };
    });
  }

  function addCrewMember() {
    setCallForm((currentForm) => {
      const crewMembers = [...currentForm.crewMembers, createCrewMember()];

      return {
        ...currentForm,
        ...syncLegacyCrewFields(crewMembers),
        crewMembers,
      };
    });
  }

  function removeCrewMember(memberId: string) {
    setCallForm((currentForm) => {
      const remainingCrewMembers = currentForm.crewMembers.filter(
        (member) => member.id !== memberId,
      );
      const crewMembers: CrewMember[] =
        remainingCrewMembers.length > 0
          ? remainingCrewMembers
          : [
              {
                ...createCrewMember(),
                role: 'Primary Care Giver',
              },
            ];
      const normalizedCrewMembers = crewMembers.some(
        (member) => member.isDocumentingPcr,
      )
        ? crewMembers
        : crewMembers.map((member, index) => ({
            ...member,
            isDocumentingPcr: index === 0,
          }));

      return {
        ...currentForm,
        ...syncLegacyCrewFields(normalizedCrewMembers),
        crewMembers: normalizedCrewMembers,
      };
    });
  }

  const dispatchCompletedFields = [
    callForm.emsResponseNumber,
    callForm.emsIncidentNumber,
    callForm.dispatchedPriority,
  ].filter(Boolean).length;

  const crewCompletedFields = [
    callForm.respondingUnitNumber,
    callForm.crewMembers.length > 0 &&
    callForm.crewMembers.every(
      (member) => member.name && member.certification && member.role,
    )
      ? 'crew-complete'
      : '',
    callForm.crewMembers.some((member) => member.isDocumentingPcr)
      ? 'documentor-selected'
      : '',
  ].filter(Boolean).length;

  const responseCompletedFields = [
    callForm.dispatchedNatureOfCall,
    callForm.typeOfServiceRequested,
    callForm.responseModeToScene,
  ].filter(Boolean).length;

  const locationRequiredFields = [
    callForm.incidentLocationType,
    ...(callForm.incidentLocationType === 'Other'
      ? [callForm.incidentLocationTypeOther]
      : []),
    callForm.incidentStreet,
    callForm.incidentCity,
    callForm.incidentZip,
    callForm.numberOfPatientsAtScene,
    callForm.firstEmsUnitOnScene,
    ...(callForm.otherAgenciesMode === 'Add'
      ? [callForm.otherAgenciesOnScene]
      : []),
    callForm.hazardousHealthExposures,
    ...(callForm.hazardousHealthExposures === 'Other Exposure'
      ? [callForm.hazardousHealthExposuresOther]
      : []),
    callForm.personalProtectiveEquipmentUsed.length > 0 ? 'selected' : '',
    ...(callForm.personalProtectiveEquipmentUsed.includes('Other')
      ? [callForm.personalProtectiveEquipmentOther]
      : []),
  ];

  const timesRequiredFields = [
    callForm.callReceived,
    callForm.callDispatched,
    callForm.unitEnRoute,
    callForm.unitOnScene,
    callForm.patientContact,
    callForm.departScene,
    callForm.arrivedAtDestination,
    callForm.transferOfCare,
    callForm.unitBackInService,
  ];

  return (
                      <div className="space-y-4">
                        <PCRCard
                          title="Dispatch Information"
                          completedFields={dispatchCompletedFields}
                          totalFields={3}
                          expanded={expandedCard === 'Dispatch Information'}
                          onToggle={() => toggleCard('Dispatch Information')}
                        >

                          <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className="mb-1 block text-sm font-semibold text-slate-700">
                            ApolloEMS Reference Number
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
                            EMS Incident Number
                          </span>
                          <input
                            type="text"
                            value={callForm.emsIncidentNumber}
                            onChange={(event) =>
                              updateCallForm(
                                'emsIncidentNumber',
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
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
                            <option value=""></option>
                            {dispatchedPriorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>

                          </div>
                        </PCRCard>

                        <PCRCard
                          title="Crew Information"
                          completedFields={crewCompletedFields}
                          totalFields={3}
                          expanded={expandedCard === 'Crew Information'}
                          onToggle={() => toggleCard('Crew Information')}
                        >

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
                              
                              className="w-full rounded-r-lg border border-slate-300 px-3 py-2 text-slate-900"
                            />
                          </div>
                        </label>

                        <div className="block md:col-span-2">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="block text-sm font-semibold text-slate-700">
                              Crew Members
                            </span>
                            <button
                              type="button"
                              onClick={addCrewMember}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                            >
                              Add Crew Member
                            </button>
                          </div>

                          <div className="space-y-4">
                            {callForm.crewMembers.map((member, index) => (
                              <div
                                key={member.id}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                              >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                  <div className="text-sm font-bold text-slate-800">
                                    Crew Member {index + 1}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeCrewMember(member.id)}
                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                                  >
                                    Remove
                                  </button>
                                </div>

                                <div className="grid gap-4 md:grid-cols-3">
                                  <label className="block md:col-span-3">
                                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                                      Name
                                    </span>
                                    <input
                                      type="text"
                                      value={member.name}
                                      onChange={(event) =>
                                        updateCrewMember(member.id, {
                                          name: event.target.value,
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                                    />
                                  </label>

                                  <label className="block">
                                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                                      Certification
                                    </span>
                                    <select
                                      value={member.certification}
                                      onChange={(event) =>
                                        updateCrewMember(member.id, {
                                          certification: event.target
                                            .value as CrewMember['certification'],
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                                    >
                                      {crewCertificationOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="block md:col-span-2">
                                    <span className="mb-1 block text-sm font-semibold text-slate-700">
                                      Role
                                    </span>
                                    <select
                                      value={member.role}
                                      onChange={(event) =>
                                        updateCrewMember(member.id, {
                                          role: event.target
                                            .value as CrewMember['role'],
                                        })
                                      }
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
                                    >
                                      {crewRoleOptions.map((option) => (
                                        <option key={option} value={option}>
                                          {option}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 md:col-span-3">
                                    <input
                                      type="checkbox"
                                      checked={member.isDocumentingPcr}
                                      onChange={() =>
                                        setDocumentingCrewMember(member.id)
                                      }
                                      className="h-4 w-4 rounded border-slate-300"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">
                                      Documenting PCR
                                    </span>
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                          </div>
                        </PCRCard>

                        <PCRCard
                          title="Response Information"
                          completedFields={responseCompletedFields}
                          totalFields={3}
                          expanded={expandedCard === 'Response Information'}
                          onToggle={() => toggleCard('Response Information')}
                        >

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
                            <option value=""></option>
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
                            <option value=""></option>
                            {responseModes.map((mode) => (
                              <option key={mode} value={mode}>
                                {mode}
                              </option>
                            ))}
                          </select>
                        </label>
                          </div>
                        </PCRCard>

                        <PCRCard
                          title="Location Information"
                          completedFields={locationRequiredFields.filter(Boolean).length}
                          totalFields={locationRequiredFields.length}
                          expanded={expandedCard === 'Location Information'}
                          onToggle={() => toggleCard('Location Information')}
                        >

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
                                <option value=""></option>
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
                                <option value=""></option>
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
                                <option value=""></option>
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

                            <div className="block md:col-span-2">
                              <span className="mb-2 block text-sm font-semibold text-slate-700">
                                Personal Protective Equipment Used
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {ppeOptions.map((ppe) => {
                                  const selected =
                                    callForm.personalProtectiveEquipmentUsed.includes(
                                      ppe,
                                    );

                                  return (
                                    <button
                                      key={ppe}
                                      type="button"
                                      onClick={() =>
                                        togglePpeSelection(
                                          callForm.personalProtectiveEquipmentUsed,
                                          ppe,
                                          updateCallForm,
                                        )
                                      }
                                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                                        selected
                                          ? 'border-slate-900 bg-slate-900 text-white'
                                          : 'border-slate-300 bg-white text-slate-700'
                                      }`}
                                    >
                                      {selected ? `✓ ${ppe}` : ppe}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {callForm.personalProtectiveEquipmentUsed.includes('Other') && (
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
                        </PCRCard>

                        <PCRCard
                          title="Times"
                          completedFields={timesRequiredFields.filter(Boolean).length}
                          totalFields={timesRequiredFields.length}
                          expanded={expandedCard === 'Times'}
                          onToggle={() => toggleCard('Times')}
                        >

                          <div className="grid gap-4 md:grid-cols-3">
                            {([
                              ['callReceived', 'Call Received'],
                              ['callDispatched', 'Call Dispatched'],
                              ['unitEnRoute', 'Unit En Route'],
                              ['unitOnScene', 'Unit on Scene'],
                              ['patientContact', 'Patient Contact'],
                              ['departScene', 'Depart Scene'],
                              ['arrivedAtDestination', 'Arrived at Destination'],
                              ['transferOfCare', 'Transfer of Care'],
                              ['unitBackInService', 'Unit Back in Service'],
                            ] satisfies [keyof Pick<CallForm, 'callReceived' | 'callDispatched' | 'unitEnRoute' | 'unitOnScene' | 'patientContact' | 'departScene' | 'arrivedAtDestination' | 'transferOfCare' | 'unitBackInService'>, string][]).map(([field, label]) => (
                              <label key={field} className="block">
                                <span className="mb-1 block text-sm font-semibold text-slate-700">
                                  {label}
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={callForm[field]}
                                  onChange={(event) =>
                                    updateCallForm(
                                      field,
                                      normalizeTimeInput(event.target.value),
                                    )
                                  }
                                  
                                  maxLength={5}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                                />
                              </label>
                            ))}
                          </div>
                        </PCRCard>
                      </div>
  );
}
