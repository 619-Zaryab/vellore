import { useEffect, useState } from 'react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Database, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { mergeSettings } from '@/lib/constants';
import { errMsg } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Checkbox, Input, PageHeader, Textarea } from '@/components/ui';
export default function Settings() {
    const { settings } = useSettings();
    const toast = useToast();
    const [s, setS] = useState(settings);
    const [busy, setBusy] = useState(false);
    const [seeding, setSeeding] = useState(false);
    useEffect(() => setS(settings), [settings]);
    const up = (k, v) => setS((x) => ({ ...x, [k]: v }));
    const save = async () => {
        if (s.taxRate < 0 || s.taxRate > 40)
            return toast.error('Tax rate must be between 0 and 40.');
        if (s.deliveryMethods.some((d) => !d.id.trim() || !d.label.trim() || d.fee < 0))
            return toast.error('Every delivery method needs an ID, a name and a fee.');
        if (new Set(s.deliveryMethods.map((d) => d.id)).size !== s.deliveryMethods.length)
            return toast.error('Delivery method IDs must be unique.');
        if (!Object.values(s.paymentMethods).some(Boolean))
            return toast.error('Enable at least one payment method.');
        setBusy(true);
        try {
            await setDoc(doc(db, 'storeSettings', 'main'), { ...mergeSettings(s), updatedAt: serverTimestamp() });
            toast.success('Settings saved');
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (<>
      <PageHeader title="Store settings" actions={<Button loading={busy} onClick={save}>Save settings</Button>}/>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold">Store details</h2>
          <Input label="Store name" value={s.storeName} onChange={(e) => up('storeName', e.target.value)}/>
          <Input label="Tagline" value={s.tagline} onChange={(e) => up('tagline', e.target.value)}/>
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Support email" type="email" value={s.supportEmail} onChange={(e) => up('supportEmail', e.target.value)}/><Input label="Phone" value={s.phone} onChange={(e) => up('phone', e.target.value)}/></div>
          <Input label="Address" value={s.address} onChange={(e) => up('address', e.target.value)}/>
          <Input label="Announcement bar (leave empty to hide)" value={s.announcement} onChange={(e) => up('announcement', e.target.value)}/>
          <Input label="Homepage headline" value={s.heroTitle} onChange={(e) => up('heroTitle', e.target.value)}/>
          <Textarea label="Homepage subheading" value={s.heroSubtitle} onChange={(e) => up('heroSubtitle', e.target.value)} className="min-h-20"/>
        </section>
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-bold">Payments</h2>
            <Checkbox label="Cash on delivery" checked={s.paymentMethods.cod} onChange={(e) => up('paymentMethods', { ...s.paymentMethods, cod: e.target.checked })}/>
            <Checkbox label="JazzCash (customer sends money to your number, you verify)" checked={s.paymentMethods.jazzcash} onChange={(e) => up('paymentMethods', { ...s.paymentMethods, jazzcash: e.target.checked })}/>
            <Checkbox label="Easypaisa (customer sends money to your number, you verify)" checked={s.paymentMethods.easypaisa} onChange={(e) => up('paymentMethods', { ...s.paymentMethods, easypaisa: e.target.checked })}/>
            {['jazzcash', 'easypaisa'].map((m) => (<div key={m} className="grid gap-3 sm:grid-cols-2">
                <Input label={`${m === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} number`} value={s.paymentAccounts?.[m]?.number ?? ''} onChange={(e) => up('paymentAccounts', { ...s.paymentAccounts, [m]: { ...s.paymentAccounts?.[m], number: e.target.value } })} placeholder="03XX XXXXXXX"/>
                <Input label="Account title" value={s.paymentAccounts?.[m]?.title ?? ''} onChange={(e) => up('paymentAccounts', { ...s.paymentAccounts, [m]: { ...s.paymentAccounts?.[m], title: e.target.value } })}/></div>))}
            <p className="text-xs text-muted">Add your account number below before enabling JazzCash or Easypaisa. Customers see it at checkout and enter the transaction ID; you mark the payment as received in the order.</p>
          </section>
          <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-bold">Pricing and stock</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Tax rate (%)" type="number" min={0} step="0.1" value={s.taxRate} onChange={(e) => up('taxRate', Number(e.target.value))} hint="0 if prices include tax."/>
              <Input label="Free shipping over (Rs.)" type="number" min={0} value={s.freeShippingThreshold} onChange={(e) => up('freeShippingThreshold', Number(e.target.value))} hint="0 disables."/>
              <Input label="Default low-stock level" type="number" min={0} value={s.lowStockDefault} onChange={(e) => up('lowStockDefault', Number(e.target.value))}/>
            </div>
            <Checkbox label="Require a verified email to place orders" checked={s.requireVerifiedEmail} onChange={(e) => up('requireVerifiedEmail', e.target.checked)}/>
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center justify-between"><h2 className="font-bold">Delivery methods</h2><Button size="sm" variant="outline" onClick={() => up('deliveryMethods', [...s.deliveryMethods, { id: `method-${s.deliveryMethods.length + 1}`, label: '', fee: 0, eta: '' }])}><Plus className="size-4"/>Add</Button></div>
            {s.deliveryMethods.map((d, i) => (<div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1.4fr_90px_1fr_auto]">
                <Input aria-label="ID" placeholder="ID" value={d.id} onChange={(e) => up('deliveryMethods', s.deliveryMethods.map((x, n) => (n === i ? { ...x, id: e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase() } : x)))}/>
                <Input aria-label="Name" placeholder="Name" value={d.label} onChange={(e) => up('deliveryMethods', s.deliveryMethods.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)))}/>
                <Input aria-label="Fee" type="number" min={0} value={d.fee} onChange={(e) => up('deliveryMethods', s.deliveryMethods.map((x, n) => (n === i ? { ...x, fee: Number(e.target.value) } : x)))}/>
                <Input aria-label="Estimate" placeholder="3 to 5 days" value={d.eta} onChange={(e) => up('deliveryMethods', s.deliveryMethods.map((x, n) => (n === i ? { ...x, eta: e.target.value } : x)))}/>
                <Button variant="ghost" aria-label="Remove" disabled={s.deliveryMethods.length < 2} onClick={() => up('deliveryMethods', s.deliveryMethods.filter((_, n) => n !== i))}><Trash2 className="size-4"/></Button>
              </div>))}
          </section>
          <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-bold">Demo data</h2>
            <p className="text-sm text-muted">Adds a few clearly labelled demo categories and products (with variants and stock) so you can test the store. Demo products show a "Demo" badge and can be deleted from Products.</p>
            <Button variant="outline" loading={seeding} onClick={async () => { setSeeding(true); try {
        const r = await api.seedDemoData({});
        toast.success(r.created ? `Added ${r.created} demo records` : 'Demo data already exists');
    }
    catch (e) {
        toast.error(errMsg(e));
    }
    finally {
        setSeeding(false);
    } }}><Database className="size-4"/>Load demo data</Button>
          </section>
        </div>
      </div>
    </>);
}
