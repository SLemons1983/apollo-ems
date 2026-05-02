'use client';

import React, { useEffect, useMemo, useState } from 'react';

type CertificationRecord = {
  driversLicense: string;
  ambulanceDriversLicense: string;
  ahaBlsCpr: string;
  medicalExaminerCertificate: string;
  annualTbScreen: string;
  californiaParamedicLicense: string;
  ccemsaParamedicLicense: string;
  acls: string;
  pals: string;
  californiaEmtLicense: string;
  ccemsaEmtLicense: string;
};

type EmployeeProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  scope: string;
  jobTitle: string;
  status: string;
  employeeType: string;
  seniorityLabel: string;
  certifications?: CertificationRecord;
  notes: string;
};

type EmployeeFormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  scope: string;
  jobTitle: string;
  status: string;
  employeeType: string;
  seniorityLabel: string;
  certifications: CertificationRecord;
  notes: string;
};

type ScheduleData = Record<string, {
  standard?: Record<string, unknown>;
  extras?: unknown[];
}>;

const STORAGE_KEY = 'apollo-employee-profiles-v2';
const SCHEDULE_STORAGE_KEY = 'apollo-schedule-page-v6';

const EMPTY_CERTIFICATIONS: CertificationRecord = {
  driversLicense: '',
  ambulanceDriversLicense: '',
  ahaBlsCpr: '',
  medicalExaminerCertificate: '',
  annualTbScreen: '',
  californiaParamedicLicense: '',
  ccemsaParamedicLicense: '',
  acls: '',
  pals: '',
  californiaEmtLicense: '',
  ccemsaEmtLicense: '',
};

