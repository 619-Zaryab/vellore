// All business operations run directly against Firestore (no Cloud Functions).
// Security comes from firestore.rules: customers can only create their own PENDING orders and cancel them;
// everything else (confirming, stock, payments, refunds) is done by an admin from the dashboard.
import {
    arrayUnion, average, collection, count, deleteDoc, doc, getAggregateFromServer, getCountFromServer, getDoc, getDocs, limit, orderBy, query,
    runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { mergeSettings } from './constants';
import { checkCoupon, computeTotals, couponApplies, couponDiscount } from './pricing';
import { deriveStock, priceInfo, variantLabel } from './utils';
import { seedDemoData as seed } from './seed';

const fail = (m) => { throw new Error(m); };
const me = () => auth.currentUser ?? fail('Please sign in to continue.');
const label = (o) => variantLabel(o) || 'Default';

const friendly = (e) => {
    if (e?.code === 'permission-denied' || /insufficient permissions/i.test(e?.message ?? '')) return new Error('You do not have permission to do that. If you think this is a mistake, contact support.');
    return e;
};
const guard = (fn) => async (...a) => { try { return await fn(...a); } catch (e) { throw friendly(e); } };

/* ------------------------------ pricing helpers ------------------------------ */
// Reads the current product data and prices each requested line. Never trusts anything the cart held.
async function loadLines(items, { strict }) {
    const merged = new Map();
    for (const i of items) { const k = `${i.productId}::${i.variantId}`; const e = merged.get(k); merged.set(k, e ? { ...e, qty: e.qty + i.qty } : { ...i }); }
    const ids = [...new Set([...merged.values()].map((i) => i.productId))];
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, 'products', id)).catch(() => null)));
    const products = new Map(snaps.filter((s) => s && s.exists() && s.data().status === 'active').map((s) => [s.id, s.data()]));
    const lines = [];
    for (const m of merged.values()) {
        const p = products.get(m.productId);
        const v = p?.variants.find((x) => x.id === m.variantId && x.active);
        if (!p || !v) { if (strict) fail('An item in your cart is no longer available. Please review your cart.'); continue; }
        if (strict && v.stock < m.qty) fail(v.stock <= 0 ? `${p.name} (${label(v.options)}) is sold out.` : `Only ${v.stock} left of ${p.name} (${label(v.options)}).`);
        const unit = priceInfo(p, v).final;
        lines.push({ productId: m.productId, variantId: v.id, name: p.name, sku: v.sku, image: v.images?.[0] ?? p.images?.[0] ?? '', options: v.options, unitPrice: unit, qty: m.qty, lineTotal: unit * m.qty, categoryId: p.categoryId });
    }
    return lines;
}

async function evaluateCoupon(code, lines, uid) {
    const snap = await getDoc(doc(db, 'coupons', code)).catch(() => null);
    if (!snap || !snap.exists()) fail('This coupon code is not valid.');
    const d = snap.data();
    const c = { ...d, code, startsAt: d.startsAt?.toMillis?.() ?? null, expiresAt: d.expiresAt?.toMillis?.() ?? null };
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const eligible = lines.filter((l) => couponApplies(c, l)).reduce((s, l) => s + l.lineTotal, 0);
    let uses = (await getDoc(doc(db, 'coupons', code, 'usages', uid)).catch(() => null))?.data()?.count ?? 0;
    // confirmed orders are counted by admin on confirmation; count this customer's still-pending orders too
    const mine = await getDocs(query(collection(db, 'orders'), where('userId', '==', uid), where('couponCode', '==', code))).catch(() => null);
    uses += mine ? mine.docs.filter((x) => x.data().status === 'pending').length : 0;
    const chk = checkCoupon(c, { now: Date.now(), subtotal, eligibleSubtotal: eligible, userUses: uses });
    if (!chk.ok) fail(chk.reason);
    return { discount: couponDiscount(c, eligible), freeShipping: !!c.freeShipping };
}

const orderNumber = () => {
    const d = new Date(Date.now() + 5 * 3600_000).toISOString();
    const rand = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    return `VEL-${d.slice(2, 4)}${d.slice(5, 7)}${d.slice(8, 10)}-${rand}`;
};

