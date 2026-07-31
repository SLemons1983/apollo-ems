export type ClinicalFactId = string;

export type ClinicalFactSource =
  | 'call'
  | 'patient'
  | 'complaint'
  | 'assessment'
  | 'vitals'
  | 'treatments'
  | 'billing'
  | 'narrative'
  | 'signatures';

export type ClinicalFactValueType =
  | 'boolean'
  | 'number'
  | 'string'
  | 'string-list';

export type ClinicalFactValue =
  | boolean
  | number
  | string
  | readonly string[];

/**
 * Stable metadata describing one recognized clinical fact.
 *
 * Definitions never contain patient data. Fact IDs must remain stable because
 * downstream narrative, protocol, QA, billing, and analytics engines will
 * reference them.
 */
export type ClinicalFactDefinition = {
  readonly id: ClinicalFactId;
  readonly label: string;
  readonly source: ClinicalFactSource;
  readonly category: string;
  readonly valueType: ClinicalFactValueType;
  readonly description?: string;
  readonly unit?: string;
};

/**
 * A documented, patient-specific value associated with a registered fact.
 */
export type ClinicalFact = {
  readonly id: ClinicalFactId;
  readonly value: ClinicalFactValue;
  readonly documentedAt?: string;
};

export type ClinicalFactRegistryFilter = {
  readonly source?: ClinicalFactSource;
  readonly category?: string;
  readonly valueType?: ClinicalFactValueType;
};

export type ClinicalFactValidationResult =
  | {
      readonly valid: true;
      readonly definition: ClinicalFactDefinition;
    }
  | {
      readonly valid: false;
      readonly reason: 'unknown-fact' | 'invalid-value';
      readonly message: string;
    };

export type ClinicalFactRegistry = {
  get(id: ClinicalFactId): ClinicalFactDefinition | undefined;
  has(id: ClinicalFactId): boolean;
  list(filter?: ClinicalFactRegistryFilter): ClinicalFactDefinition[];
  validate(fact: ClinicalFact): ClinicalFactValidationResult;
};