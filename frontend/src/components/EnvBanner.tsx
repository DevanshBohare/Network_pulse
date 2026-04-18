import { getApiBase } from "@/config";

/** Shown on production builds when VITE_API_BASE_URL was not set at build time (e.g. misconfigured Vercel env). */
export function EnvBanner() {
  if (!import.meta.env.PROD || getApiBase()) return null;
  return (
    <div className="border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-100">
      <strong className="text-amber-50">API URL not configured.</strong> Set{" "}
      <code className="rounded bg-black/30 px-1 font-mono">VITE_API_BASE_URL</code> in Vercel → Settings →
      Environment Variables, then redeploy. See <code className="font-mono">VERCEL.md</code> in the repo.
    </div>
  );
}
