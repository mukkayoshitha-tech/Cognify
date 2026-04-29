import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLocalStorage, HABIT_OPTIONS_DEFAULT, HABIT_OPTIONS_UNIVERSITY, ADD_CUSTOM_HABIT_OPTION } from '../lib/store';
import { BarChart2, Flame, Lightbulb, Clock } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [user] = useLocalStorage('cognify_user', '');
  const [selectedHabit, setSelectedHabit] = useState(HABIT_OPTIONS_DEFAULT[0]);
  const [customHabit, setCustomHabit] = useState('');
  const [deadlines, setDeadlines] = useState<any[]>([]);

  const allOptions = [...HABIT_OPTIONS_DEFAULT, ...HABIT_OPTIONS_UNIVERSITY, ADD_CUSTOM_HABIT_OPTION];

  useEffect(() => {
    if (user) {
      fetchDeadlines();
    }
  }, [user]);

  const fetchDeadlines = async () => {
    const today = new Date().toLocaleDateString('en-CA'); // local YYYY-MM-DD
    const { data } = await supabase
      .from('logs')
      .select('subject, assignment_title, exam_date, due_date')
      .eq('user_name', user)
      .gte('due_date', today)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true })
      .limit(3);
    
    // Also try to fetch exam_date if it acts as deadline
    const { data: examData } = await supabase
      .from('logs')
      .select('subject, assignment_title, exam_date, due_date')
      .eq('user_name', user)
      .gte('exam_date', today)
      .not('exam_date', 'is', null)
      .order('exam_date', { ascending: true })
      .limit(3);

    const merged = [...(data || []), ...(examData || [])]
      .map(item => ({
        subject: item.subject,
        title: item.assignment_title || 'Exam',
        date: item.due_date || item.exam_date
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    setDeadlines(merged);
  };

  const handleStartTracking = async () => {
    let finalHabit = selectedHabit;
    if (selectedHabit === ADD_CUSTOM_HABIT_OPTION) {
      if (!customHabit.trim()) return;
      finalHabit = `✨ ${customHabit.trim()}`;
      // Save to custom_habits
      await supabase.from('custom_habits').insert({
        user_name: user,
        habit_name: finalHabit
      });
    }
    // Navigate to log-today with pre-selected habit
    navigate('/log-today', { state: { habit: finalHabit } });
  };

  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const diffTime = Math.abs(target.getTime() - today.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col gap-8 pb-8 fade-in-animation">
      {/* Hero Section */}
      <div className="text-center mt-8 mb-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Track every habit.<br/>Build every skill.</h1>
        <p className="text-secondary-light dark:text-secondary-dark mb-8 max-w-2xl mx-auto">
          Log your DSA progress, workouts, reading, and more — all in one place with Cognify.
        </p>
        
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              className="flex-1 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-accent"
              value={selectedHabit}
              onChange={(e) => setSelectedHabit(e.target.value)}
            >
              {allOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <button 
              onClick={handleStartTracking}
              className="bg-primary-accent text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-90 transition whitespace-nowrap"
            >
              Start Tracking &rarr;
            </button>
          </div>
          {selectedHabit === ADD_CUSTOM_HABIT_OPTION && (
            <input 
              type="text" 
              placeholder="Name your habit..."
              value={customHabit}
              onChange={(e) => setCustomHabit(e.target.value)}
              className="w-full bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-accent"
            />
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-[#EEEDFE] dark:bg-[#2A2550] rounded-lg flex items-center justify-center text-primary-accent mb-4">
            <BarChart2 size={24} />
          </div>
          <h3 className="font-bold mb-2">Visual Progress</h3>
          <p className="text-sm text-secondary-light dark:text-secondary-dark">Daily bar charts for every habit</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-[#EEEDFE] dark:bg-[#2A2550] rounded-lg flex items-center justify-center text-primary-accent mb-4">
            <Flame size={24} />
          </div>
          <h3 className="font-bold mb-2">Cogni Streaks</h3>
          <p className="text-sm text-secondary-light dark:text-secondary-dark">Stay consistent, stay motivated</p>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
          <div className="w-10 h-10 bg-[#EEEDFE] dark:bg-[#2A2550] rounded-lg flex items-center justify-center text-primary-accent mb-4">
            <Lightbulb size={24} />
          </div>
          <h3 className="font-bold mb-2">Smart Notes</h3>
          <p className="text-sm text-secondary-light dark:text-secondary-dark">Key points per topic, always handy</p>
        </div>
      </div>

      {/* Deadlines Widget */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light dark:border-border-dark flex items-center gap-2">
          <Clock size={20} className="text-primary-accent" />
          <h3 className="font-bold">Deadlines</h3>
        </div>
        <div className="p-0">
          {deadlines.length === 0 ? (
            <div className="p-6 text-center text-secondary-light dark:text-secondary-dark">
              No upcoming deadlines — you're all clear!
            </div>
          ) : (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {deadlines.map((d, i) => {
                const days = getDaysRemaining(d.date);
                let badgeColor = "bg-secondary-accent text-white"; // teal
                if (days <= 2) badgeColor = "bg-difficulty-hard text-white"; // red
                else if (days <= 5) badgeColor = "bg-difficulty-medium text-white"; // amber

                return (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#242424] transition-colors">
                    <div>
                      <p className="font-medium">{d.subject}</p>
                      <p className="text-sm text-secondary-light dark:text-secondary-dark">{d.title}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                      {days === 0 ? 'Today' : `${days}d`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
