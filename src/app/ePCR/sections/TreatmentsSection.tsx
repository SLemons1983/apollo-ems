'use client';

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ComplaintForm, PatientForm } from '../types';
import {
  PROTOCOL_OPTIONS,
  TREATMENT_CATALOG,
  calculateMedication,
  createEmptyTreatment,
  formatTreatmentTime,
  getSuggestedProtocols,
  getSuggestedTreatments,
  getTreatmentAlerts,
  hydrateTreatmentSelection,
  toLocalTreatmentTime,
  type ProtocolSelection,
  type TreatmentRecord,
  type TreatmentsForm,
} from '../clinical/treatments/treatments';

type Props = {
  treatmentsForm: TreatmentsForm;
  setTreatmentsForm: Dispatch<SetStateAction<TreatmentsForm>>;
  patientForm: PatientForm;
  complaintForm: ComplaintForm;
  documentingProviderName: string;
  quickAddRequest: number;
};

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const labelClass = 'text-xs font-black uppercase tracking-wide text-slate-600';

function number(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statusStyle(record: TreatmentRecord) {
  const maxExceeded =
    number(record.medication.dose) > 0 &&
    number(record.medication.protocolMaxDose) > 0 &&
    number(record.medication.dose) > number(record.medication.protocolMaxDose);
  const wasteIncomplete =
    record.medication.controlled &&
    number(record.medication.wastedQuantity) > 0 &&
    (!record.medication.clinicianSignature ||
      !record.medication.witnessSignature);
  if (maxExceeded || wasteIncomplete)
    return 'border-red-300 bg-red-50 text-red-900';
  if (
    (record.kind === 'Medication' && !record.medication.rightsConfirmed) ||
    (record.procedure.verificationRequired &&
      !record.procedure.verification) ||
    !record.response ||
    record.response === 'Not yet reassessed'
  )
    return 'border-amber-300 bg-amber-50 text-amber-900';
  if (
    record.status === 'Refused' ||
    record.status === 'Attempted' ||
    record.status === 'Prior to EMS Arrival'
  )
    return 'border-slate-300 bg-slate-100 text-slate-800';
  return 'border-emerald-300 bg-emerald-50 text-emerald-900';
}

export default function TreatmentsSection({
  treatmentsForm,
  setTreatmentsForm,
  patientForm,
  complaintForm,
  documentingProviderName,
  quickAddRequest,
}: Props) {
  const [protocolEditorOpen, setProtocolEditorOpen] = useState(
    treatmentsForm.protocols.length === 0,
  );
  const [protocolDraft, setProtocolDraft] = useState<ProtocolSelection>({
    id: '',
    name: '',
    startedAt: toLocalTreatmentTime(),
    relationship: treatmentsForm.protocols.length ? 'Added' : 'Primary',
    reason: '',
    baseContactRequired: '',
    authorizationStatus: '',
  });
  const [entryOpen, setEntryOpen] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<string[]>([]);
  const [lastQuickAddRequest, setLastQuickAddRequest] = useState(quickAddRequest);

  useEffect(() => {
    if (quickAddRequest === lastQuickAddRequest) return;
    setLastQuickAddRequest(quickAddRequest);
    setEntryOpen(true);
    setTreatmentsForm((current) => ({
      ...current,
      draft: {
        ...createEmptyTreatment(toLocalTreatmentTime()),
        protocolId: current.protocols.at(-1)?.id ?? '',
        performedBy: documentingProviderName || 'Primary clinician',
      },
    }));
  }, [
    documentingProviderName,
    lastQuickAddRequest,
    quickAddRequest,
    setTreatmentsForm,
  ]);

  const suggestedProtocols = useMemo(
    () =>
      getSuggestedProtocols({
        clinicalCategory: complaintForm.clinicalCategory,
        chiefComplaint: complaintForm.chiefComplaint,
        suspectedStroke: complaintForm.suspectedStrokeCva === 'Yes',
        possibleTrauma: complaintForm.possibleInjuryTrauma === 'Yes',
        cardiacArrest:
          complaintForm.cardiacArrest !== '' &&
          complaintForm.cardiacArrest !== 'No',
      }),
    [complaintForm],
  );
  const suggestedTreatments = useMemo(
    () => getSuggestedTreatments(treatmentsForm.protocols.map((item) => item.name)),
    [treatmentsForm.protocols],
  );
  const alerts = useMemo(
    () => getTreatmentAlerts(treatmentsForm),
    [treatmentsForm],
  );
  const restockItems = useMemo(() => {
    const supplyMap: Record<string, string[]> = {
      'Peripheral IV': ['IV catheter', 'extension set', 'saline flush', 'IV dressing'],
      'External Jugular IV': ['IV catheter', 'extension set', 'saline flush', 'IV dressing'],
      'Intraosseous Access': ['IO needle', 'extension set', 'saline flush'],
      'Nebulized Treatment': ['nebulizer kit', 'oxygen tubing', 'medication unit dose'],
      'Endotracheal Intubation': ['ET tube', '10 mL syringe', 'tube securement device', 'suction supplies'],
      'Supraglottic Airway': ['supraglottic airway', 'lubricant', 'airway securement'],
      '12-Lead ECG': ['ECG electrodes × 10'],
      'Tourniquet': ['tourniquet'],
      'Hemorrhage Control': ['gauze', 'pressure dressing'],
      'Wound Care': ['gauze', 'wound dressing'],
      'Splinting': ['splinting supplies'],
      'Cervical Collar': ['cervical collar'],
    };
    const supplies = treatmentsForm.records.flatMap((record) => [
      ...(record.kind === 'Medication' ? [`${record.treatment} dose`] : []),
      ...(supplyMap[record.treatment] ?? []),
      ...record.supplies,
    ]);
    return [...new Set(supplies)];
  }, [treatmentsForm.records]);
  const patientWeightKg = patientForm.weightPounds
    ? String(Number((number(patientForm.weightPounds) / 2.20462).toFixed(1)))
    : '';
  const activeProtocol = treatmentsForm.protocols.find(
    (item) => item.id === treatmentsForm.draft.protocolId,
  );
  const isMedication = treatmentsForm.draft.kind === 'Medication';
  const isBaseContact = treatmentsForm.draft.kind === 'Base Hospital Contact';
  const isProcedure =
    treatmentsForm.draft.kind === 'Procedure' ||
    treatmentsForm.draft.kind === 'Other';
  const doseExceeded =
    number(treatmentsForm.draft.medication.dose) > 0 &&
    number(treatmentsForm.draft.medication.protocolMaxDose) > 0 &&
    number(treatmentsForm.draft.medication.dose) >
      number(treatmentsForm.draft.medication.protocolMaxDose);

  function updateDraft(patch: Partial<TreatmentRecord>) {
    setTreatmentsForm((current) => ({
      ...current,
      draft: { ...current.draft, ...patch },
    }));
  }

  function updateMedication(
    patch: Partial<TreatmentRecord['medication']>,
  ) {
    setTreatmentsForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        medication: { ...current.draft.medication, ...patch },
      },
    }));
  }

  function updateProcedure(patch: Partial<TreatmentRecord['procedure']>) {
    setTreatmentsForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        procedure: { ...current.draft.procedure, ...patch },
      },
    }));
  }

  function updateBaseContact(
    patch: Partial<TreatmentRecord['baseContact']>,
  ) {
    setTreatmentsForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        baseContact: { ...current.draft.baseContact, ...patch },
      },
    }));
  }

  function beginTreatment(category = '', treatment = '') {
    const base = {
      ...createEmptyTreatment(toLocalTreatmentTime()),
      protocolId: treatmentsForm.protocols.at(-1)?.id ?? '',
      performedBy: documentingProviderName || 'Primary clinician',
      medication: {
        ...createEmptyTreatment().medication,
        weightKg: patientWeightKg,
      },
    };
    setTreatmentsForm((current) => ({
      ...current,
      draft: treatment
        ? hydrateTreatmentSelection(base, category, treatment)
        : base,
      noTreatmentReason: '',
    }));
    setEntryOpen(true);
  }

  function saveProtocol() {
    if (!protocolDraft.name || !protocolDraft.startedAt) return;
    const protocol: ProtocolSelection = {
      ...protocolDraft,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `protocol-${Date.now()}`,
    };
    setTreatmentsForm((current) => ({
      ...current,
      protocols: [...current.protocols, protocol],
    }));
    setProtocolDraft({
      id: '',
      name: '',
      startedAt: toLocalTreatmentTime(),
      relationship: 'Added',
      reason: '',
      baseContactRequired: '',
      authorizationStatus: '',
    });
    setProtocolEditorOpen(false);
  }

  function calculateDose() {
    updateMedication(
      calculateMedication(
        treatmentsForm.draft.medication.weightKg,
        treatmentsForm.draft.medication.protocolDosePerKg,
        treatmentsForm.draft.medication.concentrationAmount,
        treatmentsForm.draft.medication.concentrationVolumeMl,
        treatmentsForm.draft.medication.durationMinutes,
      ),
    );
  }

  function saveTreatment() {
    const draft = treatmentsForm.draft;
    if (!draft.performedAt || !draft.category || !draft.treatment) return;
    const record: TreatmentRecord = {
      ...draft,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `treatment-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTreatmentsForm((current) => ({
      ...current,
      records: [...current.records, record],
      draft: createEmptyTreatment(),
    }));
    setEntryOpen(false);
  }

  function removeRecord(id: string) {
    setTreatmentsForm((current) => ({
      ...current,
      records: current.records.filter((record) => record.id !== id),
    }));
  }

  const saveDisabled =
    !treatmentsForm.draft.performedAt ||
    !treatmentsForm.draft.category ||
    !treatmentsForm.draft.treatment ||
    (isMedication &&
      (!treatmentsForm.draft.medication.dose ||
        !treatmentsForm.draft.medication.unit ||
        !treatmentsForm.draft.medication.route));

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-950 px-5 py-4 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-200">
              Protocol Workspace
            </p>
            <h3 className="text-xl font-black">Choose the care pathway first</h3>
          </div>
          <button
            type="button"
            onClick={() => setProtocolEditorOpen((open) => !open)}
            className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20"
          >
            {treatmentsForm.protocols.length ? '+ Add Protocol' : 'Select Protocol'}
          </button>
        </div>

        {treatmentsForm.protocols.length > 0 && (
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {treatmentsForm.protocols.map((protocol) => (
              <div
                key={protocol.id}
                className="rounded-xl border border-indigo-200 bg-indigo-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-indigo-950">{protocol.name}</div>
                    <div className="mt-1 text-xs font-bold text-indigo-700">
                      {protocol.relationship} · {formatTreatmentTime(protocol.startedAt)}
                    </div>
                  </div>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-indigo-700">
                    Active
                  </span>
                </div>
                {protocol.reason && (
                  <p className="mt-2 text-sm text-slate-700">{protocol.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {protocolEditorOpen && (
          <div className="border-t border-indigo-200 bg-slate-50 p-5">
            {suggestedProtocols.length > 0 && (
              <div className="mb-4">
                <div className={labelClass}>ACI protocol considerations</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {suggestedProtocols.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() =>
                        setProtocolDraft((current) => ({ ...current, name }))
                      }
                      className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-900 hover:bg-amber-100"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>
                Protocol
                <select
                  value={protocolDraft.name}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select protocol</option>
                  {PROTOCOL_OPTIONS.map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Initiated
                <input
                  type="datetime-local"
                  value={protocolDraft.startedAt}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      startedAt: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Relationship
                <select
                  value={protocolDraft.relationship}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      relationship: event.target
                        .value as ProtocolSelection['relationship'],
                    }))
                  }
                  className={inputClass}
                >
                  <option>Primary</option>
                  <option>Added</option>
                  <option>Replaced Previous</option>
                </select>
              </label>
              <label className={labelClass}>
                Reason selected / added
                <select
                  value={protocolDraft.reason}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select reason</option>
                  <option>Chief complaint / presentation</option>
                  <option>Assessment findings</option>
                  <option>Vital-sign findings</option>
                  <option>Change in patient condition</option>
                  <option>Base hospital direction</option>
                  <option>Other</option>
                </select>
              </label>
              <label className={labelClass}>
                Base contact required?
                <select
                  value={protocolDraft.baseContactRequired}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      baseContactRequired: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select</option>
                  <option>Yes</option>
                  <option>No</option>
                  <option>Unable to determine</option>
                </select>
              </label>
              <label className={labelClass}>
                Authorization
                <select
                  value={protocolDraft.authorizationStatus}
                  onChange={(event) =>
                    setProtocolDraft((current) => ({
                      ...current,
                      authorizationStatus: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select status</option>
                  <option>Standing order</option>
                  <option>Base hospital authorized</option>
                  <option>Contact pending</option>
                  <option>Contact unsuccessful</option>
                  <option>Not required</option>
                </select>
              </label>
            </div>
            {protocolDraft.relationship !== 'Primary' &&
              protocolDraft.baseContactRequired !== 'No' && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Adding or switching protocols may require base hospital contact.
                  Document contact or why it could not be completed.
                </div>
              )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={!protocolDraft.name || !protocolDraft.startedAt}
                onClick={saveProtocol}
                className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Save Protocol
              </button>
            </div>
          </div>
        )}
      </section>

      {treatmentsForm.protocols.length > 0 && (
        <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Apollo Clinical Intelligence
              </p>
              <h3 className="font-black text-amber-950">
                Protocol-linked treatment considerations
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-800">
              Suggestions are not orders
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedTreatments.length ? (
              suggestedTreatments.map((treatment) => {
                const category =
                  Object.entries(TREATMENT_CATALOG).find(([, items]) =>
                    items.includes(treatment),
                  )?.[0] ?? 'Other';
                const documented = treatmentsForm.records.some(
                  (record) => record.treatment === treatment,
                );
                return (
                  <button
                    key={treatment}
                    type="button"
                    onClick={() => beginTreatment(category, treatment)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-black ${
                      documented
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                        : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100'
                    }`}
                  >
                    {documented ? '✓ ' : '+ '}
                    {treatment}
                  </button>
                );
              })
            ) : (
              <p className="text-sm text-amber-900">
                No treatment suggestions are mapped to the selected protocol yet.
                All categories remain available below.
              </p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Categorized Quick Add
            </p>
            <h3 className="text-xl font-black text-slate-900">Document treatment</h3>
          </div>
          <button
            type="button"
            onClick={() => beginTreatment()}
            className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-700"
          >
            + Add Treatment
          </button>
        </div>

        {!entryOpen && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {Object.keys(TREATMENT_CATALOG).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => beginTreatment(category)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-sm font-black text-slate-800 hover:border-indigo-300 hover:bg-indigo-50"
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {entryOpen && (
          <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-5">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}>
                Date / Time
                <input
                  type="datetime-local"
                  value={treatmentsForm.draft.performedAt}
                  onChange={(event) => updateDraft({ performedAt: event.target.value })}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Protocol
                <select
                  value={treatmentsForm.draft.protocolId}
                  onChange={(event) => updateDraft({ protocolId: event.target.value })}
                  className={inputClass}
                >
                  <option value="">No linked protocol</option>
                  {treatmentsForm.protocols.map((protocol) => (
                    <option key={protocol.id} value={protocol.id}>
                      {protocol.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Category
                <select
                  value={treatmentsForm.draft.category}
                  onChange={(event) =>
                    setTreatmentsForm((current) => ({
                      ...current,
                      draft: hydrateTreatmentSelection(
                        current.draft,
                        event.target.value,
                        '',
                      ),
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select category</option>
                  {Object.keys(TREATMENT_CATALOG).map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Treatment
                <select
                  value={treatmentsForm.draft.treatment}
                  disabled={!treatmentsForm.draft.category}
                  onChange={(event) =>
                    setTreatmentsForm((current) => ({
                      ...current,
                      draft: hydrateTreatmentSelection(
                        current.draft,
                        current.draft.category,
                        event.target.value,
                      ),
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select treatment</option>
                  {(TREATMENT_CATALOG[treatmentsForm.draft.category] ?? []).map(
                    (treatment) => (
                      <option key={treatment}>{treatment}</option>
                    ),
                  )}
                </select>
              </label>
              <label className={labelClass}>
                Status
                <select
                  value={treatmentsForm.draft.status}
                  onChange={(event) =>
                    updateDraft({
                      status: event.target.value as TreatmentRecord['status'],
                    })
                  }
                  className={inputClass}
                >
                  <option>Performed</option>
                  <option>Attempted</option>
                  <option>Refused</option>
                  <option>Contraindicated</option>
                  <option>Not Indicated</option>
                  <option>Prior to EMS Arrival</option>
                </select>
              </label>
              <label className={labelClass}>
                Performed by
                <select
                  value={treatmentsForm.draft.performedBy}
                  onChange={(event) => updateDraft({ performedBy: event.target.value })}
                  className={inputClass}
                >
                  <option>{documentingProviderName || 'Primary clinician'}</option>
                  <option>Partner</option>
                  <option>Fire department / first responder</option>
                  <option>Sending facility</option>
                  <option>Patient / bystander</option>
                  <option>Law enforcement</option>
                  <option>Other</option>
                </select>
              </label>
              <label className={labelClass}>
                Indication
                <select
                  value={treatmentsForm.draft.indication}
                  onChange={(event) => updateDraft({ indication: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Select indication</option>
                  <option>Protocol indication met</option>
                  <option>Patient complaint / symptom</option>
                  <option>Assessment finding</option>
                  <option>Abnormal vital sign</option>
                  <option>Base hospital order</option>
                  <option>Supportive care</option>
                  <option>Other</option>
                </select>
              </label>
              <label className={labelClass}>
                Patient response
                <select
                  value={treatmentsForm.draft.response}
                  onChange={(event) => updateDraft({ response: event.target.value })}
                  className={inputClass}
                >
                  <option value="">Select response</option>
                  <option>Improved</option>
                  <option>Unchanged</option>
                  <option>Worsened</option>
                  <option>Unable to assess</option>
                  <option>Not yet reassessed</option>
                  <option>Not applicable</option>
                </select>
              </label>
            </div>

            {isMedication && (
              <div className="mt-5 space-y-4 rounded-xl border border-sky-200 bg-sky-50 p-4">
                <div>
                  <h4 className="font-black text-sky-950">Medication administration</h4>
                  <p className="text-xs text-sky-800">
                    Confirm protocol values and the actual dose administered.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                  <label className={labelClass}>
                    Dose
                    <input value={treatmentsForm.draft.medication.dose} onChange={(e) => updateMedication({ dose: e.target.value })} inputMode="decimal" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Unit
                    <select value={treatmentsForm.draft.medication.unit} onChange={(e) => updateMedication({ unit: e.target.value })} className={inputClass}>
                      <option value="">Select</option><option>mg</option><option>mcg</option><option>g</option><option>mL</option><option>units</option><option>mcg/min</option><option>mcg/kg/min</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Route
                    <select value={treatmentsForm.draft.medication.route} onChange={(e) => updateMedication({ route: e.target.value })} className={inputClass}>
                      <option value="">Select</option><option>PO</option><option>IV</option><option>IO</option><option>IM</option><option>IN</option><option>SL</option><option>ET</option><option>NEB</option><option>Topical</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Protocol max
                    <input value={treatmentsForm.draft.medication.protocolMaxDose} onChange={(e) => updateMedication({ protocolMaxDose: e.target.value })} inputMode="decimal" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Weight kg
                    <input value={treatmentsForm.draft.medication.weightKg} onChange={(e) => updateMedication({ weightKg: e.target.value })} inputMode="decimal" className={inputClass} />
                  </label>
                  <label className={labelClass}>
                    Dose per kg
                    <input value={treatmentsForm.draft.medication.protocolDosePerKg} onChange={(e) => updateMedication({ protocolDosePerKg: e.target.value })} inputMode="decimal" className={inputClass} />
                  </label>
                </div>
                {doseExceeded && (
                  <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4 text-sm font-black text-red-900">
                    Dose exceeds protocol maximum. Confirm the medication, dose,
                    patient weight, and applicable protocol. A variance reason is required.
                  </div>
                )}
                {doseExceeded && (
                  <label className={labelClass}>
                    Dose variance reason
                    <select value={treatmentsForm.draft.medication.doseVarianceReason} onChange={(e) => updateMedication({ doseVarianceReason: e.target.value })} className={inputClass}>
                      <option value="">Select reason</option><option>Base hospital order</option><option>Different protocol / concentration</option><option>Documented clinical exception</option><option>Entry corrected after administration</option><option>Other</option>
                    </select>
                  </label>
                )}
                <div className="rounded-xl border border-sky-300 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-black text-slate-900">Weight-based dose and drip calculator</div>
                      <div className="text-xs text-slate-600">Shows the calculation; clinician confirmation remains required.</div>
                    </div>
                    <button type="button" onClick={calculateDose} className="rounded-lg bg-sky-700 px-4 py-2 text-xs font-black text-white">Calculate</button>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
                    <label className={labelClass}>Medication in bag<input value={treatmentsForm.draft.medication.concentrationAmount} onChange={(e) => updateMedication({ concentrationAmount: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                    <label className={labelClass}>Final volume mL<input value={treatmentsForm.draft.medication.concentrationVolumeMl} onChange={(e) => updateMedication({ concentrationVolumeMl: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                    <label className={labelClass}>Infuse over minutes<input value={treatmentsForm.draft.medication.durationMinutes} onChange={(e) => updateMedication({ durationMinutes: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                    <div><div className={labelClass}>Calculated dose</div><div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-black">{treatmentsForm.draft.medication.calculatedDose || '—'}</div></div>
                    <div><div className={labelClass}>Pump / gravity</div><div className="mt-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-black">{treatmentsForm.draft.medication.pumpRateMlHr || '—'} mL/hr · {treatmentsForm.draft.medication.dripRate10 || '—'} gtt/min (10) · {treatmentsForm.draft.medication.dripRate60 || '—'} gtt/min (60)</div></div>
                  </div>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4">
                  <input type="checkbox" checked={treatmentsForm.draft.medication.rightsConfirmed} onChange={(e) => updateMedication({ rightsConfirmed: e.target.checked })} className="mt-1 h-4 w-4" />
                  <span className="text-sm font-bold text-emerald-950">
                    Medication rights reviewed: right patient, medication, dose,
                    route, time, indication, assessment, documentation, education,
                    and evaluation/response.
                  </span>
                </label>
                <label className="flex items-center gap-3 text-sm font-bold text-slate-800">
                  <input type="checkbox" checked={treatmentsForm.draft.medication.controlled} onChange={(e) => updateMedication({ controlled: e.target.checked })} className="h-4 w-4" />
                  Controlled medication
                </label>
                {treatmentsForm.draft.medication.controlled && (
                  <div className="rounded-xl border border-violet-300 bg-violet-50 p-4">
                    <h4 className="font-black text-violet-950">Controlled-medication reconciliation and waste</h4>
                    <div className="mt-3 grid gap-4 md:grid-cols-3">
                      <label className={labelClass}>Starting quantity<input value={treatmentsForm.draft.medication.startingQuantity} onChange={(e) => updateMedication({ startingQuantity: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                      <label className={labelClass}>Amount wasted<input value={treatmentsForm.draft.medication.wastedQuantity} onChange={(e) => updateMedication({ wastedQuantity: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                      <label className={labelClass}>Amount remaining<input value={treatmentsForm.draft.medication.remainingQuantity} onChange={(e) => updateMedication({ remainingQuantity: e.target.value })} inputMode="decimal" className={inputClass} /></label>
                      <label className={labelClass}>Waste reason<select value={treatmentsForm.draft.medication.wasteReason} onChange={(e) => updateMedication({ wasteReason: e.target.value })} className={inputClass}><option value="">Select</option><option>Partial vial after administration</option><option>Prepared but not administered</option><option>Accidental loss / breakage</option><option>Other</option></select></label>
                      <label className={labelClass}>Clinician signature<input value={treatmentsForm.draft.medication.clinicianSignature} onChange={(e) => updateMedication({ clinicianSignature: e.target.value })} placeholder="Type full legal name" className={inputClass} /></label>
                      <label className={labelClass}>Witness name<input value={treatmentsForm.draft.medication.witnessName} onChange={(e) => updateMedication({ witnessName: e.target.value })} className={inputClass} /></label>
                      <label className={labelClass}>Witness credential<select value={treatmentsForm.draft.medication.witnessCredential} onChange={(e) => updateMedication({ witnessCredential: e.target.value })} className={inputClass}><option value="">Select</option><option>EMT</option><option>Paramedic</option><option>RN</option><option>Physician</option><option>Other medically trained witness</option></select></label>
                      <label className={labelClass}>Witness signature<input value={treatmentsForm.draft.medication.witnessSignature} onChange={(e) => updateMedication({ witnessSignature: e.target.value })} placeholder="Type full legal name" className={inputClass} /></label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isProcedure && treatmentsForm.draft.treatment && (
              <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50 p-4">
                <h4 className="font-black text-teal-950">Procedure details</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                  <label className={labelClass}>Site<input value={treatmentsForm.draft.procedure.site} onChange={(e) => updateProcedure({ site: e.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Side<select value={treatmentsForm.draft.procedure.side} onChange={(e) => updateProcedure({ side: e.target.value })} className={inputClass}><option value="">Select</option><option>Left</option><option>Right</option><option>Bilateral</option><option>Midline / N/A</option></select></label>
                  <label className={labelClass}>Attempts<input value={treatmentsForm.draft.procedure.attempts} onChange={(e) => updateProcedure({ attempts: e.target.value })} inputMode="numeric" className={inputClass} /></label>
                  <label className={labelClass}>Outcome<select value={treatmentsForm.draft.procedure.successful} onChange={(e) => updateProcedure({ successful: e.target.value })} className={inputClass}><option value="">Select</option><option>Successful</option><option>Unsuccessful</option><option>Partial / ongoing</option><option>Not applicable</option></select></label>
                  <label className={labelClass}>Verification<select value={treatmentsForm.draft.procedure.verification} onChange={(e) => updateProcedure({ verification: e.target.value, verificationTime: e.target.value ? toLocalTreatmentTime() : '' })} className={inputClass}><option value="">Pending / not documented</option><option>Bilateral lung sounds and no epigastric sounds</option><option>Waveform capnography confirmed</option><option>Distal CMS verified before and after</option><option>Bleeding controlled</option><option>Electrical and mechanical capture confirmed</option><option>Patency / placement confirmed</option><option>Post-treatment rhythm documented</option><option>Other verification completed</option><option>Not applicable</option></select></label>
                </div>
                {treatmentsForm.draft.procedure.verificationRequired &&
                  !treatmentsForm.draft.procedure.verification && (
                    <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-900">
                      This procedure requires post-procedure verification. ACI will
                      keep a reminder active until verification is documented.
                    </p>
                  )}
              </div>
            )}

            {isBaseContact && (
              <div className="mt-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
                <h4 className="font-black text-purple-950">Base hospital contact</h4>
                <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <label className={labelClass}>Hospital contacted<input value={treatmentsForm.draft.baseContact.hospital} onChange={(e) => updateBaseContact({ hospital: e.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Reason<select value={treatmentsForm.draft.baseContact.reason} onChange={(e) => updateBaseContact({ reason: e.target.value })} className={inputClass}><option value="">Select</option><option>Protocol change</option><option>Medication / treatment order</option><option>Destination consultation</option><option>Patient refusal / high-risk disposition</option><option>Other consultation</option></select></label>
                  <label className={labelClass}>Contact method<select value={treatmentsForm.draft.baseContact.contactMethod} onChange={(e) => updateBaseContact({ contactMethod: e.target.value })} className={inputClass}><option value="">Select</option><option>Radio</option><option>Telephone</option><option>Telemedicine</option><option>In person</option><option>Contact unsuccessful</option></select></label>
                  <label className={labelClass}>Physician / MICN<input value={treatmentsForm.draft.baseContact.contactedPerson} onChange={(e) => updateBaseContact({ contactedPerson: e.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Orders requested<input value={treatmentsForm.draft.baseContact.ordersRequested} onChange={(e) => updateBaseContact({ ordersRequested: e.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Orders received<input value={treatmentsForm.draft.baseContact.ordersReceived} onChange={(e) => updateBaseContact({ ordersReceived: e.target.value })} className={inputClass} /></label>
                  <label className={labelClass}>Read-back confirmed?<select value={treatmentsForm.draft.baseContact.readBackConfirmed} onChange={(e) => updateBaseContact({ readBackConfirmed: e.target.value })} className={inputClass}><option value="">Select</option><option>Yes</option><option>No</option><option>Not applicable</option></select></label>
                  <label className={labelClass}>Protocol change authorized?<select value={treatmentsForm.draft.baseContact.protocolChangeAuthorized} onChange={(e) => updateBaseContact({ protocolChangeAuthorized: e.target.value })} className={inputClass}><option value="">Select</option><option>Yes</option><option>No</option><option>Not requested</option></select></label>
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Complications
                <select value={treatmentsForm.draft.complications} onChange={(e) => updateDraft({ complications: e.target.value })} className={inputClass}>
                  <option>None</option><option>Adverse reaction</option><option>Infiltration / extravasation</option><option>Airway complication</option><option>Equipment complication</option><option>Other</option>
                </select>
              </label>
              <label className={labelClass}>
                Treatment note
                <textarea value={treatmentsForm.draft.notes} onChange={(e) => updateDraft({ notes: e.target.value })} rows={2} className={inputClass} />
              </label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setEntryOpen(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700">Cancel</button>
              <button type="button" disabled={saveDisabled || (doseExceeded && !treatmentsForm.draft.medication.doseVarianceReason)} onClick={saveTreatment} className="rounded-lg bg-indigo-700 px-5 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                Save Treatment
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Chronological care record</p>
            <h3 className="text-xl font-black text-slate-900">Treatment Timeline</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
            {treatmentsForm.records.length} documented · {alerts.length} reminders
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {treatmentsForm.records.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No treatments documented yet.
            </p>
          ) : (
            [...treatmentsForm.records]
              .sort((a, b) => a.performedAt.localeCompare(b.performedAt))
              .map((record) => {
                const expanded = expandedRecords.includes(record.id);
                const protocol = treatmentsForm.protocols.find(
                  (item) => item.id === record.protocolId,
                );
                return (
                  <article key={record.id} className={`overflow-hidden rounded-xl border ${statusStyle(record)}`}>
                    <button type="button" onClick={() => setExpandedRecords((current) => current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id])} className="flex w-full items-start justify-between gap-4 p-4 text-left">
                      <div>
                        <div className="font-black">{formatTreatmentTime(record.performedAt)} — {record.treatment}</div>
                        <div className="mt-1 text-xs font-bold opacity-80">
                          {record.kind === 'Medication' ? `${record.medication.dose} ${record.medication.unit} ${record.medication.route} · ` : ''}
                          {record.status} · {record.performedBy}
                        </div>
                        {protocol && <div className="mt-1 text-xs opacity-75">{protocol.name}</div>}
                      </div>
                      <span className="font-black">{expanded ? '▲' : '▼'}</span>
                    </button>
                    {expanded && (
                      <div className="border-t border-current/15 bg-white/60 p-4 text-sm">
                        <div className="grid gap-3 md:grid-cols-3">
                          <div><span className="font-black">Indication:</span> {record.indication || 'Not documented'}</div>
                          <div><span className="font-black">Response:</span> {record.response || 'Pending'}</div>
                          <div><span className="font-black">Complications:</span> {record.complications}</div>
                          {record.procedure.verificationRequired && <div><span className="font-black">Verification:</span> {record.procedure.verification || 'Pending'}</div>}
                          {record.notes && <div className="md:col-span-2"><span className="font-black">Note:</span> {record.notes}</div>}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button type="button" onClick={() => removeRecord(record.id)} className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-black text-red-700">Delete entry</button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })
          )}
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-900">No treatment pathway</h3>
          <select
            value={treatmentsForm.noTreatmentReason}
            onChange={(event) =>
              setTreatmentsForm((current) => ({
                ...current,
                noTreatmentReason: event.target.value,
              }))
            }
            className={inputClass}
          >
            <option value="">Treatment was provided or decision pending</option>
            <option>Assessment only; no treatment indicated</option>
            <option>Patient refused treatment</option>
            <option>Care provided by another agency</option>
            <option>Treatment completed prior to EMS arrival</option>
            <option>Transport only</option>
            <option>Other</option>
          </select>
        </div>
        <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
          <h3 className="font-black text-slate-900">Treatment Clinical Note</h3>
          <textarea
            value={treatmentsForm.clinicalNote}
            onChange={(event) =>
              setTreatmentsForm((current) => ({
                ...current,
                clinicalNote: event.target.value,
              }))
            }
            rows={4}
            placeholder="Optional context that does not fit the structured treatment fields."
            className={inputClass}
          />
        </div>
      </section>

      {treatmentsForm.records.length > 0 && (
        <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Restock foundation</p>
          <h3 className="font-black text-emerald-950">Suggested supply use</h3>
          <p className="mt-1 text-sm text-emerald-900">
            Review this logic-generated list before sending anything to inventory.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {restockItems.map((item) => (
              <label
                key={item}
                className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-950"
              >
                <input type="checkbox" defaultChecked className="h-4 w-4" />
                1 × {item}
              </label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
