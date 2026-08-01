export const AGENCY_STATUSES = ['ONBOARDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE'] as const;
export const AGENCY_TYPES = ['AMBULANCE', 'FIRE_EMS', 'FIRE_DEPARTMENT', 'EDUCATION', 'OTHER'] as const;
export const SERVICE_LEVELS = ['BLS', 'ALS', 'BLS_ALS', 'CCT', 'NON_TRANSPORT', 'EDUCATION'] as const;
export const SUBSCRIPTION_STATUSES = ['BETA', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'COMPLIMENTARY', 'CANCELED'] as const;
export const APOLLO_MODULES = ['Scheduling', 'Timecards & Payroll', 'Employee Records', 'Certifications', 'Supervisor Tools', 'Dispatch', 'Incident Reports', 'Unit Inspections', 'Inventory', 'Fleet', 'SMS Notifications', 'ePCR Beta'] as const;

export type AgencyStatus = typeof AGENCY_STATUSES[number];
export type AgencyType = typeof AGENCY_TYPES[number];
export type ServiceLevel = typeof SERVICE_LEVELS[number];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUSES[number];

export type AgencyRecord = {
  id: string; name: string; legal_name: string | null; slug: string;
  status: AgencyStatus; agency_type: AgencyType; service_level: ServiceLevel;
  primary_contact_name: string; primary_contact_email: string; primary_contact_phone: string | null;
  website: string | null; enabled_modules: string[]; subscription_status: SubscriptionStatus;
  is_beta: boolean; internal_notes: string | null; created_at: string; updated_at: string;
};

export type AgencyInput = Omit<AgencyRecord, 'id' | 'created_at' | 'updated_at'>;

export function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 63);
}

export function validateAgencyInput(value: unknown): { data?: AgencyInput; error?: string } {
  if (!value || typeof value !== 'object') return { error: 'Agency details are required.' };
  const input = value as Record<string, unknown>;
  const text = (key: string, max: number) => typeof input[key] === 'string' ? input[key].trim().slice(0, max) : '';
  const nullable = (key: string, max: number) => text(key, max) || null;
  const name = text('name', 160), slug = normalizeSlug(text('slug', 80));
  const email = text('primary_contact_email', 200).toLowerCase();
  if (!name) return { error: 'Agency name is required.' };
  if (!slug || slug.length < 2) return { error: 'A valid agency slug is required.' };
  if (!text('primary_contact_name', 160)) return { error: 'Primary contact name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'A valid primary contact email is required.' };
  const status = input.status as AgencyStatus, agencyType = input.agency_type as AgencyType;
  const serviceLevel = input.service_level as ServiceLevel, subscriptionStatus = input.subscription_status as SubscriptionStatus;
  if (!AGENCY_STATUSES.includes(status)) return { error: 'Select a valid agency status.' };
  if (!AGENCY_TYPES.includes(agencyType)) return { error: 'Select a valid agency type.' };
  if (!SERVICE_LEVELS.includes(serviceLevel)) return { error: 'Select a valid service level.' };
  if (!SUBSCRIPTION_STATUSES.includes(subscriptionStatus)) return { error: 'Select a valid subscription status.' };
  const enabledModules = Array.isArray(input.enabled_modules) ? input.enabled_modules.filter((item): item is string => typeof item === 'string' && APOLLO_MODULES.includes(item as typeof APOLLO_MODULES[number])) : [];
  return { data: { name, legal_name: nullable('legal_name', 200), slug, status, agency_type: agencyType, service_level: serviceLevel, primary_contact_name: text('primary_contact_name', 160), primary_contact_email: email, primary_contact_phone: nullable('primary_contact_phone', 40), website: nullable('website', 240), enabled_modules: [...new Set(enabledModules)], subscription_status: subscriptionStatus, is_beta: input.is_beta === true, internal_notes: nullable('internal_notes', 4000) } };
}
