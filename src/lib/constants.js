export const STATUS_LABEL = {
    payment_pending: 'Payment pending',
    pending: 'Pending',
    confirmed: 'Confirmed',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    payment_failed: 'Payment failed',
    refund_pending: 'Refund pending',
    refunded: 'Refunded',
};
export const STATUS_TONE = {
    payment_pending: 'warning', pending: 'warning', confirmed: 'info', processing: 'info', shipped: 'info',
    delivered: 'success', cancelled: 'danger', payment_failed: 'danger', refund_pending: 'warning', refunded: 'neutral',
};
export const PAYMENT_STATUS_LABEL = {
    unpaid: 'Unpaid', pending: 'Awaiting payment', paid: 'Paid', failed: 'Failed', refund_pending: 'Refund pending', refunded: 'Refunded',
};
export const PAYMENT_STATUS_TONE = {
    unpaid: 'neutral', pending: 'warning', paid: 'success', failed: 'danger', refund_pending: 'warning', refunded: 'neutral',
};
export const PAYMENT_METHOD_LABEL = { cod: 'Cash on delivery', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' };
export const ORDER_FLOW = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
// Mirrors the rules in src/lib/api.js (transition). Only drives which buttons are shown.
export const ADMIN_TRANSITIONS = {
    payment_pending: ['cancelled'],
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: ['refund_pending'],
    cancelled: [], payment_failed: [], refund_pending: ['refunded'], refunded: [],
};
export const CUSTOMER_CANCELLABLE = ['pending'];
export const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Azad Jammu & Kashmir', 'Gilgit-Baltistan'];
export const DEFAULT_SETTINGS = {
    storeName: 'Vellore',
    tagline: 'Considered goods for everyday life',
    supportEmail: 'support@vellore.example',
    phone: '+92 300 0000000',
    address: 'Rawalpindi, Pakistan',
    // announcement: 'Free delivery on orders over Rs. 5,000',
    heroTitle: 'Good things, chosen with care.',
    heroSubtitle: 'Electronics, clothing, accessories and home essentials, delivered across Pakistan.',
    taxRate: 0,
    freeShippingThreshold: 5000,
    deliveryMethods: [
        { id: 'standard', label: 'Standard delivery', fee: 250, eta: '3 to 5 days' },
        { id: 'express', label: 'Express delivery', fee: 500, eta: '1 to 2 days' },
    ],
    paymentMethods: { cod: true, jazzcash: false, easypaisa: false },
    requireVerifiedEmail: true,
    lowStockDefault: 5,
    paymentAccounts: { jazzcash: { title: '', number: '' }, easypaisa: { title: '', number: '' } },
};
export function mergeSettings(s) {
    return {
        ...DEFAULT_SETTINGS,
        ...(s ?? {}),
        paymentMethods: { ...DEFAULT_SETTINGS.paymentMethods, ...(s?.paymentMethods ?? {}) },
    paymentAccounts: { ...DEFAULT_SETTINGS.paymentAccounts, ...(s?.paymentAccounts ?? {}) },
        deliveryMethods: s?.deliveryMethods?.length ? s.deliveryMethods : DEFAULT_SETTINGS.deliveryMethods,
    };
}
