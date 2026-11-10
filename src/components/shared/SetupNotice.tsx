import { AlertCircle } from 'lucide-react';

export function SetupNotice({ context = 'library' }: { context?: 'library' | 'admin' }) {
  return (
    <div className="rounded-xl border border-gold-400/50 bg-gold-100/60 p-5 text-navy-900 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-gold-700 shrink-0 mt-0.5" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold text-navy-900">
            Supabase Cloud Connection Pending Configuration
          </p>
          <p className="text-navy-800/85 leading-relaxed">
            {context === 'admin'
              ? 'To sign in and manage departmental books, connect your Supabase project credentials.'
              : 'The digital library catalog will appear automatically once your Supabase cloud database and storage credentials are configured.'}
          </p>
          <p className="text-xs font-mono text-navy-700">
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and
            SUPABASE_SECRET_KEY in .env.local (see .env.example and README.md).
          </p>
        </div>
      </div>
    </div>
  );
}