/* ------------------------------ customer actions ------------------------------ */
async function createOrder(input) {
    const user = me();
    const ref = doc(db, 'orders', `${user.uid}_${input.clientOrderId}`);
    const existing = await getDoc(ref).catch(() => null);
    if (existing?.exists()) return { orderId: ref.id, orderNumber: existing.data().orderNumber }; // same checkout retried
    const settings = mergeSettings((await getDoc(doc(db, 'storeSettings', 'main')).catch(() => null))?.data());
    if (settings.requireVerifiedEmail && !user.emailVerified) fail('Please verify your email address before placing an order.');
    if (!settings.paymentMethods[input.paymentMethod]) fail('This payment method is not available.');
    const dm = settings.deliveryMethods.find((d) => d.id === input.deliveryMethodId) ?? fail('Choose a valid delivery method.');
    const manual = input.paymentMethod !== 'cod';
    if (manual && !(input.paymentReference ?? '').trim()) fail('Enter the transaction ID of your payment so we can verify it.');

    const lines = await loadLines(input.items, { strict: true });
    const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
    const code = input.couponCode?.trim().toUpperCase();
    const cp = code ? await evaluateCoupon(code, lines, user.uid) : { discount: 0, freeShipping: false };
    const totals = computeTotals({ subtotal, discount: cp.discount, shippingFee: dm.fee, freeShippingThreshold: settings.freeShippingThreshold, freeShippingCoupon: cp.freeShipping, taxRate: settings.taxRate });
    const now = Timestamp.now();
    const number = orderNumber();
    await guard(() => setDoc(ref, {
        orderNumber: number, userId: user.uid, userEmail: user.email ?? '', customerName: input.shippingAddress.fullName, clientOrderId: input.clientOrderId,
        items: lines, ...totals, currency: 'PKR', couponCode: code ?? null,
        paymentMethod: input.paymentMethod, paymentStatus: manual ? 'pending' : 'unpaid', status: 'pending',
        statusHistory: [{ status: 'pending', at: now, by: `customer:${user.email ?? user.uid}`, note: manual ? 'Order placed, payment to be verified' : 'Order placed' }],
        shippingAddress: input.shippingAddress, billingAddress: input.billingAddress ?? null,
        deliveryMethod: { id: dm.id, label: dm.label, fee: dm.fee, eta: dm.eta }, notes: input.notes ?? '',
        trackingNumber: null, carrier: null, stockDeducted: false, stockRestored: false, payment: { reference: (input.paymentReference ?? '').trim() },
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }))();
    return { orderId: ref.id, orderNumber: number };
}

async function cancelOrder({ orderId, reason }) {
    const user = me();
    try {
        await updateDoc(doc(db, 'orders', orderId), {
            status: 'cancelled', cancelledAt: Timestamp.now(), updatedAt: serverTimestamp(),
            statusHistory: arrayUnion({ status: 'cancelled', at: Timestamp.now(), by: `customer:${user.email ?? user.uid}`, note: reason ?? 'Cancelled by customer' }),
        });
    } catch (e) {
        if (e?.code === 'permission-denied') throw new Error('This order can no longer be cancelled online. Please contact support.');
        throw e;
    }
    return { ok: true };
}

async function validateCoupon({ code: raw, items }) {
    const user = me();
    const code = raw.trim().toUpperCase();
    try {
        const lines = await loadLines(items, { strict: false });
        const r = await evaluateCoupon(code, lines, user.uid);
        return { valid: true, code, discount: r.discount, freeShipping: r.freeShipping, message: r.discount > 0 ? `You save Rs. ${r.discount.toLocaleString('en-PK')}` : 'Free shipping applied' };
    } catch (e) {
        return { valid: false, code, discount: 0, freeShipping: false, message: e.message };
    }
}

async function recomputeRating(productId) {
    const agg = await getAggregateFromServer(query(collection(db, 'reviews'), where('productId', '==', productId), where('hidden', '==', false)), { avg: average('rating'), n: count() });
    const r = agg.data();
    await updateDoc(doc(db, 'products', productId), { ratingAvg: Math.round((r.avg ?? 0) * 10) / 10, ratingCount: r.n });
}

