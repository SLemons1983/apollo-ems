'use client';

import React, { memo, useEffect, useState } from 'react';
import { makeDateInputValue, type EmployeeOption } from './shared';

type SupervisorShiftReportTileProps = {
  currentEmployee: EmployeeOption | null;
  authEmail: string;
};

function SupervisorShiftReportTile({ currentEmployee, authEmail }: SupervisorShiftReportTileProps) {
  const [supervisorShiftReportDate, setSupervisorShiftReportDate] = useState(() => makeDateInputValue(new Date()));
  const [supervisorShiftReportAbsences, setSupervisorShiftReportAbsences] = useState('No');
  const [supervisorShiftReportTardies, setSupervisorShiftReportTardies] = useState('No');
  const [supervisorShiftReportVehicleIssues, setSupervisorShiftReportVehicleIssues] = useState('No');
  const [supervisorShiftReportOtherIssues, setSupervisorShiftReportOtherIssues] = useState('No');
  const [supervisorShiftReportNarrative, setSupervisorShiftReportNarrative] = useState('');
  const [supervisorShiftReportStatus, setSupervisorShiftReportStatus] = useState('');
  const [isSubmittingSupervisorShiftReport, setIsSubmittingSupervisorShiftReport] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // The tile stays mounted while closed so the draft survives, but the
  // acknowledgment must be checked again each time it is reopened, as it was
  // when the form was rebuilt on every open.
  useEffect(() => () => setAcknowledged(false), []);

  async function handleSupervisorShiftReportSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentEmployee) {
      setSupervisorShiftReportStatus('Unable to identify the logged-in supervisor.');
      return;
    }

    const requiresDetail = [
      supervisorShiftReportAbsences,
      supervisorShiftReportTardies,
      supervisorShiftReportVehicleIssues,
      supervisorShiftReportOtherIssues,
    ].includes('Yes');

    if (requiresDetail && supervisorShiftReportNarrative.trim().length < 20) {
      setSupervisorShiftReportStatus('Narrative must include details when any issue is marked Yes.');
      return;
    }

    setIsSubmittingSupervisorShiftReport(true);
    setSupervisorShiftReportStatus('Submitting supervisor shift report...');

    try {
      const formData = new FormData();
      formData.append('supervisorName', currentEmployee.name);
      formData.append('supervisorEmail', currentEmployee.email || authEmail);
      formData.append('shiftDate', supervisorShiftReportDate);
      formData.append('unscheduledAbsences', supervisorShiftReportAbsences);
      formData.append('tardyEmployees', supervisorShiftReportTardies);
      formData.append('vehicleIssues', supervisorShiftReportVehicleIssues);
      formData.append('otherNotableIssues', supervisorShiftReportOtherIssues);
      formData.append('narrative', supervisorShiftReportNarrative.trim());

      const response = await fetch('/api/supervisor-shift-report/submit', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Supervisor shift report submission failed.');
      }

      setSupervisorShiftReportAbsences('No');
      setSupervisorShiftReportTardies('No');
      setSupervisorShiftReportVehicleIssues('No');
      setSupervisorShiftReportOtherIssues('No');
      setSupervisorShiftReportNarrative('');
      setSupervisorShiftReportStatus('Supervisor shift report submitted successfully.');
    } catch (error) {
      console.error('Supervisor shift report submission failed:', error);
      setSupervisorShiftReportStatus('Unable to submit supervisor shift report.');
    } finally {
      setIsSubmittingSupervisorShiftReport(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSupervisorShiftReportSubmit}>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-xs font-semibold text-slate-600">
        Supervisor Completing Report
        <input
          className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          value={currentEmployee?.name ?? 'Supervisor'}
          readOnly
        />
      </label>

      <label className="text-xs font-semibold text-slate-600">
        Date of Shift
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={supervisorShiftReportDate}
          onChange={(event) => setSupervisorShiftReportDate(event.target.value)}
          required
        />
      </label>
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {[
        ['Unscheduled Absences', supervisorShiftReportAbsences, setSupervisorShiftReportAbsences],
        ['Tardy Employees', supervisorShiftReportTardies, setSupervisorShiftReportTardies],
        ['Company Vehicle Issues', supervisorShiftReportVehicleIssues, setSupervisorShiftReportVehicleIssues],
        ['Other Notable Issues', supervisorShiftReportOtherIssues, setSupervisorShiftReportOtherIssues],
      ].map(([label, value, setter]) => (
        <label key={label as string} className="text-xs font-semibold text-slate-600">
          {label as string}
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={value as string}
            onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)}
            required
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </label>
      ))}
    </div>

    <label className="block text-xs font-semibold text-slate-600">
      Narrative of Events / Tasks Completed
      <textarea
        className="mt-1 min-h-[180px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        value={supervisorShiftReportNarrative}
        onChange={(event) => setSupervisorShiftReportNarrative(event.target.value)}
        placeholder="Describe any operational issues, tasks completed, absences, tardies, vehicle concerns, or other notable events."
        required
      />
    </label>

    <label className="block rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
      <input
            type="checkbox"
            className="mr-2"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            required
          />
      I acknowledge that I personally completed this shift report and that the information provided is accurate to the best of my knowledge. I understand that this report becomes part of the operational record of the company and may be used for quality improvement, investigations, personnel review, and operational planning.
    </label>

    {supervisorShiftReportStatus && <p className="text-sm font-semibold text-slate-700">{supervisorShiftReportStatus}</p>}

    <button
      type="submit"
      disabled={isSubmittingSupervisorShiftReport}
      className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:bg-slate-400"
    >
      {isSubmittingSupervisorShiftReport ? 'Submitting...' : 'Submit Supervisor Shift Report'}
    </button>
    </form>
  );
}

export default memo(SupervisorShiftReportTile);
