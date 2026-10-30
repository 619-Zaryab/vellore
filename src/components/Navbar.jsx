import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, LayoutDashboard, LogOut, Menu, Moon, Package, Search, ShoppingBag, Sun, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { fetchCategories } from '@/lib/catalog';
import { Drawer, IconButton, MenuItem, Popover } from './ui';
import { SearchBox } from './SearchBox';
import { ThemeToggle } from './ThemeToggle';
export function Logo({ className = '', compact = false }) {
    return (<Link to="/" className={`flex items-center gap-2.5 ${className}`} aria-label="Vellore home">
      <img src="/logo-mark.png" alt="" width="44" height="44" className="size-11 rounded-xl" />
      <span className={`font-display text-xl font-bold tracking-tight ${compact ? 'hidden min-[420px]:inline' : ''}`}>Vellore</span>
    </Link>);
}
const Badge = ({ n }) => n > 0 ? <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold leading-5 text-black">{n > 99 ? '99+' : n}</span> : null;
export function Navbar() {
    const { user, profile, isAdmin, logout } = useAuth();
    const cart = useCart();
    const wish = useWishlist();
    const { theme, toggle: toggleTheme } = useTheme();
    const { settings } = useSettings();
    const nav = useNavigate();
    const loc = useLocation();
    const [menu, setMenu] = useState(false);
    const [search, setSearch] = useState(false);
    const [cats, setCats] = useState([]);
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => { fetchCategories().then(setCats).catch(() => { }); }, []);
    useEffect(() => { setMenu(false); setSearch(false); }, [loc.pathname]);
    useEffect(() => {
        const on = () => setScrolled(window.scrollY > 8);
        on();
        window.addEventListener('scroll', on, { passive: true });
        return () => window.removeEventListener('scroll', on);
    }, []);
    const top = cats.filter((c) => c.active && !c.parentId);
    const link = ({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-brand' : 'text-muted hover:text-fg'}`;
    return (<header className={`sticky top-0 z-40 border-b transition ${scrolled ? 'border-border bg-bg/85 backdrop-blur-xl' : 'border-transparent bg-bg'}`}>
      {settings.announcement && <div className="bg-brand px-4 py-2 text-center text-xs font-medium text-brand-fg sm:text-sm">{settings.announcement}</div>}
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-1 px-3 sm:gap-2 sm:px-6">
        <IconButton label="Open menu" className="lg:hidden" onClick={() => setMenu(true)}><Menu className="size-5"/></IconButton>
        <Logo compact />
        <nav className="ml-4 hidden items-center lg:flex" aria-label="Main">
          <NavLink to="/products" end className={link}>Shop</NavLink>
          <Popover align="left" trigger={({ toggle, open }) => <button className={`rounded-lg px-3 py-2 text-sm font-semibold ${open ? 'text-fg' : 'text-muted hover:text-fg'}`} onClick={toggle} aria-expanded={open}>Categories</button>}>
            {(close) => top.length ? top.map((c) => <MenuItem key={c.id} onClick={() => { close(); nav(`/category/${c.id}`); }}>{c.name}</MenuItem>) : <p className="px-3 py-2 text-sm text-muted">No categories yet</p>}
          </Popover>
          <NavLink to="/products?deals=1" className={link}>Deals</NavLink>
        </nav>
        <SearchBox className="mx-4 hidden max-w-md flex-1 md:block"/>
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <IconButton label="Search" className="md:hidden" onClick={() => setSearch((s) => !s)}><Search className="size-5"/></IconButton>
          <div className="hidden sm:block"><ThemeToggle /></div>
          <Link to="/wishlist" aria-label={`Wishlist, ${wish.ids.length} items`} className="relative inline-grid size-10 place-items-center rounded-xl hover:bg-surface2"><Heart className="size-5"/><Badge n={wish.ids.length}/></Link>
          <button aria-label={`Cart, ${cart.count} items`} onClick={() => cart.setOpen(true)} className="relative inline-grid size-10 place-items-center rounded-xl hover:bg-surface2"><ShoppingBag className="size-5"/><Badge n={cart.count}/></button>
          {user ? (<Popover trigger={({ toggle }) => <IconButton label="Account" onClick={toggle}><User className="size-5"/></IconButton>}>
              {(close) => (<>
                  <div className="border-b border-border px-3 pb-2.5 pt-1.5"><p className="truncate text-sm font-semibold">{profile?.displayName || user.displayName || 'Your account'}</p><p className="truncate text-xs text-muted">{user.email}</p></div>
                  <MenuItem onClick={() => { close(); nav('/orders'); }}><Package className="size-4"/>My orders</MenuItem>
                  <MenuItem onClick={() => { close(); nav('/profile'); }}><User className="size-4"/>Profile and addresses</MenuItem>
                  {isAdmin && <MenuItem onClick={() => { close(); nav('/admin'); }}><LayoutDashboard className="size-4"/>Admin dashboard</MenuItem>}
                  <MenuItem onClick={() => { close(); logout(); }} className="text-danger"><LogOut className="size-4"/>Sign out</MenuItem>
                </>)}
            </Popover>) : <Link to="/login" state={{ from: loc.pathname }} className="ml-1 hidden rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-fg hover:opacity-90 sm:block">Sign in</Link>}
        </div>
      </div>
      {search && <div className="px-4 pb-3 md:hidden"><SearchBox autoFocus onDone={() => setSearch(false)}/></div>}
      <Drawer open={menu} onClose={() => setMenu(false)} side="left" title="Menu" width="max-w-xs">
        <nav className="space-y-1 p-3" aria-label="Mobile">
          <button type="button" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'} className="flex w-full items-center justify-between rounded-xl px-3 py-3 font-semibold hover:bg-surface2">
            <span className="flex items-center gap-2.5">{theme === 'dark' ? <Moon className="size-5"/> : <Sun className="size-5"/>}Dark mode</span>
            <span className={`relative h-6 w-11 rounded-full transition ${theme === 'dark' ? 'bg-brand' : 'bg-border'}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${theme === 'dark' ? 'left-[22px]' : 'left-0.5'}`}/></span>
          </button>
          {[['/products', 'All products'], ['/products?deals=1', 'Deals'], ['/wishlist', 'Wishlist'], ['/orders', 'My orders']].map(([to, label]) => <Link key={to} to={to} className="block rounded-xl px-3 py-3 font-semibold hover:bg-surface2">{label}</Link>)}
          {top.length > 0 && <p className="px-3 pb-1 pt-4 text-xs font-semibold text-muted">Categories</p>}
          {top.map((c) => <Link key={c.id} to={`/category/${c.id}`} className="block rounded-xl px-3 py-2.5 hover:bg-surface2">{c.name}</Link>)}
          {!user && <Link to="/login" className="mt-4 block rounded-xl bg-brand px-3 py-3 text-center font-semibold text-brand-fg">Sign in</Link>}
        </nav>
      </Drawer>
    </header>);
}
