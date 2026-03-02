import React, { useState, useRef, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, Menu, X } from 'lucide-react';
import Connect_Context from '../context/Connectcontext';
import { AI_ACTIONS } from '../data/mockData';

/* ============================
   Typing Indicator CSS
============================ */
const typingIndicatorStyles = `
.typing-indicator {
  width: 60px;
  height: 30px;
  position: relative;
  z-index: 4;
}
.typing-circle {
  width: 8px;
  height: 8px;
  position: absolute;
  border-radius: 50%;
  background-color: #000;
  left: 15%;
  transform-origin: 50%;
  animation: typing-circle7124 0.5s alternate infinite ease;
}
@keyframes typing-circle7124 {
  0% { top: 20px; height: 5px; border-radius: 50px 50px 25px 25px; transform: scaleX(1.7); }
  40% { height: 8px; border-radius: 50%; transform: scaleX(1); }
  100% { top: 0%; }
}
.typing-circle:nth-child(2) { left: 45%; animation-delay: 0.2s; }
.typing-circle:nth-child(3) { left: auto; right: 15%; animation-delay: 0.3s; }
.typing-shadow {
  width: 5px;
  height: 4px;
  border-radius: 50%;
  background-color: rgba(0,0,0,0.2);
  position: absolute;
  top: 30px;
  transform-origin: 50%;
  z-index: 3;
  left: 15%;
  filter: blur(1px);
  animation: typing-shadow046 0.5s alternate infinite ease;
}
@keyframes typing-shadow046 {
  0% { transform: scaleX(1.5); }
  40% { transform: scaleX(1); opacity: 0.7; }
  100% { transform: scaleX(0.2); opacity: 0.4; }
}
.typing-shadow:nth-child(4) { left: 45%; animation-delay: 0.2s; }
.typing-shadow:nth-child(5) { left: auto; right: 15%; animation-delay: 0.3s; }
`;

const TypingIndicator = () => (
  <div className="flex items-center p-4 bg-slate-800 rounded-2xl rounded-bl-none border border-slate-700 w-fit">
    <div className="typing-indicator">
      <div className="typing-circle"></div>
      <div className="typing-circle"></div>
      <div className="typing-circle"></div>
      <div className="typing-shadow"></div>
      <div className="typing-shadow"></div>
      <div className="typing-shadow"></div>
    </div>
  </div>
);

