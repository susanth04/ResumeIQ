/** Sets a lightweight cookie so middleware can route auth-only pages (not a security boundary). */

const COOKIE = "resumeiq_session";
const MAX_AGE = 60 * 60 * 24 * 7;

export function setAuthSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=1; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function clearAuthSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
