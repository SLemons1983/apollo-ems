'use client';

import React, { useEffect, useMemo, useState } from 'react';

type EmployeeProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  jobTitle: string;
  status: string;
};

const STORAGE_KEY = 'apollo-employee-profiles-v1';

const INITIAL_EMPLOYEES: EmployeeProfile[] = [
  {
    "id": "emp-001",
    "firstName": "Russ",
    "lastName": "Richardson",
    "email": "russ@sscems.org",
    "phone": "(559) 903-7441",
    "role": "Paramedic",
    "jobTitle": "GM",
    "status": "Full Time"
  },
  {
    "id": "emp-002",
    "firstName": "Adrian",
    "lastName": "Aguilera",
    "email": "adrian.aguilera@sscems.org",
    "phone": "(818) 384-8880",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-003",
    "firstName": "Bransen",
    "lastName": "Berry",
    "email": "bransen.berry@sscems.org",
    "phone": "(559) 305-8476",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-004",
    "firstName": "Daniel",
    "lastName": "Deblauw",
    "email": "daniel.deblauw@sscems.org",
    "phone": "(707) 637-6576",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-005",
    "firstName": "Ramses",
    "lastName": "Farias",
    "email": "ramses.farias@sscems.org",
    "phone": "(559) 308-5610",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-006",
    "firstName": "Heaven",
    "lastName": "Fernandez",
    "email": "heaven.fernandez@sscems.org",
    "phone": "(559) 837-3112",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-007",
    "firstName": "Michael",
    "lastName": "Gann",
    "email": "michael.gann@sscems.org",
    "phone": "(559) 862-8912",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-008",
    "firstName": "Lauryn",
    "lastName": "Godwin",
    "email": "lauryn.godwin@sscems.org",
    "phone": "(559) 365-5762",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-009",
    "firstName": "Carlos",
    "lastName": "Juarez-Lopez",
    "email": "carlos.juarez-lopez@sscems.org",
    "phone": "(559) 430-6224",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-010",
    "firstName": "Steve",
    "lastName": "Lemons",
    "email": "steve@sscems.org",
    "phone": "(559) 614-8610",
    "role": "EMT",
    "jobTitle": "Admin Sup",
    "status": "Full Time"
  },
  {
    "id": "emp-011",
    "firstName": "Jack",
    "lastName": "Lewis",
    "email": "jack.lewis@sscems.org",
    "phone": "(559) 672-4364",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-012",
    "firstName": "Ruben",
    "lastName": "Maldonado",
    "email": "ruben.maldonado@sscems.org",
    "phone": "(559) 859-2149",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-013",
    "firstName": "Jeromy",
    "lastName": "McHenry",
    "email": "jeromy.mchenry@sscems.org",
    "phone": "(559) 571-6727",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-014",
    "firstName": "Rudy",
    "lastName": "Mendez",
    "email": "rudy.mendez@sscems.org",
    "phone": "(818) 935-8916",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-015",
    "firstName": "Michael",
    "lastName": "Pasuit",
    "email": "michael.pasuit@sscems.org",
    "phone": "(559) 360-6621",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-016",
    "firstName": "Tomas",
    "lastName": "Renteria",
    "email": "tomas.renteria@sscems.org",
    "phone": "(559) 981-6314",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-017",
    "firstName": "Randi",
    "lastName": "Rios",
    "email": "randi.rios@sscems.org",
    "phone": "(559) 960-0383",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-018",
    "firstName": "Carmelo",
    "lastName": "Rosales",
    "email": "carmelo.rosales@sscems.org",
    "phone": "(559) 801-7181",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Full Time"
  },
  {
    "id": "emp-019",
    "firstName": "David",
    "lastName": "Bustamante",
    "email": "david.bustamante@sscems.org",
    "phone": "(559) 618-0852",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-020",
    "firstName": "Ciceroni",
    "lastName": "Colter",
    "email": "colter.ciceroni@sscems.org",
    "phone": "(559) 801-3366",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-021",
    "firstName": "Guillermo",
    "lastName": "Cruz-Gonzalez Jr",
    "email": "guillermo.cruz@sscems.org",
    "phone": "(559) 646-4361",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-022",
    "firstName": "Nick",
    "lastName": "Friesen",
    "email": "Nick.Friesen@sscems.org",
    "phone": "(559) 614-5083",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-023",
    "firstName": "Austin",
    "lastName": "Galvan",
    "email": "austin.galvan@sscems.org",
    "phone": "(559) 207-7000",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-024",
    "firstName": "Jonathan",
    "lastName": "Gonzalez",
    "email": "jonathan.gonzalez@sscems.org",
    "phone": "(559) 590-3373",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-025",
    "firstName": "Gerster",
    "lastName": "Graeme",
    "email": "graeme.gester@sscems.org",
    "phone": "(559) 356-3666",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-026",
    "firstName": "Jose",
    "lastName": "Hernandez",
    "email": "JHernandez@sscems.org",
    "phone": "(559) 305-4893",
    "role": "Paramedic",
    "jobTitle": "Field Sup",
    "status": "Full Time"
  },
  {
    "id": "emp-027",
    "firstName": "Patrick",
    "lastName": "Hescox",
    "email": "patrick@sscems.org",
    "phone": "(559) 304-8206",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-028",
    "firstName": "Benjamin",
    "lastName": "Huckaby",
    "email": "ben@sscems.org",
    "phone": "(559) 512-5911",
    "role": "Paramedic",
    "jobTitle": "Field Sup",
    "status": "Full Time"
  },
  {
    "id": "emp-029",
    "firstName": "Justin",
    "lastName": "Light",
    "email": "justin.light@sscems.org",
    "phone": "(510) 776-8352",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-030",
    "firstName": "Noah",
    "lastName": "Montes",
    "email": "noah.montes@sscems.org",
    "phone": "(559) 905-8493",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-031",
    "firstName": "Samantha",
    "lastName": "Moore",
    "email": "samantha.moore@sscems.org",
    "phone": "(559) 392-0007",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  },
  {
    "id": "emp-032",
    "firstName": "Andrew",
    "lastName": "Pulley",
    "email": "andrew@sscems.org",
    "phone": "(559) 304-9054",
    "role": "Paramedic",
    "jobTitle": "Field Sup",
    "status": "Full Time"
  },
  {
    "id": "emp-033",
    "firstName": "Raymond",
    "lastName": "Reynolds",
    "email": "raymond.reynolds@sscems.org",
    "phone": "(559) 372-6982",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-034",
    "firstName": "Heather",
    "lastName": "Washburn",
    "email": "heather.washburn@sscems.org",
    "phone": "(559) 269-3855",
    "role": "Paramedic",
    "jobTitle": "Field Sup",
    "status": "Full Time"
  },
  {
    "id": "emp-035",
    "firstName": "Keith",
    "lastName": "Little",
    "email": "keith.little@sscems.org",
    "phone": "(559) 348-3486",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-036",
    "firstName": "Dustin",
    "lastName": "Yuan",
    "email": "dustin.yuan@sscems.org",
    "phone": "(510) 402-3022",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-037",
    "firstName": "Morgan",
    "lastName": "Reynolds",
    "email": "morgan.reynolds@sscems.org",
    "phone": "",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-038",
    "firstName": "Katelyn",
    "lastName": "Peters",
    "email": "katelyn.peters@sscems.org",
    "phone": "(559) 208-2913",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-039",
    "firstName": "Benjamin",
    "lastName": "Nelson",
    "email": "ben.nelson@sscems.org",
    "phone": "(760) 573-0096",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-040",
    "firstName": "Zachary",
    "lastName": "Anger",
    "email": "zachary.anger@sscems.org",
    "phone": "(559) 458-5742",
    "role": "EMT",
    "jobTitle": "EMT",
    "status": "Per Diem"
  },
  {
    "id": "emp-041",
    "firstName": "Ricardo",
    "lastName": "Llamas",
    "email": "ricardo.llamas@sscems.org",
    "phone": "(559) 471-7223",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Per Diem"
  },
  {
    "id": "emp-042",
    "firstName": "Joseph",
    "lastName": "Lopez",
    "email": "joseph.lopez@sscems.org",
    "phone": "",
    "role": "Paramedic",
    "jobTitle": "Paramedic",
    "status": "Full Time"
  }
];

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function sortEmployees(list: EmployeeProfile[]): EmployeeProfile[] {
  return [...list].sort((a, b) => {
    const lastCompare = a.lastName.localeCompare(b.lastName);
    if (lastCompare !== 0) return lastCompare;
    return a.firstName.localeCompare(b.firstName);
  });
}

