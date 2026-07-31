import type { AssessmentForm } from '../../clinical/assessment/assessmentForm';
import type { TreatmentsForm } from '../../clinical/treatments/treatments';
import type { VitalsForm } from '../../clinical/vitals/vitals';
import type { CallForm, ComplaintForm, PatientForm } from '../../types';

export type NarrativeFormat = '' | 'Chronological' | 'SOAP';
export type NarrativeForm = { text: string; format: NarrativeFormat; generatedAt: string; sourceFingerprint: string };
export const createDefaultNarrativeForm = (): NarrativeForm => ({ text: '', format: '', generatedAt: '', sourceFingerprint: '' });

type Source = { call: CallForm; patient: PatientForm; complaint: ComplaintForm; assessment: AssessmentForm; vitals: VitalsForm; treatments: TreatmentsForm };
const sentence = (value: string) => value.trim().replace(/[.]+$/, '') + '.';
const patientLabel = (p: PatientForm) => {
  const sex = p.gender ? p.gender.toLowerCase() : 'patient';
  if (!p.dateOfBirth) return `a ${sex}`;
  const dob = new Date(`${p.dateOfBirth}T00:00:00`); const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--;
  return `a ${Math.max(0, age)}-year-old ${sex}`;
};
const vitalsText = (v: VitalsForm) => v.sets.map((x, i) => `Vital set ${i + 1}: BP ${x.systolic}${x.bloodPressureMethod === 'Palpated' ? '/P' : `/${x.diastolic}`}, pulse ${x.heartRate}, respirations ${x.respiratoryRate}, SpO2 ${x.spo2}%, and GCS ${x.gcs}`).join('. ');
const treatmentText = (t: TreatmentsForm) => t.records.map((r) => `${r.name}${r.patientResponse ? ` was performed with patient response documented as ${r.patientResponse}` : ' was performed'}${r.notes ? `; ${r.notes}` : ''}`).join('. ');

export function narrativeFingerprint(source: Source) { return JSON.stringify(source); }

export function generateNarrative(source: Source, format: Exclude<NarrativeFormat, ''>) {
  const { call, patient, complaint, assessment, vitals, treatments } = source;
  const dispatch = sentence(`${call.respondingUnitNumber || 'EMS'} was dispatched${call.dispatchedPriority ? ` ${call.dispatchedPriority}` : ''}${call.incidentLocationType ? ` to ${call.incidentLocationType.toLowerCase()}` : ''}${call.dispatchedNatureOfCall ? ` for a report of ${call.dispatchedNatureOfCall.toLowerCase()}` : ''}`);
  const contact = sentence(`Upon arrival, EMS made contact with ${patientLabel(patient)}${complaint.chiefComplaint ? ` whose chief complaint was ${complaint.chiefComplaint.toLowerCase()}` : ''}`);
  const history = [complaint.primaryImpression?.description, complaint.primarySymptom?.description, patient.medicalHistory && `Medical history included ${patient.medicalHistory}`, patient.currentMedications && `Current medications included ${patient.currentMedications}`, patient.medicationAllergies && `Medication allergies were documented as ${patient.medicationAllergies}`].filter(Boolean).map((x) => sentence(String(x))).join(' ');
  const primary = assessment.clinical.primary;
  const examParts = Object.entries(primary).filter(([, value]) => typeof value === 'string' && value).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} ${value}`);
  const exam = examParts.length ? sentence(`Assessment findings included ${examParts.join(', ')}`) : '';
  const vt = vitalsText(vitals); const tx = treatmentText(treatments);
  const disposition = patient.disposition === 'Transported' ? sentence(`Patient was transported${patient.transportedTo ? ` to ${patient.transportedTo}` : ''} without incident`) : patient.disposition ? sentence(`Final disposition was ${patient.disposition}${patient.dispositionExplanation ? `: ${patient.dispositionExplanation}` : ''}`) : '';
  const objective = [exam, vt && sentence(vt)].filter(Boolean).join(' ');
  const plan = [tx && sentence(tx), disposition].filter(Boolean).join(' ');
  if (format === 'SOAP') return `Subjective:\n${[dispatch, contact, history].filter(Boolean).join(' ')}\n\nObjective:\n${objective || 'No objective findings documented.'}\n\nAssessment:\n${complaint.primaryImpression?.description ? sentence(complaint.primaryImpression.description) : 'No clinical impression documented.'}\n\nPlan:\n${plan || 'No treatment or disposition documented.'}`;
  return [dispatch, contact, history, objective, plan].filter(Boolean).join('\n\n');
}
