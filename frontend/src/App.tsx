import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { canAccess } from "./lib/access";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Alumni from "./pages/Alumni";
import Students from "./pages/Students";
import Companies from "./pages/Companies";
import Campaigns from "./pages/Campaigns";
import Events from "./pages/Events";
import Referrals from "./pages/Referrals";
import JobIntel from "./pages/JobIntel";
import Tasks from "./pages/Tasks";
import Jobs from "./pages/Jobs";
import Users from "./pages/Users";
import AuditLog from "./pages/AuditLog";
import PublicPulse from "./pages/PublicPulse";
import PublicRsvp from "./pages/PublicRsvp";
import { ReactNode } from "react";

function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  // Role can't reach this module → bounce to the Dashboard (visible to all).
  if (!canAccess(user, pathname)) return <Navigate to="/" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public, no-login forms (PRD §8) */}
      <Route path="/forms/pulse" element={<PublicPulse />} />
      <Route path="/forms/rsvp" element={<PublicRsvp />} />
      <Route path="/" element={<Protected><Dashboard /></Protected>} />
      <Route path="/alumni" element={<Protected><Alumni /></Protected>} />
      <Route path="/students" element={<Protected><Students /></Protected>} />
      <Route path="/companies" element={<Protected><Companies /></Protected>} />
      <Route path="/campaigns" element={<Protected><Campaigns /></Protected>} />
      <Route path="/events" element={<Protected><Events /></Protected>} />
      <Route path="/referrals" element={<Protected><Referrals /></Protected>} />
      <Route path="/job-intel" element={<Protected><JobIntel /></Protected>} />
      <Route path="/tasks" element={<Protected><Tasks /></Protected>} />
      <Route path="/jobs" element={<Protected><Jobs /></Protected>} />
      <Route path="/users" element={<Protected><Users /></Protected>} />
      <Route path="/audit" element={<Protected><AuditLog /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
