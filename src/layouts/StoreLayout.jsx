import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { BackToTop } from '@/components/BackToTop';
import { PageLoader } from '@/components/ui';
export default function StoreLayout() {
    const { pathname } = useLocation();
    return (<div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-fg">Skip to content</a>
      <Navbar />
      <main id="main" className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><Outlet /></motion.div>
        </Suspense>
      </main>
      <Footer />
      <CartDrawer />
      <BackToTop />
    </div>);
}
