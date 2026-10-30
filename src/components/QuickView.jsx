import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice, priceInfo, variantStock } from '@/lib/utils';
import { useVariantSelection } from '@/hooks/useVariantSelection';
import { useCart } from '@/contexts/CartContext';
import { Button, Modal } from './ui';
import { ProductGallery } from './ProductGallery';
import { VariantPicker } from './VariantPicker';
import { QtyStepper } from './QtyStepper';
import { StockStatus } from './StockBadge';
import { WishlistHeart } from './ProductCard';
export function QuickView({ product, onClose }) {
    return (<Modal open={!!product} onClose={onClose} title={product?.name} size="xl">
      {product && <Inner key={product.id} product={product} onClose={onClose}/>}
    </Modal>);
}
function Inner({ product, onClose }) {
    const { variant, sel, select, isOptionAvailable } = useVariantSelection(product);
    const cart = useCart();
    const nav = useNavigate();
    const [qty, setQty] = useState(1);
    const stock = variantStock(variant);
    const pi = priceInfo(product, variant);
    const images = variant?.images?.length ? variant.images : product.images;
    return (<div className="grid gap-6 md:grid-cols-2">
      <ProductGallery images={images} alt={product.name} soldOut={stock <= 0}/>
      <div className="space-y-4">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold">{formatPrice(pi.final)}</span>
          {pi.onSale && <span className="text-muted line-through">{formatPrice(pi.price)}</span>}
        </div>
        <p className="line-clamp-4 text-sm text-muted">{product.description}</p>
        <VariantPicker product={product} selected={sel} onSelect={select} isAvailable={isOptionAvailable}/>
        <StockStatus variant={variant} threshold={product.lowStockThreshold}/>
        <div className="flex flex-wrap items-center gap-3">
          <QtyStepper value={Math.min(qty, Math.max(stock, 1))} onChange={setQty} max={Math.min(stock, 20)} disabled={stock <= 0}/>
          <Button className="flex-1" disabled={!variant || stock <= 0} onClick={() => { if (variant && cart.add(product, variant.id, qty))
        onClose(); }}>{stock <= 0 ? 'Sold out' : 'Add to cart'}</Button>
          <WishlistHeart id={product.id} className="border border-border"/>
        </div>
        <Button variant="outline" className="w-full" onClick={() => { onClose(); nav(`/product/${product.id}`); }}>View full details</Button>
        <Link to={`/product/${product.id}`} className="sr-only" onClick={onClose}>Product page</Link>
      </div>
    </div>);
}
