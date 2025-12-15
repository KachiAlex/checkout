import { Link } from 'react-router-dom';
import logoUrl from '../assets/checkout-logo.png';

interface BrandMarkProps {
  size?: number;
  className?: string;
  withPadding?: boolean;
  shadow?: boolean;
  backgroundClassName?: string;
  clickable?: boolean; // New prop to make it clickable
  to?: string; // Custom link destination
}

export function BrandMark({
  size = 48,
  className = '',
  withPadding = true,
  shadow = true,
  backgroundClassName = 'bg-white/90',
  clickable = true, // Default to clickable
  to = '/', // Default to homepage
}: BrandMarkProps) {
  const baseClasses = [
    'inline-flex items-center justify-center overflow-hidden',
    withPadding ? 'p-1.5' : '',
    shadow ? 'shadow-[0_12px_35px_-18px_rgba(15,23,42,0.45)]' : '',
    'rounded-2xl backdrop-blur',
    backgroundClassName,
    clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <img
      src={logoUrl}
      alt="Checkout logo"
      className="h-full w-full select-none object-contain"
      draggable={false}
    />
  );

  if (clickable) {
    return (
      <Link to={to} className={baseClasses} style={{ width: size, height: size }} title="Go to Homepage">
        {content}
      </Link>
    );
  }

  return (
    <span className={baseClasses} style={{ width: size, height: size }}>
      {content}
    </span>
  );
}


