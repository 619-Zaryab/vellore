import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
export default function NotFound() {
    return (<div className="grid min-h-[60dvh] place-items-center px-4 text-center">
      <Seo title="Page not found" noindex/>
      <div>
        <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="font-display text-8xl font-bold text-brand">404</motion.p>
        <h1 className="mt-2 text-2xl font-bold">We could not find that page</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">The link may be broken or the page may have moved.</p>
        <Link to="/"><Button className="mt-6">Go to the homepage</Button></Link>
      </div>
    </div>);
}
