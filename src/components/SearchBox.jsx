import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X } from 'lucide-react';
import { suggestProducts } from '@/lib/catalog';
import { formatPrice, priceInfo } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
export function SearchBox({ className, autoFocus, onDone }) {
    const nav = useNavigate();
    const [term, setTerm] = useState('');
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const debounced = useDebounce(term, 300);
    const ref = useRef(null);
    useEffect(() => {
        let cancel = false;
        if (debounced.trim().length < 2) {
            setResults([]);
            return;
        }
        setLoading(true);
        suggestProducts(debounced).then((r) => { if (!cancel) {
            setResults(r);
            setActive(-1);
        } }).catch(() => !cancel && setResults([])).finally(() => !cancel && setLoading(false));
        return () => { cancel = true; };
    }, [debounced]);
    useEffect(() => {
        const on = (e) => { if (!ref.current?.contains(e.target))
            setOpen(false); };
        document.addEventListener('mousedown', on);
        return () => document.removeEventListener('mousedown', on);
    }, []);
    const finish = () => { setOpen(false); onDone?.(); };
    const submit = () => { if (term.trim()) {
        nav(`/search?q=${encodeURIComponent(term.trim())}`);
        finish();
    } };
    return (<div ref={ref} className={`relative ${className ?? ''}`}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (active >= 0 && results[active]) {
        nav(`/product/${results[active].id}`);
        finish();
    }
    else
        submit(); }}>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"/>
        <input value={term} autoFocus={autoFocus} onChange={(e) => { setTerm(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, -1));
            }
            if (e.key === 'Escape')
                setOpen(false);
        }} placeholder="Search products" aria-label="Search products" role="combobox" aria-expanded={open && results.length > 0} aria-autocomplete="list" className="h-11 w-full rounded-xl border border-border bg-surface pl-10 pr-9 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"/>
        {term && <button type="button" aria-label="Clear search" onClick={() => { setTerm(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg"><X className="size-4"/></button>}
      </form>
      <AnimatePresence>
        {open && debounced.trim().length >= 2 && (<motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl" role="listbox">
            {loading && !results.length ? <p className="p-4 text-sm text-muted">Searching...</p>
                : !results.length ? <p className="p-4 text-sm text-muted">No matches for "{debounced}". Try a shorter word.</p>
                    : (<>
                  <ul>
                    {results.map((p, i) => (<li key={p.id} role="option" aria-selected={i === active}>
                        <button type="button" onClick={() => { nav(`/product/${p.id}`); finish(); }} onMouseEnter={() => setActive(i)} className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${i === active ? 'bg-surface2' : ''}`}>
                          <img src={p.images[0]} alt="" className="size-11 rounded-lg bg-surface2 object-cover"/>
                          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="text-xs text-muted">{formatPrice(priceInfo(p).final)}</span></span>
                        </button>
                      </li>))}
                  </ul>
                  <button type="button" onClick={submit} className="w-full border-t border-border px-4 py-3 text-left text-sm font-semibold text-brand hover:bg-surface2">See all results for "{debounced}"</button>
                </>)}
          </motion.div>)}
      </AnimatePresence>
    </div>);
}
