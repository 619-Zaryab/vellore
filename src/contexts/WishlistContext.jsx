import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
const LS = 'vellore-wishlist';
const read = () => { try {
    return JSON.parse(localStorage.getItem(LS) ?? '[]');
}
catch {
    return [];
} };
const Ctx = createContext({ ids: [], has: () => false, toggle() { }, remove() { } });
export const useWishlist = () => useContext(Ctx);
export function WishlistProvider({ children }) {
    const { user } = useAuth();
    const toast = useToast();
    const [ids, setIds] = useState(read);
    const synced = useRef(false);
    const prevUid = useRef(null);
    useEffect(() => {
        if (!user) {
            if (prevUid.current) {
                setIds([]);
                localStorage.removeItem(LS);
            } // signed out: don't leave the list on a shared device
            prevUid.current = null;
            synced.current = false;
            return;
        }
        prevUid.current = user.uid;
        let cancel = false;
        (async () => {
            try {
                const s = await getDoc(doc(db, 'wishlists', user.uid));
                const remote = (s.data()?.ids ?? []);
                if (!cancel) {
                    setIds((local) => [...new Set([...remote, ...local])]);
                    synced.current = true;
                }
            }
            catch {
                synced.current = true;
            }
        })();
        return () => { cancel = true; };
    }, [user?.uid]);
    useEffect(() => {
        try {
            localStorage.setItem(LS, JSON.stringify(ids));
        }
        catch { /* ignore */ }
        if (!user || !synced.current)
            return;
        const t = setTimeout(() => { setDoc(doc(db, 'wishlists', user.uid), { ids, updatedAt: serverTimestamp() }).catch(() => { }); }, 500);
        return () => clearTimeout(t);
    }, [ids, user]);
    const has = useCallback((id) => ids.includes(id), [ids]);
    const toggle = useCallback((id) => {
        setIds((x) => {
            if (x.includes(id)) {
                toast.info('Removed from wishlist');
                return x.filter((i) => i !== id);
            }
            toast.success('Saved to wishlist');
            return [id, ...x].slice(0, 200);
        });
    }, [toast]);
    const remove = useCallback((id) => setIds((x) => x.filter((i) => i !== id)), []);
    return <Ctx.Provider value={{ ids, has, toggle, remove }}>{children}</Ctx.Provider>;
}
