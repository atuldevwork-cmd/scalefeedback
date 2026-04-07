'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      // Page changed — complete the bar
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      prevPathRef.current = pathname;
    }
  }, [pathname]);

  // Expose start function for manual triggering (link clicks)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

      setVisible(true);
      setProgress(10);
      let p = 10;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        p += Math.random() * 12;
        if (p >= 85) {
          clearInterval(timerRef.current!);
          p = 85;
        }
        setProgress(p);
      }, 200);
    }

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5 transition-all duration-200 ease-out"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #ff724f, #ff9a7a)',
        opacity: progress === 100 ? 0 : 1,
        boxShadow: '0 0 8px rgba(255,114,79,0.6)',
      }}
    />
  );
}
