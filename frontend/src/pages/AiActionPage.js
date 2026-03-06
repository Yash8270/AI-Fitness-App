import React, { useState, useRef, useEffect, useContext, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, Menu, X, Zap } from 'lucide-react';
import ConnectContext from '../context/Connectcontext';
import { AI_ACTIONS } from '../data/mockData';

const typingIndicatorStyles = `
.typing-indicator {
  width: 60px; height: 30px; position: relative; z-index: 4;
}
.typing-circle {
  width: 8px; height: 8px; position: absolute; border-radius: 50%;
  background-color: #a5b4fc; left: 15%; transform-origin: 50%;
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
  width: 5px; height: 4px; border-radius: 50%; background-color: rgba(165,180,252,0.3);
  position: absolute; top: 30px; transform-origin: 50%; z-index: 3; left: 15%;
  filter: blur(1px); animation: typing-shadow046 0.5s alternate infinite ease;
}
@keyframes typing-shadow046 {
  0% { transform: scaleX(1.5); }
  40% { transform: scaleX(1); opacity: 0.7; }
  100% { transform: scaleX(0.2); opacity: 0.4; }
}
.typing-shadow:nth-child(4) { left: 45%; animation-delay: 0.2s; }
.typing-shadow:nth-child(5) { left: auto; right: 15%; animation-delay: 0.3s; }

.chat-scroll::-webkit-scrollbar { width: 4px; }
.chat-scroll::-webkit-scrollbar-track { background: transparent; }
.chat-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
.chat-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }

/* Custom horizontal scrollbar for tables */
.table-scroll::-webkit-scrollbar { height: 6px; }
.table-scroll::-webkit-scrollbar-track { background: transparent; }
.table-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
.table-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }

.bot-markdown p { margin: 0 0 0.6em 0; }
.bot-markdown p:last-child { margin-bottom: 0; }
.bot-markdown ul { list-style: disc; padding-left: 1.25rem; margin: 0.5em 0; }
.bot-markdown ol { list-style: decimal; padding-left: 1.25rem; margin: 0.5em 0; }
.bot-markdown li { margin-bottom: 0.25em; }
.bot-markdown strong { color: #e2e8f0; font-weight: 600; }
.bot-markdown code { background: #1e293b; padding: 0.1em 0.4em; border-radius: 4px; font-size: 0.85em; color: #a5b4fc; }
.bot-markdown pre { background: #1e293b; padding: 0.75rem; border-radius: 8px; overflow-x: auto; margin: 0.5em 0; }
.bot-markdown pre code { background: none; padding: 0; color: #a5b4fc; }
.bot-markdown table { border-collapse: collapse; width: 100%; font-size: 0.9em; min-width: max-content; }
.bot-markdown th { background: #1e293b; padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #334155; color: #94a3b8; font-weight: 600; }
.bot-markdown td { padding: 0.4rem 0.75rem; border: 1px solid #334155; color: #cbd5e1; }
.bot-markdown h1, .bot-markdown h2, .bot-markdown h3 { color: #e2e8f0; font-weight: 600; margin: 0.75em 0 0.25em; }
`;

const TypingIndicator = () => (
  <div className="flex items-start gap-3 md:gap-4 py-2">
    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Bot size={15} className="text-indigo-400" />
    </div>
    <div className="flex items-center px-4 py-3 bg-slate-800/60 rounded-2xl border border-slate-700/50">
      <div className="typing-indicator">
        <div className="typing-circle"></div>
        <div className="typing-circle"></div>
        <div className="typing-circle"></div>
        <div className="typing-shadow"></div>
        <div className="typing-shadow"></div>
        <div className="typing-shadow"></div>
      </div>
    </div>
  </div>
);

// Memoized so ReactMarkdown only re-renders when this message's text actually changes,
// not on every keystroke in the input box.
const BotMessage = memo(({ m, isNewGroup, idx }) => (
  <div className={`flex items-start gap-3 md:gap-4 ${isNewGroup && idx > 0 ? 'mt-2' : ''}`}>
    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Bot size={14} className="text-indigo-400" />
    </div>
    <div className="flex-1 min-w-0 text-[13px] md:text-sm leading-6 md:leading-7 text-slate-200 bot-markdown pt-0.5 md:pt-1">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ node, ...props }) => (
            <div className="w-full overflow-x-auto table-scroll my-3 pb-2">
              <table {...props} />
            </div>
          )
        }}
      >
        {m.text}
      </ReactMarkdown>
    </div>
  </div>
));

const UserMessage = memo(({ m, isNewGroup, idx }) => (
  <div className={`flex justify-end items-end gap-2 md:gap-3 ${isNewGroup && idx > 0 ? 'mt-2' : ''}`}>
    <div className="max-w-[75%] md:max-w-[60%] px-3 md:px-4 py-2 md:py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed bg-indigo-600 text-white shadow-lg shadow-indigo-900/30">
      {m.text}
    </div>
    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px] md:text-xs font-bold text-white shadow-md">
      U
    </div>
  </div>
));