const INITIAL_EMPLOYEES: EmployeeProfile[] = [
  {
    "id": "emp-001",
    "firstName": "Russ",
    "lastName": "Richardson",
    "email": "russ@sscems.org",
    "phone": "(559) 903-7441",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "GM",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-002",
    "firstName": "Adrian",
    "lastName": "Aguilera",
    "email": "adrian.aguilera@sscems.org",
    "phone": "(818) 384-8880",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-003",
    "firstName": "Bransen",
    "lastName": "Berry",
    "email": "bransen.berry@sscems.org",
    "phone": "(559) 305-8476",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-004",
    "firstName": "Daniel",
    "lastName": "Deblauw",
    "email": "daniel.deblauw@sscems.org",
    "phone": "(707) 637-6576",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-005",
    "firstName": "Ramses",
    "lastName": "Farias",
    "email": "ramses.farias@sscems.org",
    "phone": "(559) 308-5610",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-006",
    "firstName": "Heaven",
    "lastName": "Fernandez",
    "email": "heaven.fernandez@sscems.org",
    "phone": "(559) 837-3112",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-007",
    "firstName": "Michael",
    "lastName": "Gann",
    "email": "michael.gann@sscems.org",
    "phone": "(559) 862-8912",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-008",
    "firstName": "Lauryn",
    "lastName": "Godwin",
    "email": "lauryn.godwin@sscems.org",
    "phone": "(559) 365-5762",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-009",
    "firstName": "Carlos",
    "lastName": "Juarez-Lopez",
    "email": "carlos.juarez-lopez@sscems.org",
    "phone": "(559) 430-6224",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-010",
    "firstName": "Steve",
    "lastName": "Lemons",
    "email": "steve@sscems.org",
    "phone": "(559) 614-8610",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "Admin Sup",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-011",
    "firstName": "Jack",
    "lastName": "Lewis",
    "email": "jack.lewis@sscems.org",
    "phone": "(559) 672-4364",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-012",
    "firstName": "Ruben",
    "lastName": "Maldonado",
    "email": "ruben.maldonado@sscems.org",
    "phone": "(559) 859-2149",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-013",
    "firstName": "Jeromy",
    "lastName": "McHenry",
    "email": "jeromy.mchenry@sscems.org",
    "phone": "(559) 571-6727",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-014",
    "firstName": "Rudy",
    "lastName": "Mendez",
    "email": "rudy.mendez@sscems.org",
    "phone": "(818) 935-8916",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-015",
    "firstName": "Michael",
    "lastName": "Pasuit",
    "email": "michael.pasuit@sscems.org",
    "phone": "(559) 360-6621",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-016",
    "firstName": "Tomas",
    "lastName": "Renteria",
    "email": "tomas.renteria@sscems.org",
    "phone": "(559) 981-6314",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-017",
    "firstName": "Randi",
    "lastName": "Rios",
    "email": "randi.rios@sscems.org",
    "phone": "(559) 960-0383",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-018",
    "firstName": "Carmelo",
    "lastName": "Rosales",
    "email": "carmelo.rosales@sscems.org",
    "phone": "(559) 801-7181",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-019",
    "firstName": "David",
    "lastName": "Bustamante",
    "email": "david.bustamante@sscems.org",
    "phone": "(559) 618-0852",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-020",
    "firstName": "Ciceroni",
    "lastName": "Colter",
    "email": "colter.ciceroni@sscems.org",
    "phone": "(559) 801-3366",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-021",
    "firstName": "Guillermo",
    "lastName": "Cruz-Gonzalez Jr",
    "email": "guillermo.cruz@sscems.org",
    "phone": "(559) 646-4361",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-022",
    "firstName": "Nick",
    "lastName": "Friesen",
    "email": "Nick.Friesen@sscems.org",
    "phone": "(559) 614-5083",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-023",
    "firstName": "Austin",
    "lastName": "Galvan",
    "email": "austin.galvan@sscems.org",
    "phone": "(559) 207-7000",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-024",
    "firstName": "Jonathan",
    "lastName": "Gonzalez",
    "email": "jonathan.gonzalez@sscems.org",
    "phone": "(559) 590-3373",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-025",
    "firstName": "Gerster",
    "lastName": "Graeme",
    "email": "graeme.gester@sscems.org",
    "phone": "(559) 356-3666",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-026",
    "firstName": "Jose",
    "lastName": "Hernandez",
    "email": "JHernandez@sscems.org",
    "phone": "(559) 305-4893",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Field Sup",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-027",
    "firstName": "Patrick",
    "lastName": "Hescox",
    "email": "patrick@sscems.org",
    "phone": "(559) 304-8206",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-028",
    "firstName": "Benjamin",
    "lastName": "Huckaby",
    "email": "ben@sscems.org",
    "phone": "(559) 512-5911",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Field Sup",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-029",
    "firstName": "Justin",
    "lastName": "Light",
    "email": "justin.light@sscems.org",
    "phone": "(510) 776-8352",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-030",
    "firstName": "Noah",
    "lastName": "Montes",
    "email": "noah.montes@sscems.org",
    "phone": "(559) 905-8493",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-031",
    "firstName": "Samantha",
    "lastName": "Moore",
    "email": "samantha.moore@sscems.org",
    "phone": "(559) 392-0007",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-032",
    "firstName": "Andrew",
    "lastName": "Pulley",
    "email": "andrew@sscems.org",
    "phone": "(559) 304-9054",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Field Sup",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-033",
    "firstName": "Raymond",
    "lastName": "Reynolds",
    "email": "raymond.reynolds@sscems.org",
    "phone": "(559) 372-6982",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-034",
    "firstName": "Heather",
    "lastName": "Washburn",
    "email": "heather.washburn@sscems.org",
    "phone": "(559) 269-3855",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Field Sup",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-035",
    "firstName": "Keith",
    "lastName": "Little",
    "email": "keith.little@sscems.org",
    "phone": "(559) 348-3486",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-036",
    "firstName": "Dustin",
    "lastName": "Yuan",
    "email": "dustin.yuan@sscems.org",
    "phone": "(510) 402-3022",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-037",
    "firstName": "Morgan",
    "lastName": "Reynolds",
    "email": "morgan.reynolds@sscems.org",
    "phone": "",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-038",
    "firstName": "Katelyn",
    "lastName": "Peters",
    "email": "katelyn.peters@sscems.org",
    "phone": "(559) 208-2913",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-039",
    "firstName": "Benjamin",
    "lastName": "Nelson",
    "email": "ben.nelson@sscems.org",
    "phone": "(760) 573-0096",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-040",
    "firstName": "Zachary",
    "lastName": "Anger",
    "email": "zachary.anger@sscems.org",
    "phone": "(559) 458-5742",
    "role": "EMT",
    "scope": "BLS",
    "jobTitle": "EMT",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-041",
    "firstName": "Ricardo",
    "lastName": "Llamas",
    "email": "ricardo.llamas@sscems.org",
    "phone": "(559) 471-7223",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Per Diem",
    "employeeType": "Per Diem",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  },
  {
    "id": "emp-042",
    "firstName": "Joseph",
    "lastName": "Lopez",
    "email": "joseph.lopez@sscems.org",
    "phone": "",
    "role": "Paramedic",
    "scope": "ALS",
    "jobTitle": "Paramedic",
    "status": "Full Time",
    "employeeType": "Full Time",
    "seniorityLabel": "Seniority Unassigned",
    "notes": ""
  }
];

