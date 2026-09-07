import { motion,useReducedMotion,type HTMLMotionProps } from 'framer-motion';
import React from 'react';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children' | 'onDrag' | 'onDragStart' | 'onDragEnd'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  isLoading?: boolean;
}

const MotionButton = motion.button;

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  isLoading = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const reduceMotion = useReducedMotion();
  const baseStyles = 'inline-flex items-center justify-center gap-2 border border-[var(--ink)] font-black transition-all duration-150 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed btn-lift';
  
  const variants = {
    primary: 'bg-[var(--accent)] hover:bg-[var(--accent-dark)] text-white shadow-[var(--surface-shadow)]',
    secondary: 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] bg-white',
    ghost: 'border-transparent text-[var(--accent)] hover:bg-[var(--accent-soft)]',
    success: 'bg-emerald-700 hover:bg-emerald-800 text-white',
    danger: 'bg-red-700 hover:bg-red-800 text-white',
  };
  
  const sizes = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-[52px] px-6 text-base',
    lg: 'h-[56px] px-8 text-lg',
  };
  
  return (
    <MotionButton
      whileHover={reduceMotion || disabled || isLoading ? undefined : { y: -2 }}
      whileTap={reduceMotion || disabled || isLoading ? undefined : { y: 1 }}
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
    </MotionButton>
  );
}
