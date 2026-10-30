import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { uploadImage, validateImage } from '@/lib/storage';
import { useToast } from '@/contexts/ToastContext';
import { errMsg } from '@/lib/utils';
import { Button } from './ui';
export function ImageUploader({ folder, images, onChange, max = 10 }) {
    const [busy, setBusy] = useState(0);
    const input = useRef(null);
    const replaceIdx = useRef(null);
    const toast = useToast();
    const handle = async (files) => {
        if (!files?.length)
            return;
        const list = [...files].slice(0, replaceIdx.current != null ? 1 : max - images.length);
        const bad = list.map(validateImage).filter(Boolean);
        if (bad.length) {
            toast.error(bad[0]);
            return;
        }
        setBusy(list.length);
        try {
            const urls = await Promise.all(list.map((f) => uploadImage(folder, f)));
            if (replaceIdx.current != null)
                onChange(images.map((u, i) => (i === replaceIdx.current ? urls[0] : u)));
            else
                onChange([...images, ...urls]);
        }
        catch (e) {
            toast.error(errMsg(e));
        }
        finally {
            setBusy(0);
            replaceIdx.current = null;
            if (input.current)
                input.current.value = '';
        }
    };
    const move = (i, d) => { const n = [...images]; const j = i + d; if (j < 0 || j >= n.length)
        return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
    return (<div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {images.map((u, i) => (<li key={u} className="group relative overflow-hidden rounded-xl border border-border bg-surface2">
            <img src={u} alt={`Product image ${i + 1}`} className="aspect-square w-full object-cover"/>
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-bold text-brand-fg">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white">
              <button type="button" aria-label="Move left" className="p-1 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)}><ArrowLeft className="size-4"/></button>
              <button type="button" aria-label="Replace image" className="p-1" onClick={() => { replaceIdx.current = i; input.current?.click(); }}><RefreshCw className="size-4"/></button>
              <button type="button" aria-label="Remove image" className="p-1 hover:text-red-300" onClick={() => onChange(images.filter((_, n) => n !== i))}><Trash2 className="size-4"/></button>
              <button type="button" aria-label="Move right" className="p-1 disabled:opacity-30" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowRight className="size-4"/></button>
            </div>
          </li>))}
        {busy > 0 && Array.from({ length: busy }).map((_, i) => <li key={i} className="grid aspect-square place-items-center rounded-xl border border-dashed border-border"><Loader2 className="size-5 animate-spin text-muted"/></li>)}
      </ul>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={replaceIdx.current == null} hidden onChange={(e) => handle(e.target.files)}/>
      <Button variant="outline" size="sm" disabled={busy > 0 || images.length >= max} onClick={() => { replaceIdx.current = null; input.current?.click(); }}><ImagePlus className="size-4"/>Add images</Button>
      <p className="text-xs text-muted">JPG, PNG, WebP or AVIF, up to 5 MB each. The first image is the main one.</p>
    </div>);
}