const EMPTY_EMPLOYEE: EmployeeFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'EMT',
  scope: 'BLS',
  jobTitle: '',
  status: 'Active',
  employeeType: 'Full Time',
  seniorityLabel: 'Seniority Unassigned',
  certifications: EMPTY_CERTIFICATIONS,
  notes: '',
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function buildDisplayName(employee: Pick<EmployeeProfile, 'firstName' | 'lastName'>): string {
  const first = employee.firstName.trim();
  const last = employee.lastName.trim();

  if (last && first) {
    return `${last}, ${first}`;
  }

  return last || first || 'Unnamed Employee';
}

function sortEmployees(list: EmployeeProfile[]): EmployeeProfile[] {
  return [...list].sort((a, b) => {
    const lastCompare = a.lastName.localeCompare(b.lastName);
    if (lastCompare !== 0) return lastCompare;

    const firstCompare = a.firstName.localeCompare(b.firstName);
    if (firstCompare !== 0) return firstCompare;

    return a.id.localeCompare(b.id);
  });
}

function createEmployeeId(existing: EmployeeProfile[]): string {
  const numbers = existing
    .map((employee) => Number(employee.id.replace('emp-', '')))
    .filter((value) => !Number.isNaN(value));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `emp-${String(nextNumber).padStart(3, '0')}`;
}

function normalizeRole(value: string): string {
  if (value === 'Supervisor') return 'Supervisor';
  if (value === 'Paramedic') return 'Paramedic';
  return 'EMT';
}

function defaultScopeForRole(role: string): string {
  return role === 'Paramedic' ? 'ALS' : 'BLS';
}

function normalizeSeniorityLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed || 'Seniority Unassigned';
}

function normalizeCertificationRecord(value: CertificationRecord | undefined): CertificationRecord {
  return {
    driversLicense: value?.driversLicense || '',
    ambulanceDriversLicense: value?.ambulanceDriversLicense || '',
    ahaBlsCpr: value?.ahaBlsCpr || '',
    medicalExaminerCertificate: value?.medicalExaminerCertificate || '',
    annualTbScreen: value?.annualTbScreen || '',
    californiaParamedicLicense: value?.californiaParamedicLicense || '',
    ccemsaParamedicLicense: value?.ccemsaParamedicLicense || '',
    acls: value?.acls || '',
    pals: value?.pals || '',
    californiaEmtLicense: value?.californiaEmtLicense || '',
    ccemsaEmtLicense: value?.ccemsaEmtLicense || '',
  };
}

function normalizeEmployee(employee: EmployeeProfile): EmployeeProfile {
  return {
    ...employee,
    role: normalizeRole(employee.role),
    scope: employee.scope === 'ALS' ? 'ALS' : employee.scope === 'BLS' ? employee.scope : defaultScopeForRole(employee.role),
    status: employee.status || 'Active',
    employeeType: employee.employeeType || 'Full Time',
    seniorityLabel: normalizeSeniorityLabel(employee.seniorityLabel || ''),
    certifications: normalizeCertificationRecord(employee.certifications),
    notes: employee.notes || '',
  };
}