async function submitReview({ productId, rating, title, comment }) {
    const user = me();
    const delivered = await getDocs(query(collection(db, 'orders'), where('userId', '==', user.uid), where('status', '==', 'delivered'), limit(100)));
    if (!delivered.docs.some((o) => o.data().items.some((i) => i.productId === productId))) fail('You can review a product after your order for it has been delivered.');
    const product = await getDoc(doc(db, 'products', productId));
    if (!product.exists()) fail('Product not found.');
    const ref = doc(db, 'reviews', `${user.uid}_${productId}`);
    const prev = await getDoc(ref).catch(() => null);
    const body = { rating, title: title ?? '', comment: comment.trim(), updatedAt: serverTimestamp() };
    await guard(async () => {
        if (prev?.exists()) await updateDoc(ref, body);
        else await setDoc(ref, { ...body, productId, productName: product.data().name, userId: user.uid, userName: user.displayName || 'Customer', hidden: false, createdAt: serverTimestamp() });
    })();
    return { ok: true };
}

/* ------------------------------ admin: orders ------------------------------ */
const ALLOWED = {
    pending: ['confirmed', 'cancelled'], confirmed: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'], shipped: ['delivered'],
    delivered: ['refund_pending'], cancelled: [], refund_pending: ['refunded'], refunded: [], payment_pending: ['cancelled'], payment_failed: [],
};

