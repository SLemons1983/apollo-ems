// ApolloEMS timecard workflow rules.
//
// This module is the single source of truth for how submitted timecard records
// are interpreted. The employee dashboard and the supervisor review screens
// both use it, so they can never disagree about which record is current.
//
// It is deliberately free of React and Supabase so every rule can be covered
// by automated tests with synthetic data.
//
// Audit model: every employee submission, every resubmission and every
// supervisor correction is a separate, permanent row. Supervisor review
// actions (approve / return) update the status of the row they review.
// Nothing here deletes or rewrites history; it only decides which row is
// authoritative for each employee and pay period.

export type TimecardStatus = 'PENDING_SUPERVISOR_REVIEW' | 'APPROVED' | 'RETURNED';

export type TimecardVersionRecord = {
  id: string;
  employeeId: string;
  payPeriodKey: string;
  status: TimecardStatus;
  submittedAt: string;
  versionNumber?: number | null;
  parentTimecardId?: string | null;
  reviewedAt?: string | null;
  submissionAcknowledgement?: { submissionAction?: string } | null;
};

// ---------------------------------------------------------------------------
// Current-version selection
// ---------------------------------------------------------------------------

function timestampValue(value: string | null | undefined): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

/**
 * Version number used for ordering. Records saved before versioning existed
 * (and employee submissions saved before this module) have no version number;
 * they are treated as version 1, matching the database migration that
 * backfilled existing rows with 1.
 */
