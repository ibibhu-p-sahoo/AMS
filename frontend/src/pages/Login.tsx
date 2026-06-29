import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Button, Input, Label } from "../components/ui";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      {/* Decorative background glows */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-indigo-300/30 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-slate-300/40 backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-500 text-2xl font-bold text-white shadow-lg shadow-brand-600/30">
              A
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Alumni Management System</h1>
            <p className="mt-1.5 text-sm text-slate-500">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="you@institute.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
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
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
            )}
            <Button type="submit" className="w-full py-2.5 text-base shadow-md shadow-brand-600/20" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex justify-center gap-6 text-sm">
            <a href="/forms/pulse" className="font-medium text-brand-600 transition hover:text-brand-700 hover:underline">
              Hiring Pulse form
            </a>
            <a href="/forms/rsvp" className="font-medium text-brand-600 transition hover:text-brand-700 hover:underline">
              Event RSVP form
            </a>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-400">
          Google SSO (institute email) is the production sign-in.
        </p>
      </div>
    </div>
  );
}