async function transition(orderId, to, d) {
    const admin = me();
    const ref = doc(db, 'orders', orderId);
    await runTransaction(db, async (tx) => {
        // ---- reads ----
        const snap = await tx.get(ref);
        if (!snap.exists()) fail('Order not found.');
        const o = snap.data();
        if (!ALLOWED[o.status]?.includes(to)) fail(`An order that is ${o.status.replace('_', ' ')} cannot move to ${to.replace('_', ' ')}.`);
        const deduct = to === 'confirmed';
        const restore = !deduct && o.stockDeducted && !o.stockRestored && (to === 'cancelled' || (to === 'refund_pending' && d.restock));
        let psnaps = [], cSnap = null, uSnap = null;
        const cRef = o.couponCode ? doc(db, 'coupons', o.couponCode) : null;
        const uRef = o.couponCode ? doc(db, 'coupons', o.couponCode, 'usages', o.userId) : null;
        if (deduct || restore) {
            const ids = [...new Set(o.items.map((i) => i.productId))];
            psnaps = await Promise.all(ids.map((id) => tx.get(doc(db, 'products', id))));
            if (cRef) [cSnap, uSnap] = await Promise.all([tx.get(cRef), tx.get(uRef)]);
        }
        const now = Timestamp.now();
        const patch = {};
        let status = to;
        // ---- checks (still no writes) ----
        const byId = new Map(psnaps.map((s) => [s.id, s]));
        if (deduct) {
            let expected = 0;
            for (const it of o.items) {
                const p = byId.get(it.productId)?.data();
                const v = p?.variants.find((x) => x.id === it.variantId);
                if (!p || !v) fail(`${it.name} no longer exists. Cancel this order or restore the product first.`);
                if (v.stock < it.qty) fail(`Not enough stock for ${it.name} (${label(v.options)}): ${v.stock} left, ${it.qty} needed.`);
                expected += priceInfo(p, v).final * it.qty;
            }
            if (!d.force && expected !== o.subtotal) fail(`Price check failed: current prices add up to Rs. ${expected.toLocaleString('en-PK')} but this order says Rs. ${o.subtotal.toLocaleString('en-PK')}. Prices may have changed since the order, or it was altered. Check it, then use "Confirm anyway".`);
            patch.stockDeducted = true;
        }
        switch (to) {
            case 'cancelled':
                patch.cancelledAt = now;
                if (restore) patch.stockRestored = true;
                if (o.paymentStatus === 'paid') { status = 'refund_pending'; patch.paymentStatus = 'refund_pending'; }
                break;
            case 'delivered': if (o.paymentMethod === 'cod') { patch.paymentStatus = 'paid'; patch.paidAt = now; } break;
            case 'refund_pending':
                if (o.paymentStatus !== 'paid') fail('Only paid orders can be refunded.');
                patch.paymentStatus = 'refund_pending';
                if (restore) patch.stockRestored = true;
                break;
            case 'refunded':
                if (o.paymentStatus !== 'refund_pending') fail('This refund was already recorded.');
                if (!d.refundRef) fail('Enter the refund reference.');
                patch.paymentStatus = 'refunded'; patch.refundedAt = now; patch.refundRef = d.refundRef;
                break;
            default: break;
        }
        // ---- writes ----
        if (deduct || restore) {
            const sign = deduct ? -1 : 1;
            for (const s of psnaps) {
                if (!s.exists()) continue;
                const p = s.data();
                const variants = p.variants.map((v) => ({ ...v }));
                let qty = 0;
                for (const it of o.items.filter((i) => i.productId === s.id)) {
                    const v = variants.find((x) => x.id === it.variantId);
                    if (!v) continue;
                    const before = v.stock;
                    v.stock = before + sign * it.qty; qty += it.qty;
                    tx.set(doc(collection(db, 'inventoryLogs')), { productId: s.id, productName: p.name, variantId: v.id, variantLabel: label(v.options), sku: v.sku, before, after: v.stock, delta: sign * it.qty, type: deduct ? 'order' : 'restock', reason: `${deduct ? 'Order confirmed' : 'Order returned'} ${o.orderNumber}`, orderId, adminId: admin.uid, adminEmail: admin.email ?? admin.uid, createdAt: now });
                }
                tx.update(s.ref, { variants, ...deriveStock(variants, p.lowStockThreshold ?? 5), soldCount: Math.max(0, (p.soldCount ?? 0) + (deduct ? qty : -qty)), updatedAt: serverTimestamp() });
            }
            if (cSnap?.exists()) tx.update(cRef, { usedCount: Math.max(0, (cSnap.data().usedCount ?? 0) + (deduct ? 1 : -1)) });
            if (deduct && cSnap?.exists()) tx.set(uRef, { count: (uSnap?.data()?.count ?? 0) + 1, lastOrderId: orderId, updatedAt: now }, { merge: true });
            if (restore && uSnap?.exists()) tx.set(uRef, { count: Math.max(0, (uSnap.data().count ?? 1) - 1) }, { merge: true });
        }
        tx.update(ref, { ...patch, status, statusHistory: arrayUnion({ status, at: now, by: `admin:${admin.email ?? admin.uid}`, note: d.note ?? '' }), updatedAt: serverTimestamp() });
    });
}

async function updateOrderStatus(d) {
    if (d.trackingNumber) await updateDoc(doc(db, 'orders', d.orderId), { trackingNumber: d.trackingNumber, carrier: d.carrier ?? null, updatedAt: serverTimestamp() });
    if (d.status) await transition(d.orderId, d.status, d);
    return { ok: true };
}

// Admin confirms that money for an online-transfer order has arrived (COD is marked paid automatically on delivery).
async function markPaid({ orderId, note }) {
    const admin = me();
    const ref = doc(db, 'orders', orderId);
    await runTransaction(db, async (tx) => {
        const s = await tx.get(ref);
        const o = s.data() ?? fail('Order not found.');
        if (o.paymentStatus === 'paid') fail('This order is already marked as paid.');
        if (['cancelled', 'refund_pending', 'refunded'].includes(o.status)) fail('This order is closed.');
        tx.update(ref, { paymentStatus: 'paid', paidAt: Timestamp.now(), statusHistory: arrayUnion({ status: o.status, at: Timestamp.now(), by: `admin:${admin.email ?? admin.uid}`, note: note || 'Payment verified' }), updatedAt: serverTimestamp() });
    });
    return { ok: true };
}

