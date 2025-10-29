import React, { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'default', size = 'default', className, ...props },
  ref
) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants: Record<string, string> = {
    default: 'bg-[#3a6b97] text-white hover:bg-[#35628c]',
    outline: 'border border-gray-300 hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  };
  
  const sizes: Record<string, string> = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 py-1 text-xs',
    lg: 'h-12 px-6 py-3 text-base',
  };
  
  return (
    <button 
      ref={ref} 
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')} 
      {...props} 
    />
  );
});