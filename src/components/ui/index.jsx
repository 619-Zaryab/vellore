import { forwardRef, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
const BTN = {
    primary: 'bg-brand text-brand-fg hover:opacity-90 shadow-sm',
    secondary: 'bg-surface2 text-fg hover:bg-border',
    outline: 'border border-border bg-surface hover:bg-surface2',
    ghost: 'hover:bg-surface2',
    danger: 'bg-danger text-white hover:opacity-90',
};
const BTN_SIZE = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-7 text-base' };
export const Button = forwardRef(({ variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...p }, ref) => (<button ref={ref} type={type} disabled={disabled || loading} className={cn('inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50', BTN[variant], BTN_SIZE[size], className)} {...p}>
      {loading && <Loader2 className="size-4 animate-spin"/>}
      {children}
    </button>));
Button.displayName = 'Button';
export const IconButton = forwardRef(({ label, className, children, type = 'button', ...p }, ref) => (<button ref={ref} type={type} aria-label={label} title={label} className={cn('relative inline-grid size-10 place-items-center rounded-xl transition hover:bg-surface2 active:scale-95', className)} {...p}>{children}</button>));
IconButton.displayName = 'IconButton';
/* ---------- Form controls ---------- */
const FIELD = 'w-full rounded-xl border border-border bg-surface px-3.5 text-sm placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:opacity-60';
export function Field({ label, error, hint, children, className }) {
    return (<label className={cn('block space-y-1.5', className)}>
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
      {error ? <span role="alert" className="block text-xs text-danger">{error}</span> : hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>);
}
export const Input = forwardRef(({ label, error, hint, className, ...p }, ref) => (<Field label={label} error={error} hint={hint}><input ref={ref} aria-invalid={!!error} className={cn(FIELD, 'h-11', error && 'border-danger', className)} {...p}/></Field>));
Input.displayName = 'Input';
export const Textarea = forwardRef(({ label, error, className, ...p }, ref) => (<Field label={label} error={error}><textarea ref={ref} aria-invalid={!!error} className={cn(FIELD, 'min-h-24 py-2.5', error && 'border-danger', className)} {...p}/></Field>));
Textarea.displayName = 'Textarea';
export const Select = forwardRef(({ label, error, className, children, ...p }, ref) => (<Field label={label} error={error}><select ref={ref} aria-invalid={!!error} className={cn(FIELD, 'h-11', error && 'border-danger', className)} {...p}>{children}</select></Field>));
Select.displayName = 'Select';
export function Checkbox({ label, className, ...p }) {
    return (<label className={cn('flex cursor-pointer items-center gap-2.5 text-sm', className)}>
      <input type="checkbox" className="size-4 rounded border-border accent-[var(--brand)]" {...p}/>
      <span>{label}</span>
    </label>);
}
/* ---------- Surfaces ---------- */
export const Card = ({ className, children, ...p }) => (<div className={cn('rounded-2xl border border-border bg-surface', className)} {...p}>{children}</div>);
const TONES = {
    neutral: 'bg-surface2 text-muted',
    info: 'bg-brand/10 text-brand',
    success: 'bg-success/12 text-success',
    warning: 'bg-warning/15 text-warning',
    danger: 'bg-danger/12 text-danger',
};
export const Badge = ({ tone = 'neutral', className, children }) => (<span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', TONES[tone], className)}>{children}</span>);
export const Skeleton = ({ className }) => <div className={cn('skeleton', className)} aria-hidden/>;
export const Spinner = ({ className }) => <Loader2 className={cn('size-5 animate-spin text-muted', className)} aria-label="Loading"/>;
export const PageLoader = () => <div className="grid min-h-[50dvh] place-items-center"><Spinner className="size-8"/></div>;
export function EmptyState({ icon, title, description, action }) {
    return (<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto flex max-w-sm flex-col items-center px-4 py-14 text-center">
      {icon && <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: 2, duration: 1.6, ease: 'easeInOut' }} className="mb-4 grid size-16 place-items-center rounded-3xl bg-surface2 text-muted">{icon}</motion.div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>);
}
export const TableWrap = ({ children, className }) => (<div className={cn('overflow-x-auto rounded-2xl border border-border bg-surface', className)}>{children}</div>);
/* ---------- Overlays ---------- */
function useLock(open, onClose) {
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [open, onClose]);
}
const MODAL = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' };
export function Modal({ open, onClose, title, children, footer, size = 'md' }) {
    useLock(open, onClose);
    return createPortal(<AnimatePresence>
      {open && (<motion.div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose}/>
          <motion.div role="dialog" aria-modal="true" aria-label={title} className={cn('relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl', MODAL[size])} initial={{ y: 40, opacity: 0, scale: 0.98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }}>
            {title && (<div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h2 className="text-lg font-semibold">{title}</h2>
                <IconButton label="Close" onClick={onClose}><X className="size-5"/></IconButton>
              </div>)}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border bg-surface px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>)}
    </AnimatePresence>, document.body);
}
export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 'max-w-md' }) {
    useLock(open, onClose);
    const x = side === 'right' ? '100%' : '-100%';
    return createPortal(<AnimatePresence>
      {open && (<motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}/>
          <motion.aside role="dialog" aria-modal="true" aria-label={title} className={cn('absolute inset-y-0 flex w-full flex-col border-border bg-surface shadow-2xl', width, side === 'right' ? 'right-0 border-l' : 'left-0 border-r')} initial={{ x }} animate={{ x: 0 }} exit={{ x }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="text-lg font-semibold">{title}</h2>
              <IconButton label="Close" onClick={onClose}><X className="size-5"/></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && <div className="border-t border-border p-5">{footer}</div>}
          </motion.aside>
        </motion.div>)}
    </AnimatePresence>, document.body);
}
export function Popover({ trigger, children, align = 'right', className }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e) => { if (!ref.current?.contains(e.target))
            setOpen(false); };
        const onKey = (e) => e.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);
    return (<div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      <AnimatePresence>
        {open && (<motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.14 }} className={cn('absolute z-50 mt-2 min-w-56 rounded-2xl border border-border bg-surface p-1.5 shadow-xl', align === 'right' ? 'right-0' : 'left-0', className)}>
            {children(() => setOpen(false))}
          </motion.div>)}
      </AnimatePresence>
    </div>);
}
export const MenuItem = ({ className, children, ...p }) => (<button type="button" className={cn('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-surface2', className)} {...p}>{children}</button>);
export function Tabs({ value, onChange, tabs }) {
    return (<div className="scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-border px-1" role="tablist">
      {tabs.map((t) => (<button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn('relative whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition', value === t.id ? 'text-brand' : 'text-muted hover:text-fg')}>
          {t.label}
          {value === t.id && <motion.span layoutId={`tab-${tabs.map((x) => x.id).join('')}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded bg-brand"/>}
        </button>))}
    </div>);
}
export const PageHeader = ({ title, description, actions }) => (<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>{description && <p className="mt-1 text-sm text-muted">{description}</p>}</div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </div>);
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }) {
    return (<Modal open={open} onClose={onClose} title={title} size="sm" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-sm text-muted">{message}</p>
    </Modal>);
}
