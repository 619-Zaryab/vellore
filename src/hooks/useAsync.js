import { useEffect, useState } from 'react';
export function useAsync(fn, deps) {
    const [state, setState] = useState({ loading: true });
    useEffect(() => {
        let cancel = false;
        setState((s) => ({ ...s, loading: true, error: undefined }));
        fn().then((data) => !cancel && setState({ data, loading: false })).catch((error) => !cancel && setState({ loading: false, error }));
        return () => { cancel = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    return state;
}
