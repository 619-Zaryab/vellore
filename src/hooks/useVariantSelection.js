import { useEffect, useMemo, useState } from 'react';
import { defaultVariant } from '@/lib/utils';
// Tracks which option values are selected and resolves them to a concrete variant.
export function useVariantSelection(product) {
    const [sel, setSel] = useState({});
    const pid = product?.id;
    useEffect(() => {
        if (!product)
            return;
        const d = defaultVariant(product);
        setSel(d ? { ...d.options } : {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pid]);
    const variant = useMemo(() => {
        if (!product)
            return undefined;
        if (!product.options.length)
            return product.variants[0];
        return product.variants.find((v) => product.options.every((o) => v.options[o.name] === sel[o.name]));
    }, [product, sel]);
    // Is there any purchasable variant if we pick `value` for `name` (keeping the other current picks)?
    const isOptionAvailable = (name, value) => {
        if (!product)
            return false;
        return product.variants.some((v) => v.active && v.stock > 0 && v.options[name] === value &&
            product.options.every((o) => o.name === name || !sel[o.name] || v.options[o.name] === sel[o.name]));
    };
    const select = (name, value) => {
        if (!product)
            return;
        setSel((cur) => {
            const next = { ...cur, [name]: value };
            // If the exact combo doesn't exist, jump to the closest purchasable variant that has the new value.
            const exact = product.variants.find((v) => product.options.every((o) => v.options[o.name] === next[o.name]));
            if (exact)
                return next;
            const alt = product.variants.find((v) => v.active && v.stock > 0 && v.options[name] === value) ?? product.variants.find((v) => v.options[name] === value);
            return alt ? { ...alt.options } : next;
        });
    };
    return { sel, variant, select, isOptionAvailable };
}