export function getEffectiveVersionNumber(record: Pick<TimecardVersionRecord, 'versionNumber'>): number {
  const value = Number(record.versionNumber);
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/**
 * Deterministic total ordering, most recent first:
 *   1. submission time (newest first; unparseable times sort last)
 *   2. version number (highest first; missing = 1)
 *   3. record id (stable final tie-break)
 */
export function compareTimecardRecency(a: TimecardVersionRecord, b: TimecardVersionRecord): number {
  const timeDifference = timestampValue(b.submittedAt) - timestampValue(a.submittedAt);
  if (timeDifference !== 0 && !Number.isNaN(timeDifference)) return timeDifference > 0 ? 1 : -1;

  const versionDifference = getEffectiveVersionNumber(b) - getEffectiveVersionNumber(a);
  if (versionDifference !== 0) return versionDifference;

  if (a.id === b.id) return 0;
  return a.id < b.id ? 1 : -1;
}

/**
 * Returns the authoritative record from a set of records for ONE employee and
 * ONE pay period.
 *
 * A record that another record explicitly replaced (it is that record's
 * parent) is never current, regardless of device clocks. Among the remaining
 * records the most recent by compareTimecardRecency wins. Historical records
 * without lineage fall back to time ordering.
 */
export function selectCurrentTimecard<T extends TimecardVersionRecord>(records: readonly T[]): T | null {
  if (records.length === 0) return null;

  const ids = new Set(records.map((record) => record.id));
  const replacedIds = new Set(
    records
      .map((record) => record.parentTimecardId)
      .filter((parentId): parentId is string => Boolean(parentId) && ids.has(parentId as string)),
  );

  const candidates = records.filter((record) => !replacedIds.has(record.id));
  const pool = candidates.length > 0 ? candidates : records;

  return [...pool].sort(compareTimecardRecency)[0] ?? null;
}

function groupKey(record: TimecardVersionRecord): string {
  return `${record.employeeId}\u0000${record.payPeriodKey}`;
}

/** Current record for every employee/pay-period pair in the list. */
export function selectCurrentTimecards<T extends TimecardVersionRecord>(records: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  records.forEach((record) => {
    const key = groupKey(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  });

  return [...groups.values()]
    .map((group) => selectCurrentTimecard(group))
    .filter((record): record is T => record !== null);
}

// ---------------------------------------------------------------------------
// Employee view
// ---------------------------------------------------------------------------

export type EmployeeTimecardState<T extends TimecardVersionRecord> = {
  current: T | null;
  /** Current record while it is with the supervisor or approved (locks editing). */
  lockedRecord: T | null;
  /** Current record when the supervisor returned it for correction. */
  returnedRecord: T | null;
};

export function getEmployeeTimecardState<T extends TimecardVersionRecord>(
  records: readonly T[],
  employeeId: string,
  payPeriodKey: string,
): EmployeeTimecardState<T> {
  const current = selectCurrentTimecard(
    records.filter((record) => record.employeeId === employeeId && record.payPeriodKey === payPeriodKey),
  );

  return {
    current,
    lockedRecord: current && current.status !== 'RETURNED' ? current : null,
    returnedRecord: current?.status === 'RETURNED' ? current : null,
  };
}

/** Every pay period in which the employee's current record is RETURNED. */
export function getReturnedTimecardsForEmployee<T extends TimecardVersionRecord>(
  records: readonly T[],
  employeeId: string,
): T[] {
  return selectCurrentTimecards(records.filter((record) => record.employeeId === employeeId))
    .filter((record) => record.status === 'RETURNED')
    .sort((a, b) => a.payPeriodKey.localeCompare(b.payPeriodKey));
}

export type TimecardEditabilityInput = {
  /** Current or immediately preceding pay period (existing business rule). */
  isWithinEmployeeEditWindow: boolean;
  /** A payroll submission record exists for the period. */
  isPayrollFinalized: boolean;
  current: TimecardVersionRecord | null;
};

/**
 * Whether the employee may edit and submit the selected pay period.
 *
 * - Finalized payroll: locked. A supervisor must reopen payroll first
 *   (existing supervisor-controlled correction process).
 * - Pending review or approved: locked until the supervisor returns it.
 * - Returned: editable even outside the normal two-period window, because a
 *   supervisor explicitly asked for the correction. Without this, a card
 *   returned after the window closed could never be resubmitted.
 * - Not yet submitted: editable within the normal window.
 */
export function isTimecardPeriodEditable(input: TimecardEditabilityInput): boolean {
  if (input.isPayrollFinalized) return false;
  if (input.current?.status === 'PENDING_SUPERVISOR_REVIEW' || input.current?.status === 'APPROVED') {
    return false;
  }
  if (input.current?.status === 'RETURNED') return true;
  return input.isWithinEmployeeEditWindow;
}

export type SubmissionBlockReason =
  | 'NO_EMPLOYEE_PROFILE'
  | 'ALREADY_SUBMITTED'
  | 'ALREADY_APPROVED'
  | 'PAYROLL_FINALIZED'
  | 'PERIOD_CLOSED'
  | 'SUBMISSION_IN_PROGRESS';

export type SubmissionEligibility =
  | { allowed: true; isResubmission: boolean }
  | { allowed: false; reason: SubmissionBlockReason; message: string };

export function evaluateEmployeeSubmission(input: {
  hasEmployeeProfile: boolean;
  isSubmitting: boolean;
  isWithinEmployeeEditWindow: boolean;
  isPayrollFinalized: boolean;
  current: TimecardVersionRecord | null;
}): SubmissionEligibility {
  if (!input.hasEmployeeProfile) {
    return {
      allowed: false,
      reason: 'NO_EMPLOYEE_PROFILE',
      message:
        'Action Required: Apollo could not link your login to an employee profile. Please contact a supervisor before submitting payroll.',
    };
  }

  if (input.isSubmitting) {
    return { allowed: false, reason: 'SUBMISSION_IN_PROGRESS', message: 'Your timecard is already being submitted.' };
  }

  if (input.current?.status === 'PENDING_SUPERVISOR_REVIEW') {
    return {
      allowed: false,
      reason: 'ALREADY_SUBMITTED',
      message: 'This timecard has already been submitted for supervisor review.',
    };
  }

  if (input.current?.status === 'APPROVED') {
    return {
      allowed: false,
      reason: 'ALREADY_APPROVED',
      message: 'This timecard has already been approved. Contact a supervisor if a correction is needed.',
    };
  }

  if (input.isPayrollFinalized) {
    return {
      allowed: false,
      reason: 'PAYROLL_FINALIZED',
      message:
        'Payroll for this pay period has been finalized, so the timecard cannot be submitted. Contact a supervisor: they can reopen payroll for this period so you can submit.',
    };
  }

  if (!isTimecardPeriodEditable(input)) {
    return {
      allowed: false,
      reason: 'PERIOD_CLOSED',
      message: 'This pay period is closed for employee submissions. Contact a supervisor if a correction is needed.',
    };
  }

  return { allowed: true, isResubmission: input.current?.status === 'RETURNED' };
}

// ---------------------------------------------------------------------------
// Version lineage for new records
// ---------------------------------------------------------------------------

export function getNextTimecardVersionNumber(records: readonly TimecardVersionRecord[]): number {
  return records.reduce((max, record) => Math.max(max, getEffectiveVersionNumber(record)), 0) + 1;
}

export type NewVersionFields = {
  versionNumber: number;
  parentTimecardId: string | null;
  versionReason: 'EMPLOYEE_SUBMISSION' | 'EMPLOYEE_RESUBMISSION';
  createdByRole: 'EMPLOYEE';
  createdByEmployeeId: string;
  submissionAction: 'SUBMITTED' | 'RESUBMITTED';
};

/**
 * Lineage fields for a new employee submission. `periodRecords` must be all
 * records for this employee and pay period.
 */
export function getEmployeeSubmissionVersionFields(
  periodRecords: readonly TimecardVersionRecord[],
  employeeId: string,
): NewVersionFields {
  const current = selectCurrentTimecard(periodRecords);
  const isResubmission = current?.status === 'RETURNED';

  return {
    versionNumber: getNextTimecardVersionNumber(periodRecords),
    parentTimecardId: isResubmission && current ? current.id : null,
    versionReason: isResubmission ? 'EMPLOYEE_RESUBMISSION' : 'EMPLOYEE_SUBMISSION',
    createdByRole: 'EMPLOYEE',
    createdByEmployeeId: employeeId,
    submissionAction: isResubmission ? 'RESUBMITTED' : 'SUBMITTED',
  };
}

// ---------------------------------------------------------------------------
// Supervisor queues, payroll status and approved payroll packet
// ---------------------------------------------------------------------------

export type PayrollTimecardStatus = 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'PENDING_RESUBMISSION' | 'APPROVED';

export function getPayrollStatusForRecord(record: TimecardVersionRecord | null | undefined): PayrollTimecardStatus {
  if (record?.status === 'PENDING_SUPERVISOR_REVIEW') return 'PENDING_REVIEW';
  if (record?.status === 'RETURNED') return 'PENDING_RESUBMISSION';
  if (record?.status === 'APPROVED') return 'APPROVED';
  return 'NOT_SUBMITTED';
}

export type SupersededApproval<T> = {
  employeeId: string;
  /** Most recent approved record, no longer authoritative. */
  approved: T;
  /** Newer authoritative record (pending review or returned). */
  current: T;
};

export type SupervisorTimecardQueues<T> = {
  currentByEmployeeId: Map<string, T>;
  pendingReview: T[];
  resubmitted: T[];
  awaitingEmployeeResubmission: T[];
  /** One record per employee: the current record, only when it is APPROVED. */
  approvedForPayroll: T[];
  /** Employees whose earlier approval was superseded by a newer version. */
  supersededApprovals: SupersededApproval<T>[];
};

function newestFirstBy<T extends TimecardVersionRecord>(pick: (record: T) => string | null | undefined) {
  return (a: T, b: T) => {
    const difference = timestampValue(pick(b)) - timestampValue(pick(a));
    if (difference !== 0 && !Number.isNaN(difference)) return difference > 0 ? 1 : -1;
    return compareTimecardRecency(a, b);
  };
}

/** `periodRecords` must all belong to the same pay period. */
export function buildSupervisorTimecardQueues<T extends TimecardVersionRecord>(
  periodRecords: readonly T[],
): SupervisorTimecardQueues<T> {
  const currentRecords = selectCurrentTimecards(periodRecords);
  const currentByEmployeeId = new Map(currentRecords.map((record) => [record.employeeId, record]));
  const bySubmitted = newestFirstBy<T>((record) => record.submittedAt);
  const byReviewed = newestFirstBy<T>((record) => record.reviewedAt ?? record.submittedAt);

  const isResubmission = (record: T) => record.submissionAcknowledgement?.submissionAction === 'RESUBMITTED';
  const pending = currentRecords.filter((record) => record.status === 'PENDING_SUPERVISOR_REVIEW');

  const supersededApprovals: SupersededApproval<T>[] = [];
  currentRecords.forEach((current) => {
    if (current.status === 'APPROVED') return;
    const approved = periodRecords
      .filter((record) => record.employeeId === current.employeeId && record.status === 'APPROVED')
      .sort(compareTimecardRecency)[0];
    if (approved) supersededApprovals.push({ employeeId: current.employeeId, approved, current });
  });

  return {
    currentByEmployeeId,
    pendingReview: pending.filter((record) => !isResubmission(record)).sort(bySubmitted),
    resubmitted: pending.filter(isResubmission).sort(bySubmitted),
    awaitingEmployeeResubmission: currentRecords.filter((record) => record.status === 'RETURNED').sort(byReviewed),
    approvedForPayroll: currentRecords.filter((record) => record.status === 'APPROVED').sort(byReviewed),
    supersededApprovals,
  };
}

// ---------------------------------------------------------------------------
// Electronic signature
// ---------------------------------------------------------------------------

export type SignatureProfile = { firstName?: string | null; lastName?: string | null; name?: string | null };

export type SignatureCheck =
  | { valid: true; matchedProfileName: string; method: 'PROFILE_NAME_LETTERS_V2' }
  | { valid: false; reason: 'EMPTY' | 'NO_PROFILE_NAME' | 'MISMATCH'; expectedName: string; message: string };

// Constructed at runtime: the project targets ES2017, which cannot express
// Unicode property escapes in a regex literal. All supported browsers and
// Node versions implement them.
const NON_LETTER_OR_DIGIT = new RegExp('[^\\p{L}\\p{N}]', 'gu');
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Reduces a name to its letters and digits, lower-case, without accents.
 * "José Juárez-López" -> "josejuarezlopez". Only case, accents, spaces and
 * punctuation are ignored; every letter must still match, in order.
 */
export function signatureLetters(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(NON_LETTER_OR_DIGIT, '');
}

/** Accepted (first, last) name pairs from the profile. */
function getProfileNamePairs(profile: SignatureProfile | null | undefined): Array<{ first: string; last: string; label: string }> {
  if (!profile) return [];

  const pairs: Array<{ first: string; last: string; label: string }> = [];
  const first = (profile.firstName ?? '').trim();
  const last = (profile.lastName ?? '').trim();
  if (first && last) pairs.push({ first, last, label: `${first} ${last}` });

  // Apollo display names are "Last, First" when both fields exist.
  const display = (profile.name ?? '').trim();
  const commaIndex = display.indexOf(',');
  if (commaIndex > 0) {
    const displayLast = display.slice(0, commaIndex).trim();
    const displayFirst = display.slice(commaIndex + 1).trim();
    if (displayFirst && displayLast) {
      pairs.push({ first: displayFirst, last: displayLast, label: `${displayFirst} ${displayLast}` });
    }
  }

  // A first AND last name are required. When either is missing, Apollo's
  // display name falls back to the employee ID or "Unnamed Employee", which
  // must never be accepted as a signature.
  return pairs.filter((pair) => signatureLetters(pair.first) && signatureLetters(pair.last));
}

/** The name the employee is asked to type ("First Last"), or '' if none is on file. */
export function getExpectedSignatureName(profile: SignatureProfile | null | undefined): string {
  return getProfileNamePairs(profile)[0]?.label ?? '';
}

/**
 * Validates a typed electronic signature against the AUTHENTICATED employee's
 * own profile. Accepted forms: "First Last" or "Last, First", using the
 * profile's first and last name. Capitalization, accents, spacing and
 * punctuation such as hyphens, periods and apostrophes are ignored; every
 * letter must match, in order. Other people's names, partial names, initials,
 * nicknames, "Last First" without a comma, and employee IDs are rejected.
 */
export function checkTimecardSignature(
  typed: string | null | undefined,
  profile: SignatureProfile | null | undefined,
): SignatureCheck {
  const pairs = getProfileNamePairs(profile);
  const expectedName = pairs[0]?.label ?? '';

  if (pairs.length === 0) {
    return {
      valid: false,
      reason: 'NO_PROFILE_NAME',
      expectedName: '',
      message:
        'Your Apollo profile is missing a first or last name, so the timecard cannot be signed. Please ask a supervisor to update your profile.',
    };
  }

  const raw = (typed ?? '').trim();
  const typedLetters = signatureLetters(raw);

  if (!typedLetters) {
    return {
      valid: false,
      reason: 'EMPTY',
      expectedName,
      message: `Type your full name to sign: ${expectedName}.`,
    };
  }

  const commaIndex = raw.indexOf(',');
  const typedBeforeComma = commaIndex > 0 ? signatureLetters(raw.slice(0, commaIndex)) : '';
  const typedAfterComma = commaIndex > 0 ? signatureLetters(raw.slice(commaIndex + 1)) : '';

  for (const pair of pairs) {
    const firstLetters = signatureLetters(pair.first);
    const lastLetters = signatureLetters(pair.last);
    const firstLastMatch = commaIndex < 0 && typedLetters === firstLetters + lastLetters;
    const lastCommaFirstMatch =
      commaIndex > 0 && typedBeforeComma === lastLetters && typedAfterComma === firstLetters;

    if (firstLastMatch || lastCommaFirstMatch) {
      return { valid: true, matchedProfileName: pair.label, method: 'PROFILE_NAME_LETTERS_V2' };
    }
  }

  return {
    valid: false,
    reason: 'MISMATCH',
    expectedName,
    message: `The signature must match the name on your Apollo profile: ${expectedName}. Capitalization, accents and hyphens do not matter. If your profile name is wrong, ask a supervisor to correct it.`,
  };
}

// ---------------------------------------------------------------------------
// Restoring a returned timecard into editable rows
// ---------------------------------------------------------------------------

export function getEditableRowPrefix(employeeId: string, payPeriodKey: string): string {
  return `${employeeId}-${payPeriodKey}-`;
}

/** Identifier of the permanent marker row recording that a returned card was restored. */
export function getRestoreMarkerRowId(employeeId: string, payPeriodKey: string, timecardId: string): string {
  return `${getEditableRowPrefix(employeeId, payPeriodKey)}restore-marker-${timecardId}`;
}

const SEGMENT_SUFFIX = /-segment-(\d+)$/;

/**
 * Chooses visible editable-row keys for the shift groups of a returned
 * timecard. The dashboard only displays a date's base row
 * ("<prefix><date>") and its segment rows ("<prefix><date>-segment-<n>").
 * Groups whose original key already has one of those forms keep it; any other
 * group is moved to the base row, or to the next free segment row, so it is
 * displayed, editable and included in the resubmission.
 *
 * Returns a map of group key -> editable row key.
 */
export function assignRestoredRowKeys(
  groups: ReadonlyArray<{ groupKey: string; dateKey: string }>,
  prefix: string,
): Map<string, string> {
  const assigned = new Map<string, string>();
  const used = new Set<string>();

  const isCanonical = (groupKey: string, dateKey: string) => {
    const base = `${prefix}${dateKey}`;
    return groupKey === base || (groupKey.startsWith(`${base}-segment-`) && SEGMENT_SUFFIX.test(groupKey));
  };

  groups.forEach(({ groupKey, dateKey }) => {
    if (isCanonical(groupKey, dateKey) && !used.has(groupKey)) {
      assigned.set(groupKey, groupKey);
      used.add(groupKey);
    }
  });

  groups.forEach(({ groupKey, dateKey }) => {
    if (assigned.has(groupKey)) return;
    const base = `${prefix}${dateKey}`;
    if (!used.has(base)) {
      assigned.set(groupKey, base);
      used.add(base);
      return;
    }
    let nextIndex = 1;
    used.forEach((key) => {
      if (!key.startsWith(`${base}-segment-`)) return;
      const match = key.match(SEGMENT_SUFFIX);
      if (match) nextIndex = Math.max(nextIndex, Number(match[1]) + 1);
    });
    const segmentKey = `${base}-segment-${nextIndex}`;
    assigned.set(groupKey, segmentKey);
    used.add(segmentKey);
  });

  return assigned;
}

/**
 * Whether the returned timecard's rows should be copied into the editable
 * table now. They are copied exactly once per returned record: the restore is
 * recorded by a permanent marker row, so corrections the employee saves later
 * survive navigation, reloads and pay-period switching.
 */
/**
 * True when saved editable rows changed after the supervisor returned the
 * card. Those rows already hold either the returned values (written by an
 * earlier restore) or the employee's corrections, so they must not be
 * overwritten. This protects timecards that were already returned before the
 * restore marker existed.
 */
export function savedRowsChangedAfterReturn(
  latestSavedRowUpdatedAt: string | null | undefined,
  returnedReviewedAt: string | null | undefined,
): boolean {
  const saved = timestampValue(latestSavedRowUpdatedAt);
  const reviewed = timestampValue(returnedReviewedAt);
  return Number.isFinite(saved) && Number.isFinite(reviewed) && saved > reviewed;
}

export type RestoreAction = 'NONE' | 'MARKER_ONLY' | 'COPY_ROWS_AND_MARKER';

/**
 * Final restore decision, made from a FRESH database read taken immediately
 * before writing (not from rows loaded when the page opened), so another
 * device's restore or corrections are always seen.
 *
 * - Marker already present: write nothing.
 * - Saved rows changed after the return: they already hold the returned
 *   values or the employee's corrections, so only record the marker.
 * - Otherwise: copy the returned rows and record the marker in one write.
 */
export function decideReturnedTimecardRestore(input: {
  markerExists: boolean;
  latestSavedRowUpdatedAt: string | null | undefined;
  returnedReviewedAt: string | null | undefined;
}): RestoreAction {
  if (input.markerExists) return 'NONE';
  if (savedRowsChangedAfterReturn(input.latestSavedRowUpdatedAt, input.returnedReviewedAt)) return 'MARKER_ONLY';
  return 'COPY_ROWS_AND_MARKER';
}

export function shouldRestoreReturnedTimecard(input: {
  returnedTimecardId: string | null;
  isPeriodEditable: boolean;
  /** Saved rows (and markers) for the period have finished loading. */
  periodRowsLoaded: boolean;
  restoredTimecardIds: ReadonlySet<string>;
}): boolean {
  return Boolean(
    input.returnedTimecardId &&
      input.isPeriodEditable &&
      input.periodRowsLoaded &&
      !input.restoredTimecardIds.has(input.returnedTimecardId),
  );
}
