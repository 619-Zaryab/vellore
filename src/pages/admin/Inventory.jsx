import { useMemo, useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { SlidersHorizontal } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { errMsg, formatDate, variantLabel } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Badge, Button, EmptyState, Input, Modal, PageHeader, Select, Skeleton, Tabs, TableWrap, Textarea } from '@/components/ui';
export default function Inventory() {
    const toast = useToast();
    const [tab, setTab] = useState('stock');
    const [filter, setFilter] = useState('all');
    const [q, setQ] = useState('');
    const [adj, setAdj] = useState(null);
    const [mode, setMode] = useState('delta');
    const [value, setValue] = useState('');
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const products = useLiveQuery((n) => query(collection(db, 'products'), orderBy('updatedAt', 'desc'), limit(n)), [], 50);
    const logs = useLiveQuery((n) => query(collection(db, 'inventoryLogs'), orderBy('createdAt', 'desc'), limit(n)), [], 30);
    const rows = useMemo(() => (products.data ?? []).flatMap((p) => p.variants.map((v) => ({ p, v })))
        .filter(({ p, v }) => (filter === 'all' || (filter === 'out' ? v.stock <= 0 : v.stock > 0 && v.stock <= p.lowStockThreshold)) && (!q.trim() || `${p.name} ${v.sku}`.toLowerCase().includes(q.trim().toLowerCase()))), [products.data, filter, q]);
    const submit = async () => {
        if (!adj)
            return;
        const n = Number(value);
        if (!Number.isInteger(n) || (mode === 'set' && n < 0) || n === 0 && mode === 'delta')
            return toast.error('Enter a whole number.');
        if (reason.trim().length < 3)
            return toast.error('Add a reason for the audit log.');
        setBusy(true);
        try {
            const r = await api.adjustStock({ productId: adj.p.id, variantId: adj.v.id, mode, value: n, reason: reason.trim() });
            toast.success(`Stock is now ${r.stock}`);
            setAdj(null);
            setValue('');
            setReason('');
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (<>
      <PageHeader title="Inventory" description="Live stock per variant. Every change is recorded with its reason and who made it."/>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'stock', label: 'Stock levels' }, { id: 'log', label: 'Audit log' }]}/>
      <div className="pt-5">
        {tab === 'stock' ? (<>
            <div className="mb-4 flex flex-wrap gap-3">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by product or SKU" aria-label="Filter inventory" className="h-10 w-full max-w-xs rounded-xl border border-border bg-surface px-3 text-sm"/>
              <Select aria-label="Stock filter" value={filter} onChange={(e) => setFilter(e.target.value)} className="!h-10 w-auto"><option value="all">All variants</option><option value="low">Low stock</option><option value="out">Sold out</option></Select>
            </div>
            {products.loading ? <Skeleton className="h-64"/> : !rows.length ? <EmptyState title="Nothing to show" description="No variants match this filter."/> : (<>
                <TableWrap><table className="tbl"><thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Stock</th><th>Status</th><th /></tr></thead><tbody>
                  {rows.map(({ p, v }) => (<tr key={p.id + v.id}>
                      <td className="max-w-56 truncate font-medium">{p.name}</td><td>{variantLabel(v.options) || 'Default'}</td><td className="text-muted">{v.sku}</td><td className="font-semibold tabular-nums">{v.stock}</td>
                      <td>{!v.active ? <Badge>Inactive</Badge> : v.stock <= 0 ? <Badge tone="danger">SOLD OUT</Badge> : v.stock <= p.lowStockThreshold ? <Badge tone="warning">LOW STOCK</Badge> : <Badge tone="success">In stock</Badge>}</td>
                      <td><Button size="sm" variant="outline" onClick={() => { setAdj({ p, v }); setMode('delta'); setValue(''); setReason(''); }}><SlidersHorizontal className="size-4"/>Adjust</Button></td>
                    </tr>))}
                </tbody></table></TableWrap>
                {products.hasMore && <div className="mt-4 text-center"><Button variant="outline" onClick={products.loadMore}>Load more</Button></div>}
              </>)}
          </>) : logs.loading ? <Skeleton className="h-64"/> : !logs.data?.length ? <EmptyState title="No stock movements yet"/> : (<>
            <TableWrap><table className="tbl"><thead><tr><th>When</th><th>Product</th><th>Change</th><th>Type</th><th>Reason</th><th>By</th></tr></thead><tbody>
              {logs.data.map((l) => (<tr key={l.id}><td className="whitespace-nowrap text-muted">{formatDate(l.createdAt, true)}</td><td className="max-w-48 truncate">{l.productName}<span className="block text-xs text-muted">{l.variantLabel}</span></td>
                  <td className="whitespace-nowrap font-semibold tabular-nums"><span className={l.delta < 0 ? 'text-danger' : 'text-success'}>{l.delta > 0 ? '+' : ''}{l.delta}</span> <span className="font-normal text-muted">({l.before} to {l.after})</span></td>
                  <td><Badge>{l.type}</Badge></td><td className="max-w-56 truncate text-muted">{l.reason}</td><td className="text-muted">{l.adminEmail ?? (l.orderId ? 'system' : '-')}</td></tr>))}
            </tbody></table></TableWrap>
            {logs.hasMore && <div className="mt-4 text-center"><Button variant="outline" onClick={logs.loadMore}>Load more</Button></div>}
          </>)}
      </div>
      <Modal open={!!adj} onClose={() => setAdj(null)} title="Adjust stock" size="sm" footer={<><Button variant="outline" onClick={() => setAdj(null)}>Cancel</Button><Button loading={busy} onClick={submit}>Apply change</Button></>}>
        {adj && (<div className="space-y-4">
            <p className="text-sm"><b>{adj.p.name}</b><br /><span className="text-muted">{variantLabel(adj.v.options) || 'Default'} - current stock {adj.v.stock}</span></p>
            <Select label="Type of change" value={mode} onChange={(e) => setMode(e.target.value)}><option value="delta">Add or remove units</option><option value="set">Set exact quantity</option></Select>
            <Input label={mode === 'delta' ? 'Units to add (use a minus to remove)' : 'New quantity'} type="number" step="1" value={value} onChange={(e) => setValue(e.target.value)}/>
            <Textarea label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Restock delivery, damaged item, stock count..."/>
            <p className="text-xs text-muted">Stock can never go below zero. The change is applied atomically so it is safe while orders come in.</p>
          </div>)}
      </Modal>
    </>);
}
