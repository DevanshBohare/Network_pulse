import { motion } from "framer-motion";
import { ArrowRight, Lock, Radio, User, Zap } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { apiFetch } from "@/api";
import { useAuth } from "@/auth";
import { AuthShell, FeaturePill, HeroBlock } from "@/components/auth/AuthShell";

export function LoginPage() {
  const nav = useNavigate();
  const { login, token } = useAuth();
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
      const res = await apiFetch<{ access_token: string }>("/api/auth/login", {
        method: "POST",
        body: { username, password },
      });
      login(res.access_token, username.trim());
      nav("/", { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      accent="cyan"
      hero={
        <>
          <HeroBlock>
            <h2 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-[2.75rem] sm:leading-[1.05]">
              See your network in{" "}
              <span className="relative inline-block">
                <span
                  className="bg-[length:220%_100%] bg-clip-text text-transparent animate-gradient-x"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #67e8f9, #38bdf8, #818cf8, #67e8f9)",
                  }}
                >
                  real time
                </span>
                <span
                  className="pointer-events-none absolute -bottom-1 left-0 right-0 h-px opacity-60"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(34,211,238,0.8), transparent)",
                  }}
                />
              </span>
              .
            </h2>
          </HeroBlock>
          <HeroBlock>
            <p className="max-w-md text-[15px] leading-relaxed text-zinc-400">
              Live Scapy capture, protocol breakdown, throughput curves, and exportable traces — tuned
              for serious lab demos that still feel{" "}
              <span className="font-medium text-zinc-300">designed</span>, not default-themed.
            </p>
          </HeroBlock>
          <HeroBlock>
            <div className="flex flex-wrap gap-2.5">
              <FeaturePill accent="cyan">
                <Zap className="h-3.5 w-3.5 shrink-0 text-cyan-300/90" />
                BPF filters
              </FeaturePill>
              <FeaturePill accent="cyan">WebSocket stream</FeaturePill>
              <FeaturePill accent="cyan">JWT auth</FeaturePill>
            </div>
          </HeroBlock>
        </>
      }
    >
      {/* Mobile brand */}
      <div className="mb-8 flex items-center gap-3 lg:hidden">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_0_32px_-8px_rgba(34,211,238,0.4)]">
          <Radio className="relative h-5 w-5 text-accent-cyan" />
        </div>
        <div>
          <p className="font-display text-base font-bold tracking-tight text-white">NetworkPulse</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
            Sign in
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative">
          <div className="pointer-events-none absolute -inset-px rounded-[28px] auth-form-glow-cyan opacity-70 blur-xl" />
          <div className="relative rounded-[28px] p-[1px] shadow-auth-card">
            <div
              className="rounded-[28px] p-[1px]"
              style={{
                background:
                  "linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05) 42%, rgba(255,255,255,0.02))",
              }}
            >
              <div className="rounded-[27px] border border-white/[0.07] bg-[#070b14]/[0.97] px-7 py-9 backdrop-blur-2xl sm:px-10 sm:py-10">
                <div className="mb-8 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-400/90">
                    Secure access
                  </p>
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-[2rem]">
                    Welcome back
                  </h1>
                  <p className="text-sm leading-relaxed text-zinc-500">
                    Sign in to launch the live analyzer dashboard.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Username
                    </span>
                    <div className="group relative">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-cyan-300/90" />
                      <input
                        className="auth-input auth-input-cyan"
                        placeholder="lab_user"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        required
                      />
                    </div>
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                      Password
                    </span>
                    <div className="group relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition group-focus-within:text-cyan-300/90" />
                      <input
                        type="password"
                        className="auth-input auth-input-cyan"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
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

                  <button type="submit" disabled={loading} className="auth-primary-btn group flex w-full items-center justify-center gap-2">
                    <span className="relative z-[1]">{loading ? "Signing in…" : "Continue"}</span>
                    <ArrowRight className="relative z-[1] h-4 w-4 transition group-hover:translate-x-0.5" />
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-zinc-500">
                  New here?{" "}
                  <Link
                    className="font-semibold text-cyan-300/95 underline decoration-cyan-500/30 underline-offset-4 transition hover:text-cyan-200 hover:decoration-cyan-400/50"
                    to="/signup"
                  >
                    Create an account
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