function createEmployeeId(existing: EmployeeProfile[]): string {
  const numbers = existing
    .map((employee) => Number(employee.id.replace('emp-', '')))
    .filter((value) => !Number.isNaN(value));

  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `emp-${String(nextNumber).padStart(3, '0')}`;
}

export default function EmployeeProfilesPage() {
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState<Omit<EmployeeProfile, 'id'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    jobTitle: '',
    status: 'Full Time',
  });

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as EmployeeProfile[];
        setEmployees(sortEmployees(parsed));
      } else {
        setEmployees(sortEmployees(INITIAL_EMPLOYEES));
      }
    } catch (error) {
      console.error('Failed to load employee profiles:', error);
      setEmployees(sortEmployees(INITIAL_EMPLOYEES));
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

    if (!term) {
      return employees;
    }

    return employees.filter((employee) => {
      const haystack = [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.role,
        employee.jobTitle,
        employee.status,
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [employees, search]);

  const totals = useMemo(() => {
    const fullTime = employees.filter((employee) => employee.status.toLowerCase() === 'full time').length;
    const perDiem = employees.filter((employee) => employee.status.toLowerCase() === 'per diem').length;
    const paramedics = employees.filter((employee) => employee.role.toLowerCase() === 'paramedic').length;
    const emts = employees.filter((employee) => employee.role.toLowerCase() === 'emt').length;
    const supervisors = employees.filter((employee) => {
      const title = employee.jobTitle.toLowerCase();
      return title === 'gm' || title === 'admin_sup' || title === 'field_sup' || employee.role.toLowerCase() === 'supervisor';
    }).length;

    return {
      total: employees.length,
      fullTime,
      perDiem,
      paramedics,
      emts,
      supervisors,
    };
  }, [employees]);

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

    const employeeToAdd: EmployeeProfile = {
      id: createEmployeeId(employees),
      firstName: newEmployee.firstName.trim(),
      lastName: newEmployee.lastName.trim(),
      email: newEmployee.email.trim(),
      phone: newEmployee.phone.trim(),
      role: newEmployee.role.trim(),
      jobTitle: newEmployee.jobTitle.trim(),
      status: newEmployee.status.trim() || 'Full Time',
    };

    setEmployees((current) => sortEmployees([...current, employeeToAdd]));

    setNewEmployee({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: '',
      jobTitle: '',
      status: 'Full Time',
    });

    setShowAddForm(false);
  };

  const handleRemoveEmployee = (employeeId: string, employeeName: string) => {
    const confirmed = window.confirm(`Remove ${employeeName} from employee profiles?`);

    if (!confirmed) {
      return;
    }

    setEmployees((current) => current.filter((employee) => employee.id !== employeeId));
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employee Profiles</h1>
              <p className="mt-1 text-sm text-slate-600">
                Supervisor management page for employee records. Seeded from your uploaded CSV.
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
                {showAddForm ? 'Close Form' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Employees</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.total}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Time</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.fullTime}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Per Diem</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.perDiem}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paramedics</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.paramedics}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">EMTs</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.emts}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supervisors</div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{totals.supervisors}</div>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Add Employee</h2>

            <form onSubmit={handleAddEmployee} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  First Name
                </label>
                <input
                  type="text"
                  value={newEmployee.firstName}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, firstName: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newEmployee.lastName}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, lastName: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Mobile Phone
                </label>
                <input
                  type="text"
                  value={newEmployee.phone}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, phone: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Role
                </label>
                <input
                  type="text"
                  value={newEmployee.role}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, role: event.target.value }))}
                  placeholder="EMT, Paramedic, Supervisor"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Job Title
                </label>
                <input
                  type="text"
                  value={newEmployee.jobTitle}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, jobTitle: event.target.value }))}
                  placeholder="EMT, PM, GM, FIELD_SUP"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>
                <select
                  value={newEmployee.status}
                  onChange={(event) => setNewEmployee((current) => ({ ...current, status: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Per Diem">Per Diem</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Email
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phone
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Role
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Job Title
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-900">
                      <div className="font-semibold">
                        {employee.firstName} {employee.lastName}
                      </div>
                      <div className="text-xs text-slate-500">{employee.id}</div>
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                      {employee.email || '—'}
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                      {employee.phone || '—'}
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                      {employee.role || '—'}
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                      {employee.jobTitle || '—'}
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-sm text-slate-700">
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {employee.status || '—'}
                      </span>
                    </td>

                    <td className="border-b border-slate-200 px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveEmployee(employee.id, `${employee.firstName} ${employee.lastName}`)
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
