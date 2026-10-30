import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Banknote, Check, MailWarning, Smartphone, Truck } from 'lucide-react';
import { api } from '@/lib/api';
import { PAYMENT_METHOD_LABEL } from '@/lib/constants';
import { computeTotals } from '@/lib/pricing';
import { cn, errMsg, formatPrice, variantLabel } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Button, Checkbox, EmptyState, Textarea } from '@/components/ui';
import { AddressForm } from '@/components/AddressForm';
import { CouponBox } from '@/components/CouponBox';
import { Seo } from '@/components/Seo';
import { ShoppingBag } from 'lucide-react';
const STEPS = ['Shipping', 'Payment', 'Review'];
const toOrderAddr = (a) => ({ fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, province: a.province, postalCode: a.postalCode ?? '' });
export default function Checkout() {
    const { user, profile, saveAddresses, resendVerification, refreshUser } = useAuth();
    const cart = useCart();
    const { settings } = useSettings();
    const toast = useToast();
    const nav = useNavigate();
    const [step, setStep] = useState(0);
    const [addrId, setAddrId] = useState('');
    const [newAddr, setNewAddr] = useState(null);
    const [saveNew, setSaveNew] = useState(true);
    const [delivery, setDelivery] = useState(settings.deliveryMethods[0]?.id ?? 'standard');
    const [billingSame, setBillingSame] = useState(true);
    const [billing, setBilling] = useState(null);
    const [pay, setPay] = useState('cod');
    const [notes, setNotes] = useState('');
    const [reference, setReference] = useState('');
    const [busy, setBusy] = useState(false);
    const clientOrderId = useRef(crypto.randomUUID());
    const { refresh } = cart;
    useEffect(() => { refresh(); }, []); // eslint-disable-line
    const saved = profile?.addresses ?? [];
    useEffect(() => { if (!addrId && saved.length)
        setAddrId((saved.find((a) => a.isDefault) ?? saved[0]).id); }, [saved.length]); // eslint-disable-line
    const methods = ['cod', 'jazzcash', 'easypaisa'].filter((m) => settings.paymentMethods[m]);
    useEffect(() => { if (methods.length && !methods.includes(pay))
        setPay(methods[0]); }, [methods.join(',')]); // eslint-disable-line
    const dm = settings.deliveryMethods.find((d) => d.id === delivery) ?? settings.deliveryMethods[0];
    const totals = useMemo(() => computeTotals({ subtotal: cart.subtotal, discount: cart.discount, shippingFee: dm?.fee ?? 0, freeShippingThreshold: settings.freeShippingThreshold, freeShippingCoupon: cart.freeShipping, taxRate: settings.taxRate }), [cart.subtotal, cart.discount, cart.freeShipping, dm, settings]);
    const selected = addrId === 'new' || !saved.length ? newAddr : saved.find((a) => a.id === addrId) ?? null;
    const needsVerify = settings.requireVerifiedEmail && !user?.emailVerified;
    if (!cart.items.length && !busy)
        return <EmptyState icon={<ShoppingBag className="size-7"/>} title="Nothing to check out" description="Your cart is empty." action={<Link to="/products"><Button>Browse products</Button></Link>}/>;
    const place = async () => {
        if (!selected || !dm)
            return;
        setBusy(true);
        try {
            const input = {
                clientOrderId: clientOrderId.current,
                items: cart.items,
                shippingAddress: toOrderAddr(selected),
                billingAddress: billingSame || !billing ? undefined : toOrderAddr(billing),
                deliveryMethodId: dm.id,
                couponCode: cart.coupon?.code,
                paymentMethod: pay,
                notes: notes.trim() || undefined,
            };
            const { orderId } = await api.createOrder({ ...input, paymentReference: reference });
            cart.clear();
            nav(`/order/${orderId}/confirmation`, { replace: true });
        }
        catch (e) {
            toast.error(errMsg(e));
            cart.refresh();
            setBusy(false);
        }
    };
    return (<div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Seo title="Checkout" noindex/>
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      <ol className="mb-8 flex items-center" aria-label="Checkout progress">
        {STEPS.map((s, i) => (<li key={s} className="flex flex-1 items-center last:flex-none">
            <button type="button" disabled={i > step} onClick={() => setStep(i)} className="flex items-center gap-2" aria-current={i === step ? 'step' : undefined}>
              <motion.span animate={{ scale: i === step ? 1.1 : 1 }} className={cn('grid size-8 place-items-center rounded-full border-2 text-sm font-bold transition', i <= step ? 'border-brand bg-brand text-brand-fg' : 'border-border text-muted')}>{i < step ? <Check className="size-4"/> : i + 1}</motion.span>
              <span className={cn('hidden text-sm font-semibold sm:block', i <= step ? 'text-fg' : 'text-muted')}>{s}</span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-3 h-0.5 flex-1 overflow-hidden rounded bg-border"><motion.span className="block h-full bg-brand" initial={false} animate={{ width: i < step ? '100%' : '0%' }} transition={{ duration: 0.4 }}/></span>}
          </li>))}
      </ol>

      {needsVerify && (<div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
          <MailWarning className="size-5 shrink-0 text-warning"/>
          <p className="min-w-0 flex-1">Verify your email ({user?.email}) to place an order. We sent you a link when you registered.</p>
          <Button size="sm" variant="outline" onClick={async () => { await resendVerification(); toast.success('Verification email sent.'); }}>Resend email</Button>
          <Button size="sm" onClick={async () => { await refreshUser(); toast.info(user?.emailVerified ? 'Verified' : 'Not verified yet. Open the link in your email first.'); }}>I have verified</Button>
        </div>)}

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              {step === 0 && (<div className="space-y-8">
                  <section>
                    <h2 className="mb-3 text-lg font-bold">Shipping address</h2>
                    <div className="space-y-3">
                      {saved.map((a) => (<label key={a.id} className={cn('flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm', addrId === a.id ? 'border-brand bg-brand/5' : 'border-border')}>
                          <input type="radio" name="addr" className="mt-1 accent-[var(--brand)]" checked={addrId === a.id} onChange={() => setAddrId(a.id)}/>
                          <span><b>{a.label}</b> - {a.fullName}<br /><span className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.province}<br />{a.phone}</span></span>
                        </label>))}
                      {saved.length > 0 && <label className={cn('flex cursor-pointer gap-3 rounded-2xl border p-4 text-sm font-semibold', addrId === 'new' ? 'border-brand bg-brand/5' : 'border-border')}><input type="radio" name="addr" className="accent-[var(--brand)]" checked={addrId === 'new'} onChange={() => setAddrId('new')}/>Use a new address</label>}
                    </div>
                    {(addrId === 'new' || !saved.length) && (<div className="mt-4 rounded-2xl border border-border p-4">
                        <AddressForm key={newAddr ? 'filled' : 'empty'} defaults={newAddr ?? { fullName: profile?.displayName, phone: profile?.phone }} showLabel={false} showDefault={false} submitLabel={newAddr ? 'Update address' : 'Use this address'} onSubmit={(v) => { setNewAddr({ ...v, label: 'Home' }); toast.success('Address added'); }}/>
                        <div className="mt-3"><Checkbox label="Save this address to my account" checked={saveNew} onChange={(e) => setSaveNew(e.target.checked)}/></div>
                      </div>)}
                  </section>
                  <section>
                    <h2 className="mb-3 text-lg font-bold">Delivery method</h2>
                    <div className="space-y-3">
                      {settings.deliveryMethods.map((d) => (<label key={d.id} className={cn('flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-sm', delivery === d.id ? 'border-brand bg-brand/5' : 'border-border')}>
                          <input type="radio" name="delivery" className="accent-[var(--brand)]" checked={delivery === d.id} onChange={() => setDelivery(d.id)}/>
                          <Truck className="size-5 text-muted"/><span className="flex-1"><b>{d.label}</b><br /><span className="text-muted">{d.eta}</span></span><b>{formatPrice(d.fee)}</b>
                        </label>))}
                    </div>
                  </section>
                  <section>
                    <Checkbox label="Billing details are the same as shipping" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)}/>
                    {!billingSame && <div className="mt-4 rounded-2xl border border-border p-4"><h3 className="mb-3 font-semibold">Billing address</h3><AddressForm defaults={billing ?? undefined} showLabel={false} showDefault={false} submitLabel="Use billing address" onSubmit={(v) => { setBilling({ ...v, label: 'Billing' }); toast.success('Billing address added'); }}/></div>}
                  </section>
                  <Button size="lg" disabled={!selected || (!billingSame && !billing)} onClick={async () => {
                if ((addrId === 'new' || !saved.length) && newAddr && saveNew && !saved.some((a) => a.line1 === newAddr.line1 && a.phone === newAddr.phone)) {
                    await saveAddresses([...saved, { ...newAddr, id: crypto.randomUUID(), label: 'Home', isDefault: saved.length === 0 }]).catch(() => { });
                }
                setStep(1);
            }}>Continue to payment</Button>
                </div>)}
              {step === 1 && (<div className="space-y-4">
                  <h2 className="text-lg font-bold">Payment method</h2>
                  {methods.length === 0 && <p className="text-sm text-danger">No payment methods are enabled right now. Please contact support.</p>}
                  {methods.map((m) => (<label key={m} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-sm', pay === m ? 'border-brand bg-brand/5' : 'border-border')}>
                      <input type="radio" name="pay" className="mt-1 accent-[var(--brand)]" checked={pay === m} onChange={() => setPay(m)}/>
                      {m === 'cod' ? <Banknote className="size-5 text-muted"/> : <Smartphone className="size-5 text-muted"/>}
                      <span><b>{PAYMENT_METHOD_LABEL[m]}</b><br /><span className="text-muted">{m === 'cod' ? 'Pay in cash when your order arrives.' : `Send the money to our ${PAYMENT_METHOD_LABEL[m]} account, then enter the transaction ID. We confirm the payment by hand.`}</span></span>
                    </label>))}
                  {pay !== 'cod' && (<div className="space-y-3 rounded-2xl border border-border bg-surface2 p-4 text-sm">
                      <p className="font-semibold">How to pay with {PAYMENT_METHOD_LABEL[pay]}</p>
                      {settings.paymentAccounts?.[pay]?.number
                        ? <p>Send <b>{formatPrice(totals.total)}</b> to <b className="select-all">{settings.paymentAccounts[pay].number}</b>{settings.paymentAccounts[pay].title ? ` (${settings.paymentAccounts[pay].title})` : ''}, then paste the transaction ID below.</p>
                        : <p className="text-danger">The store has not added its {PAYMENT_METHOD_LABEL[pay]} account number yet. Please choose another method.</p>}
                      <label className="block space-y-1.5"><span className="font-medium">Transaction ID</span>
                        <input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={60} placeholder="e.g. 4938271650" className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm"/></label>
                    </div>)}
                  <div className="flex gap-2 pt-2"><Button variant="outline" size="lg" onClick={() => setStep(0)}>Back</Button><Button size="lg" disabled={!methods.length || (pay !== 'cod' && (!reference.trim() || !settings.paymentAccounts?.[pay]?.number))} onClick={() => setStep(2)}>Review order</Button></div>
                </div>)}
              {step === 2 && selected && (<div className="space-y-6">
                  <h2 className="text-lg font-bold">Review your order</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border p-4 text-sm"><p className="mb-1 font-semibold">Ship to</p><p className="text-muted">{selected.fullName}<br />{selected.line1}, {selected.city}, {selected.province}<br />{selected.phone}</p></div>
                    <div className="rounded-2xl border border-border p-4 text-sm"><p className="mb-1 font-semibold">Delivery and payment</p><p className="text-muted">{dm?.label} ({dm?.eta})<br />{PAYMENT_METHOD_LABEL[pay]}</p></div>
                  </div>
                  <Textarea label="Order notes (optional)" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, gift message..."/>
                  {cart.hasProblems && <p role="alert" className="text-sm font-semibold text-danger">Some items in your cart are unavailable. <Link to="/cart" className="underline">Fix your cart</Link>.</p>}
                  <div className="flex gap-2"><Button variant="outline" size="lg" onClick={() => setStep(1)}>Back</Button><Button size="lg" loading={busy} disabled={needsVerify || cart.hasProblems} onClick={place}>Place order</Button></div>
                </div>)}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-28">
          <h2 className="text-lg font-bold">Summary</h2>
          <ul className="max-h-60 space-y-3 overflow-y-auto pr-1">
            {cart.lines.map((l) => <li key={l.productId + l.variantId} className="flex gap-3 text-sm"><img src={l.variant?.images?.[0] ?? l.product?.images[0]} alt="" className="size-12 rounded-lg bg-surface2 object-cover"/><span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">{l.product?.name}</span><span className="text-xs text-muted">{l.variant ? variantLabel(l.variant.options) : ''} x {l.qty}</span></span><span className="font-semibold">{formatPrice(l.lineTotal)}</span></li>)}
          </ul>
          <CouponBox />
          <dl className="space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatPrice(totals.subtotal)}</dd></div>
            {totals.discount > 0 && <div className="flex justify-between text-success"><dt>Discount</dt><dd>-{formatPrice(totals.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</dd></div>
            {totals.tax > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{formatPrice(totals.tax)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{formatPrice(totals.total)}</dd></div>
          </dl>
          <p className="text-xs text-muted">Final prices, stock and discounts are confirmed securely when you place the order.</p>
        </aside>
      </div>
    </div>);
}
