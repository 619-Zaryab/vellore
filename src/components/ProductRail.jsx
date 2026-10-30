import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './ui';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import { Reveal } from './Reveal';
export function ProductRail({ title, subtitle, to, load, onQuickView, hideWhenEmpty = true, products }) {
    const [items, setItems] = useState(products ?? null);
    const ref = useRef(null);
    useEffect(() => {
        if (products) {
            setItems(products);
            return;
        }
        let cancel = false;
        load?.().then((r) => !cancel && setItems(r)).catch(() => !cancel && setItems([]));
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products]);
    if (items && !items.length && hideWhenEmpty)
        return null;
    const scroll = (d) => ref.current?.scrollBy({ left: d * (ref.current.clientWidth * 0.85), behavior: 'smooth' });
    return (<section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Reveal className="mb-5 flex items-end justify-between gap-4">
        <div><h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
        <div className="flex items-center gap-1">
          {to && <Link to={to} className="mr-2 text-sm font-semibold text-brand hover:underline">View all</Link>}
          <IconButton label="Scroll left" className="hidden border border-border sm:grid" onClick={() => scroll(-1)}><ChevronLeft className="size-5"/></IconButton>
          <IconButton label="Scroll right" className="hidden border border-border sm:grid" onClick={() => scroll(1)}><ChevronRight className="size-5"/></IconButton>
        </div>
      </Reveal>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {items === null
            ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="w-[46%] shrink-0 sm:w-56 lg:w-60"><ProductCardSkeleton /></div>)
            : items.map((p, i) => <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-56 lg:w-60"><ProductCard product={p} index={i} onQuickView={onQuickView}/></div>)}
      </div>
    </section>);
}