function removeEmployeeFromFutureSchedules(employeeId: string): void {
  try {
    const raw = window.localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as ScheduleData;
    const todayKey = new Date().toISOString().slice(0, 10);

    const clearSlot = (slot: unknown) => {
      if (!slot || typeof slot !== 'object') return slot;
      const maybeSlot = slot as Record<string, unknown>;

      if (maybeSlot.employeeId === employeeId) {
        return {
          ...maybeSlot,
          employeeId: '',
          startTime: '06:00',
          endTime: '06:00',
          note: '',
        };
      }

      return slot;
    };

    const updated: ScheduleData = JSON.parse(JSON.stringify(parsed));

    for (const [dateKey, day] of Object.entries(updated)) {
      if (dateKey < todayKey) {
        continue;
      }

      if (day.standard && typeof day.standard === 'object') {
        for (const shiftKey of Object.keys(day.standard)) {
          const shift = day.standard[shiftKey] as Record<string, unknown>;
          if (!shift || typeof shift !== 'object') continue;

          shift.employee1 = clearSlot(shift.employee1);
          shift.employee2 = clearSlot(shift.employee2);
          shift.employee3 = clearSlot(shift.employee3);
        }
      }

      if (Array.isArray(day.extras)) {
        day.extras = day.extras.map((extra) => {
          if (!extra || typeof extra !== 'object') return extra;
          const shift = extra as Record<string, unknown>;

          return {
            ...shift,
            employee1: clearSlot(shift.employee1),
            employee2: clearSlot(shift.employee2),
            employee3: clearSlot(shift.employee3),
          };
        });
      }
    }

    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update future schedules after employee removal:', error);
  }
}

