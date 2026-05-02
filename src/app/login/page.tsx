export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">ApolloEMS Login</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your company-issued Google Workspace email.
        </p>

        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Sign in with Google
        </button>
      </div>
    </main>
  );
}