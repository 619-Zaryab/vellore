import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { errMsg } from '@/lib/utils';
export function useAnalytics(from, to, granularity) {
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let cancel = false;
        setLoading(true);
        setError('');
        api.getAnalytics({ from, to, granularity }).then((d) => !cancel && setData(d)).catch((e) => !cancel && setError(errMsg(e))).finally(() => !cancel && setLoading(false));
        return () => { cancel = true; };
    }, [from, to, granularity]);
    return { data, error, loading };
}
