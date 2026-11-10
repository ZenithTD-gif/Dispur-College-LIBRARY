import { AlertCircle } from 'lucide-react';

export function SetupNotice({ context = 'library' }: { context?: 'library' | 'admin' }) {
  return (
    <div className="rounded-3xl border border-rose-400/30 bg-gradient-to-br from-burgundy-900/45 via-abyss-900/70 to-amethyst-700/20 p-5 text-slate-100 backdrop-blur-2xl shadow-card">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-white">
            Supabase Cloud Connection Pending Configuration
          </p>
          <p className="text-slate-300 leading-relaxed">
            {context === 'admin'
              ? 'To sign in and manage departmental books, connect your Supabase project credentials.'
              : 'The digital library catalog will appear automatically once your Supabase cloud database and storage credentials are configured.'}
          </p>
          <p className="text-xs font-mono text-amethyst-300">
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and
            SUPABASE_SECRET_KEY in .env.local (see .env.example and README.md).
          </p>
        </div>
      </div>
    </div>
  );
}

