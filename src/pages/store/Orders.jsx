import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { Package } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatPrice } from '@/lib/utils';
import { Button, EmptyState, Skeleton } from '@/components/ui';
import { OrderStatusBadge } from '@/components/StatusBadge';
import { Seo } from '@/components/Seo';
export default function Orders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState(null);
    const [max, setMax] = useState(10);
    const [error, setError] = useState(false);
    useEffect(() => {
        if (!user)
            return;
        return onSnapshot(query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(max)), (s) => { setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setError(false); }, () => setError(true));
    }, [user, max]);
    return (<div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Seo title="My orders" noindex/>
      <h1 className="mb-6 text-3xl font-bold">My orders</h1>
      {error ? <EmptyState title="Could not load your orders" description="Check your connection and refresh the page."/>
            : orders === null ? <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24"/>)}</div>
                : !orders.length ? <EmptyState icon={<Package className="size-7"/>} title="No orders yet" description="When you place an order, you can track it here." action={<Link to="/products"><Button>Start shopping</Button></Link>}/>
                    : (<>
            <ul className="space-y-3">
              {orders.map((o) => (<li key={o.id}>
                  <Link to={`/orders/${o.id}`} className="block rounded-2xl border border-border bg-surface p-4 transition hover:shadow-soft sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold">{o.orderNumber}</p><p className="text-xs text-muted">{formatDate(o.createdAt, true)}</p></div><OrderStatusBadge status={o.status}/></div>
                    <div className="mt-3 flex items-center justify-between gap-4">
                      <div className="flex -space-x-2">{o.items.slice(0, 4).map((i) => <img key={i.productId + i.variantId} src={i.image} alt="" className="size-10 rounded-lg border-2 border-surface bg-surface2 object-cover"/>)}{o.items.length > 4 && <span className="grid size-10 place-items-center rounded-lg border-2 border-surface bg-surface2 text-xs font-semibold">+{o.items.length - 4}</span>}</div>
                      <p className="font-bold">{formatPrice(o.total)}</p>
                    </div>
                  </Link>
                </li>))}
            </ul>
            {orders.length >= max && <div className="mt-6 text-center"><Button variant="outline" onClick={() => setMax(max + 10)}>Load older orders</Button></div>}
          </>)}
    </div>);
}
