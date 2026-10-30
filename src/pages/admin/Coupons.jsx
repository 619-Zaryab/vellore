import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDocs, getDoc, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { Edit3, Eye, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { deleteImageByUrl } from '@/lib/storage';
import { fetchCategories } from '@/lib/catalog';
import { errMsg, formatDate, formatPrice } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { useAsync } from '@/hooks/useAsync';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Skeleton, Tabs, TableWrap, Textarea } from '@/components/ui';
import { ImageUploader } from '@/components/ImageUploader';
const dateVal = (t) => (t ? t.toDate().toISOString().slice(0, 10) : '');
const blank = { code: '', description: '', type: 'percent', value: 10, minOrder: 0, maxDiscount: 0, startsAt: '', expiresAt: '', usageLimit: 0, perUserLimit: 1, usedCount: 0, active: true, freeShipping: false, productIds: [], categoryIds: [] };
function CouponsTab() {
    const toast = useToast();
    const list = useLiveQuery((n) => query(collection(db, 'coupons'), limit(n)), [], 50);
    const cats = useAsync(fetchCategories, []);
    const [f, setF] = useState(null);
    const [isNew, setIsNew] = useState(false);
    const [busy, setBusy] = useState(false);
    const [view, setView] = useState(null);
    const [usages, setUsages] = useState(null);
    const [del, setDel] = useState(null);
    useEffect(() => {
        setUsages(null);
        if (view)
            getDocs(collection(db, 'coupons', view.code, 'usages')).then((s) => setUsages(s.docs.map((d) => ({ id: d.id, ...d.data() })))).catch(() => setUsages([]));
    }, [view?.code]); // eslint-disable-line
    const save = async () => {
        if (!f)
            return;
        const code = f.code.trim().toUpperCase();
        if (!/^[A-Z0-9_-]{3,30}$/.test(code))
            return toast.error('Code: 3 to 30 letters, numbers, dashes or underscores.');
        if (f.type === 'percent' && (f.value <= 0 || f.value > 100))
            return toast.error('Percentage must be between 1 and 100.');
        if (f.type === 'fixed' && f.value <= 0)
            return toast.error('Enter a discount amount.');
        if (f.startsAt && f.expiresAt && f.expiresAt < f.startsAt)
            return toast.error('The end date is before the start date.');
        setBusy(true);
        try {
            const ref = doc(db, 'coupons', code);
            if (isNew && (await getDoc(ref)).exists())
                throw new Error('A coupon with this code already exists.');
            const data = {
                code, description: f.description ?? '', type: f.type, value: Number(f.value), minOrder: Number(f.minOrder) || 0, maxDiscount: Number(f.maxDiscount) || 0,
                startsAt: f.startsAt ? Timestamp.fromDate(new Date(f.startsAt + 'T00:00:00')) : null, expiresAt: f.expiresAt ? Timestamp.fromDate(new Date(f.expiresAt + 'T23:59:59')) : null,
                usageLimit: Number(f.usageLimit) || 0, perUserLimit: Number(f.perUserLimit) || 0, active: f.active, freeShipping: !!f.freeShipping,
                productIds: (f.productIds ?? []).filter(Boolean), categoryIds: f.categoryIds ?? [],
            };
            if (isNew)
                await setDoc(ref, { ...data, usedCount: 0, createdAt: serverTimestamp() });
            else
                await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
            toast.success('Coupon saved');
            setF(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    const status = (c) => !c.active ? <Badge>Inactive</Badge> : c.expiresAt && c.expiresAt.toMillis() < Date.now() ? <Badge tone="danger">Expired</Badge> : c.startsAt && c.startsAt.toMillis() > Date.now() ? <Badge tone="info">Scheduled</Badge> : c.usageLimit > 0 && c.usedCount >= c.usageLimit ? <Badge tone="warning">Used up</Badge> : <Badge tone="success">Active</Badge>;
    const edit = (c) => { setIsNew(false); setF({ ...blank, ...c, startsAt: dateVal(c.startsAt), expiresAt: dateVal(c.expiresAt) }); };
    return (<>
      <div className="mb-4 flex justify-end"><Button onClick={() => { setIsNew(true); setF(blank); }}><Plus className="size-4"/>New coupon</Button></div>
      {list.loading ? <Skeleton className="h-48"/> : !list.data?.length ? <EmptyState title="No coupons yet" description="Create a code customers can apply at checkout."/> : (<TableWrap><table className="tbl"><thead><tr><th>Code</th><th>Discount</th><th>Used</th><th>Valid</th><th>Status</th><th /></tr></thead><tbody>
          {list.data.map((c) => (<tr key={c.id}><td className="font-bold">{c.code}</td><td>{c.type === 'percent' ? `${c.value}%` : formatPrice(c.value)}{c.freeShipping ? ' + free shipping' : ''}{c.minOrder ? <span className="block text-xs text-muted">min {formatPrice(c.minOrder)}</span> : null}</td>
              <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td><td className="whitespace-nowrap text-muted">{c.startsAt ? formatDate(c.startsAt) : 'Now'} to {c.expiresAt ? formatDate(c.expiresAt) : 'no end'}</td><td>{status(c)}</td>
              <td><div className="flex gap-1"><Button size="sm" variant="ghost" aria-label="Inspect usage" onClick={() => setView(c)}><Eye className="size-4"/></Button><Button size="sm" variant="ghost" aria-label="Edit" onClick={() => edit(c)}><Edit3 className="size-4"/></Button><Button size="sm" variant="ghost" aria-label="Delete" onClick={() => setDel(c)}><Trash2 className="size-4"/></Button></div></td></tr>))}
        </tbody></table></TableWrap>)}
      <Modal open={!!f} onClose={() => setF(null)} size="lg" title={isNew ? 'New coupon' : `Edit ${f?.code}`} footer={<><Button variant="outline" onClick={() => setF(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save coupon</Button></>}>
        {f && (<div className="grid gap-4 sm:grid-cols-2">
            <Input label="Code" value={f.code} disabled={!isNew} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} placeholder="WELCOME10"/>
            <Input label="Description (internal)" value={f.description ?? ''} onChange={(e) => setF({ ...f, description: e.target.value })}/>
            <Select label="Type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percentage off</option><option value="fixed">Fixed amount off (Rs.)</option></Select>
            <Input label={f.type === 'percent' ? 'Percent (1 to 100)' : 'Amount (Rs.)'} type="number" min={0} value={f.value} onChange={(e) => setF({ ...f, value: Number(e.target.value) })}/>
            <Input label="Minimum order (Rs., 0 = none)" type="number" min={0} value={f.minOrder ?? 0} onChange={(e) => setF({ ...f, minOrder: Number(e.target.value) })}/>
            <Input label="Maximum discount (Rs., 0 = none)" type="number" min={0} value={f.maxDiscount ?? 0} disabled={f.type !== 'percent'} onChange={(e) => setF({ ...f, maxDiscount: Number(e.target.value) })}/>
            <Input label="Starts on" type="date" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })}/>
            <Input label="Expires on" type="date" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })}/>
            <Input label="Total usage limit (0 = unlimited)" type="number" min={0} value={f.usageLimit} onChange={(e) => setF({ ...f, usageLimit: Number(e.target.value) })}/>
            <Input label="Uses per customer (0 = unlimited)" type="number" min={0} value={f.perUserLimit} onChange={(e) => setF({ ...f, perUserLimit: Number(e.target.value) })}/>
            <Select label="Only for categories (optional)" multiple className="!h-28" value={f.categoryIds ?? []} onChange={(e) => setF({ ...f, categoryIds: [...e.target.selectedOptions].map((o) => o.value) })}>{(cats.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Textarea label="Only for product IDs (optional, comma separated)" className="min-h-28" value={(f.productIds ?? []).join(', ')} onChange={(e) => setF({ ...f, productIds: e.target.value.split(',').map((x) => x.trim()) })}/>
            <Checkbox label="Includes free shipping" checked={!!f.freeShipping} onChange={(e) => setF({ ...f, freeShipping: e.target.checked })}/>
            <Checkbox label="Active" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })}/>
          </div>)}
      </Modal>
      <Modal open={!!view} onClose={() => setView(null)} title={`Usage of ${view?.code}`} size="md">
        {view && <div className="space-y-3 text-sm"><p>Redeemed <b>{view.usedCount}</b> time{view.usedCount === 1 ? '' : 's'}{view.usageLimit ? ` of ${view.usageLimit}` : ''}.</p>
          {usages === null ? <Skeleton className="h-16"/> : !usages.length ? <p className="text-muted">No customer has used it yet.</p> : <ul className="divide-y divide-border">{usages.map((u) => <li key={u.id} className="flex justify-between py-2"><span className="break-all text-muted">Customer {u.id.slice(0, 8)}...</span><b>{u.count}x</b></li>)}</ul>}</div>}
      </Modal>
      <ConfirmDialog open={!!del} danger title={`Delete ${del?.code}?`} message="Orders that already used this coupon keep their discount. Consider deactivating instead." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={async () => { if (del) {
        await deleteDoc(doc(db, 'coupons', del.code));
        toast.success('Coupon deleted');
        setDel(null);
    } }}/>
    </>);
}
function PromosTab() {
    const toast = useToast();
    const list = useLiveQuery((n) => query(collection(db, 'promotions'), orderBy('title'), limit(n)), [], 50);
    const [f, setF] = useState(null);
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (!f?.title?.trim())
            return toast.error('Enter a title.');
        setBusy(true);
        try {
            const id = f.id ?? doc(collection(db, 'promotions')).id;
            const data = { title: f.title.trim(), subtitle: f.subtitle ?? '', image: f.image ?? '', link: f.link ?? '/products', placement: f.placement ?? 'banner', active: f.active ?? true, startsAt: f.start ? Timestamp.fromDate(new Date(f.start + 'T00:00:00')) : null, endsAt: f.end ? Timestamp.fromDate(new Date(f.end + 'T23:59:59')) : null };
            await setDoc(doc(db, 'promotions', id), data, { merge: true });
            toast.success('Promotion saved');
            setF(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (<>
      <div className="mb-4 flex justify-between gap-3"><p className="text-sm text-muted">Banners and seasonal campaigns shown on the homepage while active and within their dates.</p><Button onClick={() => setF({ start: '', end: '', active: true, placement: 'banner' })}><Plus className="size-4"/>New promotion</Button></div>
      {list.loading ? <Skeleton className="h-40"/> : !list.data?.length ? <EmptyState title="No promotions"/> : (<ul className="grid gap-3 sm:grid-cols-2">
          {list.data.map((p) => (<li key={p.id} className="flex gap-3 rounded-2xl border border-border bg-surface p-3">
              {p.image ? <img src={p.image} alt="" className="size-20 rounded-xl object-cover"/> : <span className="size-20 rounded-xl bg-surface2"/>}
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="truncate text-xs text-muted">{p.subtitle}</p><div className="mt-1 flex items-center gap-2"><Badge tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Off'}</Badge><span className="text-xs text-muted">{p.endsAt ? `until ${formatDate(p.endsAt)}` : ''}</span></div></div>
              <div className="flex flex-col"><Button size="sm" variant="ghost" aria-label="Edit" onClick={() => setF({ ...p, start: dateVal(p.startsAt), end: dateVal(p.endsAt) })}><Edit3 className="size-4"/></Button><Button size="sm" variant="ghost" aria-label="Delete" onClick={async () => { await deleteDoc(doc(db, 'promotions', p.id)); if (p.image)
                deleteImageByUrl(p.image); toast.info('Promotion deleted'); }}><Trash2 className="size-4"/></Button></div>
            </li>))}
        </ul>)}
      <Modal open={!!f} onClose={() => setF(null)} title={f?.id ? 'Edit promotion' : 'New promotion'} footer={<><Button variant="outline" onClick={() => setF(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {f && (<div className="space-y-4">
            <Input label="Title" value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={80}/>
            <Input label="Subtitle" value={f.subtitle ?? ''} onChange={(e) => setF({ ...f, subtitle: e.target.value })} maxLength={140}/>
            <Input label="Link (path in the store)" value={f.link ?? ''} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="/products?deals=1"/>
            <div className="grid grid-cols-2 gap-3"><Input label="Starts" type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })}/><Input label="Ends" type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })}/></div>
            <Checkbox label="Active" checked={f.active ?? true} onChange={(e) => setF({ ...f, active: e.target.checked })}/>
            <div><p className="mb-2 text-sm font-medium">Background image</p><ImageUploader folder="promotions" images={f.image ? [f.image] : []} max={1} onChange={(u) => setF({ ...f, image: u[0] ?? '' })}/></div>
          </div>)}
      </Modal>
    </>);
}
export default function Coupons() {
    const [tab, setTab] = useState('coupons');
    return (<>
      <PageHeader title="Coupons and promotions"/>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'coupons', label: 'Coupons' }, { id: 'promos', label: 'Homepage promotions' }]}/>
      <div className="pt-5">{tab === 'coupons' ? <CouponsTab /> : <PromosTab />}</div>
    </>);
}
