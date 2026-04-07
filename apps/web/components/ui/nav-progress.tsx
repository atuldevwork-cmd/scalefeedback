'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function NavProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathRef = useRef(pathname);

  function complete() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
    setProgress(100);
    setFading(false);
    // Wait for width transition to 100%, then fade out
    setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setFading(false);
      }, 300);
    }, 250);
  }

  useEffect(() => {
    if (pathname !== prevPathRef.current) {
      prevPathRef.current = pathname;
      complete();
    }
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

      // Start the bar
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
      setFading(false);
      setVisible(true);
      setProgress(10);

      let p = 10;
      timerRef.current = setInterval(() => {
        p += Math.random() * 10 + 2;
        if (p >= 85) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          p = 85;
        }
        setProgress(p);
      }, 180);

      // Safety fallback: force complete after 8s no matter what
      completeTimerRef.current = setTimeout(() => {
        complete();
      }, 8000);
    }

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
      if (timerRef.current) clearInterval(timerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-0.5"
      style={{
        width: `${progress}%`,
        background: 'linear-gradient(90deg, #ff724f, #ff9a7a)',
        boxShadow: '0 0 8px rgba(255,114,79,0.6)',
        opacity: fading ? 0 : 1,
        transition: fading
          ? 'opacity 0.3s ease-out'
          : 'width 0.2s ease-out',
      }}
    />
  );
}
