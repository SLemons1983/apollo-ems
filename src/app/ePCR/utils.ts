import type { CallForm, PatientForm } from './types';

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
    personalProtectiveEquipmentUsed: [],
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


export function createDefaultPatientForm(): PatientForm {
  return {
    firstName: '',
    middleInitial: '',
    lastName: '',
    unablePatientName: false,
    dateOfBirth: '',
    unableDateOfBirth: false,
    unableAge: false,
    patientStreet: '',
    patientApartment: '',
    patientCity: '',
    patientZip: '',
    unablePatientAddress: false,
    gender: '',
    unableGender: false,
    phoneNumber: '',
    unablePhoneNumber: false,
    socialSecurityNumber: '',
    unableSocialSecurityNumber: false,
    race: '',
    unableRace: false,
    medicalHistory: '',
    surgicalHistory: '',
    currentMedications: '',
    lastOralIntake: '',
    medicationAllergies: '',
    environmentalAllergies: '',
    patientEffects: '',
    patientEffectsLeftWith: '',
    patientEffectsLeftWithOther: '',
    disposition: '',
    dispositionExplanation: '',
  };
}

export function calculatePatientAge(dateOfBirth: string) {
  const match = dateOfBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return '';
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const birthDate = new Date(year, month - 1, day);

  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return '';
  }

  const today = new Date();

  if (birthDate > today) {
    return '';
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (today.getDate() < birthDate.getDate()) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return `${years} Year${years === 1 ? '' : 's'} and ${months} Month${
    months === 1 ? '' : 's'
  }`;
}

export function getPatientRequiredFields(patientForm: PatientForm) {
  const calculatedAge = calculatePatientAge(patientForm.dateOfBirth);

  return [
    patientForm.unablePatientName
      ? 'unable'
      : patientForm.firstName && patientForm.lastName,
    patientForm.unableDateOfBirth ? 'unable' : patientForm.dateOfBirth,
    patientForm.unableAge ? 'unable' : calculatedAge,
    patientForm.unablePatientAddress
      ? 'unable'
      : patientForm.patientStreet && patientForm.patientCity && patientForm.patientZip,
    patientForm.unableGender ? 'unable' : patientForm.gender,
    patientForm.unablePhoneNumber ? 'unable' : patientForm.phoneNumber,
    patientForm.unableSocialSecurityNumber
      ? 'unable'
      : patientForm.socialSecurityNumber,
    patientForm.unableRace ? 'unable' : patientForm.race,
    patientForm.medicalHistory,
    patientForm.surgicalHistory,
    patientForm.currentMedications,
    patientForm.lastOralIntake,
    patientForm.medicationAllergies,
    patientForm.environmentalAllergies,
    patientForm.patientEffects,
    patientForm.patientEffectsLeftWith,
    ...(patientForm.patientEffectsLeftWith === 'Other Responding Agency'
      ? [patientForm.patientEffectsLeftWithOther]
      : []),
    patientForm.disposition,
    ...(patientForm.disposition === 'Turnover Patient Care at Scene' ||
    patientForm.disposition === 'Canceled by Other Agency at Scene'
      ? [patientForm.dispositionExplanation]
      : []),
  ];
}
