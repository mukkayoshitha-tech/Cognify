import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalStorage } from '../lib/store';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function Dashboard() {
  const [user] = useLocalStorage('cognify_user', '');
  const [activeHabits, setActiveHabits] = useState<any[]>([]);
  const [selectedHabit, setSelectedHabit] = useState('');
  
  const [chartData, setChartData] = useState<any[]>([]);
  const [calendarData, setCalendarData] = useState<any[]>([]);
  
  // Metrics
  const [metrics, setMetrics] = useState({ streak: 0, questions: 0, concepts: 0, thisWeek: 0 });

  useEffect(() => {
    if (user) {
      fetchUserHabits();
      fetchTopMetrics();
    }
  }, [user]);

  useEffect(() => {
    if (selectedHabit) {
      fetchProgressData(selectedHabit);
    }
  }, [selectedHabit]);

  const fetchUserHabits = async () => {
    const { data } = await supabase
      .from('logs')
      .select('habit, created_at, topic, description, date')
      .eq('user_name', user)
      .order('created_at', { ascending: false });
      
    if (!data) return;

    // Distinct habits
    const distinct = Array.from(new Set(data.map(d => d.habit)));
    
    // Build active habits list with last log and streak
    const active = distinct.map(h => {
      const hLogs = data.filter(d => d.habit === h);
      const last = hLogs[0];
      
      // Calculate streak
      const distinctDates = Array.from(new Set(hLogs.map(d => d.date))).sort().reverse();
      let streak = 0;
      let current = new Date();
      current.setHours(0,0,0,0);
      
      const todayStr = current.toLocaleDateString('en-CA');
      if (distinctDates[0] !== todayStr) {
        current.setDate(current.getDate() - 1);
      }

      for (const d of distinctDates) {
        if (d === current.toLocaleDateString('en-CA')) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else if (d > current.toLocaleDateString('en-CA')) {
          continue;
        } else {
          break;
        }
      }

      return {
        habit: h,
        summary: last.topic || last.description || 'Logged',
        streak
      };
    });

    setActiveHabits(active);
    if (active.length > 0) setSelectedHabit(active[0].habit);
  };

  const fetchTopMetrics = async () => {
    const { data } = await supabase.from('logs').select('*').eq('user_name', user);
    if (!data) return;

    // Questions solved
    const questions = data.reduce((acc, log) => acc + (log.questions_easy || 0) + (log.questions_medium || 0) + (log.questions_hard || 0), 0);
    
    // Concepts
    const concepts = new Set(data.map(d => d.topic).filter(Boolean)).size;

    // This week questions
    const sevenDaysAgo = subDays(new Date(), 7).toLocaleDateString('en-CA');
    const thisWeek = data
      .filter(d => d.date >= sevenDaysAgo)
      .reduce((acc, log) => acc + (log.questions_easy || 0) + (log.questions_medium || 0) + (log.questions_hard || 0), 0);

    setMetrics(prev => ({ ...prev, questions, concepts, thisWeek }));
    // streak metric is highest streak which we can find from activeHabits later
  };

  useEffect(() => {
    if (activeHabits.length > 0) {
      const maxStreak = Math.max(...activeHabits.map(h => h.streak));
      setMetrics(prev => ({ ...prev, streak: maxStreak }));
    }
  }, [activeHabits]);

  const fetchProgressData = async (habit: string) => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    
    // Chart Data
    const { data: chartLogs } = await supabase
      .from('logs')
      .select('*')
      .eq('user_name', user)
      .eq('habit', habit)
      .gte('date', sevenDaysAgo.toLocaleDateString('en-CA'));
      
    const cData = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      const dStr = d.toLocaleDateString('en-CA');
      const dayLogs = chartLogs?.filter(l => l.date === dStr) || [];
      
      const entry: any = { name: format(d, 'EEE') };
      
      if (['DSA & Coding', 'Career & Projects'].includes(habit)) {
        entry.easy = dayLogs.reduce((acc, l) => acc + (l.questions_easy || 0), 0);
        entry.medium = dayLogs.reduce((acc, l) => acc + (l.questions_medium || 0), 0);
        entry.hard = dayLogs.reduce((acc, l) => acc + (l.questions_hard || 0), 0);
      } else if (habit === 'Reading a Book') {
        entry.value = dayLogs.reduce((acc, l) => acc + (l.pages || 0), 0);
      } else if (habit === 'Exercise & Workout') {
        entry.value = dayLogs.reduce((acc, l) => acc + (l.duration || 0), 0);
      } else if (['Assignment Tracker', 'Exam Preparation'].includes(habit)) {
        entry.value = dayLogs.reduce((acc, l) => acc + (l.hours_studied || 0), 0);
      } else if (habit === 'Attendance Log') {
        entry.value = dayLogs.reduce((acc, l) => acc + (l.classes_attended || 0), 0);
      } else {
        // Amount based
        entry.value = dayLogs.reduce((acc, l) => {
          let val = 0;
          if (l.amount) {
            const parsed = parseFloat(l.amount);
            if (!isNaN(parsed)) val = parsed;
          }
          if (val === 0 && l.duration) val = l.duration; // fallback
          return acc + val;
        }, 0);
      }
      
      cData.push(entry);
    }
    setChartData(cData);

    // Calendar Data
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    
    const { data: calLogs } = await supabase
      .from('logs')
      .select('date')
      .eq('user_name', user)
      .eq('habit', habit)
      .gte('date', monthStart.toLocaleDateString('en-CA'))
      .lte('date', monthEnd.toLocaleDateString('en-CA'));
      
    const logDates = new Set(calLogs?.map(l => l.date));
    
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add padding for start day of week
    const startDayOfWeek = monthStart.getDay(); // 0 = Sun
    const paddedDays = Array(startDayOfWeek).fill(null).concat(days);
    
    const calData = paddedDays.map(d => {
      if (!d) return null;
      const dStr = format(d, 'yyyy-MM-dd'); // local
      const todayStr = format(today, 'yyyy-MM-dd');
      
      let state = 'missed'; // default past
      if (logDates.has(dStr)) state = 'completed';
      else if (dStr === todayStr) state = 'today';
      else if (d > today) state = 'future';
      
      return { date: d, state };
    });
    
    setCalendarData(calData);
  };

  const getBarColor = (habit: string) => {
    if (['Reading a Book', 'Assignment Tracker', 'Exam Preparation'].includes(habit)) return '#1D9E75'; // teal
    if (habit === 'Exercise & Workout') return '#EF9F27'; // amber
    if (['Meditation', 'Water Intake', 'Sleep Tracking', 'Language Learning', 'Journaling', 'Music Practice', 'Nutrition & Diet', 'Attendance Log'].includes(habit)) return '#378ADD'; // blue
    if (habit.startsWith('✨')) return '#534AB7'; // purple
    return '#534AB7';
  };

  return (
    <div className="flex flex-col gap-8 fade-in-animation">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl mb-1">🔥</div>
          <div className="text-2xl font-bold text-primary-accent">{metrics.streak}</div>
          <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase tracking-wider font-semibold">Cogni Streak</div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold">{metrics.questions}</div>
          <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase tracking-wider font-semibold">Questions Solved</div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold">{metrics.concepts}</div>
          <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase tracking-wider font-semibold">Concepts Learned</div>
        </div>
        <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-4 rounded-xl flex flex-col items-center justify-center text-center">
          <div className="text-2xl font-bold">{metrics.thisWeek}</div>
          <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase tracking-wider font-semibold">This Week</div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">View Your Progress</h2>
          <select 
            className="form-input w-auto py-2 bg-gray-50 dark:bg-[#1A1A1A]"
            value={selectedHabit}
            onChange={e => setSelectedHabit(e.target.value)}
          >
            {activeHabits.map(h => <option key={h.habit} value={h.habit}>{h.habit}</option>)}
          </select>
        </div>

        {selectedHabit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#A0A0A0" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}
                  />
                  {['DSA & Coding', 'Career & Projects'].includes(selectedHabit) ? (
                    <>
                      <Bar dataKey="easy" stackId="a" fill="#97C459" radius={[0,0,4,4]} />
                      <Bar dataKey="medium" stackId="a" fill="#EF9F27" />
                      <Bar dataKey="hard" stackId="a" fill="#E24B4A" radius={[4,4,0,0]} />
                    </>
                  ) : (
                    <Bar dataKey="value" fill={getBarColor(selectedHabit)} radius={[4,4,4,4]} />
                  )}
                </BarChart>
              </ResponsiveContainer>
              {['DSA & Coding', 'Career & Projects'].includes(selectedHabit) && (
                <div className="flex justify-center gap-4 mt-2 text-xs">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#97C459] rounded-sm"></div> Easy</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#EF9F27] rounded-sm"></div> Medium</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#E24B4A] rounded-sm"></div> Hard</span>
                </div>
              )}
            </div>

            {/* Calendar */}
            <div>
              <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-bold text-secondary-light dark:text-secondary-dark">
                {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarData.map((d, i) => {
                  if (!d) return <div key={i} className="aspect-square"></div>;
                  let bg = 'bg-transparent';
                  if (d.state === 'completed') bg = 'bg-primary-accent';
                  else if (d.state === 'today') bg = 'bg-secondary-accent'; // teal
                  else if (d.state === 'missed') bg = 'bg-[#E5E5E5] dark:bg-[#2A2A2A]';
                  
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square rounded-md ${bg}`}
                      title={format(d.date, 'MMM d')}
                    ></div>
                  );
                })}
              </div>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-primary-accent rounded-sm"></div> Completed</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-secondary-accent rounded-sm"></div> Today</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-[#E5E5E5] dark:bg-[#2A2A2A] rounded-sm"></div> Missed</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Active Habits */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4">All Active Habits</h2>
        <div className="divide-y divide-border-light dark:divide-border-dark">
          {activeHabits.map((h, i) => (
            <div key={i} className="py-4 flex justify-between items-center first:pt-0 last:pb-0">
              <div>
                <div className="font-bold">{h.habit}</div>
                <div className="text-sm text-secondary-light dark:text-secondary-dark truncate max-w-[200px] sm:max-w-md">{h.summary}</div>
              </div>
              <div className="bg-[#EEEDFE] dark:bg-[#2A2550] text-primary-accent px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                Cogni Streak: {h.streak} days
              </div>
            </div>
          ))}
          {activeHabits.length === 0 && (
            <div className="text-center text-secondary-light py-4">No habits logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
