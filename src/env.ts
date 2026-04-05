/** Production-oriented env helpers (read once at startup). */

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * CORS: unset = allow any origin (dev-friendly).
 * Production: set `CORS_ORIGIN=https://yourapp.com` or comma-separated list.
 */
export function corsOriginConfig(): boolean | string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw) return true;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  return parts.length === 1 ? parts[0]! : parts;
}

export function trustProxyEnabled(): boolean {
  const v = process.env.TRUST_PROXY?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function logLevel(): string {
  return process.env.LOG_LEVEL?.trim() || (isProduction() ? "info" : "debug");
}
