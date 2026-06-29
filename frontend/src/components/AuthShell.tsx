import { ReactNode } from "react";

/** Centered gradient card used by the public auth pages (login / password reset). */
export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
