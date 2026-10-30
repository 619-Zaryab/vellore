import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTheme } from '@/contexts/ThemeContext';
import { IconButton } from './ui';
export function ThemeToggle() {
    const { theme, toggle } = useTheme();
    return (<IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -60, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 60, opacity: 0, scale: 0.6 }} transition={{ duration: 0.18 }}>
          {theme === 'dark' ? <Sun className="size-5"/> : <Moon className="size-5"/>}
        </motion.span>
      </AnimatePresence>
    </IconButton>);
}
