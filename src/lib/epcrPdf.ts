import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

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
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
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

const navy = rgb(0.055, 0.16, 0.28);
const blue = rgb(0.09, 0.39, 0.62);
const paleBlue = rgb(0.91, 0.95, 0.98);
const line = rgb(0.76, 0.81, 0.86);
const ink = rgb(0.12, 0.16, 0.2);
const muted = rgb(0.38, 0.43, 0.48);
const alert = rgb(0.85, 0.18, 0.18);

function safe(value: unknown) {
  return text(value).replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}
function wrapText(value: string, font: PDFFont, size: number, width: number) {
  const words = safe(value).split(' ').filter(Boolean); const result: string[] = []; let current = '';
  for (const word of words) { const next = current ? `${current} ${word}` : word; if (font.widthOfTextAtSize(next, size) <= width || !current) current = next; else { result.push(current); current = word; } }
  if (current) result.push(current); return result.length ? result : [''];
}

export async function reportPdf(chart: Record<string, unknown>, reportNumber: string, patientDisplay: string) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const patient = asObject(chart.patient);
  const gender = text(patient.gender).toLowerCase();
  const bodyMapFile = gender.includes('female')
    ? 'apollo-body-female.png'
    : 'apollo-body-male.png';
  const [logoBytes, bodyMapBytes] = await Promise.all([
    readFile(path.join(process.cwd(), 'public', 'apollo-logo.png')),
    readFile(path.join(process.cwd(), 'public', 'epcr', 'body-map', bodyMapFile)),
  ]);
  const logoImage = await pdf.embedPng(logoBytes);
  const bodyMapImage = await pdf.embedPng(bodyMapBytes);
  const margin = 38, contentWidth = 536; let page!: PDFPage; let y = 0;
  const newPage = () => { page = pdf.addPage([612, 792]); y = 730; return page; };
  const ensure = (height: number) => { if (y - height < 48) newPage(); };
  const drawHeader = (target: PDFPage) => {
    target.drawRectangle({ x: 0, y: 748, width: 612, height: 44, color: rgb(1,1,1) });
    target.drawImage(logoImage, { x: margin, y: 752, width: 54, height: 36 });
    target.drawText('PATIENT CARE REPORT', { x: 414, y: 767, size: 10.5, font: bold, color: navy });
    target.drawRectangle({ x: 0, y: 748, width: 612, height: 3, color: blue });
  };
  const section = (title: string) => { ensure(28); page.drawRectangle({ x: margin, y: y - 19, width: contentWidth, height: 20, color: navy }); page.drawText(title.toUpperCase(), { x: margin + 8, y: y - 14, size: 9.5, font: bold, color: rgb(1,1,1) }); y -= 26; };
  const paragraph = (value: string, size = 8.5, indent = 0) => { const lines = wrapText(value, regular, size, contentWidth - indent - 12); ensure(lines.length * 11 + 7); lines.forEach((entry) => { page.drawText(entry, { x: margin + 6 + indent, y, size, font: regular, color: ink }); y -= 11; }); y -= 3; };
  const fieldRows = (items: Row[]) => {
    for (let index = 0; index < items.length; index += 2) {
      const pair = items.slice(index, index + 2); const rendered = pair.map((item) => wrapText(item.value, regular, 8.3, 180)); const height = Math.max(...rendered.map((entry) => entry.length)) * 10 + 19; ensure(height);
      page.drawRectangle({ x: margin, y: y - height + 4, width: contentWidth, height, color: index % 4 === 0 ? rgb(0.97,0.98,0.99) : rgb(1,1,1), borderColor: line, borderWidth: 0.45 });
      pair.forEach((item, column) => { const x = margin + 8 + column * 268; page.drawText(safe(item.label).toUpperCase(), { x, y: y - 8, size: 6.8, font: bold, color: blue }); rendered[column].forEach((entry, rowIndex) => page.drawText(entry, { x, y: y - 19 - rowIndex * 10, size: 8.3, font: regular, color: ink })); if (column === 0) page.drawLine({ start:{x:margin+268,y:y+4}, end:{x:margin+268,y:y-height+4}, color:line, thickness:0.4 }); });
      y -= height;
    } y -= 5;
  };
  const table = (data: string[][]) => {
    if (!data.length) return; const columns = Math.max(...data.map((entry) => entry.length)); const cellWidth = contentWidth / columns;
    data.forEach((sourceRow, rowIndex) => { const wrapped = Array.from({length:columns}, (_, column) => wrapText(sourceRow[column] ?? '', rowIndex === 0 ? bold : regular, rowIndex === 0 ? 7.1 : 7.5, cellWidth - 10)); const height = Math.max(...wrapped.map((entry) => entry.length)) * 9 + 9; ensure(height); page.drawRectangle({ x:margin, y:y-height+3, width:contentWidth, height, color:rowIndex === 0 ? paleBlue : rowIndex % 2 ? rgb(1,1,1) : rgb(0.97,0.98,0.99), borderColor:line, borderWidth:0.5 }); wrapped.forEach((cell,column) => { if(column) page.drawLine({start:{x:margin+column*cellWidth,y:y+3},end:{x:margin+column*cellWidth,y:y-height+3},color:line,thickness:0.4}); cell.forEach((entry,lineIndex) => page.drawText(entry,{x:margin+column*cellWidth+5,y:y-7-lineIndex*9,size:rowIndex===0?7.1:7.5,font:rowIndex===0?bold:regular,color:rowIndex===0?navy:ink})); }); y -= height; }); y -= 6;
  };
  const bodyMap = (findings: string[][]) => {
    ensure(205); const affected = new Set(findings.map((entry) => entry[0])); const ox = margin + 4, oy = y - 174;
    const imageWidth = 194, imageHeight = 134;
    page.drawImage(bodyMapImage, { x: ox, y: oy + 20, width: imageWidth, height: imageHeight });
    const marker = (label:string, x:number, markerY:number, width:number, height:number) => {
      if (!affected.has(label)) return;
      page.drawRectangle({ x: ox + x, y: oy + markerY, width, height, color: alert, opacity: 0.28, borderColor: alert, borderWidth: 0.8, borderOpacity: 0.8 });
    };
    marker('Head', 45, 132, 18, 18); marker('Face', 48, 125, 13, 10); marker('Neck', 48, 116, 13, 8);
    marker('Chest', 38, 91, 31, 25); marker('Abdomen', 40, 76, 27, 15); marker('Pelvis', 40, 65, 28, 12);
    marker('Right Arm', 25, 73, 14, 43); marker('Left Arm', 68, 73, 14, 43);
    marker('Right Leg', 42, 23, 13, 43); marker('Left Leg', 57, 23, 13, 43);
    marker('Back', 131, 77, 31, 39);
    page.drawRectangle({x:ox,y:oy+5,width:10,height:10,color:alert,opacity:0.35,borderColor:alert,borderWidth:0.8}); page.drawText('Documented finding',{x:ox+15,y:oy+7,size:7.5,font:regular,color:ink});
    const findingsX = margin + 220; page.drawText('DOCUMENTED REGIONS',{x:findingsX,y:y-10,size:7.5,font:bold,color:blue}); let fy = y - 24;
    if (!findings.length) page.drawText('No abnormal mapped regions documented.',{x:findingsX,y:fy,size:8,font:regular,color:muted});
    findings.forEach(([region, detail]) => { const lines = wrapText(detail, regular, 7.8, 335); page.drawText(region,{x:findingsX,y:fy,size:8,font:bold,color:ink}); fy -= 10; lines.slice(0,5).forEach((entry) => { page.drawText(entry,{x:findingsX+8,y:fy,size:7.8,font:regular,color:ink}); fy -= 9; }); fy -= 3; }); y -= 196;
  };

  newPage(); page.drawText(`Report ${safe(reportNumber)}`,{x:margin,y:720,size:10,font:bold,color:navy}); page.drawText(`Patient: ${safe(patientDisplay)}`,{x:220,y:720,size:10,font:regular,color:ink}); y=700;
  for (const block of blocks(chart)) { if (block.title === 'Body Map - Documented Findings') ensure(231); section(block.title); if (block.title === 'Body Map - Documented Findings') bodyMap((block.columns ?? []).slice(1)); else { if (block.rows?.length) fieldRows(block.rows); if (block.columns?.length) table(block.columns); if (block.narrative) for (const entry of block.narrative.split(/\n+/).filter(Boolean)) paragraph(entry, 9); } }
  const pages = pdf.getPages(); pages.forEach((item,index) => { page=item; drawHeader(item); page.drawLine({start:{x:margin,y:38},end:{x:574,y:38},color:line,thickness:0.5}); page.drawText(`ApolloEMS | Report ${safe(reportNumber)}`,{x:margin,y:24,size:7.5,font:regular,color:muted}); const footer=`Page ${index+1} of ${pages.length}`; page.drawText(footer,{x:574-regular.widthOfTextAtSize(footer,7.5),y:24,size:7.5,font:regular,color:muted}); });
  return Buffer.from(await pdf.save());
}
