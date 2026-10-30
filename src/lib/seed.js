// Clearly-labelled demo data (isDemo: true). Images are placeholders from picsum.photos.
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { buildKeywords, deriveStock, slugify } from './utils';

const img = (seed, n = 3) => Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/vellore-${seed}-${i}/900/900`);

function variants(sku, options, stock, imagesFor) {
    const combos = options.reduce((acc, o) => acc.flatMap((a) => o.values.map((v) => ({ ...a, [o.name]: v }))), [{}]);
    return combos.map((o, i) => ({
        id: Object.values(o).map(slugify).join('-') || 'default',
        sku: `${sku}-${Object.values(o).map((v) => v.slice(0, 3).toUpperCase()).join('-') || 'STD'}`,
        options: o, stock: stock(i), active: true, price: null, salePrice: null, images: imagesFor ? imagesFor(o) : [],
    }));
}

const CATS = [
    { id: 'demo-electronics', name: 'Electronics', parentId: null, order: 0 },
    { id: 'demo-audio', name: 'Audio', parentId: 'demo-electronics', order: 1 },
    { id: 'demo-wearables', name: 'Wearables', parentId: 'demo-electronics', order: 2 },
    { id: 'demo-clothing', name: 'Clothing', parentId: null, order: 3 },
    { id: 'demo-accessories', name: 'Accessories', parentId: null, order: 4 },
    { id: 'demo-home', name: 'Home', parentId: null, order: 5 },
];
const PRODUCTS = [
    { id: 'demo-earbuds', name: 'Aero Wireless Earbuds', cat: 'demo-electronics', sub: 'demo-audio', price: 12999, sale: 9999, desc: 'Active noise cancelling earbuds with 28 hours of battery life. (Demo product)', options: [{ name: 'Color', values: ['Black', 'White'] }], stock: (i) => [14, 0][i], featured: true, sold: 42, specs: [['Battery', '28 hours with case'], ['Connectivity', 'Bluetooth 5.3']] },
    { id: 'demo-watch', name: 'Pulse Smart Watch', cat: 'demo-electronics', sub: 'demo-wearables', price: 18500, desc: 'AMOLED display, heart-rate and sleep tracking, 7-day battery. (Demo product)', options: [{ name: 'Color', values: ['Black', 'Silver'] }, { name: 'Size', values: ['40mm', '44mm'] }], stock: (i) => [8, 3, 0, 12][i], featured: true, sold: 27, specs: [['Display', '1.4 inch AMOLED'], ['Water resistance', '5 ATM']] },
    { id: 'demo-speaker', name: 'Orbit Bluetooth Speaker', cat: 'demo-electronics', sub: 'demo-audio', price: 6500, sale: 5200, desc: 'Portable speaker with room-filling sound and 12 hours of playtime. (Demo product)', options: [], stock: () => 3, sold: 15 },
    { id: 'demo-tee', name: 'Everyday Cotton Tee', cat: 'demo-clothing', price: 1800, desc: 'Heavyweight 100% cotton crew-neck tee in a relaxed fit. (Demo product)', options: [{ name: 'Color', values: ['Navy', 'Olive'] }, { name: 'Size', values: ['S', 'M', 'L'] }], stock: (i) => [10, 8, 0, 6, 12, 4][i], featured: true, sold: 60 },
    { id: 'demo-linen', name: 'Coastal Linen Shirt', cat: 'demo-clothing', price: 3400, sale: 2900, desc: 'Breathable linen shirt for warm days. (Demo product)', options: [{ name: 'Size', values: ['M', 'L'] }], stock: (i) => [5, 2][i], sold: 9 },
    { id: 'demo-wallet', name: 'Hand-stitched Leather Wallet', cat: 'demo-accessories', price: 2600, desc: 'Full-grain leather bifold with six card slots. (Demo product)', options: [{ name: 'Color', values: ['Brown', 'Black'] }], stock: (i) => [20, 15][i], sold: 31 },
    { id: 'demo-backpack', name: 'Canvas Daypack', cat: 'demo-accessories', price: 4200, desc: 'Water-resistant canvas backpack. Out of stock on purpose to show the sold-out state. (Demo product)', options: [], stock: () => 0, sold: 18 },
    { id: 'demo-mugs', name: 'Stoneware Mug Set', cat: 'demo-home', price: 2200, desc: 'Set of four hand-glazed stoneware mugs. (Demo product)', options: [{ name: 'Color', values: ['White', 'Grey'] }], stock: (i) => [9, 7][i], featured: true, sold: 12 },
    { id: 'demo-lamp', name: 'Arc Table Lamp', cat: 'demo-home', price: 5900, sale: 4900, desc: 'Warm-light table lamp with a dimmable base. (Demo product)', options: [], stock: () => 25, sold: 5 },
];

export async function seedDemoData() {
    let created = 0;
    const create = async (path, data) => {
        const ref = doc(db, path);
        if ((await getDoc(ref)).exists()) return;
        await setDoc(ref, data);
        created++;
    };
    for (const c of CATS)
        await create(`categories/${c.id}`, { ...c, slug: slugify(c.name), image: '', active: true, isDemo: true, createdAt: serverTimestamp() });
    for (const p of PRODUCTS) {
        const vs = variants(p.id.replace('demo-', '').toUpperCase(), p.options, p.stock, (o) => (o.Color ? img(`${p.id}-${o.Color}`) : []));
        const d = deriveStock(vs, 5);
        await create(`products/${p.id}`, {
            sku: p.id.toUpperCase(), name: p.name, slug: slugify(p.name), description: p.desc, categoryId: p.cat, subcategoryId: p.sub ?? null,
            categoryPath: [p.cat, ...(p.sub ? [p.sub] : [])], images: img(p.id), price: p.price, salePrice: p.sale ?? null,
            specs: (p.specs ?? []).map(([label, value]) => ({ label, value })), status: 'active', featured: !!p.featured,
            searchKeywords: buildKeywords(p.name, p.id, CATS.find((c) => c.id === p.cat).name), ratingAvg: 0, ratingCount: 0, soldCount: p.sold ?? 0,
            lowStockThreshold: 5, options: p.options, variants: vs, ...d, onSale: !!p.sale, isDemo: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
    }
    return { created };
}
