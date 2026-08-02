type Row = { label: string; value: string };
type Block = { title: string; rows?: Row[]; columns?: string[][]; narrative?: string };

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item) => item && typeof item === 'object').map((item) => item as Record<string, unknown>) : [];
const text = (value: unknown) => value === null || value === undefined ? '' : Array.isArray(value) ? value.filter(Boolean).join(', ') : String(value).trim();
const dateTime = (value: unknown) => {
  const raw = text(value);
  if (!raw) return '';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const row = (label: string, value: unknown): Row | null => text(value) ? { label, value: text(value) } : null;
const rows = (...items: (Row | null)[]) => items.filter((item): item is Row => Boolean(item));
const impression = (value: unknown) => {
  const item = asObject(value);
  return [text(item.description), text(item.code)].filter(Boolean).join(' - ');
};
const address = (source: Record<string, unknown>, prefix: 'incident' | 'patient') =>
  [text(source[`${prefix}Street`]), text(source[`${prefix}Apartment`]) && `Apt ${text(source[`${prefix}Apartment`])}`, text(source[`${prefix}City`]), text(source[`${prefix}Zip`])].filter(Boolean).join(', ');

const regionLabels: Record<string, string> = { head: 'Head', face: 'Face', neck: 'Neck', chest: 'Chest', abdomen: 'Abdomen', pelvis: 'Pelvis', back: 'Back', rightArm: 'Right Arm', leftArm: 'Left Arm', rightLeg: 'Right Leg', leftLeg: 'Left Leg' };
const findingLabels: Record<string, string> = { deformity: 'Deformity', contusions: 'Contusions', abrasions: 'Abrasions', puncturesPenetrations: 'Puncture/Penetration', burns: 'Burns', tenderness: 'Tenderness', lacerations: 'Lacerations', swelling: 'Swelling' };

function mappedFindings(assessment: Record<string, unknown>) {
  const bodyMap = asObject(assessment.bodyMap);
  const subregions = asObject(bodyMap.subregionFindings);
  const result: string[][] = [];
  for (const [region, label] of Object.entries(regionLabels)) {
    const details: string[] = [];
    for (const [subregion, rawFinding] of Object.entries(asObject(subregions[region]))) {
      const finding = asObject(rawFinding);
      const abnormal = Object.entries(asObject(finding.dcapBtls)).filter(([, value]) => value === true).map(([key]) => findingLabels[key] ?? key);
      const cms = asObject(finding.cmsTp);
      const cmsText = Object.entries(cms).filter(([, value]) => text(value)).map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1')}: ${text(value)}`);
      const notes = text(finding.notes);
      if (abnormal.length || cmsText.length || notes) details.push(`${subregion.replace(/-/g, ' ')}: ${[...abnormal, ...cmsText, notes].filter(Boolean).join(', ')}`);
    }
    const regionFinding = asObject(asObject(bodyMap.regionFindings)[region]);
    const regionalAbnormal = Object.entries(asObject(regionFinding.dcapBtls)).filter(([, value]) => value === true).map(([key]) => findingLabels[key] ?? key);
    if (regionalAbnormal.length || text(regionFinding.notes)) details.unshift([regionalAbnormal.join(', '), text(regionFinding.notes)].filter(Boolean).join('; '));
    if (details.length) result.push([label, details.join('; ')]);
  }
  return result;
}

function blocks(chart: Record<string, unknown>): Block[] {
  const call = asObject(chart.call), patient = asObject(chart.patient), complaint = asObject(chart.complaint);
  const assessment = asObject(chart.assessment), clinical = asObject(assessment.clinical);
  const vitals = asObject(chart.vitals), treatments = asObject(chart.treatments), billing = asObject(chart.billing);
  const narrative = typeof chart.narrative === 'string' ? chart.narrative : text(asObject(chart.narrative).text);
  const signature = asObject(chart.signature);
  const crew = asArray(call.crewMembers).map((member) => [text(member.name), text(member.certification), text(member.role), member.isDocumentingPcr ? 'Documenting' : '']);
  const vitalRows = asArray(vitals.sets).map((set) => [dateTime(set.recordedAt), [text(set.systolic), text(set.diastolic)].filter(Boolean).join('/'), text(set.heartRate), text(set.respiratoryRate), text(set.spo2) && `${text(set.spo2)}%`, text(set.gcs), [text(set.oxygenDevice), text(set.oxygenFlow) && `${text(set.oxygenFlow)} L/min`].filter(Boolean).join(' ') ]);
  const treatmentRows = asArray(treatments.records).map((item) => { const medication = asObject(item.medication); return [dateTime(item.performedAt), text(item.name), [text(medication.dose), text(medication.unit), text(medication.route)].filter(Boolean).join(' '), text(item.status), text(item.performedByName), text(item.patientResponse)]; });
  const primary = asObject(clinical.primary), pain = asObject(clinical.pain), consciousness = asObject(clinical.consciousness), history = asObject(clinical.history), ecg = asObject(clinical.ecg);
  const mapped = mappedFindings(assessment);
  return [
    { title: 'Call', rows: rows(row('Response Number', call.emsResponseNumber), row('Incident Number', call.emsIncidentNumber), row('Unit', call.respondingUnitNumber), row('Priority', call.dispatchedPriority), row('Nature of Call', call.dispatchedNatureOfCall), row('Service', call.typeOfServiceRequested), row('Response Mode', call.responseModeToScene), row('Location', address(call, 'incident')), row('Location Type', call.incidentLocationType), row('LEMSA', call.lemsa), row('PPE', call.personalProtectiveEquipmentUsed)) },
    { title: 'Crew', columns: [['Name', 'Certification', 'Role', 'PCR'], ...crew] },
    { title: 'Call Times', columns: [['Received', 'Dispatched', 'En Route', 'On Scene', 'Contact'], [text(call.callReceived), text(call.callDispatched), text(call.unitEnRoute), text(call.unitOnScene), text(call.patientContact)], ['Depart Scene', 'At Destination', 'Transfer', 'Available', ''], [text(call.departScene), text(call.arrivedAtDestination), text(call.transferOfCare), text(call.unitBackInService), '']] },
    { title: 'Patient', rows: rows(row('Name', [text(patient.firstName), text(patient.middleInitial), text(patient.lastName)].filter(Boolean).join(' ')), row('Date of Birth', patient.dateOfBirth), row('Gender', patient.gender), row('Address', address(patient, 'patient')), row('Phone', patient.phoneNumber), row('Height', text(patient.heightInches) && `${text(patient.heightInches)} in`), row('Weight', text(patient.weightPounds) && `${text(patient.weightPounds)} lb`), row('Race', patient.race), row('Code Status', patient.codeStatus), row('Medical History', patient.medicalHistory), row('Surgical History', patient.surgicalHistory), row('Medications', patient.currentMedications), row('Medication Allergies', patient.medicationAllergies), row('Environmental Allergies', patient.environmentalAllergies), row('Last Oral Intake', dateTime(patient.lastOralIntake)), row('Disposition', patient.disposition), row('Transported To', patient.transportedTo), row('Disposition Details', patient.dispositionExplanation)) },
    { title: 'Complaint', rows: rows(row('Chief Complaint', complaint.chiefComplaint), row('Clinical Category', complaint.clinicalCategory), row('Primary Impression', impression(complaint.primaryImpression)), row('Secondary Impression', impression(complaint.secondaryImpression)), row('Primary Symptom', impression(complaint.primarySymptom)), row('Associated Symptoms', complaint.otherAssociatedSymptoms), row('Symptoms Began', dateTime(complaint.symptomsBeganDateTime)), row('Last Known Well', dateTime(complaint.lastSeenNormalDateTime)), row('Patient Acuity', complaint.patientAcuity), row('Possible Trauma', complaint.possibleInjuryTrauma), row('Cardiac Arrest', complaint.cardiacArrest), row('Suspected Stroke', complaint.suspectedStrokeCva), row('Behavioral Hold', complaint.patientPlacedOn5150Hold), row('Drug/Alcohol', complaint.possibleDrugAlcoholUse)) },
    { title: 'Assessment', rows: rows(row('General Impression', primary.generalImpression), row('AVPU', consciousness.avpu), row('Orientation', consciousness.orientation), row('Airway', primary.airway), row('Breathing', primary.breathing), row('Circulation', primary.circulation), row('Disability', primary.disability), row('Exposure', primary.exposure), row('Events Leading to Illness/Injury', history.eventsLeadingToIllness), row('Pain', pain.painPresent), row('Pain Score', pain.numericPainScore), row('OPQRST', [text(pain.onset), text(pain.provocation), text(pain.quality), text(pain.radiation), text(pain.time)].filter(Boolean).join(' / ')), row('4-Lead ECG', ecg.fourLeadInterpretation), row('12-Lead ECG', ecg.twelveLeadInterpretation)) },
    { title: 'Body Map - Documented Findings', columns: mapped.length ? [['Region', 'Finding'], ...mapped] : [['Finding'], ['No abnormal mapped regions documented.']] },
    { title: 'Vitals', columns: vitalRows.length ? [['Time', 'BP', 'Pulse', 'Resp.', 'SpO2', 'GCS', 'Oxygen'], ...vitalRows] : [['Vitals'], ['No vital sets documented.']] },
    { title: 'Treatments', columns: treatmentRows.length ? [['Time', 'Treatment', 'Dose/Route', 'Status', 'Provider', 'Response'], ...treatmentRows] : [['Treatments'], [text(treatments.noTreatmentReason) || 'No treatments documented.']] },
    { title: 'Protocols', rows: rows(row('Selected Protocols', asArray(treatments.selectedProtocols).map((item) => text(item.name)).filter(Boolean))) },
    { title: 'Billing', rows: billing.unableToComplete ? [{ label: 'Status', value: `Unable to complete${text(billing.unableReason) ? ` - ${text(billing.unableReason)}` : ''}` }] : rows(row('Responsible Party', billing.responsibleParty), row('Insurance Type', billing.insuranceType), row('Insurance Company', billing.insuranceCompany), row('Member ID', billing.memberId), row('Group Number', billing.groupNumber), row('Subscriber', billing.subscriberName), row('Billing Notes', billing.billingNotes)) },
    { title: 'Narrative', narrative: narrative || 'No narrative documented.' },
    { title: 'Signatures', rows: rows(row('Clinician Signature', signature.imageData ? 'Captured electronically' : 'Not captured'), row('Signed At', dateTime(signature.signedAt))) },
  ].filter((block) => block.narrative || block.columns?.length || block.rows?.length);
}

function clean(value: string) { return value.replace(/[^\x20-\x7E]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)'); }
function wrap(value: string, width: number) { const words = value.replace(/\s+/g, ' ').trim().split(' '); const result: string[] = []; let line = ''; for (const word of words) { if (!line) line = word; else if (`${line} ${word}`.length <= width) line += ` ${word}`; else { result.push(line); line = word; } } if (line) result.push(line); return result.length ? result : ['']; }

export function reportPdf(chart: Record<string, unknown>, reportNumber: string, patientDisplay: string) {
  const pages: string[][] = [[]]; let used = 0;
  const addLine = (style: 'H'|'S'|'R'|'L', value: string) => { const capacity = style === 'H' ? 38 : style === 'S' ? 72 : 96; for (const line of wrap(value, capacity)) { const cost = style === 'H' ? 2.1 : style === 'S' ? 1.6 : 1; if (used + cost > 51) { pages.push([]); used = 0; } pages.at(-1)!.push(`${style}|${line}`); used += cost; } };
  addLine('H', 'ApolloEMS Patient Care Report'); addLine('R', `Report ${reportNumber}   Patient: ${patientDisplay}`);
  for (const block of blocks(chart)) {
    addLine('S', block.title);
    for (const item of block.rows ?? []) addLine('R', `${item.label}: ${item.value}`);
    for (const tableRow of block.columns ?? []) addLine(tableRow === block.columns?.[0] ? 'L' : 'R', tableRow.filter(Boolean).join('   |   '));
    if (block.narrative) for (const paragraph of block.narrative.split(/\n+/).filter(Boolean)) addLine('R', paragraph);
  }
  const objects: string[] = []; const add = (body: string) => { objects.push(body); return objects.length; };
  const catalogId = add(''), pagesId = add(''); const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'); const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'); const pageIds: number[] = [];
  pages.forEach((page, pageIndex) => { const commands = ['BT', '42 758 Td']; let first = true; for (const encoded of page) { const [style, ...rest] = encoded.split('|'); const value = rest.join('|'); const size = style === 'H' ? 18 : style === 'S' ? 12 : style === 'L' ? 8 : 9; const leading = style === 'H' ? 25 : style === 'S' ? 20 : 13; if (!first) commands.push(`0 -${leading} Td`); commands.push(`/${style === 'R' ? 'F1' : 'F2'} ${size} Tf (${clean(value)}) Tj`); first = false; } commands.push('ET', `BT 42 28 Td /F1 8 Tf (Page ${pageIndex + 1} of ${pages.length}) Tj ET`); const stream = commands.join('\n'); const contentId = add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`); pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${contentId} 0 R >>`)); });
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`; objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let output = '%PDF-1.4\n'; const offsets = [0]; objects.forEach((body, index) => { offsets.push(Buffer.byteLength(output)); output += `${index + 1} 0 obj\n${body}\nendobj\n`; }); const xref = Buffer.byteLength(output); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`; return Buffer.from(output, 'binary');
}
