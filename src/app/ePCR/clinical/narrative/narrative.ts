import { apolloBodyRegionDetails } from '../components/body-map/bodyRegionDetails';
import type { AssessmentForm } from '../assessment/assessmentForm';
import type { TreatmentRecord, TreatmentsForm } from '../treatments/treatments';
import type { VitalSetRecord, VitalsForm } from '../vitals/vitals';
import type { CallForm, ComplaintForm, PatientForm } from '../../types';

export type NarrativeFormat = '' | 'Chronological' | 'SOAP';
export type NarrativeForm = { text: string; format: NarrativeFormat; generatedAt: string; sourceFingerprint: string };
export type NarrativeReviewIssue = { severity: 'warning' | 'review'; message: string };
export const createDefaultNarrativeForm = (): NarrativeForm => ({ text: '', format: '', generatedAt: '', sourceFingerprint: '' });

type Source = { call: CallForm; patient: PatientForm; complaint: ComplaintForm; assessment: AssessmentForm; vitals: VitalsForm; treatments: TreatmentsForm };
const clean = (value?: string) => (value ?? '').trim();
const lowerFirst = (value: string) => value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
const sentence = (value: string) => { const result = clean(value).replace(/[.]+$/, ''); return result ? `${result}.` : ''; };
const list = (values: string[]) => values.length < 2 ? (values[0] ?? '') : values.length === 2 ? `${values[0]} and ${values[1]}` : `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
const parseDate = (value: string) => {
  const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(`${value.slice(0, 10)}T00:00:00`) : null;
  if (iso && !Number.isNaN(iso.getTime())) return iso;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const patientAge = (source: Source) => {
  const dob = parseDate(clean(source.patient.dateOfBirth));
  if (!dob) return null;
  const incident = parseDate(clean(source.complaint.symptomsBeganDateTime)) ?? new Date();
  let age = incident.getFullYear() - dob.getFullYear();
  if (incident.getMonth() < dob.getMonth() || (incident.getMonth() === dob.getMonth() && incident.getDate() < dob.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
};
const patientLabel = (source: Source) => {
  const age = patientAge(source);
  const sex = clean(source.patient.gender).toLowerCase();
  return [age === null ? '' : `${age}-year-old`, sex].filter(Boolean).join(' ') || 'patient';
};
const priority = (value: string) => clean(value).match(/^\d+/)?.[0] || clean(value);
const timeValue = (value: string) => { const time = Date.parse(value); return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER; };

function dispatchText(source: Source) {
  const { call } = source;
  const unit = clean(call.respondingUnitNumber) ? `Unit ${clean(call.respondingUnitNumber)}` : 'EMS';
  const response = [priority(call.dispatchedPriority) && `Priority ${priority(call.dispatchedPriority)}`, clean(call.responseModeToScene)].filter(Boolean).join(', ');
  const location = clean(call.incidentLocationType) === 'Other' ? clean(call.incidentLocationTypeOther) : clean(call.incidentLocationType);
  return sentence(`${unit} was dispatched${response ? ` ${response}` : ''}${location ? ` to ${lowerFirst(location)}` : ''}${clean(call.dispatchedNatureOfCall) ? ` for a reported complaint of ${lowerFirst(clean(call.dispatchedNatureOfCall))}` : ''}`);
}

function presentationText(source: Source) {
  const { complaint, assessment } = source;
  const parts = [`Upon patient contact, EMS evaluated a ${patientLabel(source)}`];
  const history = clean(assessment.clinical.history.eventsLeadingToIllness);
  const pain = assessment.clinical.pain;
  const symptom = clean(complaint.chiefComplaint || complaint.primarySymptom?.description);
  if (symptom) parts.push(`reporting ${lowerFirst(symptom)}`);
  let text = sentence(parts.join(' '));
  if (pain.painPresent === 'Yes') {
    const details: string[] = [];
    const score = clean(pain.numericPainScore || pain.facesPainScore);
    if (clean(pain.quality)) details.push(`${lowerFirst(clean(pain.quality))} in quality`);
    if (score) details.push(`rated ${score}/10`);
    if (clean(pain.radiation) && !/^none$/i.test(pain.radiation)) details.push(`with radiation to the ${lowerFirst(clean(pain.radiation))}`);
    text += ` ${sentence(`The patient described the discomfort as ${list(details) || 'present'}`)}`;
    const context: string[] = [];
    if (clean(pain.onset)) context.push(`began while ${lowerFirst(clean(pain.onset))}`);
    else if (history) context.push(`began while ${lowerFirst(history)}`);
    if (clean(pain.time)) context.push(`had been present for approximately ${lowerFirst(clean(pain.time))}`);
    if (context.length) text += ` ${sentence(`The discomfort ${list(context)}`)}`;
    if (clean(pain.provocation)) text += ` ${sentence(`${clean(pain.provocation)} was documented as provoking or relieving the discomfort`)}`;
  } else if (history) text += ` ${sentence(`Events leading to the illness or injury were documented as ${lowerFirst(history)}`)}`;
  const symptoms = [complaint.primarySymptom?.description ?? '', ...complaint.otherAssociatedSymptoms.map((item) => item.description)].map(clean).filter((item) => item && item.toLowerCase() !== symptom.toLowerCase());
  if (symptoms.length) text += ` ${sentence(`Associated symptoms included ${list(symptoms.map(lowerFirst))}`)}`;
  return text;
}

function historyText(source: Source) {
  const { patient } = source;
  const output: string[] = [];
  if (clean(patient.medicalHistory)) output.push(sentence(`Medical history included ${clean(patient.medicalHistory)}`));
  if (clean(patient.surgicalHistory)) output.push(sentence(`Surgical history included ${clean(patient.surgicalHistory)}`));
  if (clean(patient.currentMedications)) output.push(sentence(`Current medications included ${clean(patient.currentMedications)}`));
  const allergies = [clean(patient.medicationAllergies), clean(patient.environmentalAllergies)].filter((value) => value && !/^no environmental allergies$/i.test(value));
  if (allergies.length) output.push(sentence(`Allergies to ${list(allergies)} were documented`));
  else if (/^nkda$/i.test(patient.medicationAllergies)) output.push('No known medication allergies were documented.');
  return output.join(' ');
}

function examText(source: Source) {
  const { primary, respiratory, consciousness, gcs, ecg } = source.assessment.clinical;
  const output: string[] = [];
  const mental: string[] = [];
  if (clean(consciousness.avpu)) mental.push(`AVPU ${clean(consciousness.avpu)}`);
  if (clean(consciousness.orientation)) mental.push(clean(consciousness.orientation));
  const gcsTotal = [gcs.eyes, gcs.verbal, gcs.motor].every(Boolean) ? Number(gcs.eyes) + Number(gcs.verbal) + Number(gcs.motor) : null;
  if (mental.length || gcsTotal) output.push(sentence(`The patient was ${mental.length ? list(mental) : 'assessed'}${gcsTotal ? ` with a GCS of ${gcsTotal}` : ''}`));
  if (clean(primary.generalImpression)) output.push(sentence(`General impression was ${lowerFirst(clean(primary.generalImpression))}`));
  const airway = clean(respiratory.airwayPatency || primary.airway);
  if (airway) output.push(sentence(`Airway was ${lowerFirst(airway)}`));
  const resp: string[] = [];
  if (clean(respiratory.respiratoryEffort)) resp.push(lowerFirst(clean(respiratory.respiratoryEffort)));
  else if (clean(primary.breathing)) resp.push(lowerFirst(clean(primary.breathing)));
  if (clean(respiratory.breathSoundsLeft) && clean(respiratory.breathSoundsRight)) resp.push(`${lowerFirst(respiratory.breathSoundsLeft)} breath sounds on the left and ${lowerFirst(respiratory.breathSoundsRight)} breath sounds on the right`);
  if (clean(respiratory.accessoryMuscleUse)) resp.push(`${lowerFirst(respiratory.accessoryMuscleUse)} accessory-muscle use`);
  if (clean(respiratory.cough)) resp.push(`${lowerFirst(respiratory.cough)} cough`);
  if (resp.length) output.push(sentence(`Respiratory assessment demonstrated ${list(resp)}`));
  if (clean(primary.circulation)) output.push(sentence(`Circulation was assessed as ${lowerFirst(clean(primary.circulation))}`));
  if (clean(primary.disability)) output.push(sentence(`Neurologic assessment documented ${lowerFirst(clean(primary.disability))}`));
  const bodyFindings: string[] = [];
  let unremarkableCount = 0;
  for (const [region, subregions] of Object.entries(source.assessment.bodyMap.subregionFindings)) {
    for (const [subregionId, finding] of Object.entries(subregions)) {
      if (finding.unremarkable) { unremarkableCount++; continue; }
      const labels = Object.entries(finding.dcapBtls).filter(([, present]) => present).map(([key]) => key.replace(/([A-Z])/g, ' $1').replace('punctures Penetrations', 'punctures/penetrations').toLowerCase());
      const subregion = apolloBodyRegionDetails[region as keyof typeof apolloBodyRegionDetails]?.find((item) => item.id === subregionId)?.label ?? subregionId;
      if (labels.length) bodyFindings.push(`${list(labels)} to the ${lowerFirst(subregion)}`);
      if (clean(finding.notes)) bodyFindings.push(`${clean(finding.notes)} (${lowerFirst(subregion)})`);
    }
  }
  if (bodyFindings.length) output.push(sentence(`Physical assessment revealed ${list(bodyFindings)}`));
  if (unremarkableCount && bodyFindings.length) output.push('The remainder of the documented physical assessment was unremarkable.');
  else if (unremarkableCount) output.push('The documented physical assessment was otherwise unremarkable.');
  if (!ecg.notIndicated) {
    if (clean(ecg.fourLeadInterpretation)) output.push(sentence(`Four-lead ECG demonstrated ${clean(ecg.fourLeadInterpretation)}`));
    if (clean(ecg.twelveLeadInterpretation)) output.push(sentence(`A twelve-lead ECG was acquired and interpreted as ${clean(ecg.twelveLeadInterpretation)}`));
    if (clean(ecg.abnormalFindings)) output.push(sentence(`Additional ECG findings included ${clean(ecg.abnormalFindings)}`));
  }
  return output.join(' ');
}

function vitalSentence(vital: VitalSetRecord, prefix: string) {
  const values: string[] = [];
  if (clean(vital.systolic)) values.push(`blood pressure ${vital.systolic}${vital.bloodPressureMethod === 'Palpated' ? ' palpated' : clean(vital.diastolic) ? `/${vital.diastolic} mmHg` : ' mmHg'}`);
  if (clean(vital.heartRate)) values.push(`pulse ${vital.heartRate} beats per minute${clean(vital.pulseQuality) ? ` and ${lowerFirst(vital.pulseQuality)}` : ''}`);
  if (clean(vital.respiratoryRate)) values.push(`respirations ${vital.respiratoryRate} per minute${clean(vital.respiratoryQuality) ? ` and ${lowerFirst(vital.respiratoryQuality)}` : ''}`);
  if (clean(vital.spo2)) values.push(`SpO₂ ${vital.spo2}%`);
  if (clean(vital.gcs)) values.push(`GCS ${vital.gcs}`);
  const skin = [vital.skinColor, vital.skinTemperature, vital.skinMoisture].map(clean).filter(Boolean).map(lowerFirst);
  if (skin.length) values.push(`skin ${list(skin)}`);
  return sentence(`${prefix} included ${list(values)}`);
}

function vitalsText(source: Source) {
  const sets = [...source.vitals.sets].sort((a, b) => timeValue(a.recordedAt) - timeValue(b.recordedAt));
  if (!sets.length) return '';
  const first = vitalSentence(sets[0], 'Initial vital signs');
  if (sets.length === 1) return first;
  const last = sets.at(-1)!;
  const fields: (keyof VitalSetRecord)[] = ['systolic', 'diastolic', 'heartRate', 'respiratoryRate', 'spo2', 'gcs'];
  const unchanged = fields.every((field) => clean(String(sets[0][field])) === clean(String(last[field])));
  return `${first} ${unchanged ? 'Repeat vital signs were unchanged.' : vitalSentence(last, 'Most recent vital signs')}`;
}

function treatmentSentence(record: TreatmentRecord) {
  if (record.medication) {
    const medication = clean(record.medication.medication || record.name);
    const dose = [clean(record.medication.dose), clean(record.medication.unit)].filter(Boolean).join(' ');
    const routeMap: Record<string, string> = { SL: 'sublingually', IV: 'intravenously', IM: 'intramuscularly', PO: 'orally', IN: 'intranasally' };
    const route = routeMap[clean(record.medication.route)] ?? lowerFirst(clean(record.medication.route));
    let text = `${medication} was administered${dose ? `, ${dose},` : ''}${route ? ` ${route}` : ''}`;
    if (clean(record.medication.authorizationType)) text += ` under ${lowerFirst(clean(record.medication.authorizationType))}`;
    if (clean(record.patientResponse)) text += `; the patient's response was ${lowerFirst(clean(record.patientResponse))}`;
    if (clean(record.complications)) text += `, with complications documented as ${lowerFirst(clean(record.complications))}`;
    else if (clean(record.patientResponse)) text += ', with no complications documented';
    return sentence(text);
  }
  if (/12-lead/i.test(record.name)) return sentence(`A twelve-lead ECG was acquired${clean(record.patientResponse) ? `; the patient's response was ${lowerFirst(clean(record.patientResponse))}` : ''}`);
  if (/oxygen/i.test(record.name)) return sentence(`Oxygen therapy was provided${clean(record.patientResponse) ? ` with a patient response of ${lowerFirst(clean(record.patientResponse))}` : ''}`);
  return sentence(`${clean(record.name)} was performed${clean(record.patientResponse) ? `; the patient's response was ${lowerFirst(clean(record.patientResponse))}` : ''}${clean(record.complications) ? `, with complications documented as ${lowerFirst(clean(record.complications))}` : ''}`);
}

function treatmentsText(source: Source) {
  const records = [...source.treatments.records].sort((a, b) => timeValue(a.performedAt) - timeValue(b.performedAt));
  const output: string[] = [];
  const firstVital = [...source.vitals.sets].sort((a, b) => timeValue(a.recordedAt) - timeValue(b.recordedAt))[0];
  if (firstVital && clean(firstVital.oxygenDevice) && !/^room air$/i.test(firstVital.oxygenDevice)) output.push(sentence(`Oxygen was administered${clean(firstVital.oxygenFlow) ? ` at ${firstVital.oxygenFlow} L/min` : ''} by ${lowerFirst(firstVital.oxygenDevice)}`));
  for (const record of records) output.push(treatmentSentence(record));
  if (clean(source.treatments.clinicalNote)) output.push(sentence(source.treatments.clinicalNote));
  if (!records.length && source.treatments.noTreatmentReason) output.push(sentence(source.treatments.noTreatmentReason));
  return output.join(' ');
}

function dispositionText(source: Source) {
  const { patient } = source;
  if (!clean(patient.disposition)) return '';
  if (patient.disposition === 'Transported') return sentence(`The patient was transported${clean(patient.transportedTo) ? ` to ${clean(patient.transportedTo)}` : ''}`);
  if (patient.disposition === 'RMCT') return sentence(`The patient refused medical care and/or transport${clean(patient.refusalType) ? ` (${clean(patient.refusalType)})` : ''}${clean(patient.dispositionExplanation) ? `; ${clean(patient.dispositionExplanation)}` : ''}`);
  if (patient.disposition === 'Obvious Death') return sentence(`The patient met obvious death criteria${clean(patient.obviousDeathCriteria) ? `: ${clean(patient.obviousDeathCriteria)}` : ''}`);
  if (patient.disposition === 'Death Pronounced at Scene') return sentence(`Death was pronounced at the scene${clean(patient.basisForPronouncement) ? ` based on ${lowerFirst(clean(patient.basisForPronouncement))}` : ''}`);
  return sentence(`Final disposition was ${clean(patient.disposition)}${clean(patient.dispositionExplanation) ? `: ${clean(patient.dispositionExplanation)}` : ''}`);
}

function assessmentSynthesis(source: Source) {
  const findings: string[] = [];
  const pain = source.assessment.clinical.pain;
  if (pain.painPresent === 'Yes') {
    const score = clean(pain.numericPainScore || pain.facesPainScore);
    findings.push(`${clean(pain.quality) ? `${lowerFirst(pain.quality)}-like ` : ''}${lowerFirst(source.complaint.chiefComplaint || 'pain')}${score ? ` rated ${score}/10` : ''}${clean(pain.radiation) && !/^none$/i.test(pain.radiation) ? ` radiating to the ${lowerFirst(pain.radiation)}` : ''}`);
  }
  const first = [...source.vitals.sets].sort((a, b) => timeValue(a.recordedAt) - timeValue(b.recordedAt))[0];
  if (first && Number(first.spo2) < 94) findings.push('hypoxemia');
  if (first && /diaphoretic/i.test(first.skinMoisture)) findings.push('diaphoresis');
  if (clean(source.assessment.clinical.ecg.twelveLeadInterpretation)) findings.push(`a twelve-lead interpretation documented as ${source.assessment.clinical.ecg.twelveLeadInterpretation}`);
  const impression = clean(source.complaint.primaryImpression?.description);
  return sentence(findings.length ? `${list(findings)}. Primary impression was documented as ${impression || 'not specified'}${clean(source.complaint.secondaryImpression?.description) ? `, with a secondary impression of ${source.complaint.secondaryImpression?.description}` : ''}` : impression || 'No clinical impression documented');
}

export function getNarrativeReviewIssues(source: Source): NarrativeReviewIssue[] {
  const issues: NarrativeReviewIssue[] = [];
  if (source.patient.dateOfBirth && patientAge(source) === null) issues.push({ severity: 'warning', message: 'Date of birth is invalid or produces an implausible age.' });
  const times = [source.call.callReceived, source.call.callDispatched, source.call.unitEnRoute, source.call.unitOnScene, source.call.patientContact, source.call.departScene, source.call.arrivedAtDestination, source.call.transferOfCare].filter(Boolean);
  if (times.length >= 4 && new Set(times).size === 1) issues.push({ severity: 'review', message: 'Multiple call timestamps are identical. Verify the response timeline.' });
  const recorded = source.vitals.sets.map((set) => set.recordedAt).filter(Boolean);
  if (recorded.some((value, index) => index > 0 && timeValue(value) < timeValue(recorded[index - 1]))) issues.push({ severity: 'review', message: 'Vital sets were entered out of chronological order. ACI will sort them by recorded time.' });
  for (const record of source.treatments.records) {
    if (record.medication && Number(record.medication.dose) > 1 && /tablet/i.test(record.medication.unit)) issues.push({ severity: 'review', message: `${record.medication.medication || record.name} is recorded as ${record.medication.dose} ${record.medication.unit}. Verify whether this represents one dose or serial doses.` });
  }
  if (source.patient.disposition === 'Transported') {
    if (!source.patient.transportedTo) issues.push({ severity: 'warning', message: 'Receiving destination is missing.' });
    if (!source.call.arrivedAtDestination) issues.push({ severity: 'warning', message: 'Arrival at destination is not documented.' });
    if (!source.call.transferOfCare) issues.push({ severity: 'warning', message: 'Transfer-of-care time is not documented.' });
    if (!source.assessment.clinical.reassessments.length) issues.push({ severity: 'review', message: 'No transport reassessment or final patient condition is documented.' });
  }
  if (!source.vitals.sets.length) issues.push({ severity: 'warning', message: 'No completed vital-sign set is documented.' });
  return issues;
}

export function narrativeFingerprint(source: Source) { return JSON.stringify(source); }

export function generateNarrative(source: Source, format: Exclude<NarrativeFormat, ''>) {
  const dispatch = dispatchText(source);
  const presentation = presentationText(source);
  const history = historyText(source);
  const exam = examText(source);
  const vitals = vitalsText(source);
  const treatments = treatmentsText(source);
  const disposition = dispositionText(source);
  if (format === 'SOAP') return `Subjective:\n${[dispatch, presentation, history].filter(Boolean).join(' ')}\n\nObjective:\n${[exam, vitals].filter(Boolean).join(' ') || 'No objective findings documented.'}\n\nAssessment:\n${assessmentSynthesis(source)}\n\nPlan:\n${[treatments, disposition].filter(Boolean).join(' ') || 'No treatment or disposition documented.'}`;
  return [dispatch, presentation, history, [exam, vitals].filter(Boolean).join(' '), treatments, disposition].filter(Boolean).join('\n\n');
}
