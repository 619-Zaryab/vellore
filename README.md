# Vellore (no Cloud Functions version)

React + Vite + JavaScript (JSX) + Tailwind CSS v4 + Firebase (Auth, Firestore, Storage). **No Cloud Functions and no paid plan needed**: everything runs on the free Spark plan. Orders are handled by the store admin from the dashboard.

> **Status:** written and syntax-checked, not run end to end. Test it locally first.

## How it works (the manual model)

1. **Customer places an order.** It is saved as `Pending`. Stock is NOT taken yet. Payment is Cash on Delivery, or JazzCash/Easypaisa by manual transfer: the customer sends money to your number (shown at checkout) and enters the transaction ID.
2. **You confirm it** in *Admin → Orders*. At this moment the app, in one transaction: checks stock, re-checks prices, deducts stock, writes an inventory log and counts the coupon use. If prices do not match what the customer was shown, it warns you (use *Confirm anyway* only after checking).
3. For transfer orders, check your JazzCash/Easypaisa account, then press **Payment received**.
4. Move the order through Processing, Shipped (add the tracking number) and Delivered. Delivering a COD order marks it paid.
5. **Cancel / refund:** cancelling after confirmation returns the stock and coupon use. For paid orders it moves to *Refund pending*: send the money back yourself, then enter the transaction ID and mark it *Refunded* (can only be recorded once).

Customers watch their order status live. They can cancel their own order only while it is still `Pending`.

## Security (what is and is not protected)

Enforced by `firestore.rules` and `storage.rules`, which you must publish:
- Customers can only create orders for themselves, as `pending`, and cancel them while pending. They cannot change status, payment status, stock or products.
- Only admins write products, categories, coupons, settings, inventory and other people's orders.
- Admin = a document in the `admins` collection (created by hand in the Firebase console).
- Blocked accounts (set from *Admin → Customers*) cannot order or review.

**Honest limits of this free model:**
- A technically skilled customer could send an order with wrong prices because there is no server. That is why you confirm every order and the app re-checks prices when you press Confirm.
- Stock is only reserved when you confirm, so two customers can order the last item; the second confirmation will fail with "Not enough stock" and you cancel it.
- No per-customer order rate limit, no automatic payment verification, no automatic emails.
- Analytics and ratings are calculated in your browser (up to 5,000 orders per report).

Fine for a small store you run by hand. If you later need automatic payments or stronger guarantees, move this logic to Cloud Functions (Blaze plan).

## Setup

1. Firebase console: create a project, add a Web app, enable **Authentication** (Email/Password and Google), **Firestore** and **Storage**.
2. `cp .env.example .env`, fill in the web config. Keep `VITE_USE_EMULATORS=false` for the real project.
3. `npm install` then `npm run dev`.
4. Publish rules and indexes (either `firebase deploy --only firestore:rules,firestore:indexes,storage`, or paste `firestore.rules` and `storage.rules` into the console's *Rules* tabs). Indexes take a few minutes.
5. **First admin:** Authentication → Users → copy your UID. Firestore → create collection `admins` → document ID = your UID, field `admin` (boolean) = `true`. Sign out and in.
6. *Admin → Settings:* set shipping, tax, your **JazzCash / Easypaisa number and account title**, tick the payment methods you accept, and press *Load demo data* if you want sample products.

Hosting is free too: `npm run build` then `firebase deploy --only hosting`. Add your domain to *Authentication → Settings → Authorized domains*.

## Where things are
- `src/lib/api.js`: every order/stock/coupon/review/analytics operation (the logic that used to be Cloud Functions).
- `src/pages/store`, `src/pages/admin`, `src/components`, `src/contexts`: the app.
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`, `firebase.json`.

## Tests
`npm test` runs unit tests for coupon, total and price logic.
