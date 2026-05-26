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
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 pb-5 md:flex-row">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Dispatch Schedule</h1>
            <p className="mt-1 text-sm text-slate-600">Read-only weekly schedule view</p>
            <div className="mt-2 text-xs text-slate-500">Loaded {assignments.length} assignments</div>
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-500">
            <span>Powered by</span>
            <Image src="/apollo-logo.png" alt="ApolloEMS" width={80} height={80} className="h-12 w-auto" />
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600 md:grid-cols-7">
          {Array.from({ length: 7 }, (_, index) => {
            const today = new Date();
            const date = new Date(today);
            date.setDate(today.getDate() - today.getDay() + index);
            const isToday = date.toDateString() === today.toDateString();
            return <div key={index} className={`rounded-xl border p-4 ${isToday ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}`}>{date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}</div>;
          })}
        </div>
      </div>
    </main>
  );
}
