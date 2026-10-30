import { motion } from 'motion/react';
import { Info } from 'lucide-react';
import { CountUp } from '../Reveal';
import { Skeleton } from '../ui';
export function KpiCard({ label, value, format, hint, icon, loading, index = 0 }) {
  return (<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="rounded-2xl border border-border bg-surface p-4">
    <div className="flex items-center justify-between text-sm text-muted"><span className="flex items-center gap-1.5">{label}{hint && <span title={hint} aria-label={hint}><Info className="size-3.5" /></span>}</span>{icon}</div>
    <div className="mt-2 text-2xl font-bold tabular-nums">
      {loading || value == null ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <CountUp value={value} format={format} />
      )}
    </div>    </motion.div>);
}
export const ChartCard = ({ title, children, actions, className = '' }) => (<section className={`rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
  <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-bold">{title}</h2>{actions}</div>
  {children}
</section>);
export const chartTooltip = { contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12, color: 'var(--fg)' }, labelStyle: { color: 'var(--muted)' }, cursor: { fill: 'var(--surface-2)', opacity: 0.6 } };
export const PALETTE = ['var(--brand)', 'var(--accent)', 'var(--success)', 'var(--danger)', '#8b5cf6', '#06b6d4', '#f97316', '#64748b'];
