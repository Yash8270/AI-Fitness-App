import React, { useState, useEffect, useContext, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Edit2, Check, X, Plus, Trash2, Calendar, List } from 'lucide-react';
import Connect_Context from '../context/Connectcontext';

const HistoryPage = () => {
  const { getAllHistory, updateHistory, getUserDetails } = useContext(Connect_Context);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  
  // Single expanded item state (List View)
  const [expandedId, setExpandedId] = useState(null);
  
  // Selected Date state (Calendar View)
  const [selectedDateLog, setSelectedDateLog] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [userTargets, setUserTargets] = useState({
    protein_g: 0, calories_kcal: 0, carbs_g: 0, fats_g: 0,
    calcium_mg: 0, iron_mg: 0, zinc_mg: 0, magnesium_mg: 0,
    potassium_mg: 0, fiber_g: 0, water_l: 0
  });

  const [editForm, setEditForm] = useState({
    protein_g: 0, calories_kcal: 0, carbs_g: 0, fats_g: 0,
    calcium_mg: 0, iron_mg: 0, zinc_mg: 0, magnesium_mg: 0,
    potassium_mg: 0, fiber_g: 0, water_l: 0, foods: []
  });

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Ref for scrolling to details
  const detailsRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHistory(), fetchUserData()]);
      setLoading(false);
    };
    init();
  }, [fetchHistory, fetchUserData]);

  // Scroll to details when a date is selected in calendar view
  useEffect(() => {
    if (viewMode === 'calendar' && selectedDateLog && detailsRef.current) {
        // Small timeout to allow render to complete
        setTimeout(() => {
            detailsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  }, [selectedDateLog, viewMode]);

  const fetchUserData = async () => {
    const user = await getUserDetails();
    if (user && user.targets) setUserTargets(user.targets);
  };

  const fetchHistory = async () => {
    const res = await getAllHistory();
    if (res && res.data) setHistoryLogs(res.data);
  };

  const toggleExpand = (id) => {
    if (editingId !== null && editingId !== id) return;
    setExpandedId(prev => (prev === id ? null : id));
  };

  const startEditing = (log) => {
    const id = log._id || log.date;
    setEditingId(id);
    setExpandedId(id);
    
    // Also set as selected date log if in calendar view so updates reflect immediately in the detail pane
    if(viewMode === 'calendar') {
        setSelectedDateLog(log);
    }
    
    const consumed = log.consumed || {};
    setEditForm({
      protein_g: consumed.protein_g || 0,
      calories_kcal: consumed.calories_kcal || 0,
      carbs_g: consumed.carbs_g || 0,
      fats_g: consumed.fats_g || 0,
      calcium_mg: consumed.calcium_mg || 0,
      iron_mg: consumed.iron_mg || 0,
      zinc_mg: consumed.zinc_mg || 0,
      magnesium_mg: consumed.magnesium_mg || 0,
      potassium_mg: consumed.potassium_mg || 0,
      fiber_g: consumed.fiber_g || 0,
      water_l: consumed.water_l || 0,
      foods: log.foods ? JSON.parse(JSON.stringify(log.foods)) : [] 
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({ 
        protein_g: 0, calories_kcal: 0, carbs_g: 0, fats_g: 0, 
        calcium_mg: 0, iron_mg: 0, zinc_mg: 0, magnesium_mg: 0, 
        potassium_mg: 0, fiber_g: 0, water_l: 0, foods: [] 
    });
  };

  const saveEditing = async (date) => {
    const dateObj = new Date(date);
    // Use local date parts to avoid UTC offset shifting the date (e.g. IST → UTC rolls back by 5:30hrs)
    const year  = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day   = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const payload = {
      consumed: {
        protein_g: Number(editForm.protein_g),
        calories_kcal: Number(editForm.calories_kcal),
        carbs_g: Number(editForm.carbs_g),
        fats_g: Number(editForm.fats_g),
        calcium_mg: Number(editForm.calcium_mg),
        iron_mg: Number(editForm.iron_mg),
        zinc_mg: Number(editForm.zinc_mg),
        magnesium_mg: Number(editForm.magnesium_mg),
        potassium_mg: Number(editForm.potassium_mg),
        fiber_g: Number(editForm.fiber_g),
        water_l: Number(editForm.water_l),
      },
      foods: editForm.foods
    };

    const res = await updateHistory(dateStr, payload);
    if (res && !res.error) {
      setEditingId(null);
      // Force-refresh from MongoDB (bypass cache which was just busted)
      const updatedHistory = await getAllHistory(true);
      if (updatedHistory && updatedHistory.data) {
        setHistoryLogs(updatedHistory.data);
        // Refresh selected calendar log by matching on date string
        if (viewMode === 'calendar' && selectedDateLog) {
          const updatedLog = updatedHistory.data.find(
            l => (l._id && l._id === selectedDateLog._id) ||
                 new Date(l.date).toISOString().split('T')[0] === dateStr
          );
          setSelectedDateLog(updatedLog || null);
        }
      }
    } else {
      alert("Failed to update history");
    }
  };

  const handleNutrientChange = (e) => {
    setEditForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFoodChange = (index, field, value) => {
    const updatedFoods = [...editForm.foods];
    updatedFoods[index] = { ...updatedFoods[index], [field]: value };
    setEditForm(prev => ({ ...prev, foods: updatedFoods }));
  };

  const removeFood = (index) => {
    const updatedFoods = editForm.foods.filter((_, i) => i !== index);
    setEditForm(prev => ({ ...prev, foods: updatedFoods }));
  };

  const addFood = () => {
    setEditForm(prev => ({
      ...prev,
      foods: [...prev.foods, { name: "New Item", protein_g: 0, calories_kcal: 0 }]
    }));
  };

  // --- Calendar Logic ---
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getLogForDate = (day) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    // Construct date string to match backend format if needed, or compare date objects
    // Assuming historyLogs has 'date' as ISO string
    return historyLogs.find(log => {
      // Parse as local time by replacing the T separator — avoids UTC offset shifting the date
      const rawDate = log.date.includes('T') ? log.date.split('T')[0] : log.date;
      const [logYear, logMonth, logDay] = rawDate.split('-').map(Number);
      return logDay === day && (logMonth - 1) === month && logYear === year;
    });
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month); // 0 = Sunday
    
    const days = [];
    
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-transparent"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const log = getLogForDate(day);
      let statusColor = "bg-slate-800 border-slate-700"; // Default (no data)
      let statusDot = null;

      if (log) {
        // Determine status based on completion (mock logic based on calorie target)
        // If calories >= 90% of target -> Green, else Red
        const calTarget = userTargets.calories_kcal || 2000;
        const calConsumed = log.consumed?.calories_kcal || 0;
        const progress = calConsumed / calTarget;
        
        if (progress >= 0.9) {
            statusColor = "bg-slate-800 border-emerald-500/50 hover:border-emerald-500";
            statusDot = <div className="w-2 h-2 rounded-full bg-emerald-500 ml-auto mt-1 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>;
        } else {
            statusColor = "bg-slate-800 border-rose-500/50 hover:border-rose-500";
            statusDot = <div className="w-2 h-2 rounded-full bg-rose-500 ml-auto mt-1 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></div>;
        }
      }

      const isSelected = selectedDateLog && (() => {
        const rawDate = selectedDateLog.date.includes('T') ? selectedDateLog.date.split('T')[0] : selectedDateLog.date;
        const [selYear, selMonth, selDay] = rawDate.split('-').map(Number);
        return selDay === day && (selMonth - 1) === month && selYear === year;
      })();

      days.push(
        <div 
          key={day} 
          onClick={() => {
              if(log) {
                  setSelectedDateLog(log);
                  const logId = log._id || log.date;
                  if (editingId && editingId !== logId) {
                      cancelEditing();
                  }
              }
          }}
          className={`
            h-20 p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group
            ${statusColor}
            ${isSelected ? 'ring-2 ring-indigo-500 bg-slate-750' : 'hover:bg-slate-750'}
            ${!log ? 'opacity-50 cursor-default hover:bg-slate-800 hover:border-slate-700' : ''}
          `}
        >
          <span className="text-sm font-bold text-slate-300">{day}</span>
          {statusDot}
          {log && (
             <div className="text-[9px] text-slate-400 mt-1 truncate">
               {Math.round(log.consumed?.protein_g || 0)}g P
             </div>
          )}
        </div>
      );
    }

    return days;
  };

  const NutrientStat = ({ label, value, target, unit }) => {
    const consumedVal = Number(value || 0);
    const targetVal = Number(target || 1); 
    const diff = Math.abs(consumedVal - targetVal);
    const isMet = consumedVal >= targetVal;
    
    return (
      <div className="flex justify-between items-center text-xs p-2 bg-slate-800/50 rounded border border-slate-700">
        <span className="text-slate-400 font-medium">{label}</span>
        <div className="flex items-center gap-2">
            <span className={isMet ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                {consumedVal}{unit}
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-slate-500">{targetVal}{unit}</span>
            <span className="text-amber-400 font-mono ml-1 text-[10px]">
                ({diff.toFixed(1)}{unit})
            </span>
        </div>
      </div>
    );
  };

  const nutrientList = [
      { key: 'protein_g', label: 'Protein', unit: 'g' },
      { key: 'calories_kcal', label: 'Calories', unit: 'kcal' },
      { key: 'carbs_g', label: 'Carbs', unit: 'g' },
      { key: 'fats_g', label: 'Fats', unit: 'g' },
      { key: 'fiber_g', label: 'Fiber', unit: 'g' },
      { key: 'calcium_mg', label: 'Calcium', unit: 'mg' },
      { key: 'iron_mg', label: 'Iron', unit: 'mg' },
      { key: 'zinc_mg', label: 'Zinc', unit: 'mg' },
      { key: 'magnesium_mg', label: 'Magnesium', unit: 'mg' },
      { key: 'potassium_mg', label: 'Potassium', unit: 'mg' },
      { key: 'water_l', label: 'Water', unit: 'L' },
  ];

  // Helper to render the Log Item (used in both List and Calendar detail view)
  const renderLogItem = (day, isFromList = true) => {
      const uniqueId = day._id || day.date;
      const isEditing = editingId === uniqueId;
      const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      // In list view check expandedId, in calendar view always expand selected day
      const isExpanded = isFromList ? expandedId === uniqueId : true; 

      return (
        <motion.div 
          key={uniqueId} 
          layout={isFromList} // Only animate layout in list
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-slate-800 rounded-xl overflow-hidden border ${isEditing ? 'border-indigo-500' : 'border-slate-700/50'} transition-colors w-full mb-4`}
        >
          {/* Header Row */}
          <div className="p-4 flex items-center justify-between">
            
            <div 
              className="flex items-center gap-4 flex-1 cursor-pointer"
              onClick={() => isFromList && !isEditing && toggleExpand(uniqueId)}
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-sm bg-slate-700 text-slate-300`}>
                {new Date(day.date).getDate()}
              </div>
              <div>
                <h4 className="font-bold text-slate-100">{dateStr}</h4>
                <p className="text-xs text-slate-400">
                  {isEditing 
                    ? 'Editing Log...' 
                    : `${day.consumed?.calories_kcal || 0} kcal • ${day.consumed?.protein_g || 0}g Protein`
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <button 
                    onClick={() => startEditing(day)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded-full transition-colors"
                    title="Edit Log"
                  >
                    <Edit2 size={16} />
                  </button>
                  {/* Only show expand arrow in list view */}
                  {isFromList && (
                    <button 
                        onClick={() => toggleExpand(uniqueId)}
                        className="p-2 text-slate-500 hover:text-white transition-colors"
                    >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  )}
                </>
              ) : (
                <>
                   <button 
                    onClick={() => saveEditing(day.date)}
                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg font-medium transition-colors"
                  >
                    <Check size={14} /> Save
                  </button>
                  <button 
                    onClick={cancelEditing}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg font-medium transition-colors"
                  >
                    <X size={14} /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Expanded Content */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-slate-900/50 border-t border-slate-700/50"
              >
                <div className="p-4 space-y-6">
                  
                  {!isEditing ? (
                    <>
                      {/* Nutrient Summary */}
                      <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nutrient Summary</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {nutrientList.map(nutrient => (
                                <NutrientStat 
                                    key={nutrient.key}
                                    label={nutrient.label}
                                    value={day.consumed?.[nutrient.key]}
                                    target={userTargets?.[nutrient.key]}
                                    unit={nutrient.unit}
                                />
                            ))}
                          </div>
                      </div>

                      {/* Food List */}
                      <div>
                        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Logged Foods</h5>
                        <div className="space-y-2">
                          {day.foods?.map((meal, idx) => (
                            <div key={idx} className="bg-slate-800 p-3 rounded-lg border border-slate-700/50">
                              <div className="flex justify-between items-start mb-2">
                                 <span className="text-sm font-bold text-slate-200">{meal.name}</span>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[10px] text-slate-400">
                                 {nutrientList.map(n => {
                                     const val = meal[n.key];
                                     if (!val) return null; 
                                     return (
                                        <div key={n.key} className="flex flex-col">
                                            <span className="uppercase text-slate-600 text-[9px]">{n.label}</span>
                                            <span className="font-mono text-slate-300">{val}{n.unit}</span>
                                        </div>
                                     );
                                 })}
                              </div>
                            </div>
                          ))}
                          {(!day.foods || day.foods.length === 0) && <p className="text-xs text-slate-600 italic">No foods logged.</p>}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* EDIT MODE */
                    <div className="space-y-6">
                       {/* Total Consumed Edit */}
                       <div>
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Consumed (Override)</h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {nutrientList.map(nutrient => (
                              <div key={nutrient.key}>
                                 <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{nutrient.label}</label>
                                 <input 
                                    type="number"
                                    name={nutrient.key}
                                    value={editForm[nutrient.key]}
                                    onChange={handleNutrientChange}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:border-indigo-500 focus:outline-none text-xs"
                                 />
                              </div>
                            ))}
                          </div>
                       </div>

                       {/* Food List Edit */}
                       <div>
                          <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Foods</h5>
                            <button 
                              onClick={addFood}
                              className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                            >
                              <Plus size={14} /> Add Item
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {editForm.foods.map((food, idx) => (
                              <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 relative">
                                <button 
                                  onClick={() => removeFood(idx)}
                                  className="absolute top-2 right-2 text-slate-500 hover:text-rose-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                                
                                <div className="mb-2 pr-6">
                                   <label className="block text-[10px] text-slate-500 uppercase">Item Name</label>
                                   <input 
                                      type="text" 
                                      value={food.name}
                                      onChange={(e) => handleFoodChange(idx, 'name', e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white placeholder-slate-600 focus:border-indigo-500 outline-none"
                                      placeholder="e.g. Chicken Breast"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                   {nutrientList.slice(0, 8).map(n => ( 
                                      <div key={n.key}>
                                          <label className="block text-[9px] text-slate-600 uppercase">{n.label}</label>
                                          <input 
                                            type="number" 
                                            value={food[n.key] || 0}
                                            onChange={(e) => handleFoodChange(idx, n.key, Number(e.target.value))}
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-1 py-1 text-xs text-white focus:border-indigo-500 outline-none"
                                          />
                                      </div>
                                   ))}
                                </div>
                              </div>
                            ))}
                            {editForm.foods.length === 0 && (
                              <p className="text-xs text-slate-600 italic p-2 border border-dashed border-slate-800 rounded">No foods added yet.</p>
                            )}
                          </div>
                       </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading history...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            {viewMode === 'calendar' ? 'History Calendar' : 'Daily Logs'}
        </h2>
        <div className="bg-slate-800 rounded-lg p-1 flex gap-1 border border-slate-700">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <List size={14} /> List
          </button>
          <button 
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <Calendar size={14} /> Calendar
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
            <motion.div 
                key="list-view"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
            >
                {historyLogs.length === 0 && (
                    <p className="text-slate-500 text-center py-8">No history logs found.</p>
                )}
                {historyLogs.map(day => renderLogItem(day, true))}
            </motion.div>
        ) : (
            <motion.div 
                key="calendar-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
            >
                {/* Calendar Header */}
                <div className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <button onClick={handlePrevMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <ChevronDown className="transform rotate-90" />
                    </button>
                    <h3 className="text-lg font-bold text-white">
                        {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={handleNextMonth} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg">
                        <ChevronDown className="transform -rotate-90" />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-bold text-slate-500 uppercase py-2">
                            {day}
                        </div>
                    ))}
                    {renderCalendar()}
                </div>

                {/* Selected Day Details */}
                <div className="mt-6 border-t border-slate-700/50 pt-6" ref={detailsRef}>
                    {selectedDateLog ? (
                        <>
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="text-lg font-bold text-indigo-400">
                                    Details for {new Date(selectedDateLog.date).toLocaleDateString()}
                                </h4>
                                <button onClick={() => setSelectedDateLog(null)} className="text-slate-500 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>
                            {renderLogItem(selectedDateLog, false)}
                        </>
                    ) : (
                        <div className="text-center py-8 text-slate-500 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                            Select a date with data (green/red dot) to view details
                        </div>
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryPage;