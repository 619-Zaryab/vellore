import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Eye, Heart } from 'lucide-react';
import { cn, formatPrice, priceInfo } from '@/lib/utils';
import { useWishlist } from '@/contexts/WishlistContext';
import { Badge } from './ui';
import { Stars } from './Stars';
export function WishlistHeart({ id, className }) {
    const { has, toggle } = useWishlist();
    const on = has(id);
    return (<motion.button type="button" whileTap={{ scale: 0.8 }} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(id); }} className={cn('grid size-9 place-items-center rounded-full bg-surface/90 shadow-sm backdrop-blur transition hover:bg-surface', className)}>
      <motion.span key={String(on)} initial={{ scale: on ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }}>
        <Heart className={cn('size-[18px]', on ? 'fill-danger text-danger' : 'text-fg')}/>
      </motion.span>
    </motion.button>);
}
export function ProductCard({ product: p, index = 0, onQuickView, view = 'grid' }) {
    const pi = priceInfo(p);
    const sold = !p.inStock;
    const list = view === 'list';
    return (<motion.article initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4, delay: Math.min(index, 7) * 0.05 }} className={cn('group relative overflow-hidden rounded-2xl border border-border bg-surface transition hover:shadow-soft', list && 'flex sm:flex-row')}>
      <Link to={`/product/${p.id}`} className={cn('relative block overflow-hidden bg-surface2', list ? 'aspect-square w-36 shrink-0 sm:w-52' : 'aspect-[4/5]')} aria-label={p.name}>
        {p.images[0] && <img src={p.images[0]} alt={p.name} loading="lazy" decoding="async" className={cn('size-full object-cover transition duration-500 group-hover:scale-105', sold && 'opacity-60 grayscale')}/>}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {sold ? <Badge tone="danger" className="bg-danger text-white">SOLD OUT</Badge>
            : <>{pi.onSale && <Badge className="bg-accent text-black">{pi.discountPct}% off</Badge>}{p.lowStock && <Badge tone="warning" className="bg-surface">LOW STOCK</Badge>}</>}
          {p.isDemo && <Badge className="bg-surface/90">Demo</Badge>}
        </div>
      </Link>
      <WishlistHeart id={p.id} className="absolute right-2.5 top-2.5"/>
      {onQuickView && !list && (<button type="button" onClick={() => onQuickView(p)} aria-label={`Quick view ${p.name}`} className="absolute right-2.5 top-14 grid size-9 place-items-center rounded-full bg-surface/90 opacity-100 shadow-sm backdrop-blur transition hover:bg-surface md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100">
          <Eye className="size-[18px]"/>
        </button>)}
      <div className={cn('space-y-1.5 p-3.5', list && 'flex-1 py-4')}>
        <Link to={`/product/${p.id}`} className="line-clamp-2 text-sm font-semibold leading-snug hover:text-brand">{p.name}</Link>
        {p.ratingCount > 0 && <Stars value={p.ratingAvg} count={p.ratingCount} size="size-3.5"/>}
        <div className="flex items-baseline gap-2">
          <span className="font-bold">{formatPrice(pi.final)}</span>
          {pi.onSale && <span className="text-xs text-muted line-through">{formatPrice(pi.price)}</span>}
        </div>
        {list && <p className="line-clamp-2 hidden text-sm text-muted sm:block">{p.description}</p>}
        {onQuickView && list && <button type="button" onClick={() => onQuickView(p)} className="text-sm font-semibold text-brand hover:underline">Quick view</button>}
      </div>
    </motion.article>);
}
export const ProductCardSkeleton = () => (<div className="overflow-hidden rounded-2xl border border-border bg-surface">
    <div className="skeleton aspect-[4/5] rounded-none"/>
    <div className="space-y-2 p-3.5"><div className="skeleton h-4 w-4/5"/><div className="skeleton h-4 w-1/3"/></div>
  </div>);
