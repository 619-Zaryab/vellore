import { useCallback, useState } from 'react';
const LS = 'vellore-recent';
const read = () => { try {
    return JSON.parse(localStorage.getItem(LS) ?? '[]');
}
catch {
    return [];
} };
export function useRecentlyViewed() {
    const [ids, setIds] = useState(read);
    const record = useCallback((id) => {
        const next = [id, ...read().filter((x) => x !== id)].slice(0, 12);
        try {
            localStorage.setItem(LS, JSON.stringify(next));
        }
        catch { /* ignore */ }
        setIds(next);
    }, []);
    return { ids, record };
}
