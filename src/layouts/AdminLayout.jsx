import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { motion } from 'motion/react';
import { BarChart3, Bell, Boxes, ExternalLink, FolderTree, Layers, LayoutDashboard, LogOut, Menu, MessageSquare, Package, Search, Settings, ShoppingCart, Star, Tag, Users } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { Drawer, IconButton, MenuItem, PageLoader, Popover } from '@/components/ui';
import { Logo } from '@/components/Navbar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Seo } from '@/components/Seo';
const NAV = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/variants', label: 'Variants', icon: Layers },
    { to: '/admin/categories', label: 'Categories', icon: FolderTree },
    { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    { to: '/admin/coupons', label: 'Coupons and promotions', icon: Tag },
    { to: '/admin/reviews', label: 'Reviews', icon: Star },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
];
function SideNav({ onNavigate }) {
    return (<nav className="space-y-0.5 p-3" aria-label="Admin">
      {NAV.map(({ to, label, icon: Icon, end }) => (<NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${isActive ? 'text-brand' : 'text-muted hover:bg-surface2 hover:text-fg'}`}>
          {({ isActive }) => (<>{isActive && <motion.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-brand/10"/>}<Icon className="relative size-[18px]"/><span className="relative">{label}</span></>)}
        </NavLink>))}
    </nav>);
}
function Notifications() {
    const nav = useNavigate();
    const [orders, setOrders] = useState([]);
    const [msgs, setMsgs] = useState([]);
    const [seen, setSeen] = useState(() => Number(localStorage.getItem('vellore-admin-seen') || 0));
    useEffect(() => {
        const u1 = onSnapshot(query(collection(db, 'orders'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(8)), (s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => { });
        const u2 = onSnapshot(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc'), limit(5)), (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => { });
        return () => { u1(); u2(); };
    }, []);
    const notes = [
        ...orders.map((o) => ({ key: 'o' + o.id, kind: 'order', title: `New order ${o.orderNumber}`, body: `${o.customerName} - Rs. ${Math.round(o.total).toLocaleString('en-PK')}`, at: o.createdAt, link: `/admin/orders?q=${o.orderNumber}`, unread: (o.createdAt?.toMillis?.() ?? 0) > seen })),
        ...msgs.map((m) => ({ key: 'm' + m.id, kind: 'message', title: `Message from ${m.name}`, body: m.subject, at: m.createdAt, unread: !m.read, coll: 'contactMessages', id: m.id })),
    ].sort((x, y) => (y.at?.toMillis?.() ?? 0) - (x.at?.toMillis?.() ?? 0)).slice(0, 12);
    const unread = notes.filter((n) => n.unread).length;
    return (<Popover trigger={({ toggle }) => <IconButton label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => { toggle(); const t = Date.now(); localStorage.setItem('vellore-admin-seen', String(t)); setTimeout(() => setSeen(t), 1500); }}><Bell className="size-5"/>{unread > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-danger"/>}</IconButton>} className="w-80 max-w-[85vw]">
      {(close) => (<div className="max-h-96 overflow-y-auto">
          <p className="px-3 py-2 text-sm font-bold">Waiting for you</p>
          {!notes.length && <p className="px-3 py-6 text-center text-sm text-muted">No pending orders or messages.</p>}
          {notes.map((n) => (<MenuItem key={n.key} className="items-start" onClick={() => { if (n.coll) updateDoc(doc(db, n.coll, n.id), { read: true }).catch(() => { }); close(); if (n.link) nav(n.link); }}>
              {n.kind === 'message' ? <MessageSquare className="mt-0.5 size-4 shrink-0 text-brand"/> : <ShoppingCart className="mt-0.5 size-4 shrink-0 text-success"/>}
              <span className="min-w-0 flex-1"><span className={`block truncate ${n.unread ? 'font-semibold' : ''}`}>{n.title}</span>{n.body && <span className="block truncate text-xs text-muted">{n.body}</span>}<span className="text-[11px] text-muted">{n.at ? formatDate(n.at, true) : ''}</span></span>
            </MenuItem>))}
        </div>)}
    </Popover>);
}
export default function AdminLayout() {
    const { user, logout } = useAuth();
    const [menu, setMenu] = useState(false);
    const [term, setTerm] = useState('');
    const nav = useNavigate();
    const { pathname } = useLocation();
    useEffect(() => setMenu(false), [pathname]);
    const search = (e) => {
        e.preventDefault();
        const t = term.trim();
        if (!t)
            return;
        nav(/^vel-/i.test(t) ? `/admin/orders?q=${encodeURIComponent(t.toUpperCase())}` : `/admin/products?q=${encodeURIComponent(t)}`);
    };
    return (<div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <Seo title="Admin" noindex/>
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center border-b border-border px-5"><Logo /></div>
        <SideNav />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-bg/85 px-3 backdrop-blur-xl sm:px-6">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setMenu(true)}><Menu className="size-5"/></IconButton>
          <form onSubmit={search} role="search" className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/>
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search products or order number (VEL-...)" aria-label="Admin search" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand focus:outline-none"/>
          </form>
          <div className="ml-auto flex items-center gap-0.5">
            <ThemeToggle />
            <Notifications />
            <Popover trigger={({ toggle }) => <button onClick={toggle} aria-label="Account menu" className="ml-1 grid size-9 place-items-center rounded-full bg-brand text-sm font-bold text-brand-fg">{(user?.displayName || user?.email || 'A')[0].toUpperCase()}</button>}>
              {(close) => (<>
                  <div className="border-b border-border px-3 pb-2 pt-1"><p className="truncate text-sm font-semibold">{user?.displayName || 'Admin'}</p><p className="truncate text-xs text-muted">{user?.email}</p></div>
                  <Link to="/" onClick={close}><MenuItem><ExternalLink className="size-4"/>View storefront</MenuItem></Link>
                  <MenuItem className="text-danger" onClick={() => { close(); logout().then(() => nav('/')); }}><LogOut className="size-4"/>Sign out</MenuItem>
                </>)}
            </Popover>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <Suspense fallback={<PageLoader />}><motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><Outlet /></motion.div></Suspense>
        </main>
      </div>
      <Drawer open={menu} onClose={() => setMenu(false)} side="left" title="Vellore admin" width="max-w-xs"><SideNav onNavigate={() => setMenu(false)}/></Drawer>
    </div>);
}
