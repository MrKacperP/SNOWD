import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold tracking-wide transition-all duration-150 rounded-[14px] disabled:opacity-50 disabled:cursor-not-allowed btn-lift';
  
  const variants = {
    primary: 'bg-[#4361EE] hover:bg-[#1e5ba8] text-white shadow-sm',
    secondary: 'border-2 border-[#0B1F33] text-[#0B1F33] hover:bg-[#E8EDFD] bg-white',
    ghost: 'text-[#4361EE] hover:bg-[#E8EDFD]',
    success: 'bg-[#27AE60] hover:bg-[#1e8b4d] text-white',
    danger: 'bg-[#EB5757] hover:bg-[#d64545] text-white',
  };
  
  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-[52px] px-6 text-base',
    lg: 'h-[56px] px-8 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
