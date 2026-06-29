import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell";

export default function ForgotPassword() {
  return (
    <AuthShell title="Forgot password?" subtitle="Password resets are handled by your admin">
      <div className="space-y-5 text-center">
        <div className="rounded-md bg-brand-50 px-4 py-4 text-sm text-slate-600">
          To reset your password, please <span className="font-semibold text-slate-800">contact your administrator</span>.
          They can issue you a new password from the Users panel.
        </div>
        <a
          href="mailto:admin@institute.edu?subject=Password%20reset%20request"
          className="inline-block font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          ✉️ admin@institute.edu
        </a>
        <Link to="/login" className="block text-sm font-medium text-brand-600 hover:underline">
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
