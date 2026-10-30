export function couponDiscount(c, eligibleSubtotal) {
    if (eligibleSubtotal <= 0)
        return 0;
    let d = c.type === 'percent' ? Math.floor((eligibleSubtotal * c.value) / 100) : c.value;
    if (c.type === 'percent' && c.maxDiscount && c.maxDiscount > 0)
        d = Math.min(d, c.maxDiscount);
    return Math.max(0, Math.min(d, eligibleSubtotal));
}
export function checkCoupon(c, ctx) {
    if (!c.active)
        return { ok: false, reason: 'This coupon is not active.' };
    if (c.startsAt && c.startsAt > ctx.now)
        return { ok: false, reason: 'This coupon is not valid yet.' };
    if (c.expiresAt && c.expiresAt < ctx.now)
        return { ok: false, reason: 'This coupon has expired.' };
    if (c.usageLimit > 0 && c.usedCount >= c.usageLimit)
        return { ok: false, reason: 'This coupon has reached its usage limit.' };
    if (c.perUserLimit > 0 && ctx.userUses >= c.perUserLimit)
        return { ok: false, reason: 'You have already used this coupon.' };
    if (c.minOrder && ctx.subtotal < c.minOrder)
        return { ok: false, reason: `Spend at least Rs. ${c.minOrder.toLocaleString('en-PK')} to use this coupon.` };
    if (ctx.eligibleSubtotal <= 0 && !c.freeShipping)
        return { ok: false, reason: 'This coupon does not apply to the items in your cart.' };
    return { ok: true };
}
export function computeTotals(o) {
    const discount = Math.min(o.discount, o.subtotal);
    const afterDiscount = o.subtotal - discount;
    const freeShip = !!o.freeShippingCoupon || (o.freeShippingThreshold > 0 && afterDiscount >= o.freeShippingThreshold);
    const shipping = freeShip ? 0 : o.shippingFee;
    const tax = Math.round((afterDiscount * o.taxRate) / 100);
    return { subtotal: o.subtotal, discount, shipping, tax, total: afterDiscount + shipping + tax };
}
export function couponApplies(c, line) {
    const hasP = !!(c.productIds && c.productIds.length), hasC = !!(c.categoryIds && c.categoryIds.length);
    if (!hasP && !hasC)
        return true;
    return (hasP && c.productIds.includes(line.productId)) || (hasC && c.categoryIds.includes(line.categoryId));
}
