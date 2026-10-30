import { Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
export function QtyStepper({ value, onChange, max = 20, min = 1, size = 'md', disabled }) {
    const h = size === 'sm' ? 'h-9' : 'h-11';
    const btn = cn('grid aspect-square place-items-center transition hover:bg-surface2 disabled:opacity-40', h);
    return (<div className={cn('inline-flex items-center overflow-hidden rounded-xl border border-border', h)} role="group" aria-label="Quantity">
      <button type="button" className={btn} aria-label="Decrease quantity" disabled={disabled || value <= min} onClick={() => onChange(value - 1)}><Minus className="size-4"/></button>
      <div className="relative w-9 overflow-hidden text-center text-sm font-semibold tabular-nums" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={value} className="block" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.12 }}>{value}</motion.span>
        </AnimatePresence>
      </div>
      <button type="button" className={btn} aria-label="Increase quantity" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Plus className="size-4"/></button>
    </div>);
}
