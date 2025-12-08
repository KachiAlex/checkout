import { ReactNode } from 'react';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for tables that makes them responsive on mobile
 * On mobile, tables are converted to card layouts
 */
export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
  return (
    <div className={`table-responsive overflow-x-auto -webkit-overflow-scrolling-touch ${className}`}>
      {children}
    </div>
  );
}

