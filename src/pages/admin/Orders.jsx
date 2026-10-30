import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, doc, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { Download, Search } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { downloadCSV } from '@/lib/csv';
import { ADMIN_TRANSITIONS, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, STATUS_LABEL } from '@/lib/constants';
import { errMsg, formatDate, formatPrice, variantLabel } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Button, Checkbox, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Skeleton, TableWrap, Textarea } from '@/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { OrderTimeline } from '@/components/OrderTimeline';
function OrderModal({ id, onClose }) {
    const toast = useToast();
    const [o, setO] = useState(null);
    const [carrier, setCarrier] = useState('');
    const [tracking, setTracking] = useState('');
    const [note, setNote] = useState('');
    const [restock, setRestock] = useState(true);
    const [refundRef, setRefundRef] = useState('');
    const [busy, setBusy] = useState('');
    const [confirm, setConfirm] = useState(null);
    const [priceWarn, setPriceWarn] = useState('');
    useEffect(() => {
        if (!id) {
            setO(null);
            return;
        }
        return onSnapshot(doc(db, 'orders', id), (s) => { if (s.exists()) {
            const d = { id: s.id, ...s.data() };
            setO(d);
            setCarrier((c) => c || d.carrier || '');
            setTracking((t) => t || d.trackingNumber || '');
        } });
    }, [id]);
    const run = async (key, fn, ok) => { setBusy(key); try {
        await fn();
        toast.success(ok);
        setConfirm(null);
        setNote('');
    }
    catch (e) {
        if (/^Price check failed/.test(e.message)) setPriceWarn(e.message);
        else toast.error(errMsg(e));
    }
    finally {
        setBusy('');
    } };
    const next = o ? ADMIN_TRANSITIONS[o.status] : [];
    return (<Modal open={!!id} onClose={onClose} size="xl" title={o ? `Order ${o.orderNumber}` : 'Order'}>
      {!o ? <Skeleton className="h-64"/> : (<div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={o.status}/><PaymentBadge status={o.paymentStatus}/><span className="text-sm text-muted">{PAYMENT_METHOD_LABEL[o.paymentMethod]} - placed {formatDate(o.createdAt, true)}</span></div>
          <OrderTimeline order={o}/>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-2xl border border-border p-4"><p className="mb-1 font-bold">Customer</p><p className="text-muted">{o.customerName}<br />{o.userEmail}<br />{o.shippingAddress.phone}</p></div>
            <div className="rounded-2xl border border-border p-4"><p className="mb-1 font-bold">Ship to</p><p className="text-muted">{o.shippingAddress.fullName}<br />{o.shippingAddress.line1}{o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''}<br />{o.shippingAddress.city}, {o.shippingAddress.province}</p></div>
            <div className="rounded-2xl border border-border p-4"><p className="mb-1 font-bold">Delivery</p><p className="text-muted">{o.deliveryMethod.label}<br />{o.notes ? `Note: ${o.notes}` : 'No customer note'}{o.payment?.reference && <><br />Payment ID: <b className="select-all">{o.payment.reference}</b></>}</p></div>
          </div>
          <TableWrap><table className="tbl"><thead><tr><th>Item</th><th>SKU</th><th>Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>
            {o.items.map((i) => <tr key={i.productId + i.variantId}><td><div className="flex items-center gap-2"><img src={i.image} alt="" className="size-9 rounded-lg object-cover"/><span>{i.name}<span className="block text-xs text-muted">{variantLabel(i.options)}</span></span></div></td><td className="text-muted">{i.sku}</td><td>{formatPrice(i.unitPrice)}</td><td>{i.qty}</td><td>{formatPrice(i.lineTotal)}</td></tr>)}
            <tr><td colSpan={4} className="text-right text-muted">Subtotal / discount / shipping / tax</td><td>{formatPrice(o.subtotal)} / -{formatPrice(o.discount)} / {formatPrice(o.shipping)} / {formatPrice(o.tax)}</td></tr>
            <tr><td colSpan={4} className="text-right font-bold">Total</td><td className="font-bold">{formatPrice(o.total)}</td></tr>
          </tbody></table></TableWrap>

          <div className="space-y-4 rounded-2xl border border-border p-4">
            <h3 className="font-bold">Fulfilment</h3>
            {o.paymentStatus !== 'paid' && !(['cancelled', 'refund_pending', 'refunded'].includes(o.status)) && o.paymentMethod !== 'cod' && (<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface2 p-3 text-sm"><span>Customer says they paid via {PAYMENT_METHOD_LABEL[o.paymentMethod]}{o.payment?.reference ? <> (ID <b className="select-all">{o.payment.reference}</b>)</> : ''}. Check your account, then mark it as received.</span><Button size="sm" loading={busy === 'paid'} onClick={() => run('paid', () => api.markPaid({ orderId: o.id }), 'Payment marked as received')}>Payment received</Button></div>)}
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Input label="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="TCS, Leopards, M&P..."/>
              <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)}/>
              <Button variant="outline" loading={busy === 'track'} disabled={!tracking.trim()} onClick={() => run('track', () => api.updateOrderStatus({ orderId: o.id, trackingNumber: tracking.trim(), carrier: carrier.trim() }), 'Tracking saved')}>Save tracking</Button>
            </div>
            {next.length > 0 && (<>
                <Textarea label="Note for the status history (optional)" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-16"/>
                {o.status === 'delivered' && <Checkbox label="Return the items to stock" checked={restock} onChange={(e) => setRestock(e.target.checked)}/>}
                {o.status === 'refund_pending' && <Input label="Refund reference (provider transaction or transfer ID)" value={refundRef} onChange={(e) => setRefundRef(e.target.value)}/>}
                {priceWarn && (<div role="alert" className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm"><p>{priceWarn}</p>
                    <Button size="sm" variant="outline" className="mt-2" loading={busy === 'force'} onClick={() => run('force', () => api.updateOrderStatus({ orderId: o.id, status: 'confirmed', note: note.trim() || 'Confirmed after price check', force: true }), 'Order confirmed').then(() => setPriceWarn(''))}>Confirm anyway</Button></div>)}
                <div className="flex flex-wrap gap-2">
                  {next.map((s) => s === 'cancelled' || s === 'refund_pending'
                    ? <Button key={s} variant="danger" onClick={() => setConfirm(s)}>{s === 'cancelled' ? 'Cancel order' : 'Start refund'}</Button>
                    : <Button key={s} loading={busy === s} disabled={s === 'refunded' && !refundRef.trim()} onClick={() => run(s, () => api.updateOrderStatus({ orderId: o.id, status: s, note: note.trim() || undefined, refundRef: refundRef.trim() || undefined }), `Marked as ${STATUS_LABEL[s].toLowerCase()}`)}>Mark as {STATUS_LABEL[s].toLowerCase()}</Button>)}
                </div>
                {o.status === 'refund_pending' && o.paymentMethod !== 'cod' && <p className="text-xs text-muted">Send the refund from your {PAYMENT_METHOD_LABEL[o.paymentMethod]} account first, then enter the transaction ID above and mark the order as refunded. A refund can only be recorded once.</p>}
              </>)}
          </div>
        </div>)}
      <ConfirmDialog open={!!confirm} danger loading={!!busy} title={confirm === 'cancelled' ? 'Cancel this order?' : 'Start a refund?'} message={confirm === 'cancelled' ? 'If stock was already taken it is returned, and for paid orders the order moves to Refund pending.' : 'The order moves to Refund pending. Items are returned to stock only if the option above is ticked.'} confirmLabel="Yes, continue" onClose={() => setConfirm(null)} onConfirm={() => o && confirm && run('confirm', () => api.updateOrderStatus({ orderId: o.id, status: confirm, note: note.trim() || undefined, restock: confirm === 'refund_pending' ? restock : undefined }), 'Order updated')}/>
    </Modal>);
}
export default function Orders() {
    const [sp, setSp] = useSearchParams();
    const [status, setStatus] = useState('');
    const [pay, setPay] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [q, setQ] = useState(sp.get('q') ?? '');
    const [open, setOpen] = useState(null);
    const term = sp.get('q')?.trim().toUpperCase() ?? '';
    const list = useLiveQuery((n) => {
        const c = [];
        if (term)
            return query(collection(db, 'orders'), where('orderNumber', '==', term), limit(5));
        if (status)
            c.push(where('status', '==', status));
        if (pay)
            c.push(where('paymentStatus', '==', pay));
        if (from)
            c.push(where('createdAt', '>=', Timestamp.fromDate(new Date(from + 'T00:00:00'))));
        if (to)
            c.push(where('createdAt', '<=', Timestamp.fromDate(new Date(to + 'T23:59:59'))));
        return query(collection(db, 'orders'), ...c, orderBy('createdAt', 'desc'), limit(n));
    }, [status, pay, from, to, term]);
    const rows = list.data ?? [];
    const exportCsv = () => downloadCSV('vellore-orders.csv', rows.map((o) => ({ orderNumber: o.orderNumber, date: o.createdAt?.toDate().toISOString(), customer: o.customerName, email: o.userEmail, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, items: o.items.reduce((s, i) => s + i.qty, 0), subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, tax: o.tax, total: o.total, coupon: o.couponCode ?? '', tracking: o.trackingNumber ?? '' })));
    return (<>
      <PageHeader title="Orders" description="Updates appear live. Customers see status changes on their order page immediately." actions={<Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="size-4"/>Export CSV</Button>}/>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <form className="relative min-w-52" onSubmit={(e) => { e.preventDefault(); const n = new URLSearchParams(); if (q.trim())
        n.set('q', q.trim()); setSp(n); }}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/><input value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && term && setSp({})} placeholder="Order number, e.g. VEL-001001" aria-label="Search by order number" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"/>
        </form>
        <Select aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)} className="!h-10 w-auto"><option value="">All statuses</option>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
        <Select aria-label="Payment status" value={pay} onChange={(e) => setPay(e.target.value)} className="!h-10 w-auto"><option value="">All payments</option>{Object.keys(PAYMENT_STATUS_LABEL).map((v) => <option key={v} value={v}>{PAYMENT_STATUS_LABEL[v]}</option>)}</Select>
        <Input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="!h-10"/><Input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="!h-10"/>
        {(status || pay || from || to || term) && <Button variant="ghost" size="sm" onClick={() => { setStatus(''); setPay(''); setFrom(''); setTo(''); setQ(''); setSp({}); }}>Clear</Button>}
      </div>
      {list.error && <div role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{list.error}</div>}
      {list.loading ? <Skeleton className="h-64"/> : !rows.length ? <EmptyState title="No orders match" description="Try changing the filters."/> : (<>
          <TableWrap><table className="tbl"><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th>Total</th></tr></thead><tbody>
            {rows.map((o) => (<tr key={o.id} onClick={() => setOpen(o.id)} className="cursor-pointer">
                <td><button className="font-semibold text-brand hover:underline" onClick={(e) => { e.stopPropagation(); setOpen(o.id); }}>{o.orderNumber}</button></td>
                <td className="whitespace-nowrap text-muted">{formatDate(o.createdAt, true)}</td><td>{o.customerName}</td>
                <td><span className="mr-2">{PAYMENT_METHOD_LABEL[o.paymentMethod]}</span><PaymentBadge status={o.paymentStatus}/></td><td><OrderStatusBadge status={o.status}/></td><td className="font-semibold">{formatPrice(o.total)}</td>
              </tr>))}
          </tbody></table></TableWrap>
          {list.hasMore && !term && <div className="mt-4 text-center"><Button variant="outline" onClick={list.loadMore}>Load more</Button></div>}
        </>)}
      <OrderModal id={open} onClose={() => setOpen(null)}/>
    </>);
}
