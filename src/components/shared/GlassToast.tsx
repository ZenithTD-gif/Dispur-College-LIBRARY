'use client';

import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error';
  text: string;
}

export function GlassToast({
  toast,
  onDismiss,
}: {
  toast: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onDismiss, 4200);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm animate-toast-in"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-xs shadow-academic backdrop-blur-2xl backdrop-saturate-150 ${
          isError
            ? 'border-wine-400/45 bg-gradient-to-br from-maroon-950/90 to-wine-700/80 text-rose-100'
            : 'border-champagne-300/40 bg-gradient-to-br from-charcoal-900/90 via-maroon-950/85 to-burgundy-900/80 text-offwhite-100'
        }`}
      >
        {isError ? (
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-300" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-champagne-300" />
        )}
        <p className="flex-1 font-medium leading-relaxed">{toast.text}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full p-1 text-offwhite-300/70 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

