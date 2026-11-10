'use client';

import { useEffect, useRef } from 'react';

interface LiquidTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

const RESET_TRANSFORM =
  'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';

export function LiquidTiltCard({
  children,
  className = '',
  maxTilt = 5,
}: LiquidTiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    pointerRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) {
      return;
    }

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = cardRef.current;
      const glowEl = glowRef.current;
      const pointer = pointerRef.current;
      if (!el || !pointer) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const px = (pointer.x - rect.left) / rect.width;
      const py = (pointer.y - rect.top) / rect.height;

      const rotateY = (px - 0.5) * (maxTilt * 2);
      const rotateX = (0.5 - py) * (maxTilt * 2);

      el.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -4px, 0)`;
      if (glowEl) {
        glowEl.style.opacity = '1';
        glowEl.style.background = `radial-gradient(380px circle at ${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%, rgba(243, 231, 211, 0.14), rgba(224, 140, 156, 0.06) 45%, transparent 72%)`;
      }
    });
  }

  function handleMouseLeave() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (cardRef.current) {
      cardRef.current.style.transform = RESET_TRANSFORM;
    }
    if (glowRef.current) {
      glowRef.current.style.opacity = '0';
    }
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: RESET_TRANSFORM,
        transformStyle: 'preserve-3d',
      }}
      className={`relative will-change-transform transition-transform duration-300 ease-liquid ${className}`}
    >
      {/* Subtle dynamic glass specular reflection */}
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: 0,
          background:
            'radial-gradient(380px circle at 50% 20%, rgba(243, 231, 211, 0.14), rgba(224, 140, 156, 0.06) 45%, transparent 72%)',
        }}
      />
      {children}
    </div>
  );
}

