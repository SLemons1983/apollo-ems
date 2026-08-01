export const EPCR_ROLES = ['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER', 'CLINICIAN'] as const;
export type EpcrRole = typeof EPCR_ROLES[number];

export type EpcrMembership = {
  id: string; agency_id: string; auth_user_id: string | null; first_name: string;
  last_name: string; email: string; username: string; role: EpcrRole;
  status: 'INVITED' | 'ACTIVE' | 'INACTIVE' | 'REVOKED'; invited_at: string;
  accepted_at: string | null; last_invited_at: string; revoked_at: string | null;
  revoked_by: string | null;
};

export function usernameBase(firstName: string, lastName: string) {
  const initial = firstName.trim().toLowerCase().replace(/[^a-z]/g, '').slice(0, 1);
  const surname = lastName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${initial}${surname}`.slice(0, 28);
}

export function validateInvite(value: unknown) {
  if (!value || typeof value !== 'object') return { error: 'Invitation details are required.' };
  const input = value as Record<string, unknown>;
  const first_name = String(input.first_name ?? '').trim().slice(0, 80);
  const last_name = String(input.last_name ?? '').trim().slice(0, 80);
  const email = String(input.email ?? '').trim().toLowerCase().slice(0, 200);
  const role = input.role as EpcrRole;
  if (!first_name || !last_name) return { error: 'First and last name are required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'A valid email is required.' };
  if (!EPCR_ROLES.includes(role)) return { error: 'Select a valid ePCR role.' };
  const base = usernameBase(first_name, last_name);
  if (base.length < 2) return { error: 'Unable to generate a username from that name.' };
  return { data: { first_name, last_name, email, role, base } };
}
