import { useEffect, useMemo, useState } from 'react';
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { deleteImageByUrl } from '@/lib/storage';
import { buildKeywords, cn, deriveStock, errMsg, priceInfo, slugify, variantLabel } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Checkbox, Input, Modal, Select, Tabs, Textarea } from '@/components/ui';
import { ImageUploader } from '@/components/ImageUploader';
const num = z.preprocess((v) => (v === '' || v == null ? undefined : Number(v)), z.number().min(0).optional());
const schema = z.object({
    name: z.string().min(2, 'Enter a product name').max(120),
    sku: z.string().min(2, 'Enter a SKU').max(40),
    description: z.string().min(10, 'Add a short description').max(5000),
    categoryId: z.string().min(1, 'Choose a category'),
    subcategoryId: z.string().optional(),
    status: z.enum(['active', 'draft', 'archived']),
    featured: z.boolean(),
    price: z.preprocess((v) => Number(v), z.number().positive('Enter a price')),
    salePrice: num,
    lowStockThreshold: z.preprocess((v) => Number(v), z.number().int().min(0)),
});
const vid = (o) => Object.values(o).map(slugify).join('-') || 'default';
function combos(opts) {
    return opts.reduce((acc, o) => acc.flatMap((a) => o.values.map((v) => ({ ...a, [o.name]: v }))), [{}]);
}
export default function ProductEditor({ open, product, categories, onClose, newId }) {
    const { user } = useAuth();
    const { settings } = useSettings();
    const toast = useToast();
    const [tab, setTab] = useState('basic');
    const [images, setImages] = useState([]);
    const [optRows, setOptRows] = useState([]);
    const [variants, setVariants] = useState([]);
    const [specs, setSpecs] = useState([]);
    const [busy, setBusy] = useState(false);
    const id = product?.id ?? newId;
    const existing = useMemo(() => new Set(product?.variants.map((v) => v.id) ?? []), [product]);
    const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
    const catId = watch('categoryId');
    useEffect(() => {
        if (!open)
            return;
        setTab('basic');
        setImages(product?.images ?? []);
        setOptRows(product?.options.map((o) => ({ name: o.name, values: o.values.join(', ') })) ?? []);
        setVariants(product?.variants ?? [{ id: 'default', sku: '', options: {}, stock: 0, active: true }]);
        setSpecs(product?.specs ?? []);
        reset({ name: product?.name ?? '', sku: product?.sku ?? '', description: product?.description ?? '', categoryId: product?.categoryId ?? '', subcategoryId: product?.subcategoryId ?? '', status: product?.status ?? 'draft', featured: product?.featured ?? false, price: product?.price ?? '', salePrice: product?.salePrice ?? '', lowStockThreshold: product?.lowStockThreshold ?? settings.lowStockDefault });
    }, [open, product?.id]); // eslint-disable-line
    const options = optRows.map((o) => ({ name: o.name.trim(), values: [...new Set(o.values.split(',').map((x) => x.trim()).filter(Boolean))] })).filter((o) => o.name && o.values.length);
    const subs = categories.filter((c) => c.parentId === catId);
    const generate = () => {
        const list = combos(options).map((o) => {
            const idv = vid(o);
            return variants.find((v) => v.id === idv) ?? { id: idv, sku: '', options: o, stock: 0, active: true, price: null, salePrice: null };
        });
        // Existing variants that disappeared from the option list are kept but deactivated (never delete variants that may be in orders or carts).
        const gone = variants.filter((v) => existing.has(v.id) && !list.some((x) => x.id === v.id)).map((v) => ({ ...v, active: false }));
        setVariants([...list, ...gone]);
    };
    const patchV = (i, p) => setVariants((vs) => vs.map((v, n) => (n === i ? { ...v, ...p } : v)));
    const save = handleSubmit(async (f) => {
        if (!user)
            return;
        if (f.salePrice != null && f.salePrice >= f.price)
            return toast.error('Sale price must be lower than the regular price.');
        let vs = variants;
        if (!options.length)
            vs = [{ ...(variants.find((v) => v.id === 'default') ?? variants[0] ?? { stock: 0, active: true }), id: 'default', options: {}, sku: variants[0]?.sku || `${f.sku}` }];
        const skus = vs.map((v) => (v.sku || '').trim());
        if (skus.some((s) => !s)) {
            setTab('variants');
            return toast.error('Every variant needs a SKU.');
        }
        if (new Set(skus).size !== skus.length) {
            setTab('variants');
            return toast.error('Variant SKUs must be unique.');
        }
        if (vs.some((v) => !Number.isInteger(Number(v.stock)) || Number(v.stock) < 0)) {
            setTab('variants');
            return toast.error('Stock must be a whole number, zero or more.');
        }
        if (!images.length) {
            setTab('images');
            return toast.error('Add at least one product image.');
        }
        setBusy(true);
        try {
            const catName = categories.find((c) => c.id === f.categoryId)?.name ?? '';
            const ref = doc(db, 'products', id);
            const logs = [];
            await runTransaction(db, async (tx) => {
                logs.length = 0;
                const snap = await tx.get(ref);
                const live = snap.exists() ? snap.data() : null;
                // Stock of variants that already exist is controlled only through audited adjustments or orders; keep the live value.
                const merged = vs.map((v) => {
                    const lv = live?.variants.find((x) => x.id === v.id);
                    const clean = { id: v.id, sku: v.sku.trim(), options: v.options, stock: lv ? lv.stock : Number(v.stock), active: !!v.active, price: v.price ?? null, salePrice: v.salePrice ?? null, images: v.images ?? [] };
                    if (!lv && clean.stock > 0)
                        logs.push({ variantId: clean.id, variantLabel: variantLabel(clean.options) || 'Default', sku: clean.sku, before: 0, after: clean.stock, delta: clean.stock });
                    return clean;
                });
                const d = deriveStock(merged, f.lowStockThreshold);
                const onSale = f.salePrice != null || merged.some((v) => priceInfo({ price: f.price, salePrice: f.salePrice }, v).onSale);
                const data = {
                    sku: f.sku.trim(), name: f.name.trim(), slug: slugify(f.name), description: f.description.trim(), categoryId: f.categoryId, subcategoryId: f.subcategoryId || null,
                    categoryPath: [f.categoryId, ...(f.subcategoryId ? [f.subcategoryId] : [])], images, price: f.price, salePrice: f.salePrice ?? null, specs: specs.filter((s) => s.label.trim() && s.value.trim()),
                    status: f.status, featured: f.featured, lowStockThreshold: f.lowStockThreshold, options, variants: merged, ...d, onSale,
                    searchKeywords: buildKeywords(f.name, f.sku, catName, ...merged.map((v) => v.sku)), updatedAt: serverTimestamp(),
                };
                if (live)
                    tx.update(ref, data);
                else
                    tx.set(ref, { ...data, ratingAvg: 0, ratingCount: 0, soldCount: 0, createdAt: serverTimestamp(), isDemo: false });
                for (const l of logs)
                    tx.set(doc(collection(db, 'inventoryLogs')), { ...l, productId: id, productName: f.name.trim(), type: 'initial', reason: 'Initial stock', adminId: user.uid, adminEmail: user.email, createdAt: Timestamp.now() });
            });
            // Remove images that were taken off this product.
            await Promise.all((product?.images ?? []).filter((u) => !images.includes(u)).map(deleteImageByUrl));
            toast.success(product ? 'Product updated' : 'Product created');
            onClose();
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    }, () => { setTab('basic'); toast.error('Please fix the highlighted fields.'); });
    return (<Modal open={open} onClose={onClose} size="xl" title={product ? `Edit: ${product.name}` : 'New product'} footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button loading={busy} onClick={save}>Save product</Button></>}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'basic', label: 'Basics' }, { id: 'images', label: `Images (${images.length})` }, { id: 'variants', label: `Variants (${variants.length})` }, { id: 'specs', label: 'Specifications' }]}/>
      <div className="pt-5">
        <div className={cn('grid gap-4 sm:grid-cols-2', tab !== 'basic' && 'hidden')}>
          <Input label="Product name" error={errors.name?.message} {...register('name')} className="sm:col-span-2"/>
          <Input label="SKU" error={errors.sku?.message} {...register('sku')}/>
          <Select label="Status" {...register('status')}><option value="active">Active (visible in store)</option><option value="draft">Draft (hidden)</option><option value="archived">Archived (hidden)</option></Select>
          <Select label="Category" error={errors.categoryId?.message} {...register('categoryId')}><option value="">Select...</option>{categories.filter((c) => !c.parentId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Select label="Subcategory" {...register('subcategoryId')} disabled={!subs.length}><option value="">None</option>{subs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
          <Input label="Price (Rs.)" type="number" min={0} step="1" error={errors.price?.message} {...register('price')}/>
          <Input label="Sale price (Rs., optional)" type="number" min={0} step="1" {...register('salePrice')}/>
          <Input label="Low-stock threshold" type="number" min={0} step="1" hint="Shows LOW STOCK at or below this quantity." {...register('lowStockThreshold')}/>
          <div className="flex items-end pb-2"><Checkbox label="Feature on the homepage" {...register('featured')}/></div>
          <Textarea label="Description" className="min-h-32 sm:col-span-2" error={errors.description?.message} {...register('description')}/>
        </div>
        {tab === 'images' && <ImageUploader folder={`products/${id}`} images={images} onChange={setImages}/>}
        {tab === 'variants' && (<div className="space-y-6">
            <div>
              <h3 className="font-semibold">Options</h3>
              <p className="mb-3 text-sm text-muted">For example Color: Black, White and Size: S, M, L. Leave empty for a product without variants.</p>
              <div className="space-y-2">
                {optRows.map((o, i) => (<div key={i} className="grid grid-cols-[1fr_2fr_auto] items-end gap-2">
                    <Input label={i === 0 ? 'Option name' : undefined} value={o.name} placeholder="Color" onChange={(e) => setOptRows(optRows.map((r, n) => (n === i ? { ...r, name: e.target.value } : r)))}/>
                    <Input label={i === 0 ? 'Values (comma separated)' : undefined} value={o.values} placeholder="Black, White" onChange={(e) => setOptRows(optRows.map((r, n) => (n === i ? { ...r, values: e.target.value } : r)))}/>
                    <Button variant="ghost" aria-label="Remove option" onClick={() => setOptRows(optRows.filter((_, n) => n !== i))}><Trash2 className="size-4"/></Button>
                  </div>))}
              </div>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => setOptRows([...optRows, { name: '', values: '' }])}><Plus className="size-4"/>Add option</Button>{options.length > 0 && <Button size="sm" onClick={generate}>Generate variants</Button>}</div>
            </div>
            <div className="space-y-3">
              {variants.map((v, i) => (<div key={v.id} className={cn('rounded-2xl border border-border p-3', !v.active && 'opacity-60')}>
                  <div className="mb-2 flex items-center justify-between"><p className="font-semibold">{variantLabel(v.options) || 'Default variant'}</p><Checkbox label="Active" checked={v.active} onChange={(e) => patchV(i, { active: e.target.checked })}/></div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Input label="SKU" value={v.sku} onChange={(e) => patchV(i, { sku: e.target.value })}/>
                    <Input label="Price override" type="number" min={0} placeholder="Same as product" value={v.price ?? ''} onChange={(e) => patchV(i, { price: e.target.value === '' ? null : Number(e.target.value) })}/>
                    <Input label="Sale override" type="number" min={0} value={v.salePrice ?? ''} onChange={(e) => patchV(i, { salePrice: e.target.value === '' ? null : Number(e.target.value) })}/>
                    <Input label="Stock" type="number" min={0} step="1" value={v.stock} disabled={existing.has(v.id)} hint={existing.has(v.id) ? 'Change in Inventory (audited).' : undefined} onChange={(e) => patchV(i, { stock: Number(e.target.value) })}/>
                  </div>
                  {images.length > 0 && (<div className="mt-3"><p className="mb-1.5 text-xs text-muted">Images shown for this variant (none selected = product images)</p>
                      <div className="flex flex-wrap gap-2">{images.map((u) => { const on = v.images?.includes(u); return <button type="button" key={u} aria-pressed={on} onClick={() => patchV(i, { images: on ? v.images.filter((x) => x !== u) : [...(v.images ?? []), u] })} className={cn('size-12 overflow-hidden rounded-lg border-2', on ? 'border-brand' : 'border-transparent opacity-60')}><img src={u} alt="" className="size-full object-cover"/></button>; })}</div></div>)}
                </div>))}
            </div>
          </div>)}
        {tab === 'specs' && (<div className="space-y-2">
            {specs.map((s, i) => (<div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <Input aria-label="Label" placeholder="Material" value={s.label} onChange={(e) => setSpecs(specs.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))}/>
                <Input aria-label="Value" placeholder="Stainless steel" value={s.value} onChange={(e) => setSpecs(specs.map((x, n) => (n === i ? { ...x, value: e.target.value } : x)))}/>
                <Button variant="ghost" aria-label="Remove" onClick={() => setSpecs(specs.filter((_, n) => n !== i))}><Trash2 className="size-4"/></Button>
              </div>))}
            <Button size="sm" variant="outline" onClick={() => setSpecs([...specs, { label: '', value: '' }])}><Plus className="size-4"/>Add specification</Button>
          </div>)}
      </div>
    </Modal>);
}
