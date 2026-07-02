import type { CallForm } from './types';

export function createEmsResponseNumber() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');

  const randomPart = String(Math.floor(Math.random() * 100)).padStart(2, '0');

  return `${datePart}-${randomPart}`;
}

export function createDefaultCallForm(): CallForm {
  return {
    emsResponseNumber: createEmsResponseNumber(),
    dispatchedPriority: '',
    respondingUnitNumber: '',
    respondingCrew: '',
    pcrDocumentedBy: '',
    dispatchedNatureOfCall: '',
    typeOfServiceRequested: '',
    responseModeToScene: '',
    incidentLocationType: '',
    incidentLocationTypeOther: '',
    incidentStreet: '',
    incidentApartment: '',
    incidentCity: '',
    incidentZip: '',
    numberOfPatientsAtScene: '',
    firstEmsUnitOnScene: '',
    otherAgenciesMode: 'None',
    otherAgenciesOnScene: '',
    hazardousHealthExposures: '',
    hazardousHealthExposuresOther: '',
    personalProtectiveEquipmentUsed: '',
    personalProtectiveEquipmentOther: '',
    callReceived: '',
    callDispatched: '',
    unitEnRoute: '',
    unitOnScene: '',
    patientContact: '',
    departScene: '',
    arrivedAtDestination: '',
    transferOfCare: '',
    unitBackInService: '',
  };
}

export function getCallRequiredFields(callForm: CallForm) {
  return [
    callForm.emsResponseNumber,
    callForm.dispatchedPriority,
    callForm.respondingUnitNumber,
    callForm.respondingCrew,
    callForm.pcrDocumentedBy,
    callForm.dispatchedNatureOfCall,
    callForm.typeOfServiceRequested,
    callForm.responseModeToScene,
    callForm.incidentLocationType,
    callForm.incidentLocationType === 'Other'
      ? callForm.incidentLocationTypeOther
      : 'not-required',
    callForm.incidentStreet,
    callForm.incidentCity,
    callForm.incidentZip,
    callForm.numberOfPatientsAtScene,
    callForm.firstEmsUnitOnScene,
    callForm.otherAgenciesMode === 'Add'
      ? callForm.otherAgenciesOnScene
      : 'not-required',
    callForm.hazardousHealthExposures,
    callForm.hazardousHealthExposures === 'Other Exposure'
      ? callForm.hazardousHealthExposuresOther
      : 'not-required',
    callForm.personalProtectiveEquipmentUsed,
    callForm.personalProtectiveEquipmentUsed === 'Other'
      ? callForm.personalProtectiveEquipmentOther
      : 'not-required',
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
}
