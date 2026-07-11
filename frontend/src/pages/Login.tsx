import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Input, Label } from "../components/ui";

const FEATURES = [
  {
    title: "Connect",
    desc: "Find and connect with alumni",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-1a4 4 0 0 0-3-3.87M9 20H4v-1a4 4 0 0 1 4-4h2a4 4 0 0 1 4 4v1H9Zm0-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7.5-.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      </svg>
    ),
  },
  {
    title: "Collaborate",
    desc: "Share knowledge and opportunities",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h3l1.5 2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    ),
  },
  {
    title: "Engage",
    desc: "Participate in events and activities",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
      </svg>
    ),
  },
  {
    title: "Grow",
    desc: "Build your network and career",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10m6 10V4m6 16v-7m6 7V8" />
      </svg>
    ),
  },
];

const NETWORK_NODES = [
  { top: "8%", left: "58%", size: 56 },
  { top: "22%", left: "88%", size: 64 },
  { top: "48%", left: "76%", size: 60 },
  { top: "62%", left: "18%", size: 64 },
  { top: "82%", left: "58%", size: 56 },
];

function AvatarNode({ size }: { size: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full border-4 border-white/60 bg-gradient-to-br from-brand-200 to-violet-300 text-white shadow-lg"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-2/3 w-2/3 text-white/90">
        <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
      </svg>
    </div>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700">
      <div className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div className="relative hidden overflow-hidden lg:block">
          <svg
            className="absolute inset-0 h-full w-full text-white/10"
            viewBox="0 0 600 900"
            fill="none"
            preserveAspectRatio="xMidYMax slice"
          >
            <rect x="40" y="120" width="80" height="260" fill="currentColor" />
            <rect x="140" y="180" width="70" height="200" fill="currentColor" />
            <rect x="230" y="90" width="90" height="290" fill="currentColor" />
            <rect x="340" y="200" width="70" height="180" fill="currentColor" />
            <rect x="430" y="150" width="100" height="230" fill="currentColor" />
            {[80, 160, 240, 320, 400, 480].map((x) => (
              <g key={x} transform={`translate(${x} 620)`}>
                <circle cx="0" cy="0" r="16" fill="currentColor" />
                <path d="M-14 90 Q0 30 14 90 L20 180 L-20 180 Z" fill="currentColor" />
              </g>
            ))}
          </svg>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/80 via-indigo-700/70 to-violet-600/60" />

          <div className="relative flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-white">
                <path
                  d="M12 2 3 6l9 4 9-4-9-4Zm-6 7.5V15c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5V9.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="leading-tight">
                <p className="text-lg font-bold text-white">Alumni Management</p>
                <p className="text-lg font-bold text-violet-200">System</p>
              </div>
            </div>

            <div className="max-w-md">
              <h1 className="text-4xl font-extrabold leading-tight text-white">
                Stronger Together,
                <br />
                <span className="text-violet-200">Connected Forever</span>
              </h1>
              <div className="mt-4 h-1 w-14 rounded-full bg-violet-300" />
              <p className="mt-5 text-sm text-violet-100">
                A unified platform to connect, collaborate and grow with our alumni community.
              </p>

              <div className="mt-8 space-y-5">
                {FEATURES.map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-brand-600">
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{f.title}</p>
                      <p className="text-xs text-violet-100">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-violet-200/80">© 2026 Alumni Management System. All rights reserved.</p>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl shadow-indigo-950/30">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-500 text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
                A
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alumni Management System</h1>
              <p className="mt-1.5 text-sm text-slate-500">Sign in to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m3 6 8.4 6a2.5 2.5 0 0 0 3.2 0L23 6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
                  </svg>
                  <Input
                    type="email"
                    placeholder="you@institute.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label>Password</Label>
                  <Link
                    to="/forgot-password"
                    className="mb-1 text-xs font-medium text-brand-600 transition hover:text-brand-700 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V8a5 5 0 0 1 10 0v3m-11 0h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1Z" />
                  </svg>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.83 2.83M9.5 5.3A10.6 10.6 0 0 1 12 5c5 0 8.5 3.5 10 7-.6 1.3-1.4 2.5-2.4 3.5M6.4 6.4C4.6 7.7 3.2 9.6 2 12c1.5 3.5 5 7 10 7 1.1 0 2.1-.2 3.1-.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2 12c1.5-3.5 5-7 10-7s8.5 3.5 10 7c-1.5 3.5-5 7-10 7s-8.5-3.5-10-7Z" />
                        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full gap-2 py-2.5 text-base shadow-md shadow-brand-600/20"
                disabled={loading}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="flex gap-3 text-sm">
              <a
                href="/forms/pulse"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-brand-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6m4-2h6v6m0-6L11 14" />
                </svg>
                Hiring Pulse form
              </a>
              <a
                href="/forms/rsvp"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-brand-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
                </svg>
                Event RSVP form
              </a>
            </div>

            <p className="mt-5 text-center text-xs text-slate-400">
              Google SSO (institute email) is the production sign-in.
            </p>
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block">
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: "radial-gradient(white 1.5px, transparent 1.5px)",
              backgroundSize: "22px 22px",
            }}
          />
          <div className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-10 bottom-10 h-56 w-56 rounded-full bg-violet-300/20 blur-3xl" />

          <svg className="absolute inset-0 h-full w-full text-white/40" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="38" y1="26" x2="58" y2="8" stroke="currentColor" strokeWidth="0.4" />
            <line x1="38" y1="26" x2="88" y2="22" stroke="currentColor" strokeWidth="0.4" />
            <line x1="38" y1="26" x2="76" y2="48" stroke="currentColor" strokeWidth="0.4" />
            <line x1="38" y1="26" x2="18" y2="62" stroke="currentColor" strokeWidth="0.4" />
            <line x1="38" y1="26" x2="58" y2="82" stroke="currentColor" strokeWidth="0.4" />
            <circle cx="38" cy="26" r="1.4" fill="currentColor" />
          </svg>

          <div className="absolute left-[30%] top-[16%] flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
              <path strokeLinejoin="round" d="M12 3 3 7l9 4 9-4-9-4Zm-6 6.5V15c0 2 2.7 3.5 6 3.5s6-1.5 6-3.5V9.5" />
            </svg>
          </div>

          {NETWORK_NODES.map((n) => (
            <div key={n.top + n.left} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ top: n.top, left: n.left }}>
              <AvatarNode size={n.size} />
            </div>
          ))}

          <div className="absolute left-[24%] top-[58%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h3l1.5 2h9a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </svg>
          </div>
          <div className="absolute left-[68%] top-[80%] flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white shadow-lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
