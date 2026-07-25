import type { CallForm, ComplaintForm, PatientForm } from './types';

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
    emsIncidentNumber: '',
    dispatchedPriority: '',
    respondingUnitNumber: '',
    lemsa: '',
    respondingCrew: '',
    pcrDocumentedBy: '',
    crewMembers: [
      {
        id: 'crew-1',
        name: '',
        certification: 'EMT',
        role: 'Primary Care Giver',
        isDocumentingPcr: true,
      },
    ],
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
    callForm.emsIncidentNumber,
    callForm.dispatchedPriority,
    callForm.respondingUnitNumber,
    callForm.lemsa,
    callForm.crewMembers.length > 0 &&
    callForm.crewMembers.every(
      (member) => member.name && member.certification && member.role,
    )
      ? 'crew-complete'
      : '',
    callForm.crewMembers.some((member) => member.isDocumentingPcr)
      ? 'documentor-selected'
      : '',
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
    heightInches: '',
    weightPounds: '',
    codeStatus: '',
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
    transportedTo: '',
    refusalType: '',
    obviousDeathCriteria: '',
    basisForPronouncement: '',
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
    ...(patientForm.disposition === 'Transported'
      ? [patientForm.transportedTo]
      : []),
    ...(patientForm.disposition === 'RMCT'
      ? [patientForm.refusalType]
      : []),
    ...(patientForm.disposition === 'Obvious Death'
      ? [patientForm.obviousDeathCriteria]
      : []),
    ...(patientForm.disposition === 'Death Pronounced at Scene'
      ? [patientForm.basisForPronouncement]
      : []),
    ...(patientForm.disposition === 'Turnover Patient Care at Scene' ||
    patientForm.disposition === 'Canceled by Other Agency at Scene'
      ? [patientForm.dispositionExplanation]
      : []),
  ];
}


export function createDefaultComplaintForm(): ComplaintForm {
  return {
    chiefComplaint: '',
    clinicalCategory: '',
    primaryImpression: null,
    secondaryImpression: null,
    emsConditionCode: null,
    primarySymptom: null,
    otherAssociatedSymptoms: [],
    symptomsBeganDateTime: '',
    lastSeenNormalDateTime: '',
    patientAcuity: '',
    possibleInjuryTrauma: '',
    cardiacArrest: '',
    suspectedStrokeCva: '',
    strokeCvaSymptomsResolved: '',
    patientPlacedOn5150Hold: '',
    possibleDrugAlcoholUse: '',
    drugAlcoholIndications: [],
    suspectedDrug: '',
    workRelatedIllnessInjury: '',
  };
}

export function getComplaintRequiredFields(complaintForm: ComplaintForm) {
  return [
    complaintForm.clinicalCategory,
    complaintForm.primaryImpression,
    complaintForm.secondaryImpression,
    complaintForm.emsConditionCode,
    complaintForm.primarySymptom,
    complaintForm.otherAssociatedSymptoms.length > 0 ? 'selected' : '',
    complaintForm.symptomsBeganDateTime,
    complaintForm.lastSeenNormalDateTime,
    complaintForm.patientAcuity,
    complaintForm.possibleInjuryTrauma,
    complaintForm.cardiacArrest,
    complaintForm.suspectedStrokeCva,
    ...(complaintForm.suspectedStrokeCva === 'Yes'
      ? [complaintForm.strokeCvaSymptomsResolved]
      : []),
    complaintForm.patientPlacedOn5150Hold,
    complaintForm.possibleDrugAlcoholUse,
    ...(complaintForm.possibleDrugAlcoholUse === 'Yes'
      ? [complaintForm.drugAlcoholIndications.length > 0 ? 'selected' : '']
      : []),
    ...(complaintForm.drugAlcoholIndications.some((item) =>
      item.toLowerCase().includes('drug'),
    )
      ? [complaintForm.suspectedDrug]
      : []),
    complaintForm.workRelatedIllnessInjury,
  ];
}
