import React from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { Dumbbell, Flame, Activity, TrendingUp } from 'lucide-react';
import Card from '../components/ui/Card';
import { PROGRESS_DATA, VITAMIN_DATA } from '../data/mockData';

const ProgressPage = () => {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-900/50 to-slate-800 border-indigo-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Protein</p>
              <h3 className="text-3xl font-bold text-white mt-1">145<span className="text-base text-slate-500 font-medium ml-1">g</span></h3>
            </div>
            <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-300">
              <Dumbbell size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
            <TrendingUp size={14} className="mr-1" /> +12% vs last week
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Avg Calories</p>
              <h3 className="text-3xl font-bold text-white mt-1">2,350</h3>
            </div>
            <div className="bg-amber-500/20 p-2 rounded-lg text-amber-300">
              <Flame size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-slate-500 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-slate-500 mr-2"></span> On Maintenance Target
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Weight Trend</p>
              <h3 className="text-3xl font-bold text-white mt-1">84.2<span className="text-base text-slate-500 font-medium ml-1">kg</span></h3>
            </div>
            <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-300">
              <Activity size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium">
            <TrendingUp size={14} className="mr-1 transform rotate-180" /> -0.5kg vs last week
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Line Chart */}
        <Card className="lg:col-span-2 min-h-[300px] flex flex-col">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Protein Intake vs Target</h3>
            <select className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="flex-1 w-full h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={PROGRESS_DATA}>
                <defs>
                  <linearGradient id="colorProtein" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ stroke: '#334155', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="protein" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorProtein)" />
                <Area type="monotone" dataKey="targetP" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Micros Chart */}
        <Card className="flex flex-col">
          <h3 className="font-bold text-white text-lg mb-4">Micronutrients</h3>
          <div className="flex-1 w-full h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={VITAMIN_DATA} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={60} tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {VITAMIN_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProgressPage;