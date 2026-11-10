const PLACEHOLDER_MARKERS = [
  'your-project-ref',
  'your_publishable_key',
  'your_secret_key',
  'example.supabase.co',
];

function isRealValue(value: string | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !PLACEHOLDER_MARKERS.some((marker) => trimmed.includes(marker));
}

export function getPublicEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    '';

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000';

  return {
    supabaseUrl,
    supabasePublishableKey,
    siteUrl,
  };
}

export function getServerSecrets() {
  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    '';

  return {
    supabaseSecretKey,
  };
}

export function getUploadLimits() {
  const maxBookMb = Number(process.env.MAX_BOOK_FILE_SIZE_MB || '50');
  const maxCoverMb = Number(process.env.MAX_COVER_FILE_SIZE_MB || '5');

  const safeBookMb = Number.isFinite(maxBookMb) && maxBookMb > 0 ? maxBookMb : 50;
  const safeCoverMb = Number.isFinite(maxCoverMb) && maxCoverMb > 0 ? maxCoverMb : 5;

  return {
    maxBookMb: safeBookMb,
    maxBookBytes: Math.round(safeBookMb * 1024 * 1024),
    maxCoverMb: safeCoverMb,
    maxCoverBytes: Math.round(safeCoverMb * 1024 * 1024),
  };
}

export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnv();
  return (
    isRealValue(supabaseUrl) &&
    supabaseUrl.startsWith('https://') &&
    isRealValue(supabasePublishableKey)
  );
}

export function isSupabaseAdminConfigured(): boolean {
  const { supabaseSecretKey } = getServerSecrets();
  return isSupabaseConfigured() && isRealValue(supabaseSecretKey);
}

