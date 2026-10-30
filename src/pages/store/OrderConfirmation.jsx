import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Check, Clock, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { formatPrice } from '@/lib/utils';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { Button, PageLoader } from '@/components/ui';
import { OrderStatusBadge, PaymentBadge } from '@/components/StatusBadge';
import { Seo } from '@/components/Seo';

export default function OrderConfirmation() {
    const { id = '' } = useParams();
    const [order, setOrder] = useState(undefined);
    useEffect(() => onSnapshot(doc(db, 'orders', id), (s) => setOrder(s.exists() ? { id: s.id, ...s.data() } : null), () => setOrder(null)), [id]);
    if (order === undefined)
        return <PageLoader />;
    if (!order)
        return <div className="py-20 text-center"><p>We could not find this order.</p><Link to="/orders"><Button className="mt-4">My orders</Button></Link></div>;
    const cancelled = order.status === 'cancelled';
    const manual = order.paymentMethod !== 'cod' && order.paymentStatus !== 'paid';
    const Icon = cancelled ? XCircle : manual ? Clock : Check;
    return (<div className="mx-auto max-w-2xl px-4 py-12 text-center sm:px-6">
      <Seo title="Order confirmation" noindex/>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }} className={`mx-auto grid size-20 place-items-center rounded-full ${cancelled ? 'bg-danger text-white' : manual ? 'bg-warning/20 text-warning' : 'bg-success text-white'}`}>
        <Icon className="size-10" strokeWidth={3}/>
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-6 text-3xl font-bold">{cancelled ? 'This order was cancelled' : 'Thank you, your order is placed'}</motion.h1>
      <p className="mt-2 text-muted">Order <b className="text-fg">{order.orderNumber}</b></p>
      {!cancelled && <p className="mt-3 text-sm text-muted">{manual ? 'We will check your payment and then confirm the order.' : 'Our team will confirm your order shortly.'} The status below updates automatically.</p>}
      <div className="mx-auto mt-8 max-w-md space-y-3 rounded-2xl border border-border bg-surface p-5 text-left text-sm">
        <div className="flex justify-between"><span className="text-muted">Status</span><OrderStatusBadge status={order.status}/></div>
        <div className="flex justify-between"><span className="text-muted">Payment</span><span className="flex items-center gap-2">{PAYMENT_METHOD_LABEL[order.paymentMethod]} <PaymentBadge status={order.paymentStatus}/></span></div>
        <div className="flex justify-between"><span className="text-muted">Items</span><span>{order.items.reduce((s, i) => s + i.qty, 0)}</span></div>
        <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to={`/orders/${order.id}`}><Button>Track this order</Button></Link>
        <Link to="/products"><Button variant="outline">Keep shopping</Button></Link>
      </div>
    </div>);
}