/* ------------------------------ admin: stock ------------------------------ */
async function adjustStock({ productId, variantId, mode, value, reason }) {
    const admin = me();
    if (!Number.isInteger(value)) fail('Enter a whole number.');
    let stock = 0;
    await runTransaction(db, async (tx) => {
        const ref = doc(db, 'products', productId);
        const s = await tx.get(ref);
        if (!s.exists()) fail('Product not found.');
        const p = s.data();
        const variants = p.variants.map((v) => ({ ...v }));
        const v = variants.find((x) => x.id === variantId) ?? fail('Variant not found.');
        const before = v.stock;
        const after = mode === 'set' ? value : before + value;
        if (after < 0) fail(`Stock cannot go below zero (current stock is ${before}).`);
        v.stock = after; stock = after;
        tx.update(ref, { variants, ...deriveStock(variants, p.lowStockThreshold ?? 5), updatedAt: serverTimestamp() });
        tx.set(doc(collection(db, 'inventoryLogs')), { productId, productName: p.name, variantId, variantLabel: label(v.options), sku: v.sku, before, after, delta: after - before, type: 'adjustment', reason, adminId: admin.uid, adminEmail: admin.email ?? admin.uid, createdAt: Timestamp.now() });
    });
    return { ok: true, stock };
}

/* ------------------------------ admin: reviews, users, demo ------------------------------ */
async function moderateReview({ reviewId, action }) {
    const ref = doc(db, 'reviews', reviewId);
    const s = await getDoc(ref);
    if (!s.exists()) fail('Review not found.');
    const productId = s.data().productId;
    if (action === 'delete') await deleteDoc(ref); else await updateDoc(ref, { hidden: action === 'hide' });
    await recomputeRating(productId).catch(() => {});
    return { ok: true };
}

async function recalcAllRatings() {
    const snap = await getDocs(query(collection(db, 'reviews'), where('hidden', '==', false), limit(5000)));
    const by = new Map();
    snap.docs.forEach((d) => { const r = d.data(); const e = by.get(r.productId) ?? { sum: 0, n: 0 }; e.sum += r.rating; e.n++; by.set(r.productId, e); });
    let n = 0;
    for (const [id, e] of by) { await updateDoc(doc(db, 'products', id), { ratingAvg: Math.round((e.sum / e.n) * 10) / 10, ratingCount: e.n }).catch(() => {}); n++; }
    return { updated: n };
}

// "Disabled" = blocked from placing orders and reviewing (enforced in firestore.rules).
const setUserDisabled = async ({ uid, disabled }) => { await updateDoc(doc(db, 'users', uid), { blocked: !!disabled }); return { ok: true }; };
const setAdminRole = async ({ uid, admin }) => {
    if (uid === me().uid && !admin) fail('You cannot remove your own admin access.');
    if (admin) await setDoc(doc(db, 'admins', uid), { admin: true, grantedAt: serverTimestamp() }); else await deleteDoc(doc(db, 'admins', uid));
    return { ok: true };
};

/* ------------------------------ admin: analytics (calculated in the browser) ------------------------------ */
const PKT = 5 * 3600_000;
const dayKey = (ms) => new Date(ms + PKT).toISOString().slice(0, 10);
const weekKey = (ms) => { const d = new Date(ms + PKT); const dow = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - dow * 864e5).toISOString().slice(0, 10); };
const monthKey = (ms) => new Date(ms + PKT).toISOString().slice(0, 7);

