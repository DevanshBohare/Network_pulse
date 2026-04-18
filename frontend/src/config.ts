/**
 * Production (Vercel): set VITE_API_BASE_URL to your FastAPI origin, e.g. https://api.yourdomain.com
 * Dev: leave unset — Vite proxies /api and /ws to localhost:8000.
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim().replace(/\/$/, "");
}
