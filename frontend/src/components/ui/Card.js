import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = "", onClick }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={onClick ? { y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" } : {}}
    onClick={onClick}
    className={`bg-slate-800 border border-slate-700/50 rounded-xl p-5 shadow-lg ${className} ${onClick ? 'cursor-pointer' : ''}`}
  >
    {children}
  </motion.div>
);

export default Card;