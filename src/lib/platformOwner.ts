export function getPlatformOwnerEmails(): string[] {
  return (process.env.APOLLO_OWNER_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformOwner(email?: string | null): boolean {
  if (!email) return false;
  return getPlatformOwnerEmails().includes(email.trim().toLowerCase());
}
