import React, { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface InputProps extends Omit<HTMLMotionProps<'input'>, 'ref'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const MotionInput = motion.input;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <motion.label 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="block text-sm font-medium text-[var(--text-primary)] mb-2"
          >
            {label}
          </motion.label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <MotionInput
            ref={ref}
            whileFocus={{ scale: 1.02 }}
            className={`
              w-full h-[52px] px-4 ${icon ? 'pl-12' : ''}
              bg-white border border-[var(--border)] rounded-xl
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-base
              focus:outline-none focus:ring-2 focus:ring-[rgba(47,111,237,0.25)] focus:border-[var(--accent)]
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500/25 focus:border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-1.5 text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
