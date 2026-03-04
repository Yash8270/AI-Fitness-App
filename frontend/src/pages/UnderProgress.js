import React from 'react';
import { Wrench, BarChart2 } from 'lucide-react';
import Card from '../components/ui/Card';

const UnderProgress = () => {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <Card className="max-w-lg w-full text-center bg-gradient-to-br from-indigo-900/50 to-slate-800 border-indigo-500/30 p-10">
        
        {/* Icon with glowing background effect */}
        <div className="flex justify-center mb-6 relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full w-20 h-20 m-auto"></div>
          <div className="bg-indigo-500/20 p-5 rounded-full text-indigo-400 relative z-10">
            <Wrench size={40} className="animate-pulse" />
          </div>
        </div>
        
        {/* Text Content */}
        <h2 className="text-3xl font-bold text-white mb-3">
          Under Construction
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">
          We're currently crunching the numbers and building your progress dashboard. Check back soon for detailed analytics on your macros, weight trends, and more!
        </p>
        
        {/* Mock "Coming Soon" Badge */}
        <div className="inline-flex items-center justify-center px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 text-sm font-medium">
          <BarChart2 size={16} className="mr-2 text-indigo-400" />
          <span>Analytics Coming Soon</span>
        </div>
        
      </Card>
    </div>
  );
};

export default UnderProgress;