import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, variant = "primary", className = "", onClick, isLoading }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-200",
    outline: "border border-slate-600 hover:border-slate-500 text-slate-300",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800/50"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </motion.button>
  );
};

export default Button;