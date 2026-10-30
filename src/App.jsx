import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import AuthLayout from './layouts/AuthLayout';
import { RequireAdmin, RequireAuth } from './layouts/Guards';
import { PageLoader } from './components/ui';
const L = (f) => lazy(f);
const Home = L(() => import('./pages/store/Home'));
const Products = L(() => import('./pages/store/Products'));
const ProductDetail = L(() => import('./pages/store/ProductDetail'));
const Cart = L(() => import('./pages/store/Cart'));
const Wishlist = L(() => import('./pages/store/Wishlist'));
const Checkout = L(() => import('./pages/store/Checkout'));
const OrderConfirmation = L(() => import('./pages/store/OrderConfirmation'));
const Orders = L(() => import('./pages/store/Orders'));
const OrderDetail = L(() => import('./pages/store/OrderDetail'));
const Profile = L(() => import('./pages/store/Profile'));
const NotFound = L(() => import('./pages/store/NotFound'));
const Static = {
    About: L(() => import('./pages/store/Pages').then((m) => ({ default: m.About }))),
    Contact: L(() => import('./pages/store/Pages').then((m) => ({ default: m.Contact }))),
    Faqs: L(() => import('./pages/store/Pages').then((m) => ({ default: m.Faqs }))),
    Shipping: L(() => import('./pages/store/Pages').then((m) => ({ default: m.ShippingReturns }))),
    Privacy: L(() => import('./pages/store/Pages').then((m) => ({ default: m.Privacy }))),
    Terms: L(() => import('./pages/store/Pages').then((m) => ({ default: m.Terms }))),
};
const Login = L(() => import('./pages/auth/Login'));
const Register = L(() => import('./pages/auth/Register'));
const Forgot = L(() => import('./pages/auth/Forgot'));
const AdminLayout = L(() => import('./layouts/AdminLayout'));
const A = {
    Dashboard: L(() => import('./pages/admin/Dashboard')),
    Products: L(() => import('./pages/admin/Products')),
    Variants: L(() => import('./pages/admin/Variants')),
    Categories: L(() => import('./pages/admin/Categories')),
    Inventory: L(() => import('./pages/admin/Inventory')),
    Orders: L(() => import('./pages/admin/Orders')),
    Customers: L(() => import('./pages/admin/Customers')),
    Coupons: L(() => import('./pages/admin/Coupons')),
    Reviews: L(() => import('./pages/admin/Reviews')),
    Analytics: L(() => import('./pages/admin/Analytics')),
    Settings: L(() => import('./pages/admin/Settings')),
};
export default function App() {
    return (<Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />}/>
          <Route path="products" element={<Products />}/>
          <Route path="search" element={<Products />}/>
          <Route path="category/:categoryId" element={<Products />}/>
          <Route path="product/:id" element={<ProductDetail />}/>
          <Route path="cart" element={<Cart />}/>
          <Route path="wishlist" element={<Wishlist />}/>
          <Route path="about" element={<Static.About />}/>
          <Route path="contact" element={<Static.Contact />}/>
          <Route path="faqs" element={<Static.Faqs />}/>
          <Route path="shipping-returns" element={<Static.Shipping />}/>
          <Route path="privacy" element={<Static.Privacy />}/>
          <Route path="terms" element={<Static.Terms />}/>
          <Route element={<RequireAuth />}>
            <Route path="checkout" element={<Checkout />}/>
            <Route path="order/:id/confirmation" element={<OrderConfirmation />}/>
            <Route path="orders" element={<Orders />}/>
            <Route path="orders/:id" element={<OrderDetail />}/>
            <Route path="profile" element={<Profile />}/>
          </Route>
          <Route path="*" element={<NotFound />}/>
        </Route>

        <Route element={<AuthLayout />}>
          <Route path="login" element={<Login />}/>
          <Route path="register" element={<Register />}/>
          <Route path="forgot-password" element={<Forgot />}/>
        </Route>

        <Route path="admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<A.Dashboard />}/>
          <Route path="products" element={<A.Products />}/>
          <Route path="variants" element={<A.Variants />}/>
          <Route path="categories" element={<A.Categories />}/>
          <Route path="inventory" element={<A.Inventory />}/>
          <Route path="orders" element={<A.Orders />}/>
          <Route path="customers" element={<A.Customers />}/>
          <Route path="coupons" element={<A.Coupons />}/>
          <Route path="reviews" element={<A.Reviews />}/>
          <Route path="analytics" element={<A.Analytics />}/>
          <Route path="settings" element={<A.Settings />}/>
        </Route>
      </Routes>
    </Suspense>);
}
