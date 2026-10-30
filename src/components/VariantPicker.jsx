import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
const COLORS = { black: '#111', white: '#fff', red: '#d32f2f', blue: '#1e63d6', navy: '#1c2a5a', green: '#2e7d32', grey: '#8a8f98', gray: '#8a8f98', silver: '#c0c4cc', gold: '#c9a227', pink: '#e86fa0', brown: '#6d4c41', beige: '#d8c3a5', purple: '#7b3fb5', orange: '#ef7d1a', yellow: '#f2c230' };
export function VariantPicker({ product, selected, onSelect, isAvailable }) {
    if (!product.options.length)
        return null;
    return (<div className="space-y-4">
      {product.options.map((o) => {
            const isColor = /colou?r/i.test(o.name);
            return (<fieldset key={o.name}>
            <legend className="mb-2 text-sm"><span className="font-semibold">{o.name}:</span> <span className="text-muted">{selected[o.name]}</span></legend>
            <div className="flex flex-wrap gap-2">
              {o.values.map((val) => {
                    const active = selected[o.name] === val;
                    const ok = isAvailable(o.name, val);
                    const swatch = isColor ? COLORS[val.toLowerCase()] : undefined;
                    return (<button key={val} type="button" aria-pressed={active} onClick={() => onSelect(o.name, val)} title={ok ? val : `${val} (sold out)`} className={cn('relative inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition', active ? 'border-brand bg-brand/10 text-brand ring-1 ring-brand' : 'border-border hover:border-fg/40', !ok && 'text-muted line-through opacity-60')}>
                    {swatch && <span className="size-4 rounded-full border border-border" style={{ background: swatch }}/>}
                    {val}
                    {active && <Check className="size-3.5"/>}
                  </button>);
                })}
            </div>
          </fieldset>);
        })}
    </div>);
}
