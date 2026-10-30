import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '@/components/Navbar';
import { ThemeToggle } from '@/components/ThemeToggle';
export default function AuthLayout() {
    return (<div className="relative grid min-h-dvh place-items-center overflow-hidden p-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <motion.div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-96 rounded-full bg-brand/15 blur-3xl" animate={{ x: [0, 30, 0], y: [0, 20, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}/>
      <motion.div aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-accent/20 blur-3xl" animate={{ x: [0, -30, 0], y: [0, -20, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}/>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-soft sm:p-8"><Outlet /></div>
      </motion.div>
    </div>);
}
