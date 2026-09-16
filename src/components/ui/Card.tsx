import { motion } from 'framer-motion';
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'frost' | 'glacier';
  padding?: 'sm' | 'md' | 'lg';
}

const MotionDiv = motion.div;

export default function Card({ 
  children, 
  className = '',
  variant = 'default',
  padding = 'lg'
}: CardProps) {
  const baseStyles = 'rounded-2xl border border-[var(--border)]';
  
  const variants = {
    default: 'bg-[var(--bg-card-solid)] shadow-[var(--surface-shadow)]',
    frost: 'bg-[var(--bg-secondary)] shadow-[var(--surface-shadow)]',
    glacier: 'bg-[var(--bg-card-solid)] shadow-[var(--surface-shadow)]',
  };
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <MotionDiv className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}>
      {children}
    </MotionDiv>
  );
}
