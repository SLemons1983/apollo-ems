'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DispatchPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/dispatch/schedule')
      .then((response) => response.json())
      .then((data) => {
        setAssignments(data.assignments ?? []);
        setEmployees(data.employees ?? []);
      });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/dispatch-login';
  }

  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)
      ? `${employees.find((e) => e.id === id)?.first_name} ${employees.find((e) => e.id === id)?.last_name}`
      : 'Open';

  const weekDateKey = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + offset);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const dayAssignments = (offset: number) =>
    assignments.filter((item) => item.date_key === weekDateKey(offset));

  const dayShifts = (offset: number) =>
    Array.from(new Set(dayAssignments(offset).map((item) => item.shift_label)));

  const shiftLabels = Array.from(
    new Set(assignments.map((item) => item.shift_label)),
  );

  const standardShiftLabels = ['Reedley 1', 'Reedley 2', 'Parlier', 'Orange Cove', 'Field Supervisor', 'Admin Supervisor'];
  const extraShiftLabels = shiftLabels.filter((label) => {
    if (standardShiftLabels.includes(label)) {
      return false;
    }

    return assignments.some((item) =>
      item.shift_label === label &&
      item.slot_number > 0 &&
      (
        item.employee_id ||
        item.is_open_slot
      )
    );
  });
  const orderedShiftLabels = [...standardShiftLabels, ...extraShiftLabels];

  const cellAssignments = (label: string, offset: number) => dayAssignments(offset).filter((item) => item.shift_label === label);

  const todayKey = weekDateKey(new Date().getDay());
  return (
    <main className="min-h-screen bg-slate-300 px-4 py-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sequoia Safety Council</h1>
            <p className="mt-1 text-sm text-slate-600">Dispatch View of Schedule</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700">Refresh Schedule</button>
            <button type="button" onClick={handleLogout} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100">Logout</button>
            <span>Powered by</span>
            <Image src="/apollo-logo.png" alt="ApolloEMS" width={80} height={80} className="h-12 w-auto" />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid min-w-[1100px] grid-cols-[160px_repeat(7,1fr)] gap-2 text-sm">
            <div className="rounded-xl bg-slate-200 p-3 font-bold text-slate-700">Shift</div>
            {Array.from({ length: 7 }, (_, index) => {
              const today = new Date();
              const date = new Date(today);
              date.setDate(today.getDate() - today.getDay() + index);
              const isToday = weekDateKey(index) === todayKey;
              return <div key={index} className={`rounded-xl p-3 text-center font-bold ${isToday ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>;
            })}
            {orderedShiftLabels.map((label) => (
              <div key={label} className="contents">
                <div className="rounded-xl bg-slate-500 p-3 font-bold text-white">{label}</div>
                {Array.from({ length: 7 }, (_, index) => (
                  <div key={`${label}-${index}`} className={`min-h-[80px] rounded-xl border p-3 text-xs ${weekDateKey(index) === todayKey ? 'border-emerald-500 bg-emerald-100 text-emerald-950' : 'border-slate-400 bg-slate-200 text-slate-900'}`}>
                    <div className="mb-1 text-sm font-extrabold text-slate-950">Unit: {cellAssignments(label, index)[0]?.vehicle || '—'}</div>
                    {cellAssignments(label, index).filter((item) => item.slot_number > 0).map((item) => (
                      <div key={item.id}>{item.is_open_slot ? `Open ${item.open_slot_scope ?? ''}` : getEmployeeName(item.employee_id)}</div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-medium text-slate-700">
          If there are any questions, please contact Sequoia Safety Council's On-duty supervisor at (559) 406-8210.
        </p>
      </div>
    </main>
  );
}
