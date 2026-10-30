import { useState } from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { api } from '@/lib/api';
import { errMsg, formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { Stars } from '@/components/Stars';
export default function Reviews() {
    const toast = useToast();
    const list = useLiveQuery((n) => query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(n)), [], 20);
    const [del, setDel] = useState(null);
    const act = async (id, action) => { try {
        await api.moderateReview({ reviewId: id, action });
        toast.success('Review updated');
        setDel(null);
    }
    catch (e) {
        toast.error(errMsg(e));
    } };
    return (<>
      <PageHeader title="Reviews" description="Customers with a delivered order can review. Hide a review to remove it from the store and from the product's rating." actions={<Button variant="outline" onClick={async () => { try { const r = await api.recalcAllRatings(); toast.success(`Ratings updated on ${r.updated} products`); } catch (e) { toast.error(errMsg(e)); } }}>Update product ratings</Button>}/>
      {list.loading ? <Skeleton className="h-48"/> : !list.data?.length ? <EmptyState title="No reviews yet" description="Reviews appear here after customers receive their orders."/> : (<ul className="space-y-3">
          {list.data.map((r) => (<li key={r.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-3"><Stars value={r.rating}/>{r.hidden && <Badge>Hidden</Badge>}</div><span className="text-xs text-muted">{formatDate(r.createdAt, true)}</span></div>
              <p className="mt-2 text-sm text-muted">{r.userName} on <b className="text-fg">{r.productName}</b></p>
              {r.title && <p className="mt-1 font-semibold">{r.title}</p>}<p className="mt-1 text-sm">{r.comment}</p>
              <div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => act(r.id, r.hidden ? 'show' : 'hide')}>{r.hidden ? <><Eye className="size-4"/>Show</> : <><EyeOff className="size-4"/>Hide</>}</Button><Button size="sm" variant="ghost" onClick={() => setDel(r)}><Trash2 className="size-4"/>Delete</Button></div>
            </li>))}
        </ul>)}
      {list.hasMore && <div className="mt-4 text-center"><Button variant="outline" onClick={list.loadMore}>Load more</Button></div>}
      <ConfirmDialog open={!!del} danger title="Delete this review?" message="This cannot be undone." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={() => del && act(del.id, 'delete')}/>
    </>);
}
