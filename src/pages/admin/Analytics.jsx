import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useReducedMotion } from 'motion/react';
import { Download } from 'lucide-react';
import { downloadCSV } from '@/lib/csv';
import { PAYMENT_METHOD_LABEL, STATUS_LABEL } from '@/lib/constants';
import { formatPrice } from '@/lib/utils';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button, EmptyState, Input, PageHeader, Select, Skeleton, TableWrap } from '@/components/ui';
import { ChartCard, chartTooltip, KpiCard, PALETTE } from '@/components/admin/Kpi';
const iso = (d) => d.toISOString().slice(0, 10);
const RANGES = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months', custom: 'Custom range' };
const axis = { tick: { fill: 'var(--muted)', fontSize: 11 }, tickLine: false, axisLine: false };
export default function Analytics() {
    const [range, setRange] = useState('30');
    const [gran, setGran] = useState('day');
    const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 864e5)));
    const [to, setTo] = useState(iso(new Date()));
    const reduced = useReducedMotion();
    const f = range === 'custom' ? from : iso(new Date(Date.now() - (Number(range) - 1) * 864e5));
    const t = range === 'custom' ? to : iso(new Date());
    const { data, loading, error } = useAnalytics(f, t, gran);
    const k = data?.kpis;
    const status = useMemo(() => data?.ordersByStatus.map((s) => ({ ...s, name: STATUS_LABEL[s.status] ?? s.status })) ?? [], [data]);
    const pay = useMemo(() => data?.paymentMix.map((p) => ({ ...p, name: PAYMENT_METHOD_LABEL[p.method] ?? p.method })) ?? [], [data]);
    const inv = data ? [{ name: 'Healthy', value: data.inventory.healthy }, { name: 'Low stock', value: data.inventory.low }, { name: 'Out of stock', value: data.inventory.out }] : [];
    const exportAll = () => {
        if (!data)
            return;
        downloadCSV(`vellore-sales-${f}_${t}.csv`, data.sales);
        downloadCSV(`vellore-bestsellers-${f}_${t}.csv`, data.bestsellers);
        downloadCSV(`vellore-categories-${f}_${t}.csv`, data.revenueByCategory);
    };
    return (<>
      <PageHeader title="Analytics and reports" description="Every figure is calculated on the server from real orders." actions={<><Select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className="!h-10 w-auto">{Object.entries(RANGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <Select aria-label="Group by" value={gran} onChange={(e) => setGran(e.target.value)} className="!h-10 w-auto"><option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option></Select>
          <Button variant="outline" onClick={exportAll} disabled={!data}><Download className="size-4"/>Export CSV</Button></>}/>
      {range === 'custom' && <div className="mb-4 flex flex-wrap gap-3"><Input label="From" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)}/><Input label="To" type="date" value={to} min={from} max={iso(new Date())} onChange={(e) => setTo(e.target.value)}/></div>}
      {error && <div role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{error}</div>}
      {data?.truncated && <div className="mb-4 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">This range has more orders than can be aggregated live (5,000). Figures cover the most recent 5,000. Use a shorter range for exact numbers.</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Gross sales" value={k?.grossSales} format={formatPrice} loading={loading} hint="Valid orders in range (excludes cancelled, failed, unpaid online)."/>
        <KpiCard label="Net revenue" value={k?.netRevenue} format={formatPrice} loading={loading} hint="Paid online + delivered COD, minus refunds." index={1}/>
        <KpiCard label="Orders" value={k?.totalOrders} loading={loading} index={2}/>
        <KpiCard label="Average order value" value={k?.aov} format={formatPrice} loading={loading} index={3}/>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Sales over time" className="xl:col-span-2">
          {loading ? <Skeleton className="h-72"/> : !data?.sales.length ? <EmptyState title="No data for this range"/> : (<div className="h-72"><ResponsiveContainer><LineChart data={data.sales} margin={{ left: -8, right: 8, top: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="label" {...axis} minTickGap={24}/><YAxis {...axis}/><Tooltip {...chartTooltip} formatter={(v) => formatPrice(v)}/><Legend />
              <Line type="monotone" dataKey="gross" name="Gross sales" stroke="var(--brand)" strokeWidth={2} dot={false} isAnimationActive={!reduced}/>
              <Line type="monotone" dataKey="net" name="Net revenue" stroke="var(--success)" strokeWidth={2} dot={false} isAnimationActive={!reduced}/>
            </LineChart></ResponsiveContainer></div>)}
        </ChartCard>
        <ChartCard title="Orders by status">
          {loading ? <Skeleton className="h-64"/> : !status.length ? <EmptyState title="No orders"/> : (<div className="h-64"><ResponsiveContainer><BarChart data={status} layout="vertical" margin={{ left: 24 }}><CartesianGrid stroke="var(--border)" horizontal={false}/><XAxis type="number" {...axis} allowDecimals={false}/><YAxis type="category" dataKey="name" width={110} {...axis}/><Tooltip {...chartTooltip}/><Bar dataKey="count" name="Orders" fill="var(--brand)" radius={[0, 6, 6, 0]} isAnimationActive={!reduced}/></BarChart></ResponsiveContainer></div>)}
        </ChartCard>
        <ChartCard title="Revenue by category">
          {loading ? <Skeleton className="h-64"/> : !data?.revenueByCategory.length ? <EmptyState title="No category revenue"/> : (<div className="h-64"><ResponsiveContainer><BarChart data={data.revenueByCategory} margin={{ left: -8 }}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="name" {...axis}/><YAxis {...axis}/><Tooltip {...chartTooltip} formatter={(v) => formatPrice(v)}/><Bar dataKey="revenue" name="Revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} isAnimationActive={!reduced}/></BarChart></ResponsiveContainer></div>)}
        </ChartCard>
        <ChartCard title="Payment methods">
          {loading ? <Skeleton className="h-64"/> : !pay.length ? <EmptyState title="No payments yet"/> : (<div className="h-64"><ResponsiveContainer><PieChart><Pie data={pay} dataKey="orders" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} isAnimationActive={!reduced}>{pay.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}</Pie><Tooltip {...chartTooltip}/><Legend /></PieChart></ResponsiveContainer></div>)}
        </ChartCard>
        <ChartCard title="Inventory health">
          {loading ? <Skeleton className="h-64"/> : (<div className="h-64"><ResponsiveContainer><PieChart><Pie data={inv} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3} isAnimationActive={!reduced}>{inv.map((_, i) => <Cell key={i} fill={['var(--success)', 'var(--accent)', 'var(--danger)'][i]}/>)}</Pie><Tooltip {...chartTooltip}/><Legend /></PieChart></ResponsiveContainer></div>)}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Bestselling products" actions={data && <Button size="sm" variant="ghost" onClick={() => downloadCSV(`bestsellers-${f}_${t}.csv`, data.bestsellers)}><Download className="size-4"/></Button>}>
          {loading ? <Skeleton className="h-40"/> : !data?.bestsellers.length ? <p className="py-6 text-center text-sm text-muted">No sales in this range.</p> : (<TableWrap className="border-0"><table className="tbl"><thead><tr><th>Product</th><th>Units</th><th>Revenue</th></tr></thead><tbody>{data.bestsellers.map((b) => <tr key={b.productId}><td className="max-w-56 truncate">{b.name}</td><td>{b.qty}</td><td>{formatPrice(b.revenue)}</td></tr>)}</tbody></table></TableWrap>)}
        </ChartCard>
        <ChartCard title="Coupon performance" actions={data && <Button size="sm" variant="ghost" onClick={() => downloadCSV(`coupons-${f}_${t}.csv`, data.coupons)}><Download className="size-4"/></Button>}>
          {loading ? <Skeleton className="h-40"/> : !data?.coupons.length ? <p className="py-6 text-center text-sm text-muted">No coupons used in this range.</p> : (<TableWrap className="border-0"><table className="tbl"><thead><tr><th>Code</th><th>Orders</th><th>Discount given</th></tr></thead><tbody>{data.coupons.map((c) => <tr key={c.code}><td className="font-semibold">{c.code}</td><td>{c.uses}</td><td>{formatPrice(c.discount)}</td></tr>)}</tbody></table></TableWrap>)}
          <div className="mt-4 rounded-xl bg-surface2 p-3 text-sm">
            <p className="font-semibold">Repeat customers</p>
            {data?.repeat ? <p className="text-muted">{data.repeat.repeatCustomers} of {data.repeat.customers} customers ordered more than once ({Math.round(data.repeat.rate * 100)}%).</p> : <p className="text-muted">Not enough orders in this range yet (needs at least 10).</p>}
          </div>
        </ChartCard>
      </div>
      <details className="mt-6 rounded-2xl border border-border bg-surface p-4 text-sm text-muted"><summary className="cursor-pointer font-semibold text-fg">How these numbers are calculated</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5"><li><b>Gross sales:</b> total of orders that are not cancelled, failed or awaiting online payment.</li><li><b>Net revenue:</b> orders with payment received (online paid, or COD once delivered) minus refunded orders.</li><li><b>Average order value:</b> gross sales divided by valid orders.</li><li>Sales are grouped by the order creation date in Pakistan time.</li></ul>
      </details>
    </>);
}
