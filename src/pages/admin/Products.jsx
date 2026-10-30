import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, deleteDoc, doc, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, where, writeBatch } from 'firebase/firestore';
import { Archive, Download, Edit3, Plus, Search, Star, Trash2, Upload } from 'lucide-react';
import { db } from '@/lib/firebase';
import { deleteImageByUrl } from '@/lib/storage';
import { downloadCSV, parseCSV } from '@/lib/csv';
import { fetchCategories } from '@/lib/catalog';
import { buildKeywords, errMsg, formatDate, formatPrice, slugify } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useAsync } from '@/hooks/useAsync';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, PageHeader, Select, Skeleton, TableWrap } from '@/components/ui';
import ProductEditor from './ProductEditor';
export default function Products() {
    const { user } = useAuth();
    const toast = useToast();
    const [sp] = useSearchParams();
    const [q, setQ] = useState(sp.get('q') ?? '');
    const [status, setStatus] = useState('');
    const [sel, setSel] = useState(new Set());
    const [editing, setEditing] = useState(null);
    const [newId] = useState(() => doc(collection(db, 'products')).id);
    const [del, setDel] = useState(null);
    const [busy, setBusy] = useState(false);
    const file = useRef(null);
    const cats = useAsync(fetchCategories, [editing]);
    const list = useLiveQuery((n) => status
        ? query(collection(db, 'products'), where('status', '==', status), orderBy('updatedAt', 'desc'), limit(n))
        : query(collection(db, 'products'), orderBy('updatedAt', 'desc'), limit(n)), [status]);
    const rows = useMemo(() => {
        const t = q.trim().toLowerCase();
        return (list.data ?? []).filter((p) => !t || p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t));
    }, [list.data, q]);
    const catName = (id) => cats.data?.find((c) => c.id === id)?.name ?? '-';
    const bulk = async (patch, msg) => {
        setBusy(true);
        try {
            const b = writeBatch(db);
            sel.forEach((id) => b.update(doc(db, 'products', id), { ...patch, updatedAt: serverTimestamp() }));
            await b.commit();
            toast.success(msg);
            setSel(new Set());
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!del)
            return;
        setBusy(true);
        try {
            for (const p of del) {
                await deleteDoc(doc(db, 'products', p.id));
                await Promise.all(p.images.map(deleteImageByUrl));
            }
            toast.success(`Deleted ${del.length} product${del.length > 1 ? 's' : ''}`);
            setSel(new Set());
            setDel(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    const exportCsv = () => downloadCSV('vellore-products.csv', (list.data ?? []).flatMap((p) => p.variants.map((v) => ({ productId: p.id, sku: v.sku, name: p.name, variant: Object.values(v.options).join(' / '), category: catName(p.categoryId), status: p.status, price: v.price ?? p.price, salePrice: v.salePrice ?? p.salePrice ?? '', stock: v.stock, featured: p.featured }))));
    const importCsv = async (f) => {
        if (!f || !user)
            return;
        setBusy(true);
        try {
            const rows = parseCSV(await f.text());
            if (!rows.length)
                throw new Error('The file has no rows.');
            let ok = 0;
            const errors = [];
            for (const [i, r] of rows.entries()) {
                const price = Number(r.price), stock = Number(r.stock || 0);
                if (!r.name || !r.sku || !r.categoryId || !(price > 0) || !Number.isInteger(stock) || stock < 0) {
                    errors.push(`Row ${i + 2}`);
                    continue;
                }
                const ref = doc(collection(db, 'products'));
                await setDoc(ref, {
                    sku: r.sku, name: r.name, slug: slugify(r.name), description: r.description || r.name, categoryId: r.categoryId, subcategoryId: null, categoryPath: [r.categoryId], images: r.image ? [r.image] : [], price,
                    salePrice: Number(r.salePrice) > 0 ? Number(r.salePrice) : null, specs: [], status: r.status === 'active' ? 'active' : 'draft', searchKeywords: buildKeywords(r.name, r.sku), featured: false, ratingAvg: 0, ratingCount: 0, soldCount: 0, lowStockThreshold: 5,
                    options: [], variants: [{ id: 'default', sku: r.sku, options: {}, stock, active: true, price: null, salePrice: null, images: [] }], totalStock: stock, inStock: stock > 0, lowStock: stock > 0 && stock <= 5, onSale: Number(r.salePrice) > 0, isDemo: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
                });
                if (stock > 0)
                    await setDoc(doc(collection(db, 'inventoryLogs')), { productId: ref.id, productName: r.name, variantId: 'default', variantLabel: 'Default', sku: r.sku, before: 0, after: stock, delta: stock, type: 'initial', reason: 'CSV import', adminId: user.uid, adminEmail: user.email, createdAt: Timestamp.now() });
                ok++;
            }
            toast[errors.length ? 'info' : 'success'](`Imported ${ok} product${ok === 1 ? '' : 's'}${errors.length ? `. Skipped: ${errors.slice(0, 5).join(', ')}${errors.length > 5 ? '...' : ''}` : ''}. Imported products are drafts: add images, then activate them.`);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
            if (file.current)
                file.current.value = '';
        }
    };
    const all = rows.length > 0 && rows.every((p) => sel.has(p.id));
    return (<>
      <PageHeader title="Products" description="Create products, manage images, variants and visibility." actions={<><input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => importCsv(e.target.files?.[0])}/>
          <Button variant="outline" onClick={() => file.current?.click()} loading={busy}><Upload className="size-4"/>Import CSV</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!list.data?.length}><Download className="size-4"/>Export CSV</Button>
          <Button onClick={() => setEditing('new')}><Plus className="size-4"/>New product</Button></>}/>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by name or SKU" aria-label="Filter products" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"/></div>
        <Select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="!h-10 w-auto"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></Select>
        {sel.size > 0 && (<div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand/10 px-3 py-1.5 text-sm"><b>{sel.size} selected</b>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ status: 'active' }, 'Products activated')}>Activate</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ status: 'archived' }, 'Products archived')}><Archive className="size-4"/>Archive</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ featured: true }, 'Marked as featured')}><Star className="size-4"/>Feature</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk({ featured: false }, 'Removed from featured')}>Unfeature</Button>
            <Button size="sm" variant="danger" onClick={() => setDel(rows.filter((p) => sel.has(p.id)))}><Trash2 className="size-4"/></Button>
          </div>)}
      </div>
      {list.error && <div role="alert" className="mb-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">{list.error}</div>}
      {list.loading ? <Skeleton className="h-64"/> : !rows.length ? <EmptyState title="No products found" description="Create your first product, or load demo data from Settings." action={<Button onClick={() => setEditing('new')}>New product</Button>}/> : (<>
          <TableWrap>
            <table className="tbl">
              <thead><tr><th className="w-10"><Checkbox aria-label="Select all" label="" checked={all} onChange={() => setSel(all ? new Set() : new Set(rows.map((p) => p.id)))}/></th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Updated</th><th /></tr></thead>
              <tbody>
                {rows.map((p) => (<tr key={p.id}>
                    <td><Checkbox aria-label={`Select ${p.name}`} label="" checked={sel.has(p.id)} onChange={() => setSel((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })}/></td>
                    <td><div className="flex items-center gap-3"><img src={p.images[0]} alt="" className="size-11 rounded-lg bg-surface2 object-cover"/><div className="min-w-0"><p className="max-w-56 truncate font-semibold">{p.name} {p.featured && <Star className="inline size-3.5 fill-accent text-accent"/>}</p><p className="text-xs text-muted">{p.sku} - {p.variants.length} variant{p.variants.length > 1 ? 's' : ''}{p.isDemo ? ' - demo' : ''}</p></div></div></td>
                    <td>{catName(p.categoryId)}</td>
                    <td>{formatPrice(p.salePrice ?? p.price)}</td>
                    <td>{!p.inStock ? <Badge tone="danger">Sold out</Badge> : p.lowStock ? <Badge tone="warning">Low: {p.totalStock}</Badge> : p.totalStock}</td>
                    <td><Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</Badge></td>
                    <td className="whitespace-nowrap text-muted">{formatDate(p.updatedAt)}</td>
                    <td><div className="flex gap-1"><Button size="sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)}><Edit3 className="size-4"/></Button><Button size="sm" variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => setDel([p])}><Trash2 className="size-4"/></Button></div></td>
                  </tr>))}
              </tbody>
            </table>
          </TableWrap>
          {list.hasMore && <div className="mt-4 text-center"><Button variant="outline" onClick={list.loadMore}>Load more</Button></div>}
        </>)}
      <ProductEditor open={!!editing} product={editing === 'new' ? null : editing} categories={cats.data ?? []} newId={newId} onClose={() => setEditing(null)}/>
      <ConfirmDialog open={!!del} danger loading={busy} title={`Delete ${del?.length === 1 ? del[0].name : `${del?.length} products`}?`} message="This permanently removes the product and its images. Existing orders keep their own copy of the details. Archive instead if you may want it back." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={remove}/>
    </>);
}
