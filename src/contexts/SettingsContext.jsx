import { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_SETTINGS, mergeSettings } from '@/lib/constants';
const Ctx = createContext({ settings: DEFAULT_SETTINGS, loaded: false });
export const useSettings = () => useContext(Ctx);
export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => onSnapshot(doc(db, 'storeSettings', 'main'), (s) => { setSettings(mergeSettings(s.data())); setLoaded(true); }, () => setLoaded(true)), []);
    return <Ctx.Provider value={{ settings, loaded }}>{children}</Ctx.Provider>;
}
