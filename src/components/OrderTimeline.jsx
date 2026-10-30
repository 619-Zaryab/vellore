import { motion } from 'motion/react';
import { Check, CircleAlert } from 'lucide-react';
import { ORDER_FLOW, STATUS_LABEL } from '@/lib/constants';
import { cn, formatDate } from '@/lib/utils';
export function OrderTimeline({ order }) {
    const exception = ['cancelled', 'payment_failed', 'refund_pending', 'refunded', 'payment_pending'].includes(order.status);
    const at = (s) => order.statusHistory?.filter((h) => h.status === s).pop()?.at;
    const idx = ORDER_FLOW.indexOf(order.status);
    // For an order that never progressed (cancelled while pending), only show history that actually happened.
    const reached = (s, i) => (idx >= 0 ? i <= idx : !!at(s));
    return (<div className="space-y-5">
      {exception && (<div className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm', order.status === 'payment_pending' ? 'border-warning/40 bg-warning/10' : 'border-danger/30 bg-danger/10')}>
          <CircleAlert className="mt-0.5 size-5 shrink-0"/>
          <div><p className="font-semibold">{STATUS_LABEL[order.status]}</p><p className="text-muted">{formatDate(at(order.status), true)}{order.statusHistory?.filter((h) => h.status === order.status).pop()?.note ? ` - ${order.statusHistory.filter((h) => h.status === order.status).pop()?.note}` : ''}</p></div>
        </div>)}
      <ol className="grid grid-cols-5 gap-1 sm:gap-2">
        {ORDER_FLOW.map((s, i) => {
            const done = reached(s, i);
            const current = order.status === s;
            return (<li key={s} className="relative flex flex-col items-center text-center">
              {i > 0 && (<span className="absolute right-1/2 top-4 h-0.5 w-full bg-border" aria-hidden>
                  <motion.span className="block h-full origin-left bg-brand" initial={{ scaleX: 0 }} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.5, delay: i * 0.1 }}/>
                </span>)}
              <motion.span initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1, type: 'spring' }} className={cn('relative z-10 grid size-8 place-items-center rounded-full border-2 text-xs font-bold', done ? 'border-brand bg-brand text-brand-fg' : 'border-border bg-surface text-muted', current && 'ring-4 ring-brand/20')}>
                {done ? <Check className="size-4"/> : i + 1}
              </motion.span>
              <span className={cn('mt-2 text-[11px] font-semibold sm:text-xs', done ? 'text-fg' : 'text-muted')}>{STATUS_LABEL[s]}</span>
              <span className="hidden text-[11px] text-muted sm:block">{at(s) ? formatDate(at(s)) : ''}</span>
            </li>);
        })}
      </ol>
      <details className="rounded-2xl border border-border p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Status history</summary>
        <ul className="mt-3 space-y-2">
          {order.statusHistory?.map((h, i) => <li key={i} className="flex justify-between gap-4"><span>{STATUS_LABEL[h.status]}{h.note ? <span className="text-muted"> - {h.note}</span> : null}</span><span className="shrink-0 text-muted">{formatDate(h.at, true)}</span></li>)}
        </ul>
      </details>
    </div>);
}
