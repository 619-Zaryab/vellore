import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile, } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const registering = useRef(false);
    const [, setVersion] = useState(0); // re-render after user.reload()
    useEffect(() => {
        let unsubProfile;
        const unsub = onAuthStateChanged(auth, async (u) => {
            unsubProfile?.();
            setUser(u);
            if (!u) {
                setProfile(null);
                setIsAdmin(false);
                setLoading(false);
                return;
            }
            const token = await u.getIdTokenResult();
            let admin = token.claims.admin === true;
            if (!admin) { try { admin = (await getDoc(doc(db, 'admins', u.uid))).exists(); } catch { /* not an admin */ } }
            setIsAdmin(admin);
            const ref = doc(db, 'users', u.uid);
            unsubProfile = onSnapshot(ref, async (snap) => {
                if (snap.exists()) {
                    setProfile({ ...snap.data(), uid: u.uid });
                    setLoading(false);
                    return;
                }
                if (registering.current)
                    return; // register() creates the document itself
                await setDoc(ref, { uid: u.uid, displayName: u.displayName ?? '', email: u.email, phone: '', photoURL: u.photoURL ?? '', addresses: [], newsletter: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }, () => setLoading(false));
            setLoading(false);
        });
        return () => { unsub(); unsubProfile?.(); };
    }, []);
    const register = useCallback(async (name, email, password) => {
        registering.current = true;
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(cred.user, { displayName: name });
            await setDoc(doc(db, 'users', cred.user.uid), { uid: cred.user.uid, displayName: name, email: cred.user.email, phone: '', photoURL: '', addresses: [], newsletter: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            await sendEmailVerification(cred.user);
        }
        finally {
            registering.current = false;
        }
    }, []);
    const value = {
        user, profile, isAdmin, loading, register,
        login: async (e, p) => { await signInWithEmailAndPassword(auth, e, p); },
        loginWithGoogle: async () => { await signInWithPopup(auth, googleProvider); },
        logout: () => signOut(auth),
        resetPassword: (e) => sendPasswordResetEmail(auth, e),
        resendVerification: async () => { if (auth.currentUser)
            await sendEmailVerification(auth.currentUser); },
        refreshUser: async () => {
            if (!auth.currentUser)
                return;
            await auth.currentUser.reload();
            const t = await auth.currentUser.getIdTokenResult(true);
            let admin = t.claims.admin === true;
            if (!admin) { try { admin = (await getDoc(doc(db, 'admins', auth.currentUser.uid))).exists(); } catch { /* not an admin */ } }
            setIsAdmin(admin);
            setVersion((v) => v + 1);
        },
        updateProfileData: async (data) => {
            if (!user)
                return;
            await updateDoc(doc(db, 'users', user.uid), { ...data, updatedAt: serverTimestamp() });
            if (data.displayName)
                await updateProfile(user, { displayName: data.displayName });
        },
        saveAddresses: async (addresses) => {
            if (!user)
                return;
            await updateDoc(doc(db, 'users', user.uid), { addresses, updatedAt: serverTimestamp() });
        },
    };
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
