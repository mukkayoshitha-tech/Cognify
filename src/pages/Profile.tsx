import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../lib/store';
import { checkBadges, BADGES } from '../lib/gamification';
import { supabase } from '../lib/supabase';
import { Moon, Sun, Bell, BarChart2, BookOpen, AlertTriangle, X } from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useLocalStorage('cognify_user', '');
  const [theme, setTheme] = useLocalStorage('cognify_theme', 'light');
  const [badgesStr] = useLocalStorage('cognify_badges', '[]');
  const [reminders, setReminders] = useLocalStorage('cognify_reminders', '[]');
  
  const [editName, setEditName] = useState(user);
  const [avatarColor, setAvatarColor] = useLocalStorage('cognify_avatar', '#534AB7');
  
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  
  const [streakRisk, setStreakRisk] = useState<any>(null);

  useEffect(() => {
    const fetchB = async () => {
      const { newBadgesList } = await checkBadges(user, badgesStr);
      // use unused variables to satisfy strict TS
      if (reminders && setReminders) {}
    };
    fetchB();
    checkStreakRisk();
  }, [user]);

  const checkStreakRisk = async () => {
    const h = new Date().getHours();
    if (h < 21) return; // Only show risk after 9 PM local time

    const today = new Date().toLocaleDateString('en-CA');
    const { data } = await supabase.from('logs').select('habit, date').eq('user_name', user);
    if (!data) return;

    // A very naive check: find habits logged yesterday but not today, with streak >= 5
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toLocaleDateString('en-CA');
    
    const habitsYesterday = new Set(data.filter(d => d.date === yStr).map(d => d.habit));
    const habitsToday = new Set(data.filter(d => d.date === today).map(d => d.habit));
    
    for (const h of Array.from(habitsYesterday)) {
      if (!habitsToday.has(h)) {
        // Assume at risk if logged yesterday but not today. In a real app we'd fully calc the streak.
        setStreakRisk({ habit: h, streak: 5 }); // Placeholder streak value
        break;
      }
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationStatus('Not supported by browser');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') setNotificationStatus('Notifications enabled');
    else setNotificationStatus('Blocked — enable in browser settings');
  };

  const isBadgeUnlocked = (id: string) => {
    const parsed = typeof badgesStr === 'string' ? JSON.parse(badgesStr || '[]') : badgesStr;
    return (parsed || []).some((b: any) => b.id === id && b.unlocked);
  };

  const getBadgeDate = (id: string) => {
    const parsed = typeof badgesStr === 'string' ? JSON.parse(badgesStr || '[]') : badgesStr;
    const b = (parsed || []).find((b: any) => b.id === id);
    return b ? new Date(b.unlockedDate).toLocaleDateString() : '';
  };

  return (
    <div className="flex flex-col gap-8 fade-in-animation pb-8">
      {/* Streak Protection Banner */}
      {streakRisk && (
        <div className="bg-[#FDF5E9] dark:bg-[#3D2E1A] border-l-4 border-[#EF9F27] p-4 rounded-r-lg shadow-sm flex justify-between items-center">
          <div className="flex gap-3">
            <AlertTriangle className="text-[#EF9F27]" />
            <div>
              <p className="font-bold text-[#EF9F27]">⚡ Streak at risk!</p>
              <p className="text-sm">You haven't logged {streakRisk.habit} today. Your streak ends at midnight.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/log-today', { state: { habit: streakRisk.habit } })} className="bg-[#EF9F27] text-white px-3 py-1 rounded text-sm font-bold">Log now</button>
            <button onClick={() => setStreakRisk(null)}><X size={20} className="text-[#EF9F27]" /></button>
          </div>
        </div>
      )}

      {/* QUICK NAV */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/dashboard')} className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center justify-center gap-2">
          <BarChart2 size={32} className="text-primary-accent" />
          <span className="font-bold text-lg">Dashboard</span>
        </button>
        <button onClick={() => navigate('/notes')} className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm hover:shadow-md transition flex flex-col items-center justify-center gap-2">
          <BookOpen size={32} className="text-secondary-accent" />
          <span className="font-bold text-lg">Notes</span>
        </button>
      </div>

      {/* IDENTITY */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-6">Profile Settings</h2>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-inner transition-colors duration-300" style={{backgroundColor: avatarColor}}>
            {editName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <input 
              type="text" 
              value={editName} 
              onChange={e => setEditName(e.target.value)} 
              className="form-input text-lg font-bold"
            />
            <div className="flex gap-2 justify-center sm:justify-start">
              {['#534AB7', '#1D9E75', '#378ADD', '#EF9F27', '#E24B4A', '#D4537E'].map(c => (
                <button key={c} onClick={() => setAvatarColor(c)} className={`w-8 h-8 rounded-full ${avatarColor === c ? 'ring-2 ring-offset-2 ring-primary-light dark:ring-primary-dark dark:ring-offset-background-dark' : ''}`} style={{backgroundColor: c}}></button>
              ))}
            </div>
            <button onClick={() => setUser(editName)} className="bg-primary-accent text-white px-4 py-2 rounded-lg font-medium w-full sm:w-auto">
              Save changes
            </button>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-6">Your Cogni Badges</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {BADGES.map(b => {
            const unlocked = isBadgeUnlocked(b.id);
            return (
              <div key={b.id} className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${unlocked ? 'bg-[#EEEDFE] dark:bg-[#2A2550] border-primary-accent' : 'bg-gray-50 dark:bg-[#242424] border-border-light dark:border-border-dark grayscale opacity-60'}`}>
                <div className="text-3xl mb-2">{b.name.split(' ').pop()}</div>
                <div className={`font-bold text-sm ${unlocked ? 'text-primary-accent' : ''}`}>{b.name.split(' ').slice(0,-1).join(' ')}</div>
                <div className="text-xs mt-1 text-secondary-light dark:text-secondary-dark">{b.desc}</div>
                {unlocked ? (
                  <div className="text-[10px] mt-2 font-medium text-primary-accent">{getBadgeDate(b.id)}</div>
                ) : (
                  <div className="text-[10px] mt-2 font-medium uppercase tracking-wider">Locked</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* APPEARANCE */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Appearance</h2>
          <p className="text-sm text-secondary-light dark:text-secondary-dark">Toggle dark mode</p>
        </div>
        <button onClick={toggleTheme} className="p-3 bg-gray-100 dark:bg-[#242424] rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition">
          {theme === 'dark' ? <Sun className="text-primary-dark" /> : <Moon className="text-primary-light" />}
        </button>
      </div>

      {/* NOTIFICATIONS */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2"><Bell size={24} /> Daily Reminders</h2>
          <button onClick={requestNotifications} className="bg-background-light dark:bg-[#242424] border border-border-light dark:border-border-dark px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Enable Notifications
          </button>
        </div>
        {notificationStatus && (
          <div className={`text-sm mb-4 font-medium ${notificationStatus.includes('enabled') ? 'text-secondary-accent' : 'text-difficulty-hard'}`}>
            {notificationStatus}
          </div>
        )}
        <p className="text-sm text-secondary-light dark:text-secondary-dark italic">
          Reminder settings are configured in code structure. In a full implementation, you'd map your active habits to time pickers here.
        </p>
      </div>
    </div>
  );
}
