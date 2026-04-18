import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import type { ReactNode } from "react";

type Accent = "cyan" | "violet";

const accentMap: Record<
  Accent,
  { blob1: string; blob2: string; icon: string; ring: string; pillHover: string }
> = {
  cyan: {
    blob1: "bg-accent-cyan/20",
    blob2: "bg-sky-500/15",
    icon: "text-accent-cyan",
    ring: "shadow-[0_0_40px_-8px_rgba(34,211,238,0.45)]",
    pillHover: "hover:border-accent-cyan/35 hover:shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]",
  },
  violet: {
    blob1: "bg-accent-violet/20",
    blob2: "bg-fuchsia-500/12",
    icon: "text-accent-violet",
    ring: "shadow-[0_0_40px_-8px_rgba(167,139,250,0.45)]",
    pillHover: "hover:border-accent-violet/35 hover:shadow-[0_0_24px_-8px_rgba(167,139,250,0.35)]",
  },
};

type Props = {
  accent: Accent;
  reversed?: boolean;
  hero: ReactNode;
  heroFooter?: ReactNode;
  children: ReactNode;
};

const heroContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.06 },
  },
};

const heroItem = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const footerItem = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function HeroColumn({
  accent,
  hero,
  heroFooter,
}: {
  accent: Accent;
  hero: ReactNode;
  heroFooter?: ReactNode;
}) {
  const a = accentMap[accent];

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#060912]">
      <div className="pointer-events-none absolute inset-0 bg-auth-noise bg-[length:220px_220px] opacity-[0.4]" />
      <div className="pointer-events-none absolute inset-0 bg-auth-grid bg-[length:48px_48px] opacity-[0.6]" />
      <div className="pointer-events-none absolute inset-0 bg-mesh opacity-90" />
      <motion.div
        className={`pointer-events-none absolute -left-32 top-1/4 h-[min(420px,50vh)] w-[min(420px,50vw)] rounded-full ${a.blob1} blur-[100px]`}
        animate={{ scale: [1, 1.06, 1], opacity: [0.45, 0.65, 0.45] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`pointer-events-none absolute -right-24 bottom-0 h-[min(360px,45vh)] w-[min(360px,45vw)] rounded-full ${a.blob2} blur-[90px]`}
        animate={{ scale: [1, 1.05, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#060912] via-[#060912]/80 to-transparent" />

      <motion.div
        className="relative z-10 flex shrink-0 items-center gap-3 px-6 pt-8 sm:px-10 sm:pt-10 lg:px-11 lg:pt-11 xl:px-14 xl:pt-12"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div
          className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] ${a.ring} backdrop-blur-md`}
        >
          <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.12] to-transparent" />
          <Radio className={`relative h-6 w-6 ${a.icon}`} strokeWidth={1.5} />
        </div>
        <div className="leading-tight">
          <span className="font-display text-lg font-bold tracking-tight text-white">NetworkPulse</span>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">Analyzer</p>
        </div>
      </motion.div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-6 py-8 sm:px-10 lg:px-11 lg:py-10 xl:px-14">
        <motion.div
          className="mx-auto w-full max-w-xl space-y-10"
          variants={heroContainer}
          initial="hidden"
          animate="show"
        >
          {hero}
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 shrink-0 px-6 pb-8 pt-2 sm:px-10 sm:pb-10 lg:px-11 lg:pb-11 xl:px-14 xl:pb-12"
        variants={footerItem}
        initial="hidden"
        animate="show"
      >
        {heroFooter ?? <p className="text-xs text-zinc-600">© {new Date().getFullYear()} NetworkPulse</p>}
      </motion.div>
    </div>
  );
}

function FormColumn({
  accent,
  reversed,
  children,
}: {
  accent: Accent;
  reversed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 flex-col justify-center bg-[#070a12] px-5 py-10 sm:px-8 sm:py-12 lg:px-10 xl:px-12 2xl:px-16">
      <div className="pointer-events-none absolute inset-0 bg-auth-noise bg-[length:220px_220px] opacity-[0.22]" />
      <div
        className={`pointer-events-none absolute ${reversed ? "-left-24" : "-right-24"} top-1/2 h-[min(520px,70vh)] w-[min(520px,70vw)] -translate-y-1/2 rounded-full ${accent === "cyan" ? "bg-accent-cyan/[0.07]" : "bg-accent-violet/[0.08]"} blur-[120px]`}
      />
      <div className="relative z-10 mx-auto w-full max-w-[440px] lg:max-w-[min(420px,92%)] xl:max-w-[440px]">
        {children}
      </div>
    </div>
  );
}

export function AuthShell({ accent, reversed, hero, heroFooter, children }: Props) {
  const heroEl = (
    <div className="hidden min-h-0 lg:flex lg:h-full lg:flex-col">
      <HeroColumn accent={accent} hero={hero} heroFooter={heroFooter} />
    </div>
  );

  const formEl = (
    <div className="flex min-h-[100dvh] flex-col lg:min-h-0 lg:h-full">
      <FormColumn accent={accent} reversed={!!reversed}>
        {children}
      </FormColumn>
    </div>
  );

  return (
    <div className="grid min-h-[100dvh] w-full grid-cols-1 lg:h-[100dvh] lg:grid-cols-2 lg:overflow-hidden">
      {reversed ? (
        <>
          {formEl}
          {heroEl}
        </>
      ) : (
        <>
          {heroEl}
          {formEl}
        </>
      )}
    </div>
  );
}

export function HeroBlock({ children }: { children: ReactNode }) {
  return <motion.div variants={heroItem}>{children}</motion.div>;
}

export function FeaturePill({
  children,
  accent,
}: {
  children: ReactNode;
  accent: Accent;
}) {
  const hover = accentMap[accent].pillHover;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-medium tracking-wide text-zinc-400 backdrop-blur-sm transition ${hover}`}
    >
      {children}
    </span>
  );
}
