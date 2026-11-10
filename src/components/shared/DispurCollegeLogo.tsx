interface DispurCollegeLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<DispurCollegeLogoProps['size']>, string> = {
  sm: 'h-9 w-9 rounded-xl p-1',
  md: 'h-10 w-10 rounded-xl p-1',
  lg: 'h-14 w-14 rounded-2xl p-1.5',
};

export function DispurCollegeLogo({
  size = 'md',
  className = '',
}: DispurCollegeLogoProps) {
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white border border-black/10 shadow-[0_4px_14px_-2px_rgba(17,12,14,0.32),0_1px_3px_rgba(0,0,0,0.12)] ${SIZE_CLASSES[size]} ${className}`}
    >
      <img
        src="/dispur-college-logo.png"
        alt="Dispur College Official Logo"
        width={500}
        height={500}
        className="h-full w-full object-contain select-none"
      />
    </div>
  );
}

