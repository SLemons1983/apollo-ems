// Outside production, ApolloEMS must never contact real people or live
// systems. These helpers are pure so they can be unit tested.

/**
 * Keeps only recipients on the non-production allowlist. Entries are full
 * addresses ("qa@example.test") or domains ("@example.test"). An empty
 * allowlist blocks every recipient.
 */
export function filterNonProductionRecipients(recipients: string[], allowlist: string | undefined): string[] {
  const entries = (allowlist ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return recipients.filter((recipient) => {
    const address = recipient.trim().toLowerCase();
    return entries.some((entry) => (entry.startsWith('@') ? address.endsWith(entry) : address === entry));
  });
}
