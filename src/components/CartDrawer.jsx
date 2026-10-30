import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice, variantLabel } from '@/lib/utils';
import { Button, Drawer, EmptyState } from './ui';
import { QtyStepper } from './QtyStepper';
export function CartDrawer() {
    const c = useCart();
    const close = () => c.setOpen(false);
    return (<Drawer open={c.open} onClose={close} title={`Your cart${c.count ? ` (${c.count})` : ''}`} footer={c.items.length > 0 && (<div className="space-y-3">
          <div className="flex items-center justify-between text-base font-semibold"><span>Subtotal</span><span>{formatPrice(c.subtotal)}</span></div>
          <p className="text-xs text-muted">Shipping, tax and coupons are finalised at checkout.</p>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/cart" onClick={close}><Button variant="outline" className="w-full">View cart</Button></Link>
            <Link to="/checkout" onClick={close}><Button className="w-full" disabled={c.hasProblems}>Checkout</Button></Link>
          </div>
        </div>)}>
      {c.items.length === 0 ? (<EmptyState icon={<ShoppingBag className="size-7"/>} title="Your cart is empty" description="Add something you like and it will show up here." action={<Link to="/products" onClick={close}><Button>Start shopping</Button></Link>}/>) : (<ul className="divide-y divide-border">
          <AnimatePresence initial={false}>
            {c.lines.map((l) => (<motion.li key={l.productId + l.variantId} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-3 p-4">
                  <Link to={`/product/${l.productId}`} onClick={close} className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface2">
                    {(l.variant?.images?.[0] ?? l.product?.images[0]) && <img src={l.variant?.images?.[0] ?? l.product?.images[0]} alt="" className="size-full object-cover" loading="lazy"/>}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Link to={`/product/${l.productId}`} onClick={close} className="line-clamp-2 text-sm font-semibold hover:text-brand">{l.product?.name ?? 'Loading...'}</Link>
                    {l.variant && Object.keys(l.variant.options).length > 0 && <p className="text-xs text-muted">{variantLabel(l.variant.options)}</p>}
                    {l.problem && <p className="text-xs font-semibold text-danger">{l.problem}</p>}
                    <div className="flex items-center justify-between">
                      <QtyStepper size="sm" value={l.qty} max={Math.max(1, l.available)} onChange={(n) => c.setQty(l.productId, l.variantId, n)}/>
                      <span className="text-sm font-bold">{formatPrice(l.lineTotal)}</span>
                    </div>
                  </div>
                  <button aria-label="Remove item" className="self-start p-1 text-muted hover:text-danger" onClick={() => c.remove(l.productId, l.variantId)}><Trash2 className="size-4"/></button>
                </div>
              </motion.li>))}
          </AnimatePresence>
        </ul>)}
    </Drawer>);
}
