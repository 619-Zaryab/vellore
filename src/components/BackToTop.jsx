import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
export function BackToTop() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const on = () => setShow(window.scrollY > 600);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);
    return (<AnimatePresence>
      {show && (<motion.button initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }} aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-full border border-border bg-surface shadow-soft hover:bg-surface2">
          <ArrowUp className="size-5"/>
        </motion.button>)}
    </AnimatePresence>);
}
