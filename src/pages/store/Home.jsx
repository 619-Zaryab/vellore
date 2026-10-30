import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, Quote } from 'lucide-react';
import { db } from '@/lib/firebase';
import { fetchCategories, fetchProducts, getProductsByIds } from '@/lib/catalog';
import { formatPrice, priceInfo } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { ProductRail } from '@/components/ProductRail';
import { QuickView } from '@/components/QuickView';
import { Reveal } from '@/components/Reveal';
import { Stars } from '@/components/Stars';
import { NewsletterForm } from '@/components/Footer';
import { Seo } from '@/components/Seo';
function Hero({ picks }) {
    const { settings } = useSettings();
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 500], [0, -40]);
    const y2 = useTransform(scrollY, [0, 500], [0, 30]);
    return (<section className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_80%_20%,color-mix(in_srgb,var(--brand)_16%,transparent),transparent),radial-gradient(40%_50%_at_10%_90%,color-mix(in_srgb,var(--accent)_18%,transparent),transparent)]"/>
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">{settings.heroTitle}</motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.12 }} className="mt-5 max-w-md text-lg text-muted">{settings.heroSubtitle}</motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.22 }} className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-7 font-semibold text-brand-fg transition hover:opacity-90 active:scale-[0.97]">Shop the collection<ArrowRight className="size-4"/></Link>
            <Link to="/products?deals=1" className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-7 font-semibold transition hover:bg-surface2">See deals</Link>
          </motion.div>
        </div>
        <div className="relative mx-auto grid w-full max-w-md grid-cols-2 gap-4 sm:max-w-lg" aria-hidden={picks.length === 0}>
          {picks.slice(0, 3).map((p, i) => (<motion.div key={p.id} style={{ y: i === 1 ? y2 : y1 }} initial={{ opacity: 0, scale: 0.92, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 + i * 0.12 }} className={i === 0 ? 'row-span-2' : i === 2 ? 'translate-y-6' : ''}>
              <Link to={`/product/${p.id}`} className="group block overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
                <img src={p.images[0]} alt={p.name} className={`w-full object-cover transition duration-500 group-hover:scale-105 ${i === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}/>
                <div className="p-3"><p className="truncate text-sm font-semibold">{p.name}</p><p className="text-sm text-muted">{formatPrice(priceInfo(p).final)}</p></div>
              </Link>
            </motion.div>))}
        </div>
      </div>
    </section>);
}
export default function Home() {
    const [cats, setCats] = useState([]);
    const [picks, setPicks] = useState([]);
    const [promos, setPromos] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [recent, setRecent] = useState([]);
    const [quick, setQuick] = useState(null);
    const { ids } = useRecentlyViewed();
    useEffect(() => {
        fetchCategories().then(setCats).catch(() => { });
        fetchProducts({ featured: true, pageSize: 3 }).then(async (r) => setPicks(r.items.length ? r.items : (await fetchProducts({ pageSize: 3 })).items)).catch(() => { });
        getDocs(query(collection(db, 'promotions'), where('active', '==', true), limit(6))).then((s) => {
            const now = Date.now();
            setPromos(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => (!p.startsAt || p.startsAt.toMillis() <= now) && (!p.endsAt || p.endsAt.toMillis() >= now)));
        }).catch(() => { });
        getDocs(query(collection(db, 'reviews'), where('hidden', '==', false), orderBy('createdAt', 'desc'), limit(12)))
            .then((s) => setReviews(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.rating >= 4 && r.comment.length > 20).slice(0, 3))).catch(() => { });
    }, []);
    useEffect(() => { if (ids.length)
        getProductsByIds(ids.slice(0, 10)).then(setRecent); }, [ids.join(',')]);
    const top = cats.filter((c) => c.active && !c.parentId);
    const rail = (opts) => async () => (await fetchProducts({ pageSize: 10, ...opts })).items;
    return (<>
      <Seo />
      <Hero picks={picks}/>

      {promos.length > 0 && (<section className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-2">
          {promos.map((p) => (<Reveal key={p.id}>
              <Link to={p.link || '/products'} className="group relative flex min-h-40 items-end overflow-hidden rounded-3xl bg-brand p-6 text-brand-fg">
                {p.image && <img src={p.image} alt="" className="absolute inset-0 size-full object-cover opacity-50 transition duration-500 group-hover:scale-105" loading="lazy"/>}
                <div className="relative"><h2 className="text-2xl font-bold">{p.title}</h2>{p.subtitle && <p className="mt-1 max-w-xs text-sm opacity-90">{p.subtitle}</p>}</div>
              </Link>
            </Reveal>))}
        </section>)}

      {top.length > 0 && (<section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal><h2 className="mb-5 text-2xl font-bold sm:text-3xl">Shop by category</h2></Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {top.slice(0, 8).map((c, i) => (<Reveal key={c.id} delay={i * 0.05}>
                <Link to={`/category/${c.id}`} className="group relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl border border-border bg-surface2 p-4">
                  {c.image && <img src={c.image} alt="" loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"/>}
                  <span className={`relative rounded-lg px-3 py-1.5 text-sm font-bold ${c.image ? 'bg-surface/90' : ''}`}>{c.name}</span>
                </Link>
              </Reveal>))}
          </div>
        </section>)}

      <ProductRail title="New arrivals" subtitle="Just landed in the store" to="/products?sort=newest" load={rail({ sort: 'newest' })} onQuickView={setQuick}/>
      <ProductRail title="Trending now" subtitle="Hand-picked by our team" to="/products" load={rail({ featured: true })} onQuickView={setQuick}/>
      <ProductRail title="Featured deals" subtitle="Reduced prices, for now" to="/products?deals=1" load={rail({ onSale: true })} onQuickView={setQuick}/>
      <ProductRail title="Bestsellers" subtitle="What customers buy most" to="/products?sort=popular" load={async () => (await fetchProducts({ sort: 'popular', pageSize: 10 })).items.filter((p) => p.soldCount > 0)} onQuickView={setQuick}/>
      {recent.length > 0 && <ProductRail title="Recently viewed" products={recent} onQuickView={setQuick}/>}

      {reviews.length > 0 && (<section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal><h2 className="mb-5 text-2xl font-bold sm:text-3xl">From verified buyers</h2></Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {reviews.map((r, i) => (<Reveal key={r.id} delay={i * 0.08}>
                <figure className="h-full rounded-2xl border border-border bg-surface p-5">
                  <Quote className="mb-3 size-6 text-brand/50"/>
                  <Stars value={r.rating}/>
                  <blockquote className="mt-3 line-clamp-5 text-sm">{r.comment}</blockquote>
                  <figcaption className="mt-4 text-sm"><b>{r.userName}</b><span className="text-muted"> on </span><Link to={`/product/${r.productId}`} className="text-brand hover:underline">{r.productName}</Link></figcaption>
                </figure>
              </Reveal>))}
          </div>
        </section>)}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <Reveal className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand p-8 text-brand-fg md:flex-row md:items-center md:p-12">
          <div><h2 className="text-3xl font-bold">First to know about new arrivals</h2><p className="mt-2 max-w-md opacity-90">One short email when something good lands. Unsubscribe any time.</p></div>
          <div className="w-full max-w-md [&_button]:bg-brand-fg [&_button]:text-brand [&_input]:border-transparent"><NewsletterForm /></div>
        </Reveal>
      </section>
      <QuickView product={quick} onClose={() => setQuick(null)}/>
    </>);
}
