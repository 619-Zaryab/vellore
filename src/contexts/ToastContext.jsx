import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
const Ctx = createContext({ success() { }, error() { }, info() { } });
export const useToast = () => useContext(Ctx);
const ICON = { success: CheckCircle2, error: TriangleAlert, info: Info };
const TONE = { success: 'text-success', error: 'text-danger', info: 'text-brand' };
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const push = useCallback((kind, msg) => {
        const id = Date.now() + Math.random();
        setItems((x) => [...x.slice(-3), { id, kind, msg }]);
        setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3500);
    }, []);
    const api = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);
    return (<Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = ICON[t.kind];
            return (<motion.div key={t.id} layout initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }} className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-border bg-surface p-3.5 shadow-xl" role={t.kind === 'error' ? 'alert' : 'status'}>
                <Icon className={`mt-0.5 size-5 shrink-0 ${TONE[t.kind]}`}/>
                <p className="flex-1 text-sm">{t.msg}</p>
                <button aria-label="Dismiss" className="text-muted hover:text-fg" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}><X className="size-4"/></button>
              </motion.div>);
        })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>);
}
