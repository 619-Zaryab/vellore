import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconButton, Modal } from './ui';
export function ProductGallery({ images, alt, soldOut }) {
    const [i, setI] = useState(0);
    const [zoom, setZoom] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const [origin, setOrigin] = useState('50% 50%');
    const dir = useRef(1);
    const sig = images.join('|');
    useEffect(() => { setI(0); }, [sig]);
    const go = (n) => { dir.current = n > i ? 1 : -1; setI((n + images.length) % images.length); };
    const current = images[i] ?? images[0];
    if (!images.length)
        return <div className="aspect-square rounded-3xl bg-surface2"/>;
    return (<div className="flex flex-col-reverse gap-3 lg:flex-row">
      {images.length > 1 && (<div className="scrollbar-none flex gap-2 overflow-x-auto lg:max-h-[560px] lg:flex-col lg:overflow-y-auto" role="tablist" aria-label="Product images">
          {images.map((src, n) => (<button key={src + n} role="tab" aria-selected={n === i} aria-label={`Image ${n + 1}`} onClick={() => go(n)} className={cn('size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-surface2 transition sm:size-20', n === i ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100')}>
              <img src={src} alt="" loading="lazy" className="size-full object-cover"/>
            </button>))}
        </div>)}
      <div className="relative flex-1 overflow-hidden rounded-3xl bg-surface2">
        <div className="relative aspect-square cursor-zoom-in touch-pan-y" onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)} onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`); }} onClick={() => setLightbox(true)}>
          <AnimatePresence initial={false} custom={dir.current} mode="popLayout">
            <motion.img key={current} src={current} alt={alt} draggable={false} custom={dir.current} initial={{ opacity: 0, x: dir.current * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir.current * -40 }} transition={{ duration: 0.25 }} drag={images.length > 1 ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={(_, info) => { if (info.offset.x < -60)
        go(i + 1);
    else if (info.offset.x > 60)
        go(i - 1); }} style={{ transformOrigin: origin, scale: zoom ? 1.8 : 1 }} className={cn('absolute inset-0 size-full object-cover transition-[scale] duration-200', soldOut && 'opacity-60')}/>
          </AnimatePresence>
        </div>
        <span className="pointer-events-none absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/90 shadow-sm"><ZoomIn className="size-4"/></span>
        {images.length > 1 && (<>
            <IconButton label="Previous image" onClick={() => go(i - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-surface/90 shadow-sm"><ChevronLeft className="size-5"/></IconButton>
            <IconButton label="Next image" onClick={() => go(i + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface/90 shadow-sm"><ChevronRight className="size-5"/></IconButton>
          </>)}
      </div>
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={alt} size="xl">
        <div className="max-h-[75dvh] overflow-auto rounded-2xl"><img src={current} alt={alt} className="mx-auto w-full max-w-none object-contain sm:max-w-full"/></div>
      </Modal>
    </div>);
}
