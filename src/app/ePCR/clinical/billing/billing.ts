export type BillingForm = {
  unableToComplete: boolean;
  unableReason: string;
  responsibleParty: string;
  responsiblePartyOther: string;
  insuranceType: string;
  insuranceTypeOther: string;
  insuranceCompany: string;
  memberId: string;
  groupNumber: string;
  subscriberName: string;
  subscriberDateOfBirth: string;
  relationshipToPatient: string;
  relationshipOther: string;
  billingNotes: string;
};

export function createDefaultBillingForm(): BillingForm {
  return {
    unableToComplete: false,
    unableReason: "",
    responsibleParty: "",
    responsiblePartyOther: "",
    insuranceType: "",
    insuranceTypeOther: "",
    insuranceCompany: "",
    memberId: "",
    groupNumber: "",
    subscriberName: "",
    subscriberDateOfBirth: "",
    relationshipToPatient: "",
    relationshipOther: "",
    billingNotes: "",
  };
}

export function mergeBillingWithDefaults(uploaded: unknown): BillingForm {
  if (!uploaded || typeof uploaded !== "object" || Array.isArray(uploaded)) {
    return createDefaultBillingForm();
  }

  return {
    ...createDefaultBillingForm(),
    ...(uploaded as Partial<BillingForm>),
  };
}

export function getBillingProgress(form: BillingForm) {
  if (form.unableToComplete) {
    return { completedFields: 1, totalFields: 1 };
  }

  const completed =
    Boolean(form.responsibleParty) &&
    Boolean(form.insuranceType) &&
    (form.insuranceType === "Self-Pay" ||
      Boolean(form.insuranceCompany) ||
      form.insuranceType === "Other");

  return {
    completedFields: completed ? 1 : 0,
    totalFields: 1,
  };
}
