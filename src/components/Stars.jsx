import { Star } from 'lucide-react';
export function Stars({ value, count, size = 'size-4' }) {
    return (<span className="inline-flex items-center gap-1" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`${size} ${i <= Math.round(value) ? 'fill-accent text-accent' : 'text-border'}`}/>)}
      </span>
      {count != null && <span className="text-xs text-muted">({count})</span>}
    </span>);
}
export function StarInput({ value, onChange }) {
    return (<div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (<button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => onChange(i)} className="p-0.5">
          <Star className={`size-7 transition ${i <= value ? 'fill-accent text-accent' : 'text-border hover:text-accent'}`}/>
        </button>))}
    </div>);
}
