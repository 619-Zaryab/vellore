import { collection, doc, getDoc, getDocs, limit, orderBy, query, startAfter, where } from 'firebase/firestore';
import { db } from './firebase';
const SORTS = {
    newest: ['createdAt', 'desc'], 'price-asc': ['price', 'asc'], 'price-desc': ['price', 'desc'], popular: ['soldCount', 'desc'],
};
export const SORT_LABEL = { newest: 'Newest', 'price-asc': 'Price: low to high', 'price-desc': 'Price: high to low', popular: 'Most popular' };
const toProduct = (d) => ({ id: d.id, ...d.data() });
export async function fetchProducts(o) {
    const size = o.pageSize ?? 12;
    const c = [where('status', '==', 'active')];
    if (o.featured)
        c.push(where('featured', '==', true));
    if (o.onSale)
        c.push(where('onSale', '==', true));
    if (o.categoryId)
        c.push(where('categoryPath', 'array-contains', o.categoryId));
    // featured / onSale lists are always newest-first (see firestore.indexes.json)
    const [field, dir] = o.featured || o.onSale ? SORTS.newest : SORTS[o.sort ?? 'newest'];
    c.push(orderBy(field, dir));
    if (o.cursor)
        c.push(startAfter(o.cursor));
    c.push(limit(size));
    const snap = await getDocs(query(collection(db, 'products'), ...c));
    return { items: snap.docs.map(toProduct), cursor: snap.docs[snap.docs.length - 1] ?? null, done: snap.size < size };
}
export async function getProduct(id) {
    try {
        const s = await getDoc(doc(db, 'products', id));
        return s.exists() ? { id: s.id, ...s.data() } : null;
    }
    catch {
        return null;
    }
}
export async function getProductsByIds(ids) {
    const res = await Promise.allSettled(ids.map((id) => getProduct(id)));
    return res.flatMap((r) => (r.status === 'fulfilled' && r.value && r.value.status === 'active' ? [r.value] : []));
}
const norm = (s) => s.toLowerCase().trim().split(/[^a-z0-9]+/).filter(Boolean);
export async function searchProducts(term, max = 48) {
    const tokens = norm(term);
    if (!tokens.length)
        return [];
    const lead = [...tokens].sort((a, b) => b.length - a.length)[0];
    const snap = await getDocs(query(collection(db, 'products'), where('status', '==', 'active'), where('searchKeywords', 'array-contains', lead), limit(max)));
    return snap.docs.map(toProduct).filter((p) => tokens.every((t) => p.searchKeywords.includes(t)));
}
export const suggestProducts = (term) => searchProducts(term, 6);
export async function fetchCategories() {
    const snap = await getDocs(query(collection(db, 'categories'), orderBy('order', 'asc')));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
