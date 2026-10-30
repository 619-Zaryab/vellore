import { Link } from 'react-router-dom';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, variantLabel } from '@/lib/utils';
import { Button, EmptyState } from '@/components/ui';
import { QtyStepper } from '@/components/QtyStepper';
import { CouponBox } from '@/components/CouponBox';
import { Seo } from '@/components/Seo';
export default function Cart() {
    const c = useCart();
    if (!c.items.length)
        return <EmptyState icon={<ShoppingBag className="size-7"/>} title="Your cart is empty" description="Browse the store and add something you like." action={<Link to="/products"><Button>Continue shopping</Button></Link>}/>;
    return (<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo title="Cart" noindex/>
      <h1 className="mb-6 text-3xl font-bold">Shopping cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {c.lines.map((l) => (<li key={l.productId + l.variantId} className="flex gap-4 p-4">
              <Link to={`/product/${l.productId}`} className="size-24 shrink-0 overflow-hidden rounded-xl bg-surface2 sm:size-28">{(l.variant?.images?.[0] ?? l.product?.images[0]) && <img src={l.variant?.images?.[0] ?? l.product?.images[0]} alt="" className="size-full object-cover"/>}</Link>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0"><Link to={`/product/${l.productId}`} className="line-clamp-2 font-semibold hover:text-brand">{l.product?.name ?? 'Loading...'}</Link>{l.variant && Object.keys(l.variant.options).length > 0 && <p className="text-sm text-muted">{variantLabel(l.variant.options)}</p>}</div>
                  <button aria-label="Remove item" onClick={() => c.remove(l.productId, l.variantId)} className="self-start p-1 text-muted hover:text-danger"><Trash2 className="size-5"/></button>
                </div>
                {l.problem && <p className="mt-1 text-sm font-semibold text-danger">{l.problem}. Adjust quantity or remove this item to continue.</p>}
                <div className="mt-3 flex items-center justify-between"><QtyStepper value={l.qty} max={Math.max(1, l.available)} onChange={(n) => c.setQty(l.productId, l.variantId, n)}/><div className="text-right"><p className="font-bold">{formatPrice(l.lineTotal)}</p>{l.unitPrice !== l.original && <p className="text-xs text-muted line-through">{formatPrice(l.original * l.qty)}</p>}</div></div>
              </div>
            </li>))}
        </ul>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Order summary</h2>
          <CouponBox />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(c.subtotal)}</dd></div>
            {c.discount > 0 && <div className="flex justify-between text-success"><dt>Discount ({c.coupon?.code})</dt><dd>-{formatPrice(c.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping and tax</dt><dd className="text-muted">At checkout</dd></div>
          </dl>
          <Link to="/checkout"><Button size="lg" className="w-full" disabled={c.hasProblems}>Proceed to checkout</Button></Link>
          <Link to="/products" className="block text-center text-sm font-semibold text-brand hover:underline">Continue shopping</Link>
        </aside>
      </div>
    </div>);
}
