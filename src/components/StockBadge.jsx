import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { stockState, variantStock } from '@/lib/utils';
export function StockStatus({ variant, threshold }) {
    if (!variant)
        return <p className="flex items-center gap-2 text-sm font-semibold text-danger"><XCircle className="size-4"/>This combination is unavailable</p>;
    const s = stockState(variant, threshold);
    if (s === 'out')
        return <span className="inline-flex items-center gap-2 rounded-lg bg-danger px-3 py-1.5 text-sm font-bold tracking-wide text-white"><XCircle className="size-4"/>SOLD OUT</span>;
    if (s === 'low')
        return <p className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="size-4"/>LOW STOCK: only {variantStock(variant)} left</p>;
    return <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="size-4"/>In stock</p>;
}
