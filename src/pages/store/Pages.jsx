import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChevronDown, Mail, MapPin, Phone } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { db } from '@/lib/firebase';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Button, Input, Textarea } from '@/components/ui';
import { Seo } from '@/components/Seo';
const Doc = ({ title, intro, children }) => (<article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
    <Seo title={title} description={intro}/>
    <h1 className="text-4xl font-bold">{title}</h1>
    {intro && <p className="mt-3 text-lg text-muted">{intro}</p>}
    <div className="mt-8 space-y-6 text-[15px] leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_li]:text-muted">{children}</div>
  </article>);
export function About() {
    const { settings } = useSettings();
    return (<Doc title={`About ${settings.storeName}`} intro={settings.tagline}>
      <section><h2>What we do</h2><p>{settings.storeName} is an online store for electronics, clothing, accessories and home products. We list a product only when we would be comfortable recommending it to a friend, and we keep the details honest: real photos, clear specifications and prices that include everything you will pay.</p></section>
      <section><h2>How we work</h2><p>Stock levels on this site are live, so what you see is what we have. Orders are confirmed by our team, packed carefully and shipped with a tracking number you can follow from your account.</p></section>
      <section><h2>Based in {settings.address}</h2><p>Questions about an order or a product? Our support team replies within one working day at {settings.supportEmail}.</p></section>
    </Doc>);
}
export function Contact() {
    const { settings } = useSettings();
    const toast = useToast();
    const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const up = (k) => (e) => setF({ ...f, [k]: e.target.value });
    return (<div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_1.2fr]">
      <Seo title="Contact us" description="Get in touch with the Vellore support team."/>
      <div>
        <h1 className="text-4xl font-bold">Contact us</h1>
        <p className="mt-3 text-muted">We reply within one working day.</p>
        <ul className="mt-8 space-y-4 text-sm">
          <li className="flex gap-3"><Mail className="size-5 text-brand"/>{settings.supportEmail}</li>
          <li className="flex gap-3"><Phone className="size-5 text-brand"/>{settings.phone}</li>
          <li className="flex gap-3"><MapPin className="size-5 text-brand"/>{settings.address}</li>
        </ul>
      </div>
      {sent ? <div className="rounded-2xl border border-border bg-surface p-8 text-center"><h2 className="text-xl font-bold">Message sent</h2><p className="mt-2 text-sm text-muted">Thanks for writing in. We will get back to you at {f.email}.</p></div> : (<form className="space-y-4 rounded-2xl border border-border bg-surface p-6" onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                    await addDoc(collection(db, 'contactMessages'), { ...f, read: false, createdAt: serverTimestamp() });
                    setSent(true);
                }
                catch (err) {
                    toast.error(errMsg(err));
                }
                finally {
                    setBusy(false);
                }
            }}>
          <Input label="Your name" required value={f.name} onChange={up('name')} maxLength={80}/>
          <Input label="Email" type="email" required value={f.email} onChange={up('email')}/>
          <Input label="Subject" required value={f.subject} onChange={up('subject')} maxLength={120}/>
          <Textarea label="Message" required minLength={10} maxLength={1900} value={f.message} onChange={up('message')}/>
          <Button type="submit" loading={busy}>Send message</Button>
        </form>)}
    </div>);
}
const FAQS = [
    ['How long does delivery take?', 'Standard delivery takes 3 to 5 working days and express takes 1 to 2 working days to most cities in Pakistan. The exact options and fees are shown at checkout.'],
    ['Which payment methods do you accept?', 'Cash on delivery, JazzCash and Easypaisa. Online payments are processed on the provider\'s secure page. We never see or store your card or wallet PIN.'],
    ['Can I cancel an order?', 'Yes. You can cancel from the order page until your order starts processing. Items go back to stock, and any online payment is refunded.'],
    ['How do I track my order?', 'Open My orders from your account. The timeline updates automatically as we confirm, pack and ship your order, and shows the tracking number once available.'],
    ['What if an item is sold out?', 'Stock is live. If a product or option shows SOLD OUT, it cannot be ordered right now. Add it to your wishlist and check back.'],
    ['Do I need an account?', 'You can browse and build a cart without one. To place an order you need a verified account so we can keep your order history and tracking safe.'],
];
export function Faqs() {
    const [open, setOpen] = useState(0);
    return (<Doc title="Frequently asked questions" intro="Quick answers to the things people ask most.">
      <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {FAQS.map(([q, a], i) => (<div key={q}>
            <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-semibold" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>{q}<ChevronDown className={`size-5 shrink-0 transition ${open === i ? 'rotate-180' : ''}`}/></button>
            <AnimatePresence initial={false}>{open === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><p className="px-5 pb-4">{a}</p></motion.div>}</AnimatePresence>
          </div>))}
      </div>
    </Doc>);
}
export function ShippingReturns() {
    const { settings } = useSettings();
    return (<Doc title="Shipping and returns" intro="What to expect once you place an order.">
      <section><h2>Shipping</h2><ul>{settings.deliveryMethods.map((d) => <li key={d.id}>{d.label}: Rs. {d.fee.toLocaleString('en-PK')}, {d.eta}</li>)}{settings.freeShippingThreshold > 0 && <li>Free shipping on orders of Rs. {settings.freeShippingThreshold.toLocaleString('en-PK')} or more</li>}</ul></section>
      <section><h2>Returns</h2><p>If your item arrives damaged, defective or not as described, contact us within 7 days of delivery with your order number and a photo. We will arrange a replacement or refund. Items must be unused and in original packaging for change-of-mind returns.</p></section>
      <section><h2>Refunds</h2><p>Approved refunds for online payments go back to the original JazzCash or Easypaisa account. Cash on delivery refunds are sent by bank or wallet transfer. Processing normally takes 5 to 10 working days.</p></section>
    </Doc>);
}
export function Privacy() {
    const { settings } = useSettings();
    return (<Doc title="Privacy policy" intro="How we handle your information.">
      <section><h2>What we collect</h2><p>Your name, email, phone number, delivery addresses and order history, so we can deliver your orders and support you. Payments are handled by JazzCash and Easypaisa; we never receive or store card numbers or wallet PINs.</p></section>
      <section><h2>How we use it</h2><p>To process orders, send order updates, prevent fraud and improve the store. We only send marketing emails if you subscribe, and you can unsubscribe at any time.</p></section>
      <section><h2>Sharing</h2><p>We share the details needed for delivery with our courier partners and for payment with the payment provider. We do not sell your data.</p></section>
      <section><h2>Your choices</h2><p>You can update or delete your saved addresses from your profile. To request deletion of your account, email {settings.supportEmail}.</p></section>
      <p className="text-xs">This is a template. Have it reviewed against your legal obligations before launch.</p>
    </Doc>);
}
export function Terms() {
    return (<Doc title="Terms of service" intro="The rules for using the store.">
      <section><h2>Orders</h2><p>An order is accepted when we confirm it. We may cancel orders in cases of pricing errors, suspected fraud or stock problems, and will refund any payment received.</p></section>
      <section><h2>Prices and availability</h2><p>Prices are in Pakistani rupees. Stock is shown in real time but is only reserved once your order is placed.</p></section>
      <section><h2>Accounts</h2><p>You are responsible for keeping your login secure and for the accuracy of the information you provide.</p></section>
      <section><h2>Liability</h2><p>Our liability is limited to the value of the goods purchased, to the extent permitted by law.</p></section>
      <p className="text-xs">This is a template. Have it reviewed against your legal obligations before launch.</p>
    </Doc>);
}
