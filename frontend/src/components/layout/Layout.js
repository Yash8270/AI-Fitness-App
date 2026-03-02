import React from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';

const Layout = ({ children, activeTab, onNavigate, onLogout }) => (
  <div className="min-h-screen bg-slate-950 pb-20 md:pb-0 md:pt-20 text-slate-200">
    <Navbar activeTab={activeTab} onNavigate={onNavigate} onLogout={onLogout} />
    <main className={`
      mx-auto p-3 md:p-6 lg:p-8 
      ${activeTab === 'ai' ? 'w-full max-w-full px-0 md:px-6 lg:px-8' : 'max-w-5xl'}
    `}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </main>
  </div>
);

export default Layout;