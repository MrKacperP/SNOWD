import React from 'react';
import { motion } from 'framer-motion';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const notificationVariants = {
  hidden: { opacity: 0, y: -50, scale: 0.8 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.8 },
};

const iconVariants = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
};

const colorVariants = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
}

export default function Notification({ message, type, onClose }: NotificationProps) {
  return (
    <motion.div
      variants={notificationVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`fixed top-5 right-5 p-4 rounded-lg text-white shadow-lg ${colorVariants[type]}`}
    >
      <div className="flex items-center">
        <span className="mr-2">{iconVariants[type]}</span>
        <p>{message}</p>
        <button onClick={onClose} className="ml-4 font-bold">X</button>
      </div>
    </motion.div>
  );
}
