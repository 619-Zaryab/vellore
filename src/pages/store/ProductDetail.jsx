import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Heart, PackageX, ShieldCheck, Truck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { fetchProducts } from '@/lib/catalog';
import { errMsg, formatDate, formatPrice, priceInfo, variantStock } from '@/lib/utils';
import { fetchCategories } from '@/lib/catalog';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useVariantSelection } from '@/hooks/useVariantSelection';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { getProductsByIds } from '@/lib/catalog';
import { Button, EmptyState, Skeleton, Textarea, Input } from '@/components/ui';
import { ProductGallery } from '@/components/ProductGallery';
import { VariantPicker } from '@/components/VariantPicker';
import { QtyStepper } from '@/components/QtyStepper';
import { StockStatus } from '@/components/StockBadge';
import { ProductRail } from '@/components/ProductRail';
import { Stars, StarInput } from '@/components/Stars';
import { Seo } from '@/components/Seo';
function Reviews({ product }) {
    const { user } = useAuth();
    const toast = useToast();
    const [list, setList] = useState([]);
    const [rating, setRating] = useState(5);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);
    const load = () => getDocs(query(collection(db, 'reviews'), where('productId', '==', product.id), where('hidden', '==', false), orderBy('createdAt', 'desc'), limit(20)))
        .then((s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() })))).catch(() => { });
    useEffect(() => { load(); }, [product.id]); // eslint-disable-line
    return (<section className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
      <div>
        <h2 className="text-2xl font-bold">Customer reviews</h2>
        {list.length > 0 ? (() => { const avg = list.reduce((a, r) => a + r.rating, 0) / list.length; return <div className="mt-3 flex items-center gap-3"><span className="text-4xl font-bold">{avg.toFixed(1)}</span><div><Stars value={avg}/><p className="text-sm text-muted">{list.length} review{list.length > 1 ? 's' : ''}</p></div></div>; })() : <p className="mt-2 text-sm text-muted">No reviews yet.</p>}
        {user ? (<form className="mt-6 space-y-3 rounded-2xl border border-border p-4" onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                    await api.submitReview({ productId: product.id, rating, title: title.trim() || undefined, comment: comment.trim() });
                    toast.success('Thanks, your review is live.');
                    setComment('');
                    setTitle('');
                    load();
                }
                catch (err) {
                    toast.error(errMsg(err));
                }
                finally {
                    setBusy(false);
                }
            }}>
            <h3 className="font-semibold">Write a review</h3>
            <p className="text-xs text-muted">Only customers with a delivered order of this product can review it.</p>
            <StarInput value={rating} onChange={setRating}/>
            <Input label="Title (optional)" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)}/>
            <Textarea label="Your review" required minLength={10} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)}/>
            <Button type="submit" loading={busy}>Submit review</Button>
          </form>) : <p className="mt-6 text-sm"><Link to="/login" state={{ from: `/product/${product.id}` }} className="font-semibold text-brand hover:underline">Sign in</Link> to review this product.</p>}
      </div>
      <ul className="space-y-4">
        {list.map((r) => (<li key={r.id} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between"><Stars value={r.rating}/><span className="text-xs text-muted">{formatDate(r.createdAt)}</span></div>
            {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
            <p className="mt-1 text-sm">{r.comment}</p>
            <p className="mt-2 text-xs text-muted">{r.userName} - verified purchase</p>
          </li>))}
      </ul>
    </section>);
}
export default function ProductDetail() {
    const { id = '' } = useParams();
    const nav = useNavigate();
    const cart = useCart();
    const wish = useWishlist();
    const [product, setProduct] = useState(undefined);
    const [cats, setCats] = useState([]);
    const [qty, setQty] = useState(1);
    const { variant, sel, select, isOptionAvailable } = useVariantSelection(product);
    const { ids, record } = useRecentlyViewed();
    const [recent, setRecent] = useState([]);
    // Real-time listener: stock and price changes made in the admin panel show up immediately.
    useEffect(() => {
        setProduct(undefined);
        setQty(1);
        return onSnapshot(doc(db, 'products', id), (s) => setProduct(s.exists() && s.data().status === 'active' ? { id: s.id, ...s.data() } : null), () => setProduct(null));
    }, [id]);
    useEffect(() => { fetchCategories().then(setCats).catch(() => { }); }, []);
    useEffect(() => { if (product)
        record(product.id); }, [product?.id]); // eslint-disable-line
    useEffect(() => { getProductsByIds(ids.filter((x) => x !== id).slice(0, 10)).then(setRecent); }, [id, ids.join(',')]); // eslint-disable-line
    if (product === undefined)
        return <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2"><Skeleton className="aspect-square rounded-3xl"/><div className="space-y-4"><Skeleton className="h-10 w-3/4"/><Skeleton className="h-8 w-1/3"/><Skeleton className="h-40"/></div></div>;
    if (product === null)
        return <EmptyState icon={<PackageX className="size-7"/>} title="This product is not available" description="It may have been removed or is not on sale right now." action={<Link to="/products"><Button>Browse products</Button></Link>}/>;
    const stock = variantStock(variant);
    const pi = priceInfo(product, variant);
    const images = variant?.images?.length ? variant.images : product.images;
    const cat = cats.find((c) => c.id === product.categoryId);
    const maxQty = Math.max(1, Math.min(stock, 20));
    const q = Math.min(qty, maxQty);
    const canBuy = !!variant && stock > 0;
    const ld = {
        '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, sku: variant?.sku ?? product.sku, image: images,
        ...(product.ratingCount > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } } : {}),
        offers: { '@type': 'Offer', priceCurrency: 'PKR', price: pi.final, availability: canBuy ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: window.location.href },
    };
    return (<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Seo title={product.name} description={product.description.slice(0, 155)} image={product.images[0]} type="product" jsonLd={ld}/>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted"><Link to="/" className="hover:text-fg">Home</Link> / <Link to="/products" className="hover:text-fg">Shop</Link>{cat && <> / <Link to={`/category/${cat.id}`} className="hover:text-fg">{cat.name}</Link></>}</nav>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={images} alt={product.name} soldOut={!canBuy}/>
        <div className="space-y-5">
          <div>
            {product.isDemo && <span className="mb-2 inline-block rounded-md bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted">Demo product</span>}
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-2 flex items-center gap-3 text-sm text-muted"><Stars value={product.ratingAvg} count={product.ratingCount}/><span>SKU: {variant?.sku ?? product.sku}</span></div>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold">{formatPrice(pi.final)}</span>
            {pi.onSale && <><span className="text-lg text-muted line-through">{formatPrice(pi.price)}</span><span className="rounded-md bg-accent px-2 py-0.5 text-sm font-bold text-black">{pi.discountPct}% off</span></>}
          </div>
          <VariantPicker product={product} selected={sel} onSelect={(n, v) => { select(n, v); setQty(1); }} isAvailable={isOptionAvailable}/>
          <StockStatus variant={variant} threshold={product.lowStockThreshold}/>
          <div className="flex flex-wrap items-center gap-3">
            <QtyStepper value={q} onChange={setQty} max={maxQty} disabled={!canBuy}/>
            <Button size="lg" className="min-w-40 flex-1" disabled={!canBuy} onClick={() => variant && cart.add(product, variant.id, q)}>{canBuy ? 'Add to cart' : 'Sold out'}</Button>
            <button aria-pressed={wish.has(product.id)} aria-label="Toggle wishlist" onClick={() => wish.toggle(product.id)} className="grid size-12 place-items-center rounded-xl border border-border hover:bg-surface2"><Heart className={`size-5 ${wish.has(product.id) ? 'fill-danger text-danger' : ''}`}/></button>
          </div>
          <Button size="lg" variant="secondary" className="w-full" disabled={!canBuy} onClick={() => { if (variant && cart.add(product, variant.id, q)) {
        cart.setOpen(false);
        nav('/checkout');
    } }}>Buy now</Button>
          <ul className="grid gap-3 rounded-2xl border border-border p-4 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2"><Truck className="size-4 text-brand"/>Delivery across Pakistan</li>
            <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand"/>Cash on delivery available</li>
          </ul>
          <div><h2 className="mb-1.5 text-lg font-bold">Description</h2><p className="whitespace-pre-line text-sm leading-relaxed text-muted">{product.description}</p></div>
          {product.specs?.length > 0 && (<div><h2 className="mb-2 text-lg font-bold">Specifications</h2>
              <dl className="divide-y divide-border rounded-2xl border border-border text-sm">{product.specs.map((s) => <div key={s.label} className="grid grid-cols-[1fr_2fr] gap-3 px-4 py-2.5"><dt className="text-muted">{s.label}</dt><dd>{s.value}</dd></div>)}</dl>
            </div>)}
        </div>
      </div>
      <Reviews product={product}/>
      <div className="-mx-4 sm:-mx-6">
        <ProductRail title="You may also like" load={async () => (await fetchProducts({ categoryId: product.subcategoryId || product.categoryId, pageSize: 10 })).items.filter((p) => p.id !== product.id)}/>
        {recent.length > 0 && <ProductRail title="Recently viewed" products={recent}/>}
      </div>
    </div>);
}
