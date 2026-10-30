import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { getProductsByIds } from '@/lib/catalog';
import { defaultVariant, formatPrice, priceInfo } from '@/lib/utils';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui';
import { Seo } from '@/components/Seo';
export default function Wishlist() {
    const w = useWishlist();
    const cart = useCart();
    const toast = useToast();
    const [items, setItems] = useState(null);
    useEffect(() => { getProductsByIds(w.ids).then((r) => setItems(w.ids.map((id) => r.find((p) => p.id === id)).filter(Boolean))); }, [w.ids.join(',')]); // eslint-disable-line
    if (!w.ids.length)
        return <EmptyState icon={<Heart className="size-7"/>} title="Your wishlist is empty" description="Tap the heart on any product to save it for later." action={<Link to="/products"><Button>Explore products</Button></Link>}/>;
    return (<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Seo title="Wishlist" noindex/>
      <h1 className="mb-6 text-3xl font-bold">Wishlist</h1>
      {items === null ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28"/>)}</div> : (<ul className="space-y-3">
          {items.map((p) => {
                const v = defaultVariant(p);
                const pi = priceInfo(p, v);
                return (<li key={p.id} className="flex gap-4 rounded-2xl border border-border bg-surface p-3 sm:p-4">
                <Link to={`/product/${p.id}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-surface2"><img src={p.images[0]} alt="" className="size-full object-cover"/></Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div className="min-w-0"><Link to={`/product/${p.id}`} className="line-clamp-2 font-semibold hover:text-brand">{p.name}</Link><p className="mt-1 font-bold">{formatPrice(pi.final)}</p><div className="mt-1">{p.inStock ? (p.lowStock ? <Badge tone="warning">LOW STOCK</Badge> : <Badge tone="success">In stock</Badge>) : <Badge tone="danger">SOLD OUT</Badge>}</div></div>
                  <div className="flex gap-2">
                    {/* Price and stock are re-validated server-side again at checkout. */}
                    <Button size="sm" disabled={!p.inStock || !v} onClick={() => { if (p.options.length > 0 && p.variants.filter((x) => x.active).length > 1) {
                    toast.info('Choose your options on the product page.');
                    return;
                } if (v && cart.add(p, v.id, 1))
                    w.remove(p.id); }}><ShoppingBag className="size-4"/>{p.options.length ? 'Choose options' : 'Move to cart'}</Button>
                    <Button size="sm" variant="outline" aria-label="Remove from wishlist" onClick={() => w.remove(p.id)}><Trash2 className="size-4"/></Button>
                  </div>
                </div>
              </li>);
            })}
        </ul>)}
    </div>);
}
