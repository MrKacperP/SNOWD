import React from 'react';
import { motion } from 'framer-motion';

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
  const baseStyles = 'rounded-2xl border border-[#E6EEF6] transition-all duration-150';
  
  const variants = {
    default: 'bg-white shadow-sm',
    frost: 'frost-glass',
    glacier: 'glacier-glow bg-white shadow-sm',
  };
  
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  return (
    <MotionDiv 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${className}`}
    >
      {children}
    </MotionDiv>
  );
}
