export const cn = (...c) => c.filter(Boolean).join(' ');
export const formatPrice = (n) => `Rs. ${Math.round(n || 0).toLocaleString('en-PK')}`;
export const formatDate = (d, withTime = false) => {
    const date = d && 'toDate' in d && d.toDate ? d.toDate() : d;
    if (!date)
        return '-';
    return date.toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
};
// Same rule as functions/src/pricing.ts: variant override first, then product price.
export function priceInfo(p, v) {
    const price = v?.price ?? p.price;
    const saleRaw = v ? (v.salePrice ?? (v.price == null ? p.salePrice : null)) : p.salePrice;
    const sale = saleRaw != null && saleRaw > 0 && saleRaw < price ? saleRaw : null;
    const final = sale ?? price;
    return { price, sale, final, onSale: sale != null, discountPct: sale ? Math.round(((price - sale) / price) * 100) : 0 };
}
export const variantStock = (v) => (v && v.active ? Math.max(0, v.stock) : 0);
export const variantLabel = (options) => Object.values(options).join(' / ');
export const defaultVariant = (p) => p.variants.find((v) => v.active && v.stock > 0) ?? p.variants.find((v) => v.active) ?? p.variants[0];
export const stockState = (v, threshold) => {
    const s = variantStock(v);
    return s <= 0 ? 'out' : s <= threshold ? 'low' : 'ok';
};
export const deriveStock = (variants, threshold) => {
    const active = variants.filter((v) => v.active);
    const totalStock = active.reduce((s, v) => s + Math.max(0, v.stock), 0);
    return { totalStock, inStock: totalStock > 0, lowStock: active.some((v) => v.stock > 0 && v.stock <= threshold) };
};
export const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
// Search keywords: lowercase tokens plus prefixes (min 2 chars) so Firestore array-contains can do prefix-style search.
export function buildKeywords(...parts) {
    const set = new Set();
    for (const part of parts) {
        for (const w of part.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)) {
            set.add(w);
            for (let i = 2; i < Math.min(w.length, 12); i++)
                set.add(w.slice(0, i));
        }
    }
    return [...set].slice(0, 250);
}
export const errMsg = (e) => {
    const x = e;
    const m = x?.message ?? 'Something went wrong. Please try again.';
    return m.replace(/^(Firebase|FirebaseError):\s*/i, '').replace(/\s*\(auth\/[a-z-]+\)\.?$/i, '') || 'Something went wrong.';
};
export function debounce(fn, ms) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