async function getAnalytics({ from, to, granularity }) {
    const MAX = 5000;
    const start = new Date(`${from}T00:00:00+05:00`), end = new Date(`${to}T23:59:59.999+05:00`);
    if (!(end >= start) || (end - start) / 864e5 > 800) fail('Choose a valid date range of up to about two years.');
    const key = granularity === 'day' ? dayKey : granularity === 'week' ? weekKey : monthKey;
    const snap = await getDocs(query(collection(db, 'orders'), where('createdAt', '>=', Timestamp.fromDate(start)), where('createdAt', '<=', Timestamp.fromDate(end)), orderBy('createdAt', 'desc'), limit(MAX + 1)));
    const truncated = snap.size > MAX;
    const orders = snap.docs.slice(0, MAX).map((d) => d.data());

    const series = new Map();
    for (let t = start.getTime(); t <= end.getTime(); t += 864e5) { const k = key(t); if (!series.has(k)) series.set(k, { label: k, gross: 0, net: 0, orders: 0 }); }
    const byStatus = new Map(), byCat = new Map(), prod = new Map(), pay = new Map(), coupons = new Map(), perUser = new Map();
    let gross = 0, net = 0, valid = 0;
    for (const o of orders) {
        byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);
        if (['payment_pending', 'payment_failed', 'cancelled'].includes(o.status) || o.cancelledAt) continue;
        const ms = o.createdAt.toMillis();
        const b = series.get(key(ms)) ?? { label: key(ms), gross: 0, net: 0, orders: 0 };
        series.set(key(ms), b);
        gross += o.total; valid++; b.gross += o.total; b.orders++;
        if (o.paymentStatus === 'paid') { net += o.total; b.net += o.total; }
        const pm = pay.get(o.paymentMethod) ?? { orders: 0, revenue: 0 }; pm.orders++; pm.revenue += o.total; pay.set(o.paymentMethod, pm);
        if (o.couponCode) { const c = coupons.get(o.couponCode) ?? { uses: 0, discount: 0 }; c.uses++; c.discount += o.discount; coupons.set(o.couponCode, c); }
        perUser.set(o.userId, (perUser.get(o.userId) ?? 0) + 1);
        for (const i of o.items) {
            byCat.set(i.categoryId, (byCat.get(i.categoryId) ?? 0) + i.lineTotal);
            const p = prod.get(i.productId) ?? { name: i.name, qty: 0, revenue: 0 }; p.qty += i.qty; p.revenue += i.lineTotal; prod.set(i.productId, p);
        }
    }
    const catSnaps = await Promise.all([...byCat.keys()].map((id) => getDoc(doc(db, 'categories', id)).catch(() => null)));
    const catName = new Map(catSnaps.filter(Boolean).map((s) => [s.id, s.data()?.name ?? 'Uncategorised']));
    const cnt = async (q) => (await getCountFromServer(q)).data().count;
    const [pendingOrders, totalProducts, customers, lowStock, outOfStock] = await Promise.all([
        cnt(query(collection(db, 'orders'), where('status', '==', 'pending'))), cnt(collection(db, 'products')), cnt(collection(db, 'users')),
        cnt(query(collection(db, 'products'), where('lowStock', '==', true))), cnt(query(collection(db, 'products'), where('inStock', '==', false))),
    ]);
    const users = [...perUser.values()];
    return {
        range: { from, to, granularity },
        kpis: { grossSales: gross, netRevenue: net, totalOrders: valid, aov: valid ? Math.round(gross / valid) : 0, pendingOrders, totalProducts, customers, lowStock, outOfStock },
        sales: [...series.values()].sort((a, b) => a.label.localeCompare(b.label)),
        ordersByStatus: [...byStatus].map(([status, c]) => ({ status, count: c })),
        revenueByCategory: [...byCat].map(([categoryId, revenue]) => ({ categoryId, name: catName.get(categoryId) ?? 'Uncategorised', revenue })).sort((a, b) => b.revenue - a.revenue),
        bestsellers: [...prod].map(([productId, p]) => ({ productId, ...p })).sort((a, b) => b.qty - a.qty).slice(0, 10),
        paymentMix: [...pay].map(([method, v]) => ({ method, ...v })),
        coupons: [...coupons].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.uses - a.uses),
        repeat: valid >= 10 ? { repeatCustomers: users.filter((n) => n > 1).length, customers: users.length, rate: users.length ? users.filter((n) => n > 1).length / users.length : 0 } : null,
        inventory: { healthy: Math.max(0, totalProducts - lowStock - outOfStock), low: lowStock, out: outOfStock },
        truncated,
    };
}

export const api = {
    createOrder, cancelOrder, validateCoupon, submitReview,
    updateOrderStatus, markPaid, adjustStock, getAnalytics, moderateReview, recalcAllRatings, setUserDisabled, setAdminRole,
    seedDemoData: guard(seed),
};