export default function EmployeeProfilesPage() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState<EmployeeFormState>(EMPTY_EMPLOYEE);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as EmployeeProfile[];
        setEmployees(sortEmployees(parsed.map(normalizeEmployee)));
      } else {
        setEmployees(sortEmployees(INITIAL_EMPLOYEES.map(normalizeEmployee)));
      }
    } catch (error) {
      console.error('Failed to load employee profiles:', error);
      setEmployees(sortEmployees(INITIAL_EMPLOYEES.map(normalizeEmployee)));
    } finally {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
    } catch (error) {
      console.error('Failed to save employee profiles:', error);
    }
  }, [employees, mounted]);

  const filteredEmployees = useMemo(() => {
    const term = normalizeText(search);

    return employees.filter((employee) => {
      const haystack = [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.role,
        employee.scope,
        employee.jobTitle,
        employee.status,
        employee.employeeType,
        employee.seniorityLabel,
        employee.notes,
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !term || haystack.includes(term);
      const matchesStatus = statusFilter === 'All' || employee.status === statusFilter;
      const matchesType = typeFilter === 'All' || employee.employeeType === typeFilter;
      const matchesRole = roleFilter === 'All' || employee.role === roleFilter;

      return matchesSearch && matchesStatus && matchesType && matchesRole;
    });
  }, [employees, roleFilter, search, statusFilter, typeFilter]);

  const totals = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => (employee.status || '').trim() === 'Active').length;
    const inactive = employees.filter((employee) => (employee.status || '').trim() === 'Inactive').length;
    const leave = employees.filter((employee) => (employee.status || '').trim() === 'Leave').length;
    const paramedics = employees.filter((employee) => employee.role === 'Paramedic').length;
    const emts = employees.filter((employee) => employee.role === 'EMT').length;
    const supervisors = employees.filter((employee) => employee.role === 'Supervisor').length;

    return {
      total,
      active,
      inactive,
      leave,
      paramedics,
      emts,
      supervisors,
    };
  }, [employees]);

  const employeesByCategory = useMemo(() => {
    return {
      total: sortEmployees([...employees]),
      active: sortEmployees(employees.filter((employee) => (employee.status || '').trim() === 'Active')),
      leave: sortEmployees(employees.filter((employee) => (employee.status || '').trim() === 'Leave')),
      inactive: sortEmployees(employees.filter((employee) => (employee.status || '').trim() === 'Inactive')),
      paramedics: sortEmployees(employees.filter((employee) => employee.role === 'Paramedic')),
      emts: sortEmployees(employees.filter((employee) => employee.role === 'EMT')),
      supervisors: sortEmployees(employees.filter((employee) => employee.role === 'Supervisor')),
    };
  }, [employees]);

  function renderSummaryCard(
    label: string,
    value: number,
    categoryEmployees: EmployeeProfile[],
  ) {
    return (
      <div className="group relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>

        <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xl group-hover:block">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {label} Employees
          </div>

          {categoryEmployees.length === 0 ? (
            <div className="text-slate-500">No employees in this category.</div>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {categoryEmployees.map((employee) => (
                <div key={employee.id} className="rounded-lg bg-slate-50 px-2 py-1.5 text-slate-700">
                  {buildDisplayName(employee)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const roleOptions = useMemo(() => {
    return ['All', ...Array.from(new Set(employees.map((employee) => employee.role).filter(Boolean))).sort()];
  }, [employees]);

  const employeeTypeOptions = useMemo(() => {
    return ['All', ...Array.from(new Set(employees.map((employee) => employee.employeeType).filter(Boolean))).sort()];
  }, [employees]);

  const handleNewEmployeeChange = (field: keyof EmployeeFormState, value: string) => {
    setNewEmployee((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'role' && current.scope === defaultScopeForRole(current.role)) {
        next.scope = defaultScopeForRole(value);
      }

      return next;
    });
  };

  const handleAddEmployee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newEmployee.firstName.trim() || !newEmployee.lastName.trim()) {
      window.alert('First name and last name are required.');
      return;
    }

    const emailAlreadyExists =
      newEmployee.email.trim() &&
      employees.some((employee) => normalizeText(employee.email) === normalizeText(newEmployee.email));

    if (emailAlreadyExists) {
      window.alert('That email address is already in use.');
      return;
    }

    const employeeToAdd: EmployeeProfile = normalizeEmployee({
      id: createEmployeeId(employees),
      firstName: newEmployee.firstName.trim(),
      lastName: newEmployee.lastName.trim(),
      email: newEmployee.email.trim(),
      phone: newEmployee.phone.trim(),
      role: newEmployee.role.trim() || 'EMT',
      scope: newEmployee.scope.trim() || defaultScopeForRole(newEmployee.role),
      jobTitle: newEmployee.jobTitle.trim(),
      status: newEmployee.status.trim() || 'Active',
      employeeType: newEmployee.employeeType.trim() || 'Full Time',
      seniorityLabel: normalizeSeniorityLabel(newEmployee.seniorityLabel),
      certifications: normalizeCertificationRecord(newEmployee.certifications),
      notes: newEmployee.notes.trim(),
    });

    setEmployees((current) => sortEmployees([...current, employeeToAdd]));
    setNewEmployee(EMPTY_EMPLOYEE);
    setShowAddForm(false);
    setExpandedEmployeeId(employeeToAdd.id);
  };

  const handleEmployeeFieldChange = (employeeId: string, field: keyof EmployeeProfile, value: string) => {
    setEmployees((current) =>
      sortEmployees(
        current.map((employee) => {
          if (employee.id !== employeeId) {
            return employee;
          }

          const updated = {
            ...employee,
            [field]: value,
          };

          if (field === 'role' && employee.scope === defaultScopeForRole(employee.role)) {
            updated.scope = defaultScopeForRole(value);
          }

          return normalizeEmployee(updated);
        }),
      ),
    );
  };

  const handleEmployeeCertificationChange = (
    employeeId: string,
    field: keyof CertificationRecord,
    value: string,
  ) => {
    setEmployees((current) =>
      sortEmployees(
        current.map((employee) =>
          employee.id === employeeId
            ? normalizeEmployee({
                ...employee,
                certifications: {
                  ...normalizeCertificationRecord(employee.certifications),
                  [field]: value,
                },
              })
            : employee,
        ),
      ),
    );
  };

  const handleNewEmployeeCertificationChange = (field: keyof CertificationRecord, value: string) => {
    setNewEmployee((current) => ({
      ...current,
      certifications: {
        ...normalizeCertificationRecord(current.certifications),
        [field]: value,
      },
    }));
  };

  function renderCertificationFields(
    certifications: CertificationRecord,
    onChange: (field: keyof CertificationRecord, value: string) => void,
    scope: string,
  ) {
    const commonFields: Array<[keyof CertificationRecord, string]> = [
      ['driversLicense', 'Drivers License'],
      ['ambulanceDriversLicense', 'Ambulance Drivers License'],
      ['ahaBlsCpr', 'AHA BLS CPR Card'],
      ['medicalExaminerCertificate', 'Medical Examiners Certificate'],
      ['annualTbScreen', 'Annual TB Screen'],
    ];

    const alsFields: Array<[keyof CertificationRecord, string]> = [
      ['californiaParamedicLicense', 'California Paramedic License'],
      ['ccemsaParamedicLicense', 'CCEMSA Paramedic License'],
      ['acls', 'ACLS'],
      ['pals', 'PALS'],
    ];

    const blsFields: Array<[keyof CertificationRecord, string]> = [
      ['californiaEmtLicense', 'California EMT License'],
      ['ccemsaEmtLicense', 'CCEMSA EMT License'],
    ];

    return (
      <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold text-slate-900">Certifications & Expiration Dates</div>
          <div className="text-xs text-slate-500">
            Employees with ALS scope require paramedic credentials. Employees with BLS scope require EMT credentials.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Required for All Employees</div>
            <div className="grid gap-3">
              {commonFields.map(([field, label]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                  <input
                    type="date"
                    value={certifications[field]}
                    onChange={(event) => onChange(field, event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {scope === 'ALS' ? 'Required for ALS Scope' : 'Required for BLS Scope'}
            </div>

            <div className="grid gap-3">
              {(scope === 'ALS' ? alsFields : blsFields).map(([field, label]) => (
                <div key={field}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
                  <input
                    type="date"
                    value={certifications[field]}
                    onChange={(event) => onChange(field, event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleRemoveEmployee = (employeeId: string, employeeName: string) => {
    const acknowledgement = window.confirm(
      `Remove ${employeeName}?\n\nThis will remove the employee from Employee Profiles and also remove them from ALL FUTURE schedules starting today forward.\n\nPast schedules will stay unchanged.\n\nClick OK to continue.`,
    );

    if (!acknowledgement) {
      return;
    }

    const secondConfirmation = window.confirm(
      `Final confirmation: permanently remove ${employeeName} from Employee Profiles and clear them from future schedules only?`,
    );

    if (!secondConfirmation) {
      return;
    }

    removeEmployeeFromFutureSchedules(employeeId);
    setEmployees((current) => current.filter((employee) => employee.id !== employeeId));
    setExpandedEmployeeId((current) => (current === employeeId ? null : current));
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Profiles</h1>
              <p className="mt-1 text-sm text-slate-600">
                Supervisor profile management. Names are shown in Last, First format and sorted alphabetically by last name.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search employees"
                className="w-64 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              />

              <button
                type="button"
                onClick={() => setShowAddForm((current) => !current)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                {showAddForm ? 'Close Add Employee' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-7">
          {renderSummaryCard('Total Employees', totals.total, employeesByCategory.total)}
          {renderSummaryCard('Active', totals.active, employeesByCategory.active)}
          {renderSummaryCard('Leave', totals.leave, employeesByCategory.leave)}
          {renderSummaryCard('Inactive', totals.inactive, employeesByCategory.inactive)}
          {renderSummaryCard('Paramedics', totals.paramedics, employeesByCategory.paramedics)}
          {renderSummaryCard('EMTs', totals.emts, employeesByCategory.emts)}
          {renderSummaryCard('Supervisors', totals.supervisors, employeesByCategory.supervisors)}
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Leave">Leave</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Type</label>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                {employeeTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
              >
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
                Showing <span className="font-semibold">{filteredEmployees.length}</span> employee{filteredEmployees.length === 1 ? '' : 's'}
              </div>
            </div>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Add Employee</h2>

            <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</label>
                <input
                  type="text"
                  value={newEmployee.firstName}
                  onChange={(event) => handleNewEmployeeChange('firstName', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</label>
                <input
                  type="text"
                  value={newEmployee.lastName}
                  onChange={(event) => handleNewEmployeeChange('lastName', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(event) => handleNewEmployeeChange('email', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Mobile Phone</label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(event) => handleNewEmployeeChange('phone', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                <select
                  value={newEmployee.role}
                  onChange={(event) => handleNewEmployeeChange('role', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="EMT">EMT</option>
                  <option value="Paramedic">Paramedic</option>
                  <option value="Supervisor">Supervisor</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Scope</label>
                <select
                  value={newEmployee.scope}
                  onChange={(event) => handleNewEmployeeChange('scope', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="BLS">BLS</option>
                  <option value="ALS">ALS</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Title</label>
                <input
                  type="text"
                  value={newEmployee.jobTitle}
                  onChange={(event) => handleNewEmployeeChange('jobTitle', event.target.value)}
                  placeholder="Example: FIELD_SUP"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                <select
                  value={newEmployee.status}
                  onChange={(event) => handleNewEmployeeChange('status', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Leave">Leave</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Type</label>
                <select
                  value={newEmployee.employeeType}
                  onChange={(event) => handleNewEmployeeChange('employeeType', event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Per Diem">Per Diem</option>
                  <option value="Part Time">Part Time</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Seniority</label>
                <input
                  type="text"
                  value={newEmployee.seniorityLabel}
                  onChange={(event) => handleNewEmployeeChange('seniorityLabel', event.target.value)}
                  placeholder="Seniority Unassigned"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              {renderCertificationFields(
                normalizeCertificationRecord(newEmployee.certifications),
                handleNewEmployeeCertificationChange,
                newEmployee.scope,
              )}

              <div className="md:col-span-2 xl:col-span-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                <textarea
                  value={newEmployee.notes}
                  onChange={(event) => handleNewEmployeeChange('notes', event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="xl:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(300px,1.3fr)_minmax(180px,1fr)_minmax(180px,0.9fr)_minmax(150px,0.8fr)_140px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <div>Name</div>
            <div>Contact</div>
            <div>Role / Scope</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredEmployees.map((employee) => {
              const expanded = expandedEmployeeId === employee.id;

              return (
                <div key={employee.id}>
                  <div className="grid grid-cols-[minmax(300px,1.3fr)_minmax(180px,1fr)_minmax(180px,0.9fr)_minmax(150px,0.8fr)_140px] items-center px-4 py-3 hover:bg-slate-50">
                    <div>
                      <div className="font-semibold text-slate-900">{buildDisplayName(employee)}</div>
                      <div className="text-xs text-slate-500">{employee.seniorityLabel || 'Seniority Unassigned'}</div>
                    </div>

                    <div className="text-sm text-slate-700">
                      <div>{employee.email || '—'}</div>
                      <div className="text-xs text-slate-500">{employee.phone || '—'}</div>
                    </div>

                    <div className="text-sm text-slate-700">
                      <div>{employee.role || '—'}</div>
                      <div className="text-xs text-slate-500">Scope: {employee.scope || '—'}</div>
                    </div>

                    <div className="text-sm text-slate-700">
                      <div>{employee.status || '—'}</div>
                      <div className="text-xs text-slate-500">{employee.employeeType || '—'}</div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedEmployeeId((current) => (current === employee.id ? null : employee.id))}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {expanded ? 'Close' : 'Edit Profile'}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Removing this employee will also remove them from all future schedules starting today forward. Past schedules will remain unchanged.
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</label>
                          <input
                            type="text"
                            value={employee.firstName}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'firstName', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</label>
                          <input
                            type="text"
                            value={employee.lastName}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'lastName', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Email</label>
                          <input
                            type="email"
                            value={employee.email}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'email', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</label>
                          <input
                            type="text"
                            value={employee.phone}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'phone', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Role</label>
                          <select
                            value={employee.role}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'role', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="EMT">EMT</option>
                            <option value="Paramedic">Paramedic</option>
                            <option value="Supervisor">Supervisor</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Scope</label>
                          <select
                            value={employee.scope || 'BLS'}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'scope', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="BLS">BLS</option>
                            <option value="ALS">ALS</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Title</label>
                          <input
                            type="text"
                            value={employee.jobTitle}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'jobTitle', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Status</label>
                          <select
                            value={employee.status}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'status', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Leave">Leave</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Employee Type</label>
                          <select
                            value={employee.employeeType}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'employeeType', event.target.value)}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          >
                            <option value="Full Time">Full Time</option>
                            <option value="Per Diem">Per Diem</option>
                            <option value="Part Time">Part Time</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Seniority</label>
                          <input
                            type="text"
                            value={employee.seniorityLabel || 'Seniority Unassigned'}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'seniorityLabel', event.target.value)}
                            placeholder="Seniority Unassigned"
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>

                        {renderCertificationFields(
                          normalizeCertificationRecord(employee.certifications),
                          (field, value) => handleEmployeeCertificationChange(employee.id, field, value),
                          employee.scope,
                        )}

                        <div className="md:col-span-2 xl:col-span-4">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</label>
                          <textarea
                            value={employee.notes}
                            onChange={(event) => handleEmployeeFieldChange(employee.id, 'notes', event.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveEmployee(employee.id, buildDisplayName(employee))}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Remove Employee
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
