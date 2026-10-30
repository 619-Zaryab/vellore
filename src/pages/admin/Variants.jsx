import { useMemo, useState } from 'react';
import { collection, doc, limit, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '@/lib/firebase';
import { deriveStock, errMsg, formatPrice, priceInfo, variantLabel } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Badge, Button, Checkbox, EmptyState, PageHeader, Skeleton, TableWrap } from '@/components/ui';
export default function Variants() {
    const toast = useToast();
    const [q, setQ] = useState('');
    const [edit, setEdit] = useState({});
    const list = useLiveQuery((n) => query(collection(db, 'products'), orderBy('updatedAt', 'desc'), limit(n)), [], 40);
    const rows = useMemo(() => (list.data ?? []).flatMap((p) => p.variants.map((v) => ({ p, v }))).filter(({ p, v }) => !q.trim() || `${p.name} ${v.sku} ${variantLabel(v.options)}`.toLowerCase().includes(q.trim().toLowerCase())), [list.data, q]);
    const patch = async (p, vid, fn) => {
        try {
            await runTransaction(db, async (tx) => {
                const ref = doc(db, 'products', p.id);
                const s = await tx.get(ref);
                const live = s.data();
                const variants = live.variants.map((v) => (v.id === vid ? fn(v) : v));
                tx.update(ref, { variants, ...deriveStock(variants, live.lowStockThreshold), onSale: variants.some((v) => priceInfo(live, v).onSale) || !!live.salePrice, updatedAt: serverTimestamp() });
            });
            toast.success('Variant updated');
        }
        catch (e) {
            toast.error(errMsg(e));
        }
    };
    return (<>
      <PageHeader title="Product variants" description="Quick edits for prices and availability across all variants. Stock is managed in Inventory so every change is logged."/>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by product, SKU or option" aria-label="Filter variants" className="mb-4 h-10 w-full max-w-sm rounded-xl border border-border bg-surface px-3 text-sm"/>
      {list.loading ? <Skeleton className="h-64"/> : !rows.length ? <EmptyState title="No variants" description="Variants are created in the product editor."/> : (<>
          <TableWrap>
            <table className="tbl">
              <thead><tr><th>Product</th><th>Variant</th><th>SKU</th><th>Price</th><th>Sale price</th><th>Stock</th><th>Active</th><th /></tr></thead>
              <tbody>
                {rows.map(({ p, v }) => {
                const k = `${p.id}:${v.id}`;
                const e = edit[k] ?? { price: v.price?.toString() ?? '', sale: v.salePrice?.toString() ?? '' };
                const dirty = e.price !== (v.price?.toString() ?? '') || e.sale !== (v.salePrice?.toString() ?? '');
                return (<tr key={k}>
                      <td className="max-w-48 truncate font-medium">{p.name}</td>
                      <td>{variantLabel(v.options) || 'Default'}</td>
                      <td className="text-muted">{v.sku}</td>
                      <td><input aria-label="Price override" type="number" min={0} placeholder={String(p.price)} value={e.price} onChange={(x) => setEdit({ ...edit, [k]: { ...e, price: x.target.value } })} className="h-9 w-24 rounded-lg border border-border bg-surface px-2"/></td>
                      <td><input aria-label="Sale override" type="number" min={0} value={e.sale} onChange={(x) => setEdit({ ...edit, [k]: { ...e, sale: x.target.value } })} className="h-9 w-24 rounded-lg border border-border bg-surface px-2"/></td>
                      <td>{v.stock <= 0 ? <Badge tone="danger">0</Badge> : v.stock}</td>
                      <td><Checkbox aria-label="Active" label="" checked={v.active} onChange={(x) => patch(p, v.id, (o) => ({ ...o, active: x.target.checked }))}/></td>
                      <td>{dirty && <Button size="sm" onClick={() => { const price = e.price === '' ? null : Number(e.price), sale = e.sale === '' ? null : Number(e.sale); if ((price != null && price <= 0) || (sale != null && sale >= (price ?? p.price)))
                    return toast.error('Sale price must be lower than the price.'); patch(p, v.id, (o) => ({ ...o, price, salePrice: sale })).then(() => setEdit((s) => { const n = { ...s }; delete n[k]; return n; })); }}>Save</Button>}</td>
                    </tr>);
            })}
              </tbody>
            </table>
          </TableWrap>
          <p className="mt-3 text-xs text-muted">Current price shown as placeholder: {rows[0] ? formatPrice(rows[0].p.price) : ''}. Open the <Link className="font-semibold text-brand" to="/admin/products">product editor</Link> to add or remove options.</p>
          {list.hasMore && <div className="mt-4 text-center"><Button variant="outline" onClick={list.loadMore}>Load more</Button></div>}
        </>)}
    </>);
}
