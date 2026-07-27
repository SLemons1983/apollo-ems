"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BillingForm } from "../clinical/billing/billing";

type BillingSectionProps = {
  billingForm: BillingForm;
  setBillingForm: Dispatch<SetStateAction<BillingForm>>;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200";
const labelClass = "text-sm font-semibold text-slate-700";

export default function BillingSection({
  billingForm,
  setBillingForm,
}: BillingSectionProps) {
  function updateField<K extends keyof BillingForm>(
    field: K,
    value: BillingForm[K],
  ) {
    setBillingForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Billing Information</h3>
          <p className="text-sm text-slate-600">
            Document the available payer and subscriber information.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            updateField("unableToComplete", !billingForm.unableToComplete)
          }
          className={`rounded-lg border px-4 py-2 text-sm font-bold transition ${
            billingForm.unableToComplete
              ? "border-amber-600 bg-amber-600 text-white"
              : "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
          }`}
        >
          {billingForm.unableToComplete
            ? "Unable to Complete ✓"
            : "Unable to Complete"}
        </button>
      </div>

      {billingForm.unableToComplete ? (
        <label className={labelClass}>
          Reason (optional)
          <textarea
            value={billingForm.unableReason}
            onChange={(event) =>
              updateField("unableReason", event.target.value)
            }
            rows={3}
            placeholder="Example: Patient unidentified or condition prevented collection."
            className={inputClass}
          />
        </label>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className={labelClass}>
              Responsible Party
              <select
                value={billingForm.responsibleParty}
                onChange={(event) =>
                  updateField("responsibleParty", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Select responsible party</option>
                <option>Patient</option>
                <option>Parent / Guardian</option>
                <option>Spouse</option>
                <option>Other</option>
              </select>
            </label>
            {billingForm.responsibleParty === "Other" && (
              <label className={labelClass}>
                Other Responsible Party
                <input
                  value={billingForm.responsiblePartyOther}
                  onChange={(event) =>
                    updateField("responsiblePartyOther", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            )}
            <label className={labelClass}>
              Insurance Type
              <select
                value={billingForm.insuranceType}
                onChange={(event) =>
                  updateField("insuranceType", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Select insurance type</option>
                <option>Private Insurance</option>
                <option>Medicare</option>
                <option>Medicaid / Medi-Cal</option>
                <option>Workers&apos; Compensation</option>
                <option>Self-Pay</option>
                <option>Other</option>
              </select>
            </label>
            {billingForm.insuranceType === "Other" && (
              <label className={labelClass}>
                Other Insurance Type
                <input
                  value={billingForm.insuranceTypeOther}
                  onChange={(event) =>
                    updateField("insuranceTypeOther", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            )}
          </div>

          {billingForm.insuranceType !== "Self-Pay" && (
            <div className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
              <label className={labelClass}>
                Insurance Company
                <input
                  value={billingForm.insuranceCompany}
                  onChange={(event) =>
                    updateField("insuranceCompany", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Member / Policy ID
                <input
                  value={billingForm.memberId}
                  onChange={(event) =>
                    updateField("memberId", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Group Number
                <input
                  value={billingForm.groupNumber}
                  onChange={(event) =>
                    updateField("groupNumber", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            </div>
          )}

          <div className="grid gap-4 rounded-xl border border-slate-200 p-4 md:grid-cols-3">
            <label className={labelClass}>
              Subscriber Name
              <input
                value={billingForm.subscriberName}
                onChange={(event) =>
                  updateField("subscriberName", event.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Subscriber Date of Birth
              <input
                type="date"
                value={billingForm.subscriberDateOfBirth}
                onChange={(event) =>
                  updateField("subscriberDateOfBirth", event.target.value)
                }
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Relationship to Patient
              <select
                value={billingForm.relationshipToPatient}
                onChange={(event) =>
                  updateField("relationshipToPatient", event.target.value)
                }
                className={inputClass}
              >
                <option value="">Select relationship</option>
                <option>Self</option>
                <option>Parent / Guardian</option>
                <option>Spouse</option>
                <option>Other</option>
              </select>
            </label>
            {billingForm.relationshipToPatient === "Other" && (
              <label className={labelClass}>
                Other Relationship
                <input
                  value={billingForm.relationshipOther}
                  onChange={(event) =>
                    updateField("relationshipOther", event.target.value)
                  }
                  className={inputClass}
                />
              </label>
            )}
          </div>

          <label className={labelClass}>
            Billing Notes
            <textarea
              value={billingForm.billingNotes}
              onChange={(event) =>
                updateField("billingNotes", event.target.value)
              }
              rows={3}
              className={inputClass}
            />
          </label>
        </>
      )}
    </div>
  );
}
