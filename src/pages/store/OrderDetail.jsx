import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { CUSTOMER_CANCELLABLE, PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { errMsg, formatDate, formatPrice, variantLabel } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button, ConfirmDialog, EmptyState, PageLoader } from '@/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
import { Seo } from '@/components/Seo';
export default function OrderDetail() {
    const { id = '' } = useParams();
    const toast = useToast();
    const { settings } = useSettings();
    const [order, setOrder] = useState(undefined);
    const [confirm, setConfirm] = useState(false);
    const [busy, setBusy] = useState(false);
    // Real-time listener scoped to this one order. Security rules only allow the owner (or an admin) to read it.
    useEffect(() => onSnapshot(doc(db, 'orders', id), (s) => setOrder(s.exists() ? { id: s.id, ...s.data() } : null), () => setOrder(null)), [id]);
    if (order === undefined)
        return <PageLoader />;
    if (!order)
        return <EmptyState title="Order not found" description="It may belong to a different account." action={<Link to="/orders"><Button>My orders</Button></Link>}/>;
    const a = order.shippingAddress;
    return (<div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Seo title={`Order ${order.orderNumber}`} noindex/>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div><Link to="/orders" className="text-sm text-muted hover:text-fg">All orders</Link><h1 className="text-3xl font-bold">{order.orderNumber}</h1><p className="text-sm text-muted">Placed {formatDate(order.createdAt, true)}</p></div>
        <div className="flex items-center gap-2"><OrderStatusBadge status={order.status}/><PaymentBadge status={order.paymentStatus}/></div>
      </div>
      <div className="rounded-2xl border border-border bg-surface p-5"><OrderTimeline order={order}/></div>
      {(order.trackingNumber || order.status === 'shipped') && (<div className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm"><b>Shipping:</b> {order.carrier || 'Courier'}{order.trackingNumber ? <> - tracking number <b className="select-all">{order.trackingNumber}</b></> : ' - tracking number will appear here soon.'}</div>)}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {order.items.map((i) => (<li key={i.productId + i.variantId} className="flex gap-4 p-4">
              <img src={i.image} alt="" className="size-20 rounded-xl bg-surface2 object-cover"/>
              <div className="min-w-0 flex-1 text-sm"><Link to={`/product/${i.productId}`} className="line-clamp-2 font-semibold hover:text-brand">{i.name}</Link><p className="text-muted">{variantLabel(i.options)}</p><p className="text-muted">Qty {i.qty} x {formatPrice(i.unitPrice)}</p>{order.status === 'delivered' && <Link to={`/product/${i.productId}#reviews`} className="mt-1 inline-block font-semibold text-brand hover:underline">Write a review</Link>}</div>
              <p className="font-bold">{formatPrice(i.lineTotal)}</p>
            </li>))}
        </ul>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm">
            <h2 className="mb-3 font-bold">Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && <div className="flex justify-between text-success"><dt>Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>-{formatPrice(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{order.shipping ? formatPrice(order.shipping) : 'Free'}</dd></div>
              {order.tax > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{formatPrice(order.tax)}</dd></div>}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
            <p className="mt-3 text-muted">Paid with {PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm"><h2 className="mb-2 font-bold">Delivery address</h2><p className="text-muted">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.province} {a.postalCode}<br />{a.phone}</p><p className="mt-2 text-muted">{order.deliveryMethod.label} ({order.deliveryMethod.eta})</p></div>
          <div className="space-y-2">
            {CUSTOMER_CANCELLABLE.includes(order.status) && <Button variant="outline" className="w-full" onClick={() => setConfirm(true)}>Cancel order</Button>}
            <p className="text-center text-xs text-muted">Need help? <Link to="/contact" className="font-semibold text-brand">Contact support</Link> or email {settings.supportEmail}</p>
          </div>
        </div>
      </div>
      <ConfirmDialog open={confirm} danger loading={busy} title="Cancel this order?" message={order.paymentStatus === 'paid' ? 'We will arrange a refund of your payment.' : 'This cannot be undone.'} confirmLabel="Cancel order" onClose={() => setConfirm(false)} onConfirm={async () => { setBusy(true); try {
        await api.cancelOrder({ orderId: order.id, reason: 'Cancelled by customer' });
        toast.success('Order cancelled');
        setConfirm(false);
    }
    catch (e) {
        toast.error(errMsg(e));
    }
    finally {
        setBusy(false);
    } }}/>
    </div>);
}
