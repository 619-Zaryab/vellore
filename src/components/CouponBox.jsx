import { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { errMsg, formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui';
export function CouponBox() {
    const cart = useCart();
    const { user } = useAuth();
    const toast = useToast();
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    if (cart.coupon) {
        return (<div className="flex items-center justify-between gap-3 rounded-xl border border-success/40 bg-success/10 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2"><Tag className="size-4 text-success"/><b>{cart.coupon.code}</b><span className="text-muted">{cart.coupon.discount > 0 ? `saves ${formatPrice(cart.coupon.discount)}` : 'free shipping'}</span></span>
        <button aria-label="Remove coupon" onClick={cart.removeCoupon} className="text-muted hover:text-danger"><X className="size-4"/></button>
      </div>);
    }
    const apply = async (e) => {
        e.preventDefault();
        if (!user)
            return toast.info('Sign in to apply a coupon.');
        if (!code.trim())
            return;
        setBusy(true);
        setError('');
        try {
            await cart.applyCoupon(code.trim());
            toast.success('Coupon applied');
            setCode('');
        }
        catch (err) {
            setError(errMsg(err));
        }
        finally {
            setBusy(false);
        }
    };
    return (<form onSubmit={apply} className="space-y-1.5">
      <div className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" maxLength={40} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 text-sm uppercase placeholder:normal-case placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"/>
        <Button type="submit" variant="outline" loading={busy}>Apply</Button>
      </div>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </form>);
}
