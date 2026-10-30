import { useState } from 'react';
import { collection, deleteDoc, doc, getCountFromServer, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { deleteImageByUrl } from '@/lib/storage';
import { errMsg, slugify } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useLiveQuery } from '@/hooks/useLiveQuery';
import { Badge, Button, Checkbox, ConfirmDialog, EmptyState, Input, Modal, PageHeader, Select, Skeleton } from '@/components/ui';
import { ImageUploader } from '@/components/ImageUploader';
export default function Categories() {
    const toast = useToast();
    const list = useLiveQuery((n) => query(collection(db, 'categories'), orderBy('order', 'asc')), [], 500);
    const [edit, setEdit] = useState(null);
    const [del, setDel] = useState(null);
    const [busy, setBusy] = useState(false);
    const all = list.data ?? [];
    const top = all.filter((c) => !c.parentId);
    const save = async () => {
        if (!edit?.name?.trim())
            return toast.error('Enter a category name.');
        setBusy(true);
        try {
            const id = edit.id ?? doc(collection(db, 'categories')).id;
            const data = { name: edit.name.trim(), slug: slugify(edit.name), parentId: edit.parentId || null, image: edit.image ?? '', order: Number(edit.order ?? all.length), active: edit.active ?? true };
            if (edit.id)
                await updateDoc(doc(db, 'categories', id), { ...data, updatedAt: serverTimestamp() });
            else
                await setDoc(doc(db, 'categories', id), { ...data, createdAt: serverTimestamp() });
            toast.success('Category saved');
            setEdit(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    const remove = async () => {
        if (!del)
            return;
        setBusy(true);
        try {
            const used = await getCountFromServer(query(collection(db, 'products'), where('categoryPath', 'array-contains', del.id)));
            if (used.data().count > 0)
                throw new Error(`${used.data().count} product(s) use this category. Move them first.`);
            if (all.some((c) => c.parentId === del.id))
                throw new Error('Delete or move its subcategories first.');
            await deleteDoc(doc(db, 'categories', del.id));
            if (del.image)
                await deleteImageByUrl(del.image);
            toast.success('Category deleted');
            setDel(null);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(false);
        }
    };
    const Row = ({ c, sub }) => (<li className={`flex items-center gap-3 px-4 py-3 ${sub ? 'pl-10' : ''}`}>
      {c.image ? <img src={c.image} alt="" className="size-10 rounded-lg object-cover"/> : <span className="size-10 rounded-lg bg-surface2"/>}
      <div className="min-w-0 flex-1"><p className="truncate font-semibold">{c.name}</p><p className="text-xs text-muted">Order {c.order}</p></div>
      {!c.active && <Badge>Hidden</Badge>}
      <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => setEdit(c)}><Edit3 className="size-4"/></Button>
      <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setDel(c)}><Trash2 className="size-4"/></Button>
    </li>);
    return (<>
      <PageHeader title="Categories" description="Organise the catalog. Subcategories appear under their parent in the store." actions={<Button onClick={() => setEdit({ active: true, order: all.length })}><Plus className="size-4"/>New category</Button>}/>
      {list.loading ? <Skeleton className="h-48"/> : !all.length ? <EmptyState title="No categories yet" description="Add a category before creating products." action={<Button onClick={() => setEdit({ active: true, order: 0 })}>Add category</Button>}/> : (<ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {top.map((c) => <div key={c.id}><Row c={c}/>{all.filter((s) => s.parentId === c.id).map((s) => <Row key={s.id} c={s} sub/>)}</div>)}
        </ul>)}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit category' : 'New category'} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button loading={busy} onClick={save}>Save</Button></>}>
        {edit && (<div className="space-y-4">
            <Input label="Name" value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })}/>
            <Select label="Parent category" value={edit.parentId ?? ''} onChange={(e) => setEdit({ ...edit, parentId: e.target.value })}><option value="">None (top level)</option>{top.filter((c) => c.id !== edit.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
            <Input label="Display order" type="number" value={edit.order ?? 0} onChange={(e) => setEdit({ ...edit, order: Number(e.target.value) })}/>
            <Checkbox label="Visible in the store" checked={edit.active ?? true} onChange={(e) => setEdit({ ...edit, active: e.target.checked })}/>
            <div><p className="mb-2 text-sm font-medium">Image (optional)</p><ImageUploader folder="categories" images={edit.image ? [edit.image] : []} max={1} onChange={(u) => setEdit({ ...edit, image: u[0] ?? '' })}/></div>
          </div>)}
      </Modal>
      <ConfirmDialog open={!!del} danger loading={busy} title={`Delete ${del?.name}?`} message="You can only delete a category that has no products or subcategories." confirmLabel="Delete" onClose={() => setDel(null)} onConfirm={remove}/>
    </>);
}
