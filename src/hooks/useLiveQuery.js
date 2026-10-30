import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
// Real-time list that grows by `step` each time loadMore() is called (the listener is re-created with a larger limit).
export function useLiveQuery(build, deps, step = 25) {
    const [max, setMax] = useState(step);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    useEffect(() => { setMax(step); }, deps); // eslint-disable-line
    useEffect(() => {
        const q = build(max);
        if (!q) {
            setData([]);
            return;
        }
        return onSnapshot(q, (s) => { setData(s.docs.map((d) => ({ id: d.id, ...d.data() }))); setError(null); }, (e) => { setError(e.message.includes('index') ? 'A Firestore index is missing. Deploy firestore.indexes.json.' : e.message); setData([]); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [max, ...deps]);
    return { data, error, hasMore: !!data && data.length >= max, loadMore: () => setMax((m) => m + step), loading: data === null };
}
