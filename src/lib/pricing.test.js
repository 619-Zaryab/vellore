import { describe, it, expect } from 'vitest';
import { checkCoupon, computeTotals, couponDiscount } from './pricing';
import { priceInfo, deriveStock, buildKeywords } from './utils';
const base = { type: 'percent', value: 10, active: true, usageLimit: 0, perUserLimit: 0, usedCount: 0 };
const ctx = { now: 1_000_000, subtotal: 5000, eligibleSubtotal: 5000, userUses: 0 };
describe('couponDiscount', () => {
    it('calculates percentages and rounds down', () => expect(couponDiscount(base, 999)).toBe(99));
    it('respects maxDiscount', () => expect(couponDiscount({ ...base, value: 50, maxDiscount: 300 }, 2000)).toBe(300));
    it('never exceeds the eligible subtotal for fixed coupons', () => expect(couponDiscount({ type: 'fixed', value: 900 }, 500)).toBe(500));
    it('is zero for an empty eligible subtotal', () => expect(couponDiscount(base, 0)).toBe(0));
});
describe('checkCoupon', () => {
    it('accepts a valid coupon', () => expect(checkCoupon(base, ctx).ok).toBe(true));
    it('rejects inactive coupons', () => expect(checkCoupon({ ...base, active: false }, ctx).ok).toBe(false));
    it('rejects expired coupons', () => expect(checkCoupon({ ...base, expiresAt: 10 }, ctx).ok).toBe(false));
    it('rejects coupons that have not started', () => expect(checkCoupon({ ...base, startsAt: 2_000_000 }, ctx).ok).toBe(false));
    it('rejects exhausted coupons', () => expect(checkCoupon({ ...base, usageLimit: 5, usedCount: 5 }, ctx).ok).toBe(false));
    it('enforces per-customer limits', () => expect(checkCoupon({ ...base, perUserLimit: 1 }, { ...ctx, userUses: 1 }).ok).toBe(false));
    it('enforces the minimum order', () => expect(checkCoupon({ ...base, minOrder: 9000 }, ctx).ok).toBe(false));
    it('rejects coupons that match no cart items', () => expect(checkCoupon(base, { ...ctx, eligibleSubtotal: 0 }).ok).toBe(false));
});
describe('computeTotals', () => {
    it('adds shipping below the free-shipping threshold', () => {
        expect(computeTotals({ subtotal: 2000, discount: 0, shippingFee: 250, freeShippingThreshold: 5000, taxRate: 0 }).total).toBe(2250);
    });
    it('waives shipping above the threshold', () => {
        expect(computeTotals({ subtotal: 6000, discount: 0, shippingFee: 250, freeShippingThreshold: 5000, taxRate: 0 }).shipping).toBe(0);
    });
    it('applies the discount before tax and shipping', () => {
        const t = computeTotals({ subtotal: 1000, discount: 200, shippingFee: 100, freeShippingThreshold: 0, taxRate: 10 });
        expect(t).toEqual({ subtotal: 1000, discount: 200, shipping: 100, tax: 80, total: 980 });
    });
    it('honours free-shipping coupons', () => {
        expect(computeTotals({ subtotal: 1000, discount: 0, shippingFee: 300, freeShippingThreshold: 0, freeShippingCoupon: true, taxRate: 0 }).shipping).toBe(0);
    });
});
describe('priceInfo', () => {
    it('uses the variant override over the product price', () => {
        expect(priceInfo({ price: 1000, salePrice: null }, { price: 1500, salePrice: 1200 }).final).toBe(1200);
    });
    it('inherits the product sale price when the variant has no override', () => {
        expect(priceInfo({ price: 1000, salePrice: 800 }, { price: null, salePrice: null }).final).toBe(800);
    });
    it('ignores a sale price that is not lower', () => {
        expect(priceInfo({ price: 1000, salePrice: 1200 }).onSale).toBe(false);
    });
});
describe('inventory helpers', () => {
    const v = (stock, active = true) => ({ id: 'a', sku: 'a', options: {}, stock, active });
    it('derives stock flags from active variants only', () => {
        expect(deriveStock([v(3), v(10, false)], 5)).toEqual({ totalStock: 3, inStock: true, lowStock: true });
        expect(deriveStock([v(0)], 5).inStock).toBe(false);
    });
    it('builds prefix keywords', () => expect(buildKeywords('Wireless Mouse')).toContain('wire'));
});
