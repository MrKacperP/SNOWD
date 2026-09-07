import { motion,type HTMLMotionProps } from 'framer-motion';
import React,{ forwardRef,useId } from 'react';

interface InputProps extends Omit<HTMLMotionProps<'input'>, 'ref'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const MotionInput = motion.input;

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    return (
      <div className="w-full">
        {label && (
          <motion.label htmlFor={inputId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="block text-sm font-black text-[var(--text-primary)] mb-2"
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
            {...props}
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={[props["aria-describedby"], (error || helperText) ? descriptionId : undefined].filter(Boolean).join(" ") || undefined}
            className={`
              w-full h-[52px] px-4 ${icon ? 'pl-12' : ''}
              bg-white border border-[var(--border)] rounded-xl
              text-[var(--text-primary)] placeholder:text-[var(--text-muted)] text-base font-bold
              focus:outline-none focus:ring-2 focus:ring-[var(--accent-sun)] focus:border-[var(--accent)]
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500/25 focus:border-red-500' : ''}
              ${className}
            `}
          />
        </div>
        {error && (
          <motion.p id={descriptionId} role="alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-1.5 text-sm text-red-500"
          >
            {error}
          </motion.p>
        )}
        {helperText && !error && (
          <p id={descriptionId} className="mt-1.5 text-xs text-[var(--text-muted)]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
