import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Search, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { errMsg, formatDate, formatPrice } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Button, ConfirmDialog, EmptyState, Modal, PageHeader, Skeleton, TableWrap } from '@/components/ui';
import { OrderStatusBadge } from '@/components/StatusBadge';
export default function Customers() {
    const toast = useToast();
    const { user } = useAuth();
    const [q, setQ] = useState('');
    const [term, setTerm] = useState('');
    const [sel, setSel] = useState(null);
    const [orders, setOrders] = useState(null);
    const [action, setAction] = useState(null);
    const [busy, setBusy] = useState(false);
    const list = useLiveQuery((n) => term
        ? query(collection(db, 'users'), where('email', '==', term.toLowerCase()), limit(5))
        : query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(n)), [term], 25);
    useEffect(() => {
        setOrders(null);
        if (!sel)
            return;
        getDocs(query(collection(db, 'orders'), where('userId', '==', sel.uid), orderBy('createdAt', 'desc'), limit(10))).then((s) => setOrders(s.docs.map((d) => ({ id: d.id, ...d.data() })))).catch(() => setOrders([]));
    }, [sel?.uid]); // eslint-disable-line
    const rows = list.data ?? [];
    const spent = orders?.filter((o) => o.paymentStatus === 'paid').reduce((s, o) => s + o.total, 0) ?? 0;
    const run = async () => {
        if (!sel || !action)
            return;
        setBusy(true);
        try {
            if (action.kind === 'disable')
                await api.setUserDisabled({ uid: sel.uid, disabled: action.value });
            else
                await api.setAdminRole({ uid: sel.uid, admin: action.value });
            toast.success('Account updated');
            setAction(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    return (<>
      <PageHeader title="Customers" description="Registered accounts. Personal data is visible to admins only."/>
      <form className="relative mb-4 max-w-sm" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"/>
        <input value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value)
        setTerm(''); }} placeholder="Find by exact email, press Enter" aria-label="Search customers" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm"/>
      </form>
      {list.loading ? <Skeleton className="h-64"/> : !rows.length ? <EmptyState title="No customers found"/> : (<>
          <TableWrap><table className="tbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>
            {rows.map((u) => <tr key={u.id} className="cursor-pointer" onClick={() => setSel(u)}><td className="font-semibold">{u.displayName || '-'}</td><td>{u.email}</td><td className="text-muted">{u.phone || '-'}</td><td className="text-muted">{formatDate(u.createdAt)}</td></tr>)}
          </tbody></table></TableWrap>
          {list.hasMore && !term && <div className="mt-4 text-center"><Button variant="outline" onClick={list.loadMore}>Load more</Button></div>}
        </>)}
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.displayName || sel?.email} size="lg">
        {sel && (<div className="space-y-5 text-sm">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border p-3"><p className="text-muted">Email</p><p className="break-all font-semibold">{sel.email}</p></div>
              <div className="rounded-2xl border border-border p-3"><p className="text-muted">Phone</p><p className="font-semibold">{sel.phone || '-'}</p></div>
              <div className="rounded-2xl border border-border p-3"><p className="text-muted">Paid orders (last 10)</p><p className="font-semibold">{formatPrice(spent)}</p></div>
            </div>
            <div><h3 className="mb-2 font-bold">Saved addresses</h3>{sel.addresses?.length ? sel.addresses.map((a) => <p key={a.id} className="text-muted">{a.label}: {a.line1}, {a.city}, {a.province}</p>) : <p className="text-muted">None</p>}</div>
            <div><h3 className="mb-2 font-bold">Recent orders</h3>
              {orders === null ? <Skeleton className="h-16"/> : !orders.length ? <p className="text-muted">No orders yet.</p> : <ul className="divide-y divide-border">{orders.map((o) => <li key={o.id} className="flex items-center justify-between py-2"><span><b>{o.orderNumber}</b> <span className="text-muted">{formatDate(o.createdAt)}</span></span><span className="flex items-center gap-3"><OrderStatusBadge status={o.status}/><b>{formatPrice(o.total)}</b></span></li>)}</ul>}
            </div>
            {sel.uid !== user?.uid && (<div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <Button variant="danger" onClick={() => setAction({ kind: 'disable', value: true })}>Block account</Button>
                <Button variant="outline" onClick={() => setAction({ kind: 'disable', value: false })}>Unblock account</Button>
                <Button variant="outline" onClick={() => setAction({ kind: 'admin', value: true })}><ShieldCheck className="size-4"/>Make admin</Button>
                <Button variant="outline" onClick={() => setAction({ kind: 'admin', value: false })}>Remove admin</Button>
              </div>)}
          </div>)}
      </Modal>
      <ConfirmDialog open={!!action} danger={action?.kind === 'disable' && action.value} loading={busy} title="Confirm account change" confirmLabel="Confirm" onClose={() => setAction(null)} onConfirm={run} message={action?.kind === 'admin' ? (action.value ? 'This person gets full access to the admin dashboard.' : 'Admin access will be removed. (An admin created with the custom claim has to be removed with the script.)') : action?.value ? 'They will not be able to place orders or write reviews.' : 'They can place orders again.'}/>
    </>);
}
