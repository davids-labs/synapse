import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore } from '../../store/toastStore';

const TONE_STYLES = {
  info: 'border-sky-400/30 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
  error: 'border-red-400/30 bg-red-500/10 text-red-100',
} as const;

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), 3600),
    );

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer);
      }
    };
  }, [dismissToast, toasts]);

  return (
    <div className="pointer-events-none absolute right-4 top-16 z-[70] flex w-96 flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${TONE_STYLES[toast.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-1 text-xs opacity-85">{toast.description}</p>
                )}
              </div>
              <button
                className="text-xs opacity-70 transition hover:opacity-100"
                onClick={() => dismissToast(toast.id)}
              >
                Close
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
