/**
 * Короткий delight при «Готово»
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

let triggerCelebrate: (() => void) | null = null;

export function celebrateDone(): void {
  triggerCelebrate?.();
}

export function CelebrateHost() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    triggerCelebrate = () => {
      setShow(true);
      window.setTimeout(() => setShow(false), 1400);
    };
    return () => {
      triggerCelebrate = null;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <div
          className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
          aria-hidden
        >
          {Array.from({ length: 18 }).map((_, i) => (
            <motion.span
              key={i}
              className={cn(
                'absolute top-[40%] left-1/2 h-2.5 w-2.5 rounded-full',
                i % 3 === 0
                  ? 'bg-accent-500'
                  : i % 3 === 1
                    ? 'bg-emerald-400'
                    : 'bg-amber-400'
              )}
              initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              animate={{
                opacity: 0,
                x: (i % 2 === 0 ? 1 : -1) * (40 + ((i * 17) % 120)),
                y: -80 - ((i * 13) % 100),
                scale: 0.4,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />
          ))}
          <motion.div
            className="absolute left-1/2 top-[38%] -translate-x-1/2 rounded-2xl bg-emerald-500 text-white text-sm font-bold px-4 py-2 shadow-xl"
            initial={{ opacity: 0, scale: 0.8, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          >
            Готово ✨
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
