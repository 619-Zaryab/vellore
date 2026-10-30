import { Link } from 'react-router-dom';
import { collection, limit, orderBy, query, where } from 'firebase/firestore';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'motion/react';
import { AlertTriangle, Banknote, Boxes, Clock, CreditCard, Package, ShoppingCart, TrendingUp, Users, XCircle } from 'lucide-react';
import { db } from '@/lib/firebase';
import { formatDate, formatPrice } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Button, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { ChartCard, chartTooltip, KpiCard } from '@/components/admin/Kpi';
import { OrderStatusBadge } from '@/components/StatusBadge';
const iso = (d) => d.toISOString().slice(0, 10);
export default function Dashboard() {
    const to = new Date(), from = new Date(Date.now() - 29 * 864e5);
    const { data, error, loading } = useAnalytics(iso(from), iso(to), 'day');
    const reduced = useReducedMotion();
    const recent = useLiveQuery((n) => query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(Math.min(n, 6))), [], 6);
    const low = useLiveQuery((n) => query(collection(db, 'products'), where('lowStock', '==', true), limit(Math.min(n, 5))), [], 5);
    const out = useLiveQuery((n) => query(collection(db, 'products'), where('inStock', '==', false), limit(Math.min(n, 5))), [], 5);
    const k = data?.kpis;
    const kp = (label, value, icon, o = {}) => ({ label, value, icon, format: o.money ? formatPrice : undefined, hint: o.hint });
    const cards = [
        kp('Gross sales', k?.grossSales, <TrendingUp className="size-4"/>, { money: true, hint: 'Value of valid orders in the last 30 days (excludes cancelled, failed and unpaid online orders).' }),
        kp('Net revenue', k?.netRevenue, <Banknote className="size-4"/>, { money: true, hint: 'Money actually received: paid online orders plus delivered cash-on-delivery orders, minus refunds.' }),
        kp('Orders', k?.totalOrders, <ShoppingCart className="size-4"/>),
        kp('Average order value', k?.aov, <CreditCard className="size-4"/>, { money: true }),
        kp('Pending orders', k?.pendingOrders, <Clock className="size-4"/>, { hint: 'Orders waiting for confirmation (all time).' }),
        kp('Products', k?.totalProducts, <Package className="size-4"/>),
        kp('Customers', k?.customers, <Users className="size-4"/>),
        kp('Low stock', k?.lowStock, <AlertTriangle className="size-4"/>),
        kp('Out of stock', k?.outOfStock, <XCircle className="size-4"/>),
    ];
    return (<>
      <PageHeader title="Overview" description="Last 30 days, live from your store data." actions={<Link to="/admin/analytics"><Button variant="outline">Full analytics</Button></Link>}/>
      {error && <div role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">Could not load analytics: {error}. Check that the Firestore indexes are deployed.</div>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{cards.map((c, i) => <KpiCard key={c.label} {...c} loading={loading} index={i}/>)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <ChartCard title="Sales over time (Rs.)">
          {loading ? <Skeleton className="h-64"/> : !data?.sales.some((s) => s.gross > 0) ? <EmptyState title="No sales in this period" description="Orders will appear here as customers buy."/> : (<div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.sales} margin={{ left: -10, right: 8, top: 8 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35}/><stop offset="100%" stopColor="var(--brand)" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24}/><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false}/>
              <Tooltip {...chartTooltip} formatter={(v) => formatPrice(v)}/><Area type="monotone" dataKey="gross" name="Gross" stroke="var(--brand)" strokeWidth={2} fill="url(#g)" isAnimationActive={!reduced}/>
            </AreaChart></ResponsiveContainer></div>)}
        </ChartCard>
        <ChartCard title="Bestsellers">
          {loading ? <Skeleton className="h-64"/> : !data?.bestsellers.length ? <p className="py-10 text-center text-sm text-muted">No sales yet.</p> : (<ol className="space-y-3">{data.bestsellers.slice(0, 6).map((b, i) => <li key={b.productId} className="flex items-center gap-3 text-sm"><span className="grid size-6 place-items-center rounded-full bg-surface2 text-xs font-bold">{i + 1}</span><span className="min-w-0 flex-1 truncate">{b.name}</span><span className="font-semibold">{b.qty} sold</span></li>)}</ol>)}
        </ChartCard>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <ChartCard title="Recent orders" actions={<Link to="/admin/orders" className="text-sm font-semibold text-brand">View all</Link>}>
          {recent.loading ? <Skeleton className="h-40"/> : !recent.data?.length ? <p className="py-8 text-center text-sm text-muted">No orders yet.</p> : (<ul className="divide-y divide-border">{recent.data.map((o) => <li key={o.id}><Link to={`/admin/orders?q=${o.orderNumber}`} className="flex items-center justify-between gap-3 py-3 text-sm"><span><b>{o.orderNumber}</b><br /><span className="text-xs text-muted">{o.customerName} - {formatDate(o.createdAt, true)}</span></span><span className="flex items-center gap-3"><OrderStatusBadge status={o.status}/><b>{formatPrice(o.total)}</b></span></Link></li>)}</ul>)}
        </ChartCard>
        <ChartCard title="Inventory attention" actions={<Link to="/admin/inventory" className="text-sm font-semibold text-brand">Manage stock</Link>}>
          {!(low.data?.length || out.data?.length) ? <p className="py-8 text-center text-sm text-muted"><Boxes className="mx-auto mb-2 size-6"/>Stock levels look healthy.</p> : (<ul className="divide-y divide-border text-sm">
              {out.data?.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2.5"><span className="truncate">{p.name}</span><span className="rounded-full bg-danger/12 px-2.5 py-0.5 text-xs font-semibold text-danger">Sold out</span></li>)}
              {low.data?.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 py-2.5"><span className="truncate">{p.name}</span><span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">Low: {p.totalStock} left</span></li>)}
            </ul>)}
        </ChartCard>
      </div>
    </>);
}
