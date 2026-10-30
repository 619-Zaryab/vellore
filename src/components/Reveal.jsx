import { animate, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef } from 'react';
export const Reveal = ({ children, delay = 0, className }) => (<motion.div className={className} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.45, delay, ease: 'easeOut' }}>
    {children}
  </motion.div>);
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-PK') }) {
    const ref = useRef(null);
    const reduced = useReducedMotion();
    useEffect(() => {
        if (reduced) {
            if (ref.current)
                ref.current.textContent = format(value);
            return;
        }
        const c = animate(0, value, { duration: 0.9, ease: 'easeOut', onUpdate: (v) => { if (ref.current)
                ref.current.textContent = format(v); } });
        return () => c.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, reduced]);
    return <span ref={ref}>{format(0)}</span>;
}
