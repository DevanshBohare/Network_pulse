import { motion, AnimatePresence } from "framer-motion";
import { Activity, Radio } from "lucide-react";

type Props = {
  show: boolean;
  onExitComplete?: () => void;
};

export function Preloader({ show, onExitComplete }: Props) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-900"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="absolute inset-0 bg-grid-fade" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.08),transparent_65%)]" />

          <motion.div
            className="relative flex flex-col items-center gap-8"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative">
              <motion.div
                className="absolute -inset-6 rounded-full bg-accent-cyan/20 blur-2xl"
                animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-glass backdrop-blur-xl">
                <Radio className="h-9 w-9 text-accent-cyan" strokeWidth={1.5} />
              </div>
            </div>

            <div className="text-center">
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-white">
                NetworkPulse
              </h1>
              <p className="mt-2 text-sm font-medium text-zinc-400">
                Live packet intelligence · Lab-grade analytics
              </p>
            </div>

            <div className="flex w-64 flex-col gap-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent-cyan via-accent-violet to-accent-rose"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <Activity className="h-3.5 w-3.5 animate-pulse text-accent-cyan" />
                <span>Initializing interface bridge…</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
