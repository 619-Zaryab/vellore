import { useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, MapPin, Phone } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useSettings } from '@/contexts/SettingsContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from './ui';
import { Logo } from './Navbar';
export function NewsletterForm() {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const toast = useToast();
    const submit = async (e) => {
        e.preventDefault();
        const v = email.trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v))
            return toast.error('Enter a valid email address.');
        setBusy(true);
        try {
            await setDoc(doc(db, 'newsletter', v), { email: v, createdAt: serverTimestamp() });
            toast.success('You are subscribed. Welcome!');
            setEmail('');
        }
        catch {
            toast.info('You are already on the list.');
            setEmail('');
        }
        finally {
            setBusy(false);
        }
    };
    return (<form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address" required className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"/>
      <Button type="submit" loading={busy}>Subscribe</Button>
    </form>);
}
export function Footer() {
    const { settings } = useSettings();
    const col = (title, links) => (<div><h3 className="mb-3 text-sm font-bold">{title}</h3><ul className="space-y-2 text-sm text-muted">{links.map(([to, l]) => <li key={to}><Link to={to} className="hover:text-fg">{l}</Link></li>)}</ul></div>);
    return (<footer className="mt-20 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">{settings.tagline}</p>
          <ul className="space-y-1.5 text-sm text-muted">
            <li className="flex items-center gap-2"><Mail className="size-4"/>{settings.supportEmail}</li>
            <li className="flex items-center gap-2"><Phone className="size-4"/>{settings.phone}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4"/>{settings.address}</li>
          </ul>
        </div>
        {col('Shop', [['/products', 'All products'], ['/products?deals=1', 'Deals'], ['/wishlist', 'Wishlist'], ['/orders', 'Track an order']])}
        {col('Help', [['/faqs', 'FAQs'], ['/shipping-returns', 'Shipping and returns'], ['/contact', 'Contact us'], ['/about', 'About Vellore']])}
        <div>
          <h3 className="mb-3 text-sm font-bold">Stay in the loop</h3>
          <p className="mb-3 text-sm text-muted">New arrivals and offers, no spam.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted sm:px-6">
          <p>&copy; {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <div className="flex gap-4"><Link to="/privacy" className="hover:text-fg">Privacy</Link><Link to="/terms" className="hover:text-fg">Terms</Link></div>
        </div>
      </div>
    </footer>);
}
