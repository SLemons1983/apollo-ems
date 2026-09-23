export type ApolloBodyAgeGroup =
  | 'neonate'
  | 'infant'
  | 'toddler'
  | 'preschool'
  | 'child'
  | 'adolescent'
  | 'adult'
  | 'middle-aged'
  | 'senior';

export const apolloBodyAgeGroupLabels: Record<ApolloBodyAgeGroup, string> = {
  neonate: 'Neonate',
  infant: 'Infant',
  toddler: 'Toddler',
  preschool: 'Preschool',
  child: 'Child',
  adolescent: 'Adolescent',
  adult: 'Adult',
  'middle-aged': 'Middle-Aged',
  senior: 'Senior',
};

export type ApolloBodyPatientProfile = {
  ageGroup: ApolloBodyAgeGroup;
  ageGroupLabel: string;
  ageDescription: string;
};

function parseDateOfBirth(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function differenceInDays(start: Date, end: Date) {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.floor((endUtc - startUtc) / 86_400_000);
}

function completedYears(birthDate: Date, referenceDate: Date) {
  let years = referenceDate.getFullYear() - birthDate.getFullYear();
  const anniversary = new Date(
    referenceDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  );
  if (referenceDate < anniversary) years -= 1;
  return years;
}

function completedMonths(birthDate: Date, referenceDate: Date) {
  let months =
    (referenceDate.getFullYear() - birthDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - birthDate.getMonth());
  if (referenceDate.getDate() < birthDate.getDate()) months -= 1;
  return months;
}

export function getApolloBodyPatientProfile(
  dateOfBirth: string,
  referenceDate = new Date(),
): ApolloBodyPatientProfile | null {
  const birthDate = parseDateOfBirth(dateOfBirth);
  if (!birthDate || birthDate > referenceDate) return null;

  const days = differenceInDays(birthDate, referenceDate);
  const months = completedMonths(birthDate, referenceDate);
  const years = completedYears(birthDate, referenceDate);

  let ageGroup: ApolloBodyAgeGroup;
  let ageDescription: string;

  if (days <= 30) {
    ageGroup = 'neonate';
    ageDescription = `${days} day${days === 1 ? '' : 's'}`;
  } else if (months < 12) {
    ageGroup = 'infant';
    ageDescription = `${Math.max(months, 1)} month${months === 1 ? '' : 's'}`;
  } else if (years < 3) {
    ageGroup = 'toddler';
    ageDescription = `${years} year${years === 1 ? '' : 's'}`;
  } else if (years < 6) {
    ageGroup = 'preschool';
    ageDescription = `${years} years`;
  } else if (years < 13) {
    ageGroup = 'child';
    ageDescription = `${years} years`;
  } else if (years < 18) {
    ageGroup = 'adolescent';
    ageDescription = `${years} years`;
  } else if (years < 40) {
    ageGroup = 'adult';
    ageDescription = `${years} years`;
  } else if (years < 60) {
    ageGroup = 'middle-aged';
    ageDescription = `${years} years`;
  } else {
    ageGroup = 'senior';
    ageDescription = `${years} years`;
  }

  return {
    ageGroup,
    ageGroupLabel: apolloBodyAgeGroupLabels[ageGroup],
    ageDescription,
  };
}
