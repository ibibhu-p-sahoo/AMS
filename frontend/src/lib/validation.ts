/** Basic email format check (text@text.tld). Domain existence is verified
 *  server-side via an MX lookup — see backend DeliverableEmailField. */
export function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v ?? "").trim());
}
