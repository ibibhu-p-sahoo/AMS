import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import AuthShell from "../components/AuthShell";
import { Button, Input, Label } from "../components/ui";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const badLink = !uid || !token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/password-reset-confirm/", { uid, token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      const data = err?.response?.data;
      // DRF returns {password: [...]} for weak passwords, {detail: "..."} otherwise.
      setError(data?.password?.[0] || data?.detail || "Could not reset password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password you'll remember">
      {badLink ? (
        <div className="space-y-4 text-center">
          <div className="rounded-md bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
            This reset link is invalid or incomplete. Please request a new one.
          </div>
          <Link to="/forgot-password" className="block text-sm font-medium text-brand-600 hover:underline">
            Request a new link
          </Link>
        </div>
      ) : done ? (
        <div className="space-y-4 text-center">
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Password updated! Redirecting you to sign in…
          </div>
          <Link to="/login" className="block text-sm font-medium text-brand-600 hover:underline">
            Sign in now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>New password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoFocus
            />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full py-2.5 text-base shadow-md shadow-brand-600/20" disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </Button>
          <Link to="/login" className="block text-center text-sm font-medium text-brand-600 hover:underline">
            ← Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
