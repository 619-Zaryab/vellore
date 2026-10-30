import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { LayoutGrid, List, PackageSearch, SlidersHorizontal, X } from 'lucide-react';
import { fetchCategories, fetchProducts, searchProducts, SORT_LABEL } from '@/lib/catalog';
import { cn, priceInfo } from '@/lib/utils';
import { Button, Checkbox, Drawer, EmptyState, Select } from '@/components/ui';
import { ProductCard, ProductCardSkeleton } from '@/components/ProductCard';
import { QuickView } from '@/components/QuickView';
import { Seo } from '@/components/Seo';
import { useDebounce } from '@/hooks/useDebounce';
export default function Products() {
    const { categoryId: routeCat } = useParams();
    const [sp, setSp] = useSearchParams();
    const q = sp.get('q')?.trim() ?? '';
    const categoryId = routeCat ?? sp.get('category') ?? '';
    const deals = sp.get('deals') === '1';
    const sort = sp.get('sort') || 'newest';
    const inStockOnly = sp.get('stock') === '1';
    const minRating = Number(sp.get('rating') ?? 0);
    const [view, setView] = useState('grid');
    const [cats, setCats] = useState([]);
    const [items, setItems] = useState([]);
    const [cursor, setCursor] = useState(null);
    const [done, setDone] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState(false);
    const [quick, setQuick] = useState(null);
    const [minP, setMinP] = useState(sp.get('min') ?? '');
    const [maxP, setMaxP] = useState(sp.get('max') ?? '');
    const dMin = useDebounce(minP, 400), dMax = useDebounce(maxP, 400);
    const set = useCallback((patch) => {
        const n = new URLSearchParams(sp);
        for (const [k, v] of Object.entries(patch))
            v ? n.set(k, v) : n.delete(k);
        setSp(n, { replace: true });
    }, [sp, setSp]);
    useEffect(() => { if ((sp.get('min') ?? '') !== dMin || (sp.get('max') ?? '') !== dMax)
        set({ min: dMin || null, max: dMax || null }); }, [dMin, dMax]); // eslint-disable-line
    useEffect(() => { fetchCategories().then(setCats).catch(() => { }); }, []);
    const load = useCallback(async (reset) => {
        setLoading(true);
        setError('');
        try {
            if (q) {
                const r = await searchProducts(q);
                setItems(r);
                setDone(true);
                setCursor(null);
            }
            else {
                const page = await fetchProducts({ categoryId: categoryId || undefined, sort, pageSize: 12, cursor: reset ? null : cursor, onSale: deals || undefined });
                setItems((cur) => (reset ? page.items : [...cur, ...page.items]));
                setCursor(page.cursor);
                setDone(page.done);
            }
        }
        catch (e) {
            setError(e.message.includes('index') ? 'This view needs a Firestore index. Deploy firestore.indexes.json and try again.' : 'We could not load products. Check your connection and try again.');
        }
        finally {
            setLoading(false);
        }
    }, [q, categoryId, sort, deals, cursor]);
    useEffect(() => { load(true); }, [q, categoryId, sort, deals]); // eslint-disable-line
    const shown = useMemo(() => {
        let r = items;
        const lo = Number(sp.get('min') || 0), hi = Number(sp.get('max') || 0);
        if (lo)
            r = r.filter((p) => priceInfo(p).final >= lo);
        if (hi)
            r = r.filter((p) => priceInfo(p).final <= hi);
        if (inStockOnly)
            r = r.filter((p) => p.inStock);
        if (minRating)
            r = r.filter((p) => p.ratingAvg >= minRating);
        if (q) {
            if (sort === 'price-asc')
                r = [...r].sort((a, b) => priceInfo(a).final - priceInfo(b).final);
            else if (sort === 'price-desc')
                r = [...r].sort((a, b) => priceInfo(b).final - priceInfo(a).final);
            else if (sort === 'popular')
                r = [...r].sort((a, b) => b.soldCount - a.soldCount);
        }
        return r;
    }, [items, sp, inStockOnly, minRating, q, sort]);
    const top = cats.filter((c) => c.active && !c.parentId);
    const activeCat = cats.find((c) => c.id === categoryId);
    const activeCount = [sp.get('min'), sp.get('max'), inStockOnly && '1', minRating && '1'].filter(Boolean).length;
    const clear = () => { setMinP(''); setMaxP(''); const n = new URLSearchParams(); if (q)
        n.set('q', q); if (sort !== 'newest')
        n.set('sort', sort); setSp(n, { replace: true }); };
    const title = q ? `Results for "${q}"` : deals ? 'Deals' : activeCat?.name ?? 'All products';
    const Panel = (<div className="space-y-7">
      {!q && (<div>
          <h3 className="mb-2 text-sm font-bold">Category</h3>
          <ul className="space-y-0.5 text-sm">
            <li><Link to="/products" className={cn('block rounded-lg px-2.5 py-1.5 hover:bg-surface2', !categoryId && 'bg-brand/10 font-semibold text-brand')}>All products</Link></li>
            {top.map((c) => (<li key={c.id}>
                <Link to={`/category/${c.id}`} className={cn('block rounded-lg px-2.5 py-1.5 hover:bg-surface2', categoryId === c.id && 'bg-brand/10 font-semibold text-brand')}>{c.name}</Link>
                {(categoryId === c.id || cats.find((x) => x.id === categoryId)?.parentId === c.id) && cats.filter((s) => s.parentId === c.id && s.active).map((s) => (<Link key={s.id} to={`/category/${s.id}`} className={cn('ml-4 block rounded-lg px-2.5 py-1 text-muted hover:bg-surface2', categoryId === s.id && 'font-semibold text-brand')}>{s.name}</Link>))}
              </li>))}
          </ul>
        </div>)}
      <div>
        <h3 className="mb-2 text-sm font-bold">Price (Rs.)</h3>
        <div className="flex items-center gap-2">
          <input inputMode="numeric" aria-label="Minimum price" placeholder="Min" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ''))} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"/>
          <span className="text-muted">to</span>
          <input inputMode="numeric" aria-label="Maximum price" placeholder="Max" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ''))} className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm"/>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Availability</h3>
        <Checkbox label="In stock only" checked={inStockOnly} onChange={(e) => set({ stock: e.target.checked ? '1' : null })}/>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-bold">Rating</h3>
        <div className="space-y-1.5">
          {[0, 4, 3].map((r) => <label key={r} className="flex cursor-pointer items-center gap-2 text-sm"><input type="radio" name="rating" className="accent-[var(--brand)]" checked={minRating === r} onChange={() => set({ rating: r ? String(r) : null })}/>{r ? `${r} stars and up` : 'Any rating'}</label>)}
        </div>
      </div>
      {activeCount > 0 && <Button variant="outline" className="w-full" onClick={clear}><X className="size-4"/>Clear filters</Button>}
    </div>);
    return (<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Seo title={title} description={`Browse ${title.toLowerCase()} at Vellore.`}/>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted">{loading && !items.length ? 'Loading...' : `${shown.length} product${shown.length === 1 ? '' : 's'}${!done ? ' loaded' : ''}`}</p></div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFilters(true)}><SlidersHorizontal className="size-4"/>Filters{activeCount > 0 && ` (${activeCount})`}</Button>
          <Select aria-label="Sort products" value={sort} onChange={(e) => set({ sort: e.target.value === 'newest' ? null : e.target.value })} className="!h-9 w-auto">
            {Object.keys(SORT_LABEL).map((s) => <option key={s} value={s}>{SORT_LABEL[s]}</option>)}
          </Select>
          <div className="hidden overflow-hidden rounded-xl border border-border sm:flex">
            {[['grid', LayoutGrid], ['list', List]].map(([v, Icon]) => <button key={v} aria-label={`${v} view`} aria-pressed={view === v} onClick={() => setView(v)} className={cn('grid size-9 place-items-center', view === v ? 'bg-brand text-brand-fg' : 'hover:bg-surface2')}><Icon className="size-4"/></button>)}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block"><div className="sticky top-28">{Panel}</div></aside>
        <div>
          {error ? <EmptyState icon={<PackageSearch className="size-7"/>} title="Could not load products" description={error} action={<Button onClick={() => load(true)}>Try again</Button>}/>
            : loading && !items.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i}/>)}</div>
                : !shown.length ? <EmptyState icon={<PackageSearch className="size-7"/>} title="No products found" description={activeCount ? 'Try removing a filter.' : q ? 'Check the spelling or try a shorter search.' : 'New products will appear here soon.'} action={activeCount ? <Button onClick={clear}>Clear filters</Button> : undefined}/>
                    : (<>
                <AnimatePresence mode="popLayout">
                  <motion.div layout className={view === 'grid' ? 'grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4' : 'flex flex-col gap-4'}>
                    {shown.map((p, i) => <ProductCard key={p.id} product={p} index={i % 12} view={view} onQuickView={setQuick}/>)}
                  </motion.div>
                </AnimatePresence>
                {!done && <div className="mt-8 text-center"><Button variant="outline" loading={loading} onClick={() => load(false)}>Load more</Button></div>}
              </>)}
        </div>
      </div>
      <Drawer open={filters} onClose={() => setFilters(false)} side="left" title="Filters" width="max-w-xs" footer={<Button className="w-full" onClick={() => setFilters(false)}>Show {shown.length} results</Button>}><div className="p-5">{Panel}</div></Drawer>
      <QuickView product={quick} onClose={() => setQuick(null)}/>
    </div>);
}
