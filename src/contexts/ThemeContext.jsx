import { createContext, useCallback, useContext, useEffect, useState } from 'react';
const Ctx = createContext({ theme: 'light', toggle: () => { } });
export const useTheme = () => useContext(Ctx);
const systemTheme = () => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        try {
            return localStorage.getItem('vellore-theme') ?? systemTheme();
        }
        catch {
            return systemTheme();
        }
    });
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.style.colorScheme = theme;
    }, [theme]);
    // Follow the OS only while the user has not chosen explicitly.
    useEffect(() => {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const on = () => { if (!localStorage.getItem('vellore-theme'))
            setTheme(mq.matches ? 'dark' : 'light'); };
        mq.addEventListener('change', on);
        return () => mq.removeEventListener('change', on);
    }, []);
    const toggle = useCallback(() => {
        const root = document.documentElement;
        root.classList.add('theme-anim');
        setTimeout(() => root.classList.remove('theme-anim'), 350);
        setTheme((t) => {
            const next = t === 'dark' ? 'light' : 'dark';
            try {
                localStorage.setItem('vellore-theme', next);
            }
            catch { /* private mode */ }
            return next;
        });
    }, []);
    return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}
