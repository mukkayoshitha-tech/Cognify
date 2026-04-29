import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, MessageSquare, X, Send, LogOut } from 'lucide-react';
import { useLocalStorage, getXPProgress, getLevelFromXP } from '../lib/store';
import { callGeminiAPI } from '../lib/gemini';

export const Navbar = () => {
  const [theme, setTheme] = useLocalStorage<string>('cognify_theme', 'light');
  const [user, setUser] = useLocalStorage<string>('cognify_user', '');
  const [xp] = useLocalStorage<number>('cognify_xp', 0);
  const navigate = useNavigate();

  const handleSignOut = () => {
    setUser('');
    navigate('/');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const level = getLevelFromXP(xp);
  const progress = getXPProgress(xp);
  const initials = user ? user.substring(0, 2).toUpperCase() : 'CO';

  return (
    <div className="sticky top-0 z-40 bg-background-light dark:bg-background-dark">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
        <div className="text-primary-accent font-bold text-xl tracking-tight cursor-pointer" onClick={() => navigate('/')}>
          Cognify
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            {theme === 'dark' ? <Sun size={20} className="text-primary-dark" /> : <Moon size={20} className="text-primary-light" />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/profile')}>
              <span className="text-sm font-medium hidden sm:inline-block">Lv.{level}</span>
              <div className="w-8 h-8 rounded-full bg-primary-accent text-white flex items-center justify-center font-bold text-sm">
                {initials}
              </div>
              <span className="text-sm font-medium max-w-[100px] truncate hidden sm:inline-block">{user}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="p-2 text-secondary-light dark:text-secondary-dark hover:text-red-500 transition-colors"
              title="Sign Out"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>
      {/* XP Progress Bar */}
      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-primary-accent transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export const TabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { name: 'Home', path: '/' },
    { name: 'Log Today', path: '/log-today' },
    { name: 'Friends', path: '/friends' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark">
      <div className="flex overflow-x-auto hide-scrollbar whitespace-nowrap justify-around max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || (tab.path === '/' && location.pathname === '/home');
          return (
            <button
              key={tab.name}
              onClick={() => navigate(tab.path)}
              className={`flex-1 py-4 px-2 text-sm font-medium transition-colors border-t-2 ${
                isActive 
                  ? 'border-primary-accent text-primary-accent' 
                  : 'border-transparent text-secondary-light dark:text-secondary-dark hover:text-primary-light dark:hover:text-primary-dark'
              }`}
            >
              {tab.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const StudyBuddyFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await callGeminiAPI(
        "You are a friendly and helpful study assistant inside Cognify. Answer questions clearly and simply, especially about DSA, programming concepts, fitness, reading, or any learning topic the user is tracking. Keep answers concise and beginner-friendly.",
        userMsg
      );
      setMessages(prev => [...prev, { role: 'ai', content: response }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 w-14 h-14 rounded-full bg-primary-accent text-white shadow-lg flex items-center justify-center z-50 hover:scale-105 transition-transform"
        aria-label="Study Buddy"
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[350px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[70vh] bg-card-light dark:bg-card-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark flex flex-col z-50 overflow-hidden slide-up-animation">
          <div className="bg-primary-accent text-white px-4 py-3 flex justify-between items-center">
            <h3 className="font-bold">Study Buddy 🤖</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 && (
              <div className="text-center text-secondary-light dark:text-secondary-dark mt-4 text-sm">
                Ask me anything about your studies, fitness, or habits!
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-lg p-3 text-sm ${
                m.role === 'user' 
                  ? 'bg-primary-accent text-white self-end rounded-br-sm' 
                  : 'bg-gray-100 dark:bg-[#242424] text-primary-light dark:text-primary-dark self-start rounded-bl-sm'
              }`}>
                {m.content}
              </div>
            ))}
            {isLoading && (
              <div className="bg-gray-100 dark:bg-[#242424] text-primary-light dark:text-primary-dark self-start rounded-lg rounded-bl-sm p-3 text-sm flex gap-1 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-border-light dark:border-border-dark flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Message..."
              className="flex-1 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-accent dark:text-white"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-primary-accent text-white p-2 rounded-md disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