const AiActionPage = () => {
  // ── Pull persistent chat state from context (survives navigation) ──
  const {
    chatMessages,
    chatIsTyping,
    chatIsLoading,
    initChatHistory,
    sendChatMessage,
  } = useContext(ConnectContext);

  // ── Local UI-only state (fine to reset on navigation) ──────────────
  const [inputValue, setInputValue] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');

  const dateInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Load history once — initChatHistory is safe to call on every mount;
  // it uses an internal ref to skip the fetch if already done.
  useEffect(() => {
    initChatHistory();
  }, [initChatHistory]);

  // Scroll to bottom when messages update or typing indicator changes
  useEffect(scrollToBottom, [chatMessages, chatIsTyping]);

  const handleDietOption = (type) => {
    if (selectedOption === type) { setSelectedOption(null); setSelectedDate(''); return; }
    setSelectedOption(type);
    if (type === 'today') setSelectedDate(new Date().toISOString().split('T')[0]);
    if (type === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
    if (type === 'date') setTimeout(() => dateInputRef.current?.showPicker(), 100);
  };

  const handleSend = async (text) => {
    if (!text.trim() || chatIsTyping || chatIsLoading) return;
    setInputValue('');
    const option = selectedOption;
    const date = selectedDate;
    setSelectedOption(null);
    setSelectedDate('');
    await sendChatMessage(text, option, date);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const handleActionClick = (action) => {
    if (action.type === 'LOG_TODAY_MEAL') { handleSend("Today I ate the following meals:\n"); return; }
    if (action.type === 'SET_TARGET_GYM') { handleSend('Set my daily nutrition targets for a gym day using my age and weight.'); return; }
    if (action.type === 'SET_TARGET_NO_GYM') { handleSend('Set my daily nutrition targets for a non-gym day using my age and weight.'); return; }
    handleSend(action.title);
  };

  return (
    <div
      className="fixed inset-0 md:top-[var(--navbar-height,65px)] flex overflow-hidden bg-slate-950"
    >
      <style>{typingIndicatorStyles}</style>

      {/* ===== SIDEBAR ===== */}
      <aside className={`
        w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col
        fixed md:static inset-y-0 left-0 z-40 h-full
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-200">Quick Actions</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => { handleActionClick(a); setIsSidebarOpen(false); }}
              className="w-full p-3 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all duration-150 text-left group"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center flex-shrink-0`}>
                  {React.cloneElement(a.icon, { size: 15, className: 'text-white' }) }
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-100 transition-colors leading-snug">
                  {a.title}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex-shrink-0">
          <p className="text-xs text-slate-600 text-center">FitMetrics AI v1.0</p>
        </div>
      </aside>

      {/* ===== CHAT AREA ===== */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900 flex-shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-slate-200">AI Assistant</span>
        </div>

        {/* Messages or Loading Spinner */}
        <div className="flex-1 overflow-y-auto chat-scroll py-4 md:py-6 pb-2 min-h-0 relative">
          {chatIsLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4">
              <div className="relative flex items-center justify-center w-14 h-14">
                <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                <Bot size={20} className="text-indigo-400 animate-pulse" />
              </div>
              <p className="text-slate-400 text-sm font-medium animate-pulse tracking-wide">Syncing AI History...</p>
            </div>
          ) : (
            <div className="px-4 md:px-6 space-y-6 md:space-y-8">
              {chatMessages.map((m, idx) => {
                const prevRole = idx > 0 ? chatMessages[idx - 1].role : null;
                const isNewGroup = prevRole !== m.role;
                return m.role === 'user'
                  ? <UserMessage key={m.id} m={m} isNewGroup={isNewGroup} idx={idx} />
                  : <BotMessage  key={m.id} m={m} isNewGroup={isNewGroup} idx={idx} />;
              })}
              {chatIsTyping && <TypingIndicator />}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* ===== INPUT AREA ===== */}
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur-md px-3 md:px-6 py-3 pb-[90px] md:pb-6 z-10 w-full shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]">
          <div className="space-y-2 md:space-y-3">
            
            <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide -mx-1 px-1">
              {[
                { label: '📊 Calculate My Diet', type: 'today' },
                { label: "📅 Yesterday's Diet", type: 'yesterday' },
                { label: '🗓 Specific Date', type: 'date' },
              ].map(btn => (
                <button
                  key={btn.type}
                  type="button"
                  onClick={() => handleDietOption(btn.type)}
                  disabled={chatIsLoading}
                  className={`flex-shrink-0 px-3 py-1.5 text-[11px] md:text-xs rounded-lg border transition-all duration-150 ${
                    selectedOption === btn.type
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <input type="date" ref={dateInputRef} className="hidden" onChange={(e) => setSelectedDate(e.target.value)} />

            {selectedOption && selectedDate && (
              <p className="text-[10px] md:text-xs text-slate-500">
                📅 Saving diet for: <span className="text-indigo-400 font-medium">{selectedDate}</span>
              </p>
            )}

            <div className={`flex gap-2 md:gap-3 items-end bg-slate-800 border border-slate-700 rounded-xl md:rounded-2xl px-3 md:px-4 py-2 md:py-3 transition-colors ${!chatIsLoading && 'focus-within:border-indigo-500/70'}`}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chatIsTyping || chatIsLoading}
                placeholder={chatIsLoading ? "Initializing..." : "Message FitMetrics AI..."}
                className="flex-1 bg-transparent text-slate-200 text-[13px] md:text-sm resize-none overflow-y-auto min-h-[20px] md:min-h-[22px] max-h-[100px] md:max-h-[150px] focus:outline-none placeholder-slate-500 disabled:cursor-not-allowed py-0.5"
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={!inputValue.trim() || chatIsTyping || chatIsLoading}
                className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg flex items-center justify-center transition-all flex-shrink-0 self-end mb-0.5"
              >
                <Send size={14} />
              </button>
            </div>

            <p className="text-center text-[9px] md:text-xs text-slate-600 hidden md:block">
              FitMetrics AI can make mistakes. Verify important nutrition info.
            </p>
          </div>
        </div>
      </main>

      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}
    </div>
  );
};

export default AiActionPage;