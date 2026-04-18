/**
 * Optional absolute API origin (e.g. https://api.example.com). No trailing slash.
 * Leave unset for same-origin requests: Vercel Services monorepo, or `npm run dev` with Vite proxy.
 * Set only when the UI is hosted separately from the FastAPI host.
 */
export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (raw == null || String(raw).trim() === "") return "";
  return String(raw).trim().replace(/\/$/, "");
}