const AiActionPage = () => {

  const { askAiFirst, updateAiChat, getAiHistory } = useContext(Connect_Context);

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [first, setFirst] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  /* ===== DIET FEATURE STATE ===== */
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const dateInputRef = useRef(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  /* =======================
     Load History
  ======================= */
  useEffect(() => {
    const loadHistory = async () => {
      const res = await getAiHistory();
      if (res?.messages?.length) {
        const formatted = res.messages.flatMap((m, i) => [
          { id: `${i}-q`, role: 'user', text: m.question },
          { id: `${i}-a`, role: 'bot', text: m.answer },
        ]);
        setMessages(formatted);
        setFirst(false);
      } else {
        setMessages([{
          id: 'welcome',
          role: 'bot',
          text: "Hello! You can ask questions, set targets, or log today's meals.",
        }]);
      }
    };
    loadHistory();
  }, []);

  useEffect(scrollToBottom, [messages, isTyping]);

  /* =======================
     Diet Option Handler
  ======================= */
  const handleDietOption = (type) => {
    if (selectedOption === type) {
      setSelectedOption(null);
      setSelectedDate('');
      return;
    }

    setSelectedOption(type);

    if (type === 'today') {
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }

    if (type === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }

    if (type === 'date') {
      setTimeout(() => {
        dateInputRef.current?.showPicker();
      }, 100);
    }
  };

  /* =======================
     Streaming
  ======================= */
  const streamResponse = (text) => {
    const id = Date.now();
    setMessages(p => [...p, { id, role: 'bot', text: '' }]);
    let i = 0;
    const interval = setInterval(() => {
      i += 4;
      setMessages(p =>
        p.map(m => m.id === id ? { ...m, text: text.slice(0, i) } : m)
      );
      if (i >= text.length) clearInterval(interval);
    }, 5);
  };

  /* =======================
     Send Message
  ======================= */
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    let finalText = text;

    // Check if a diet button is selected
    if (selectedOption && selectedDate) {
      if (selectedOption === 'today') {
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for today.\n\n${text}`;
      } else if (selectedOption === 'yesterday') {
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for yesterday.\n\n${text}`;
      } else if (selectedOption === 'date') {
        finalText = `[SAVE_DIET:${selectedDate}] Calculate my diet for ${selectedDate}.\n\n${text}`;
      }
    }

    setMessages(p => [...p, { id: Date.now(), role: 'user', text }]);
    setInputValue('');
    setIsTyping(true);

    // Reset selection after sending
    setSelectedOption(null);
    setSelectedDate('');

    try {
      const res = first
        ? await askAiFirst(finalText)
        : await updateAiChat(finalText);

      setFirst(false);
      setIsTyping(false);
      streamResponse(res.response);
    } catch (err) {
      setIsTyping(false);
      setMessages(p => [...p, {
        id: Date.now(),
        role: 'bot',
        text: err?.error?.detail || 'Error occurred.'
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const handleSubmit = () => {
    sendMessage(inputValue);
  };

  /* =======================
     Sidebar Action Handler
  ======================= */
  const handleActionClick = (action) => {
    if (action.type === 'LOG_TODAY_MEAL') {
      sendMessage('Today I ate the following meals:\n');
      return;
    }
    if (action.type === 'SET_TARGET_GYM') {
      sendMessage('Set my daily nutrition targets for a gym day using my age and weight.');
      return;
    }
    if (action.type === 'SET_TARGET_NO_GYM') {
      sendMessage('Set my daily nutrition targets for a non-gym day using my age and weight.');
      return;
    }
    sendMessage(action.title);
  };

  /* =======================
     RENDER
  ======================= */
  return (
    <div className="relative flex h-[calc(100vh-120px)] gap-4">
      <style>{typingIndicatorStyles}</style>

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed bottom-24 left-4 z-50 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl shadow-lg"
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <motion.div 
        className={`
          w-64 bg-slate-900 border-r border-slate-800 p-4
          fixed md:relative inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:flex flex-col h-full
        `}
        initial={false}
        animate={{ x: isSidebarOpen ? 0 : -256 }}
      >
        <div className="flex items-center justify-between mb-6 md:hidden">
          <h3 className="text-sm font-bold text-slate-300">Quick Actions</h3>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            <X size={18} />
          </button>
        </div>
        
        <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 hidden md:block">
          Quick Actions
        </h3>
        
        <div className="flex-1 overflow-y-auto">
          {AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                handleActionClick(a);
                setIsSidebarOpen(false);
              }}
              className="w-full mb-2 p-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-indigo-500 active:scale-[0.98] transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${a.color} text-white flex-shrink-0`}>
                  {React.cloneElement(a.icon, { size: 16 })}
                </div>
                <span className="text-xs font-bold text-slate-200 text-left">
                  {a.title}
                </span>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Chat Container */}
      <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-800 rounded-2xl md:rounded-2xl">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] md:max-w-[85%] p-3 rounded-2xl ${
                m.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}>
                {m.role === 'bot' && <Bot size={14} className="mb-1 text-emerald-400" />}
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.text}
                </ReactMarkdown>
              </div>
            </div>
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA WITH DIET BUTTONS */}
        <div className="p-3 md:p-4 border-t border-slate-800 bg-slate-900/30">
          {/* Diet Buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {[
              { label: "Calculate My Diet", type: "today" },
              { label: "Calculate Yesterday's Diet", type: "yesterday" },
              { label: "Calculate Diet of Particular Date", type: "date" },
            ].map(btn => (
              <button
                type="button"
                key={btn.type}
                onClick={() => handleDietOption(btn.type)}
                className={`px-3 py-2 text-xs md:text-sm rounded-xl border transition-all duration-200 ${
                  selectedOption === btn.type
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <input
            type="date"
            ref={dateInputRef}
            className="hidden"
            onChange={(e) => setSelectedDate(e.target.value)}
          />

          {selectedOption && selectedDate && (
            <div className="mb-2 text-xs text-slate-400">
              📅 Will save diet for: <span className="text-indigo-400 font-semibold">{selectedDate}</span>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                placeholder="e.g. Today I ate 5 rotis..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 
                text-slate-200 resize-none overflow-hidden min-h-[46px] max-h-[150px] 
                focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isTyping}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AiActionPage;