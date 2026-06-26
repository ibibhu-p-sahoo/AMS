import { User } from "./auth";

export type Role = User["role"];

const ALL: Role[] = ["admin", "coordinator", "volunteer", "alumnus", "readonly"];
const STAFF: Role[] = ["admin", "coordinator", "volunteer"];

// Which roles may access each module (by route path). Single source of truth
// for both the sidebar nav and the route guards. Admin always passes.
export const MODULE_ACCESS: Record<string, Role[]> = {
  "/": ALL,                                       // Dashboard — everyone
  "/alumni": ALL,                                 // Alumni directory — everyone
  "/students": STAFF,
  "/companies": STAFF,
  "/campaigns": STAFF,                            // Outreach
  "/events": ALL,
  "/referrals": STAFF,
  "/job-intel": ALL,
  "/jobs": ALL,                                   // Job board — everyone
  "/tasks": STAFF,
  "/users": ["admin"],
  "/audit": ["admin", "coordinator"],
};

// Internal team members (see operational metrics, pipelines, etc.).
// Externals (alumnus, read-only) get a limited, community-facing view.
export function isStaff(user: User | null): boolean {
  return !!user && (user.is_admin || user.role === "coordinator" || user.role === "volunteer");
}

export function canAccess(user: User | null, path: string): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  const allowed = MODULE_ACCESS[path];
  // Unknown paths default to allowed (e.g. wildcard redirect target).
  return allowed ? allowed.includes(user.role) : true;
}
