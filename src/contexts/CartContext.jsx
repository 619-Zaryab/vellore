import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { getProduct } from '@/lib/catalog';
import { priceInfo, variantStock, errMsg } from '@/lib/utils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const LS = 'vellore-cart';
const readLS = () => { try {
    return JSON.parse(localStorage.getItem(LS) ?? '[]');
}
catch {
    return [];
} };
const key = (i) => `${i.productId}::${i.variantId}`;
const mergeItems = (a, b) => {
    const m = new Map();
    for (const i of [...a, ...b]) {
        const k = key(i);
        const e = m.get(k);
        m.set(k, e ? { ...e, qty: Math.min(20, e.qty + i.qty) } : { ...i });
    }
    return [...m.values()];
};
export function CartProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState(readLS);
    const [products, setProducts] = useState({});
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [coupon, setCoupon] = useState(null);
    const synced = useRef(false);
    const prevUid = useRef(null);
    // Merge the guest cart with the saved cart after login; wipe local data on logout.
    useEffect(() => {
        if (!user) {
            if (prevUid.current) {
                setItems([]);
                setCoupon(null);
                localStorage.removeItem(LS);
            }
            prevUid.current = null;
            synced.current = false;
            return;
        }
        prevUid.current = user.uid;
        let cancel = false;
        (async () => {
            try {
                const s = await getDoc(doc(db, 'carts', user.uid));
                const remote = (s.data()?.items ?? []);
                if (!cancel)
                    setItems((local) => mergeItems(remote, local));
            }
            catch { /* offline: keep local cart */ }
            synced.current = true;
        })();
        return () => { cancel = true; };
    }, [user?.uid]);
    useEffect(() => {
        try {
            localStorage.setItem(LS, JSON.stringify(items));
        }
        catch { /* ignore */ }
        if (!user || !synced.current)
            return;
        const t = setTimeout(() => { setDoc(doc(db, 'carts', user.uid), { items, updatedAt: serverTimestamp() }).catch(() => { }); }, 600);
        return () => clearTimeout(t);
    }, [items, user]);
    const idsKey = useMemo(() => [...new Set(items.map((i) => i.productId))].sort().join(','), [items]);
    const load = useCallback(async () => {
        const ids = idsKey ? idsKey.split(',') : [];
        if (!ids.length)
            return;
        setLoading(true);
        const res = await Promise.all(ids.map(async (id) => [id, await getProduct(id)]));
        setProducts((p) => ({ ...p, ...Object.fromEntries(res.map(([id, pr]) => [id, pr && pr.status === 'active' ? pr : null])) }));
        setLoading(false);
    }, [idsKey]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => { if (open)
        load(); }, [open, load]);
    const lines = useMemo(() => items.map((i) => {
        const product = products[i.productId] ?? undefined;
        const variant = product?.variants.find((v) => v.id === i.variantId);
        const base = { ...i, product, variant, unitPrice: 0, original: 0, available: 0, lineTotal: 0 };
        if (i.productId in products && !product)
            return { ...base, problem: 'No longer available' };
        if (!product)
            return base;
        if (!variant || !variant.active)
            return { ...base, problem: 'This option is no longer available' };
        const pi = priceInfo(product, variant);
        const available = variantStock(variant);
        const problem = available <= 0 ? 'Sold out' : i.qty > available ? `Only ${available} left` : undefined;
        return { ...base, unitPrice: pi.final, original: pi.price, available, lineTotal: pi.final * i.qty, problem };
    }), [items, products]);
    const subtotal = lines.reduce((s, l) => s + (l.problem ? 0 : l.lineTotal), 0);
    const count = items.reduce((s, i) => s + i.qty, 0);
    const hasProblems = lines.some((l) => !!l.problem);
    const add = useCallback((product, variantId, qty = 1) => {
        const v = product.variants.find((x) => x.id === variantId);
        const max = variantStock(v);
        if (!v || max <= 0) {
            toast.error('This item is sold out.');
            return false;
        }
        setProducts((p) => ({ ...p, [product.id]: product }));
        let ok = true;
        setItems((cur) => {
            const ex = cur.find((i) => i.productId === product.id && i.variantId === variantId);
            const want = (ex?.qty ?? 0) + qty;
            if (want > max) {
                ok = false;
            }
            const next = Math.min(want, max, 20);
            return ex ? cur.map((i) => (i === ex ? { ...i, qty: next } : i)) : [...cur, { productId: product.id, variantId, qty: next }];
        });
        if (!ok)
            toast.info(`Only ${max} available. Cart updated to the maximum.`);
        else
            toast.success('Added to cart');
        setOpen(true);
        return true;
    }, [toast]);
    const setQty = useCallback((productId, variantId, qty) => {
        setItems((cur) => cur.flatMap((i) => {
            if (i.productId !== productId || i.variantId !== variantId)
                return [i];
            if (qty <= 0)
                return [];
            const p = products[productId];
            const max = Math.min(20, variantStock(p?.variants.find((v) => v.id === variantId)) || 20);
            return [{ ...i, qty: Math.min(qty, max) }];
        }));
    }, [products]);
    const remove = useCallback((productId, variantId) => setItems((c) => c.filter((i) => !(i.productId === productId && i.variantId === variantId))), []);
    const clear = useCallback(() => { setItems([]); setCoupon(null); }, []);
    const applyCoupon = useCallback(async (code) => {
        if (!items.length)
            throw new Error('Your cart is empty.');
        const r = await api.validateCoupon({ code, items });
        if (!r.valid)
            throw new Error(r.message);
        setCoupon({ code: r.code, discount: r.discount, freeShipping: r.freeShipping, message: r.message });
    }, [items]);
    const removeCoupon = useCallback(() => setCoupon(null), []);
    // Keep the coupon honest when the cart changes (the server recalculates from trusted prices).
    const itemsSig = JSON.stringify(items);
    useEffect(() => {
        if (!coupon)
            return;
        const t = setTimeout(async () => {
            try {
                if (!items.length)
                    return setCoupon(null);
                const r = await api.validateCoupon({ code: coupon.code, items });
                if (!r.valid) {
                    setCoupon(null);
                    toast.info(r.message);
                }
                else
                    setCoupon({ code: r.code, discount: r.discount, freeShipping: r.freeShipping, message: r.message });
            }
            catch (e) {
                setCoupon(null);
                toast.error(errMsg(e));
            }
        }, 700);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemsSig]);
    const value = {
        items, lines, count, subtotal, discount: Math.min(coupon?.discount ?? 0, subtotal), freeShipping: !!coupon?.freeShipping,
        coupon, hasProblems, loading, open, setOpen, add, setQty, remove, clear, refresh: load, applyCoupon, removeCoupon,
    };
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
