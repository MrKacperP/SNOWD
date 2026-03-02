import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-[#0B1F33] mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6B7C8F]">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-[52px] px-4 ${icon ? 'pl-12' : ''}
              bg-white border border-[#E6EEF6] rounded-xl
              text-[#0B1F33] placeholder:text-[#6B7C8F] text-base
              focus:outline-none focus:ring-2 focus:ring-[#246EB9]/25 focus:border-[#246EB9]
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-[#EB5757] focus:ring-[#EB5757]/25 focus:border-[#EB5757]' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-[#EB5757]">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-[#6B7C8F]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
