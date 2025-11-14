import logoUrl from '../assets/checkout-logo.png';

interface BrandMarkProps {
  size?: number;
  className?: string;
  withPadding?: boolean;
  shadow?: boolean;
  backgroundClassName?: string;
}

export function BrandMark({
  size = 48,
  className = '',
  withPadding = true,
  shadow = true,
  backgroundClassName = 'bg-white/90',
}: BrandMarkProps) {
  const baseClasses = [
    'inline-flex items-center justify-center overflow-hidden',
    withPadding ? 'p-1.5' : '',
    shadow ? 'shadow-[0_12px_35px_-18px_rgba(15,23,42,0.45)]' : '',
    'rounded-2xl backdrop-blur',
    backgroundClassName,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={baseClasses} style={{ width: size, height: size }}>
      <img
        src={logoUrl}
        alt="Checkout logo"
        className="h-full w-full select-none object-contain"
        draggable={false}
      />
    </span>
  );
}


