'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DispatchPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('schedule_assignments').select('*').then(({ data }) => setAssignments(data ?? []));
    supabase.from('employees').select('id,first_name,last_name').then(({ data }) => setEmployees(data ?? []));
  }, []);

  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)
      ? `${employees.find((e) => e.id === id)?.first_name} ${employees.find((e) => e.id === id)?.last_name}`
      : 'Open';

  const weekDateKey = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + offset);
    return d.toISOString().slice(0, 10);
  };

  const dayAssignments = (offset: number) =>
    assignments.filter((item) => item.date_key === weekDateKey(offset));

  const dayShifts = (offset: number) =>
    Array.from(new Set(dayAssignments(offset).map((item) => item.shift_label)));

  const shiftLabels = Array.from(
    new Set(assignments.map((item) => item.shift_label)),
  );

  const orderedShiftLabels = ['Reedley 1', 'Reedley 2', 'Parlier', 'Orange Cove', 'Field Supervisor', 'Admin Supervisor', 'Extra'].filter((label) => shiftLabels.includes(label));
  return (
    <main className="min-h-screen bg-slate-300 px-4 py-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sequoia Safety Council</h1>
            <p className="mt-1 text-sm text-slate-600">Dispatch View of Schedule</p>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
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
              const isToday = date.toDateString() === today.toDateString();
              return <div key={index} className={`rounded-xl p-3 text-center font-bold ${isToday ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>;
            })}
            {orderedShiftLabels.map((label) => (
              <div key={label} className="contents">
                <div className="rounded-xl bg-slate-300 p-3 font-bold text-slate-800">{label}</div>
                {Array.from({ length: 7 }, (_, index) => <div key={`${label}-${index}`} className="min-h-[80px] rounded-xl border border-slate-200 bg-white p-3" />)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
