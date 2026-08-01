'use client';

import { useState } from 'react';

export default function DispatchLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function loginDispatch() {
    if (username === 'Dispatch' && password === 'Sequoia') {
      document.cookie = 'apollo_dispatch_session=active; path=/; max-age=43200; SameSite=Lax';
      window.location.href = '/dispatch';
      return;
    }

    setError('Invalid username or password.');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-900">Dispatch Login</h1>
        <p className="mt-2 text-sm text-slate-600">Read-only schedule access for dispatch partners.</p>

        <div className="mt-6 space-y-3">
          <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500" />

          <button type="button" onClick={loginDispatch} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700">
            Login
          </button>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
      </div>
    </main>
  );
}
