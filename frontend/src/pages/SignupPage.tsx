import { motion } from "framer-motion";
import { ArrowRight, AtSign, Lock, Radio, Sparkles, User } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell, FeaturePill, HeroBlock } from "@/components/auth/AuthShell";

export function SignupPage() {
  const nav = useNavigate();
  const { login, token } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ access_token: string }>("/api/auth/register", {
        method: "POST",
        body: { email, username, password },
      });
      login(res.access_token, username.trim());
      nav("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not register");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      accent="violet"
      reversed
      hero={
        <>
          <HeroBlock>
            <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.05]">
              Your lab-grade{" "}
              <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-rose-300 bg-clip-text text-transparent">
                command center
              </span>
              .
            </h2>
          </HeroBlock>
          <HeroBlock>
            <p className="max-w-md text-[15px] leading-relaxed text-zinc-400">
              Accounts keep sessions private on shared machines. After signup you unlock interface
              selection, BPF filters, live charts, top flows, and CSV export — all streaming over a
              single WebSocket.
            </p>
          </HeroBlock>
          <HeroBlock>
            <ul className="space-y-3.5 text-[14px] leading-snug text-zinc-400">
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-600 shadow-[0_0_12px_rgba(34,211,238,0.55)]" />
                Packet table with protocol-aware summaries
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-violet-300 to-violet-600 shadow-[0_0_12px_rgba(167,139,250,0.55)]" />
                Rolling throughput &amp; protocol mix charts
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-br from-rose-300 to-rose-600 shadow-[0_0_12px_rgba(251,113,133,0.45)]" />
                WebSocket push — zero polling latency
              </li>
            </ul>
          </HeroBlock>
          <HeroBlock>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill accent="violet">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-200/90" />
                Live dashboard
              </FeaturePill>
              <FeaturePill accent="violet">CSV export</FeaturePill>
            </div>
          </HeroBlock>
        </>
      }
      heroFooter={<p className="text-xs text-zinc-600">Computer Networks Lab · Demo build</p>}
    >
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_32px_-8px_rgba(167,139,250,0.45)]">
          <Radio className="relative h-5 w-5 text-accent-violet" />
        </div>
        <div>
          <p className="font-display text-base font-bold tracking-tight text-white">NetworkPulse</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Register
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative">
          <div className="pointer-events-none absolute -inset-px rounded-[28px] auth-form-glow-violet opacity-75 blur-xl" />
          <div className="relative rounded-[28px] p-[1px] shadow-auth-card">
            <div
              className="rounded-[28px] p-[1px]"
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.02))",
              }}
            >
              <div className="rounded-[27px] border border-white/[0.07] bg-[#070b14]/[0.97] px-7 py-9 backdrop-blur-2xl sm:px-10 sm:py-10">
                <div className="mb-8 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300/90">
                    Join the workspace
                  </p>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-[2rem]">
                    Create account
                  </h1>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    A few fields — then you are inside the live analyzer.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Email
                    </span>
                    <div className="group relative">
                      <AtSign className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-violet-300/90" />
                      <input
                        type="email"
                        className="auth-input auth-input-violet"
                        placeholder="you@university.edu"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Username
                    </span>
                    <div className="group relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-violet-300/90" />
                      <input
                        className="auth-input auth-input-violet"
                        placeholder="choose_a_username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                        minLength={3}
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Password
                    </span>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-violet-300/90" />
                      <input
                        type="password"
                        className="auth-input auth-input-violet"
                        placeholder="At least 8 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={8}
                      />
                    </div>
                  </label>

                  {err && (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-rose-500/35 bg-rose-500/[0.09] px-4 py-3 text-sm text-rose-200"
                    >
                      {err}
                    </motion.p>
                  )}

                  <button type="submit" disabled={loading} className="auth-violet-btn group flex w-full items-center justify-center gap-2">
                    <span className="relative z-[1]">{loading ? "Creating…" : "Create account"}</span>
                    <ArrowRight className="relative z-[1] h-4 w-4 transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-zinc-500">
                  Already have an account?{" "}
                  <Link
                    className="font-semibold text-violet-300/95 underline decoration-violet-500/30 underline-offset-4 transition hover:text-violet-200 hover:decoration-violet-400/50"
                    to="/login"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AuthShell>
  );
}
