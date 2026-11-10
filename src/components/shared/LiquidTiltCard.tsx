'use client';

import { useRef, useState } from 'react';

interface LiquidTiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}

export function LiquidTiltCard({
  children,
  className = '',
  maxTilt = 5,
}: LiquidTiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [transform, setTransform] = useState(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)'
  );
  const [glowPos, setGlowPos] = useState({ x: 50, y: 20, opacity: 0 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * (maxTilt * 2);
    const rotateX = (0.5 - py) * (maxTilt * 2);

    setTransform(
      `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0, -4px, 0)`
    );
    setGlowPos({ x: px * 100, y: py * 100, opacity: 1 });
  }

  function handleMouseLeave() {
    setTransform(
      'perspective(1000px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)'
    );
    setGlowPos((prev) => ({ ...prev, opacity: 0 }));
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform,
        transformStyle: 'preserve-3d',
      }}
      className={`relative will-change-transform transition-transform duration-300 ease-liquid ${className}`}
    >
      {/* Subtle dynamic glass specular reflection */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: glowPos.opacity,
          background: `radial-gradient(380px circle at ${glowPos.x}% ${glowPos.y}%, rgba(243, 231, 211, 0.14), rgba(224, 140, 156, 0.06) 45%, transparent 72%)`,
        }}
      />
      {children}
    </div>
  );
}

