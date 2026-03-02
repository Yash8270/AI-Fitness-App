import React from 'react';
import { motion } from 'framer-motion';

const ProgressBar = ({ value, max, colorClass = "bg-indigo-500", label, showValue = true, unit = "" }) => {
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-400 font-medium">{label}</span>
        {showValue && <span className="text-slate-200 font-bold">{value} <span className="text-slate-500 font-normal">{unit} / {max}{unit}</span></span>}
      </div>
      <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </div>
  );
};

export default ProgressBar;