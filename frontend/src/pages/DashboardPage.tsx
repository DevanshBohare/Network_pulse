import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpRight,
  BarChart3,
  Bell,
  ChevronRight,
  Database,
  Filter,
  Gauge,
  LayoutDashboard,
  Layers,
  LogOut,
  Network,
  Pause,
  Play,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  CircleCheck,
  CircleX,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiFetch } from "@/api";
import { useAuth } from "@/auth";
import { useLivePackets } from "@/hooks/useLivePackets";
import type { PacketRow, StatsSnapshot } from "@/types";

type Iface = { id: string; label: string; ssid?: string };

type CaptureHealth = {
  pcap_available: boolean;
  running_as_admin: boolean | null;
  npcap_service_status: string | null;
  note: string;
};

const PURPLE = "#8b5cf6";
const PINK = "#ec4899";
const ORANGE = "#fb923c";
const CYAN = "#22d3ee";
const TEAL = "#2dd4bf";
const CHART_COLORS = [PURPLE, PINK, ORANGE, CYAN, TEAL, "#60a5fa", "#f472b6"];

function formatTs(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString(undefined, {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function exportCsv(rows: PacketRow[]) {
  const header = ["time", "layer", "src_ip", "dst_ip", "sport", "dport", "length", "info"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    lines.push(
      [
        new Date(r.ts * 1000).toISOString(),
        r.layer,
        r.src_ip ?? "",
        r.dst_ip ?? "",
        r.sport ?? "",
        r.dport ?? "",
        r.length,
        esc(r.info || ""),
      ].join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `networkpulse-capture-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function useBitrate(stats: StatsSnapshot | null) {
  const ref = useRef({ bytes: 0, t: 0 });
  const [mbps, setMbps] = useState(0);
  useEffect(() => {
    if (!stats) return;
    const now = Date.now() / 1000;
    const b = stats.bytes_total;
    const prev = ref.current;
    if (prev.t === 0) {
      ref.current = { bytes: b, t: now };
      return;
    }
    const dt = now - prev.t;
    if (dt <= 0) return;
    const db = b - prev.bytes;
    const m = (db * 8) / dt / 1_000_000;
    setMbps(Math.max(0, Math.min(m, 10_000)));
    ref.current = { bytes: b, t: now };
  }, [stats]);
  return mbps;
}

function StatMini({
  icon: Icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: typeof Zap;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-4 shadow-lg shadow-black/20 backdrop-blur-sm transition hover:border-brand-500/20">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-600" />
      </div>
      <p className="font-display text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-zinc-500">{label}</p>
      {sub && <p className="mt-0.5 text-[11px] text-zinc-600">{sub}</p>}
    </div>
  );
}

export function DashboardPage() {
  const { token, username, logout } = useAuth();
  const [ifaces, setIfaces] = useState<Iface[]>([]);
  const [iface, setIface] = useState<string>("");
  const [bpf, setBpf] = useState("");
  const [capLoading, setCapLoading] = useState(false);
  const [capErr, setCapErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<string>("all");
  const [frozen, setFrozen] = useState(false);
  const [frozenRows, setFrozenRows] = useState<PacketRow[]>([]);
  const [selected, setSelected] = useState<PacketRow | null>(null);
  const [ppsSeries, setPpsSeries] = useState<{ t: string; pps: number }[]>([]);
  const [nav, setNav] = useState<"overview" | "capture" | "analytics">("overview");
  const [captureHealth, setCaptureHealth] = useState<CaptureHealth | null>(null);

  const { packets, stats, connected, wsError, serverError, clearBuffers } = useLivePackets(
    token,
    !!token,
  );

  const mbps = useBitrate(stats);

  useEffect(() => {
    if (!stats) return;
    setPpsSeries((prev) => {
      const next = [
        ...prev,
        { t: new Date().toLocaleTimeString(undefined, { hour12: false }), pps: stats.packets_per_sec },
      ];
      return next.slice(-45);
    });
  }, [stats]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const [ifRes, healthRes] = await Promise.all([
          apiFetch<{ interfaces: Iface[] }>("/api/interfaces", { token }),
          apiFetch<CaptureHealth>("/api/capture/health", { token }),
        ]);
        setIfaces(ifRes.interfaces);
        setIface((prev) => prev || (ifRes.interfaces[0]?.id ?? ""));
        setCaptureHealth(healthRes);
      } catch {
        setIfaces([]);
      }
    })();
  }, [token]);

  const selectedIface = useMemo(() => ifaces.find((i) => i.id === iface), [ifaces, iface]);

  const displayPackets = frozen ? frozenRows : packets;

  const layers = useMemo(() => {
    const s = new Set<string>();
    for (const p of displayPackets) s.add(p.layer);
    return ["all", ...Array.from(s).sort()];
  }, [displayPackets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayPackets.filter((p) => {
      if (layerFilter !== "all" && p.layer !== layerFilter) return false;
      if (!q) return true;
      const hay = [
        p.src_ip,
        p.dst_ip,
        p.layer,
        p.info,
        p.sport?.toString(),
        p.dport?.toString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [displayPackets, search, layerFilter]);

  const topTalkers = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of displayPackets) {
      const a = p.src_ip || "—";
      const b = p.dst_ip || "—";
      if (a !== "—" || b !== "—") {
        const key = `${a} → ${b}`;
        m.set(key, (m.get(key) ?? 0) + 1);
      }
    }
    return Array.from(m.entries())
      .sort((x, y) => y[1] - x[1])
      .slice(0, 8);
  }, [displayPackets]);

  const pieData = useMemo(() => {
    const src = stats?.by_layer ?? {};
    return Object.entries(src)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  const { tcpPct, udpPct } = useMemo(() => {
    const bl = stats?.by_layer ?? {};
    const t = stats?.total_packets || 0;
    if (!t) return { tcpPct: 0, udpPct: 0 };
    const tcp = bl["TCP"] ?? 0;
    const udp = bl["UDP"] ?? 0;
    return {
      tcpPct: Math.round((tcp / t) * 100),
      udpPct: Math.round((udp / t) * 100),
    };
  }, [stats]);

  const activityScore = useMemo(() => {
    const pps = stats?.packets_per_sec ?? 0;
    return Math.min(100, Math.round(Math.log10(pps + 1) * 33));
  }, [stats]);

  const gaugeData = [{ name: "Activity", value: activityScore, fill: PURPLE }];

  const toggleFreeze = useCallback(() => {
    if (!frozen) {
      setFrozenRows(packets);
      setFrozen(true);
    } else {
      setFrozen(false);
    }
  }, [frozen, packets]);

  async function startCapture() {
    if (!token) return;
    setCapErr(null);
    setCapLoading(true);
    try {
      await apiFetch("/api/capture/start", {
        method: "POST",
        token,
        body: { interface: iface || null, bpf_filter: bpf || null, force: true },
      });
      clearBuffers();
      setCapErr(null);
    } catch (e) {
      setCapErr(e instanceof Error ? e.message : "Start failed");
    } finally {
      setCapLoading(false);
    }
  }

  async function stopCapture() {
    if (!token) return;
    setCapLoading(true);
    try {
      await apiFetch("/api/capture/stop", { method: "POST", token });
      setCapErr(null);
    } catch (e) {
      setCapErr(e instanceof Error ? e.message : "Stop failed");
    } finally {
      setCapLoading(false);
    }
  }

  const activityLabel =
    activityScore >= 70 ? "High" : activityScore >= 35 ? "Moderate" : activityScore > 0 ? "Low" : "Idle";

  return (
    <div className="flex min-h-[100dvh] bg-[#0c0c10] text-zinc-100">
      {/* Sidebar — Vertex-style (desktop) */}
      <aside className="fixed left-0 top-0 z-40 hidden h-[100dvh] w-64 flex-col border-r border-white/[0.06] bg-[#101018] px-4 pb-6 pt-8 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-500/25">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-display text-sm font-bold tracking-tight text-white">NetworkPulse</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-400/90">Analyzer</p>
          </div>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-1 text-sm">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">General</p>
          <button
            type="button"
            onClick={() => setNav("overview")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
              nav === "overview"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </button>
          <button
            type="button"
            onClick={() => {
              setNav("capture");
              document.getElementById("capture-panel")?.scrollIntoView({ behavior: "smooth" });
            }}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
              nav === "capture"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Wifi className="h-4 w-4" />
            Live capture
          </button>
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Insights</p>
          <button
            type="button"
            onClick={() => setNav("analytics")}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition ${
              nav === "analytics"
                ? "bg-brand-600 text-white shadow-md shadow-brand-600/30"
                : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Analytics
          </button>
          <button
            type="button"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-zinc-400 transition hover:bg-white/[0.04] hover:text-white"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>

        <div className="rounded-2xl border border-brand-500/20 bg-gradient-to-br from-brand-600/15 to-transparent p-4">
          <p className="text-xs font-medium leading-snug text-zinc-300">Npcap + admin required for raw capture on Windows.</p>
          <a
            className="mt-2 inline-block text-xs font-semibold text-brand-400 hover:text-brand-300"
            href="https://npcap.com/"
            target="_blank"
            rel="noreferrer"
          >
            Install Npcap →
          </a>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-white/[0.06]"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex flex-col gap-4 border-b border-white/[0.06] bg-[#0c0c10]/95 px-4 py-4 backdrop-blur-xl sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="mr-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 lg:hidden">
              <Radio className="h-5 w-5 text-white" />
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 text-sm font-bold text-white ring-2 ring-brand-500/30">
              {(username || "?").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm text-zinc-500">Welcome back</p>
              <p className="font-display text-lg font-semibold text-white">{username || "Operator"}</p>
            </div>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3 sm:max-w-xl sm:pl-8">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="w-full rounded-xl border border-white/[0.08] bg-panel-raised py-2.5 pl-10 pr-4 text-sm text-white outline-none ring-0 placeholder:text-zinc-600 focus:border-brand-500/40"
                placeholder="Search packets, IPs, ports…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-panel-raised text-zinc-400 transition hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                connected
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
              {connected ? "Live" : "WS"}
            </div>
          </div>
        </header>

        <main className="flex-1 space-y-6 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          {captureHealth && (
            <section className="rounded-2xl border border-white/[0.08] bg-panel-raised/70 p-4 sm:p-5">
              <h3 className="mb-3 font-display text-sm font-semibold text-white">Capture diagnostics</h3>
              <p className="mb-4 text-xs leading-relaxed text-zinc-500">{captureHealth.note}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
                  {captureHealth.pcap_available ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <CircleX className="h-4 w-4 shrink-0 text-red-400" />
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Pcap stack</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {captureHealth.pcap_available ? "Available (Npcap OK)" : "Not available"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
                  {captureHealth.running_as_admin === true ? (
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : captureHealth.running_as_admin === false ? (
                    <CircleX className="h-4 w-4 shrink-0 text-amber-400" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-zinc-600" />
                  )}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">API process</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {captureHealth.running_as_admin === true
                        ? "Running as Administrator"
                        : captureHealth.running_as_admin === false
                          ? "Not elevated — use Run as administrator"
                          : "Unknown (non-Windows)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Npcap service</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {captureHealth.npcap_service_status ?? "Not queried (driver may still work)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Wi-Fi name</p>
                    <p className="text-sm font-medium text-zinc-200">
                      {selectedIface?.ssid
                        ? `Profile: ${selectedIface.ssid}`
                        : "Pick Wi-Fi adapter — SSID is the active Windows profile"}
                    </p>
                  </div>
                </div>
              </div>
              {captureHealth.running_as_admin === false && (
                <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-xs leading-relaxed text-amber-100/95">
                  <strong className="text-amber-50">Elevate the backend:</strong> Stop the API in your terminal, then either
                  double-click <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">run-backend-as-admin.bat</code>{" "}
                  in the project folder (approves UAC), or open <strong>PowerShell as Administrator</strong>,{" "}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">cd</code> into{" "}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">backend</code>, and run{" "}
                  <code className="rounded bg-black/30 px-1.5 py-0.5 font-mono text-[11px]">python run.py</code>. Refresh this
                  page after it starts — &quot;API process&quot; should turn green.
                </p>
              )}
            </section>
          )}

          {(wsError || serverError || capErr) && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.12] px-4 py-4 text-sm text-amber-50">
              <div className="flex gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                <div className="space-y-2">
                  <p className="font-semibold text-amber-100">Capture issue</p>
                  <p className="leading-relaxed text-amber-100/90">
                    If you see WinPcap/Npcap errors: install{" "}
                    <a className="font-semibold text-white underline" href="https://npcap.com/" target="_blank" rel="noreferrer">
                      Npcap
                    </a>{" "}
                    and run the backend terminal <strong className="text-white">as Administrator</strong>. Start now sends{" "}
                    <code className="rounded bg-black/20 px-1 font-mono text-[11px]">force: true</code> so a stale
                    &quot;already running&quot; state is cleared automatically.
                  </p>
                  {serverError && <p className="text-xs text-amber-200/80">Details: {serverError}</p>}
                  {capErr && <p className="text-xs text-amber-200/80">{capErr}</p>}
                  {wsError && <p className="text-xs text-amber-200/80">{wsError}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Top metrics + gauge */}
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-6 lg:gap-4">
            <div className="col-span-1 lg:col-span-1">
              <StatMini
                icon={Zap}
                iconBg="bg-gradient-to-br from-orange-500 to-rose-600"
                label="Packets / sec"
                value={(stats?.packets_per_sec ?? 0).toFixed(1)}
                sub="Live rate"
              />
            </div>
            <div className="col-span-1 lg:col-span-1">
              <StatMini
                icon={Database}
                iconBg="bg-gradient-to-br from-brand-500 to-indigo-700"
                label="Total packets"
                value={String(stats?.total_packets ?? 0)}
              />
            </div>
            <div className="col-span-1 lg:col-span-1">
              <StatMini
                icon={Gauge}
                iconBg="bg-gradient-to-br from-cyan-500 to-blue-700"
                label="Throughput"
                value={`${mbps.toFixed(2)} Mbps`}
              />
            </div>
            <div className="col-span-1 lg:col-span-1">
              <StatMini
                icon={Network}
                iconBg="bg-gradient-to-br from-teal-500 to-emerald-700"
                label="TCP share"
                value={`${tcpPct}%`}
              />
            </div>
            <div className="col-span-1 lg:col-span-1">
              <StatMini
                icon={Activity}
                iconBg="bg-gradient-to-br from-pink-500 to-purple-700"
                label="UDP share"
                value={`${udpPct}%`}
              />
            </div>
            <div className="col-span-2 flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-panel-raised/90 p-4 lg:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Live activity</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    activityScore >= 70
                      ? "bg-orange-500/20 text-orange-300"
                      : activityScore >= 35
                        ? "bg-amber-500/20 text-amber-200"
                        : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {activityLabel}
                </span>
              </div>
              <div className="relative mx-auto h-[130px] w-full max-w-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    cx="50%"
                    cy="85%"
                    innerRadius="55%"
                    outerRadius="100%"
                    barSize={10}
                    data={gaugeData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: "#2a2a35" }}
                      dataKey="value"
                      cornerRadius={8}
                      fill={PURPLE}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pt-4 text-center">
                  <span className="font-display text-3xl font-bold text-white">{activityScore}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Score</span>
                </div>
              </div>
            </div>
          </section>

          {/* Charts row */}
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-5 backdrop-blur-sm lg:col-span-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base font-semibold text-white">Traffic timeline</h3>
                  <p className="text-xs text-zinc-500">Packets per second (rolling)</p>
                </div>
                <span className="rounded-lg border border-white/[0.06] bg-black/20 px-2 py-1 text-[11px] text-zinc-400">
                  Live
                </span>
              </div>
              <div className="h-[280px] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ppsSeries}>
                    <defs>
                      <linearGradient id="pv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PURPLE} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={PURPLE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="t" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "#1a1a24",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pps"
                      stroke={PURPLE}
                      strokeWidth={2}
                      fill="url(#pv)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-5 backdrop-blur-sm lg:col-span-4">
              <h3 className="font-display text-base font-semibold text-white">Protocol mix</h3>
              <p className="mb-4 text-xs text-zinc-500">By decoded layer</p>
              <div className="h-[280px]">
                {pieData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                    Start capture to see distribution
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a24",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <ul className="mt-2 space-y-1.5 border-t border-white/[0.06] pt-3">
                {pieData.slice(0, 5).map((p, i) => (
                  <li key={p.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      {p.name}
                    </span>
                    <span className="font-mono text-zinc-300">{p.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Capture */}
          <section id="capture-panel" className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Wifi className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-lg font-semibold text-white">Capture controls</h3>
            </div>
            <p className="mb-6 max-w-3xl text-sm leading-relaxed text-zinc-500">
              Pick a network interface (friendly names come from Windows when Npcap is installed), optionally add a{" "}
              <a
                href="https://www.tcpdump.org/manpages/pcap-filter.7.html"
                className="text-brand-400 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                BPF
              </a>{" "}
              filter, then start. Raw capture needs privileges. You do not choose an SSID here: connect to the Wi-Fi
              network in Windows, then capture on the <strong className="text-zinc-400">Wi-Fi adapter</strong> — the
              SSID below is whatever Windows reports for that adapter.
            </p>
            {selectedIface?.ssid && (
              <p className="mb-4 rounded-xl border border-brand-500/25 bg-brand-500/[0.07] px-4 py-3 text-sm text-zinc-200">
                <span className="font-semibold text-brand-300">Active profile / SSID (from Windows): </span>
                {selectedIface.ssid}
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
              <label className="lg:col-span-4">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Interface
                </span>
                <select
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c10] py-3 pl-3 pr-8 text-sm text-white outline-none focus:border-brand-500/40"
                  value={iface}
                  title={ifaces.find((x) => x.id === iface)?.id}
                  onChange={(e) => setIface(e.target.value)}
                >
                  {ifaces.length === 0 && <option value="">(no interfaces — check Npcap / admin)</option>}
                  {ifaces.map((i) => (
                    <option key={i.id} value={i.id} title={i.id}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="lg:col-span-5">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  BPF filter (optional)
                </span>
                <input
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0c0c10] py-3 px-3 font-mono text-sm text-white outline-none placeholder:text-zinc-600 focus:border-brand-500/40"
                  placeholder="tcp port 443"
                  value={bpf}
                  onChange={(e) => setBpf(e.target.value)}
                />
              </label>
              <div className="flex gap-2 lg:col-span-3">
                <button
                  type="button"
                  disabled={capLoading || !iface}
                  onClick={startCapture}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:brightness-110 disabled:opacity-40"
                >
                  <Play className="h-4 w-4" />
                  Start
                </button>
                <button
                  type="button"
                  disabled={capLoading}
                  onClick={stopCapture}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
                >
                  <Pause className="h-4 w-4" />
                  Stop
                </button>
              </div>
            </div>
          </section>

          {/* Table + flows */}
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-5 lg:col-span-8">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-pink-400" />
                  <h3 className="font-display text-base font-semibold text-white">Packet details</h3>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[11px] text-zinc-400">
                    {filtered.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      className="appearance-none rounded-xl border border-white/[0.08] bg-[#0c0c10] py-2 pl-9 pr-8 text-sm outline-none focus:border-brand-500/40"
                      value={layerFilter}
                      onChange={(e) => setLayerFilter(e.target.value)}
                    >
                      {layers.map((l) => (
                        <option key={l} value={l}>
                          {l === "all" ? "All layers" : l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={toggleFreeze}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      frozen
                        ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                        : "border-white/[0.08] bg-white/[0.04] text-zinc-300"
                    }`}
                  >
                    {frozen ? "Resume" : "Freeze"}
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCsv(filtered)}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-200 hover:bg-white/[0.08]"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-white/[0.05]">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-black/20 text-[11px] uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Layer</th>
                      <th className="px-4 py-3 font-semibold">Source</th>
                      <th className="px-4 py-3 font-semibold">Destination</th>
                      <th className="px-4 py-3 font-semibold">Ports</th>
                      <th className="px-4 py-3 font-semibold">Len</th>
                      <th className="px-4 py-3 font-semibold">Info</th>
                      <th className="px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filtered
                      .slice()
                      .reverse()
                      .slice(0, 100)
                      .map((p) => (
                        <tr
                          key={p.id}
                          className="cursor-pointer font-mono text-[13px] text-zinc-300 transition hover:bg-white/[0.03]"
                          onClick={() => setSelected(p)}
                        >
                          <td className="whitespace-nowrap px-4 py-2.5 text-zinc-500">{formatTs(p.ts)}</td>
                          <td className="px-4 py-2.5">
                            <span className="rounded-md bg-brand-600/20 px-2 py-0.5 text-xs text-brand-300">
                              {p.layer}
                            </span>
                          </td>
                          <td className="max-w-[140px] truncate px-4 py-2.5">{p.src_ip ?? "—"}</td>
                          <td className="max-w-[140px] truncate px-4 py-2.5">{p.dst_ip ?? "—"}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-zinc-400">
                            {p.sport ?? "—"} → {p.dport ?? "—"}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">{p.length}</td>
                          <td className="max-w-[200px] truncate px-4 py-2.5 text-zinc-500">{p.info}</td>
                          <td className="px-2 py-2.5 text-zinc-600">
                            <ChevronRight className="h-4 w-4" />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="py-12 text-center text-sm text-zinc-500">No packets in view.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-panel-raised/80 p-5 lg:col-span-4">
              <h3 className="mb-1 font-display text-base font-semibold text-white">Top flows</h3>
              <p className="mb-4 text-xs text-zinc-500">By packet count</p>
              <ul className="space-y-2">
                {topTalkers.length === 0 && (
                  <li className="text-sm text-zinc-500">No flows yet.</li>
                )}
                {topTalkers.map(([k, v], idx) => (
                  <li
                    key={k}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600/40 to-purple-900/40 text-xs font-bold text-brand-200">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-zinc-300" title={k}>
                        {k}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-pink-500"
                          style={{
                            width: `${Math.min(100, (v / (topTalkers[0]?.[1] || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-zinc-400">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#14141c] p-6 shadow-2xl"
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 16, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-display text-lg font-semibold text-white">Packet detail</h4>
                  <p className="font-mono text-xs text-zinc-500">{selected.id}</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="rounded-xl border border-white/[0.08] p-2 text-zinc-400 hover:bg-white/[0.06]"
                  onClick={() => setSelected(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <dl className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 text-sm">
                <dt className="text-zinc-500">Timestamp</dt>
                <dd className="font-mono text-zinc-200">{new Date(selected.ts * 1000).toISOString()}</dd>
                <dt className="text-zinc-500">Layer</dt>
                <dd className="text-brand-400">{selected.layer}</dd>
                <dt className="text-zinc-500">Ethernet</dt>
                <dd className="break-all font-mono text-xs text-zinc-400">
                  {selected.eth_src ?? "—"} → {selected.eth_dst ?? "—"}
                </dd>
                <dt className="text-zinc-500">IP</dt>
                <dd className="break-all font-mono text-xs">
                  {selected.src_ip ?? "—"} → {selected.dst_ip ?? "—"}
                </dd>
                <dt className="text-zinc-500">Ports</dt>
                <dd className="font-mono">
                  {selected.sport ?? "—"} → {selected.dport ?? "—"}
                </dd>
                <dt className="text-zinc-500">Length</dt>
                <dd className="font-mono">{selected.length} B</dd>
                <dt className="text-zinc-500">Summary</dt>
                <dd className="text-zinc-300">{selected.info || "—"}</dd>
              </dl>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
