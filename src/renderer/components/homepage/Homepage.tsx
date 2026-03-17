import { motion } from 'framer-motion';
import type { BaseCardSummary } from '../../../shared/types';
import { useUIStore } from '../../store/uiStore';
import { BaseCard } from './BaseCard';

interface HomepageProps {
  bases: BaseCardSummary[];
  onOpenBase: (coursePath: string) => void;
}

export function Homepage({ bases, onOpenBase }: HomepageProps) {
  const openQuickCapture = useUIStore((state) => state.openQuickCapture);

  return (
    <motion.section
      className="flex h-full flex-col items-center justify-center gap-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        className="flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/50 bg-sky-500/10 text-3xl text-sky-200 shadow-[0_0_32px_rgba(74,144,226,0.2)] transition hover:scale-105"
        onClick={openQuickCapture}
      >
        +
      </button>

      <div className="flex flex-wrap items-center justify-center gap-8">
        {bases.map((base) => (
          <BaseCard key={base.id} base={base} onOpen={() => onOpenBase(base.path)} />
        ))}
      </div>

      <p className="text-sm text-slate-400">Command Palette: Ctrl+K</p>
    </motion.section>
  );
}
