import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalStorage } from '../lib/store';
import { callGeminiAPI } from '../lib/gemini';
import { LineChart, Line, AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Download } from 'lucide-react';

export default function Reports() {
  const [user] = useLocalStorage('cognify_user', '');
  const [xp] = useLocalStorage('cognify_xp', 0);
  
  const [weeklyStats, setWeeklyStats] = useState({ logs: 0, consistent: '', streak: 0, bestDay: '' });
  const [weeklyChart, setWeeklyChart] = useState<any[]>([]);
  const [activeLines, setActiveLines] = useState<string[]>([]);
  
  const [monthlyStats, setMonthlyStats] = useState({ logs: 0, compareLogs: 0, percent: 0, topHabit: '' });
  const [heatmap, setHeatmap] = useState<any[]>([]);
  const [monthlyChart, setMonthlyChart] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    fetchWeekly();
    fetchMonthly();
  }, [user]);

  const fetchWeekly = async () => {
    const today = new Date();
    const startW = startOfWeek(today, { weekStartsOn: 1 }); // Mon
    const endW = endOfWeek(today, { weekStartsOn: 1 }); // Sun

    const { data } = await supabase
      .from('logs')
      .select('*')
      .eq('user_name', user)
      .gte('date', format(startW, 'yyyy-MM-dd'))
      .lte('date', format(endW, 'yyyy-MM-dd'));

    if (!data) return;

    const days = eachDayOfInterval({ start: startW, end: endW });
    const cData: any[] = [];
    const habitLines = new Set<string>();
    
    let maxLogs = -1;
    let bestDayStr = '';

    days.forEach(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const dayLogs = data.filter(l => l.date === dStr);
      
      const entry: any = { name: format(d, 'EEE') };
      const habitCounts: Record<string, number> = {};
      
      dayLogs.forEach(l => {
        habitCounts[l.habit] = (habitCounts[l.habit] || 0) + 1;
        habitLines.add(l.habit);
      });

      Object.assign(entry, habitCounts);
      cData.push(entry);

      if (dayLogs.length > maxLogs) {
        maxLogs = dayLogs.length;
        bestDayStr = format(d, 'EEEE');
      }
    });

    setWeeklyChart(cData);
    setActiveLines(Array.from(habitLines));

    // Stats
    const habitTotals: Record<string, number> = {};
    data.forEach(l => habitTotals[l.habit] = (habitTotals[l.habit] || 0) + 1);
    
    let topHabit = '';
    let topCount = 0;
    Object.entries(habitTotals).forEach(([h, c]) => {
      if (c > topCount) { topCount = c; topHabit = h; }
    });

    setWeeklyStats({
      logs: data.length,
      consistent: topHabit || 'None',
      streak: 0, // Placeholder
      bestDay: bestDayStr
    });
  };

  const fetchMonthly = async () => {
    const today = new Date();
    const startM = startOfMonth(today);
    const endM = endOfMonth(today);
    const lastMStart = startOfMonth(subDays(startM, 1));
    const lastMEnd = endOfMonth(subDays(startM, 1));

    const { data: mData } = await supabase.from('logs').select('date, habit').eq('user_name', user).gte('date', format(startM, 'yyyy-MM-dd')).lte('date', format(endM, 'yyyy-MM-dd'));
    const { data: lastMData } = await supabase.from('logs').select('id').eq('user_name', user).gte('date', format(lastMStart, 'yyyy-MM-dd')).lte('date', format(lastMEnd, 'yyyy-MM-dd'));

    if (!mData) return;

    // Heatmap
    const days = eachDayOfInterval({ start: startM, end: endM });
    const startDayOfWeek = startM.getDay(); // 0 = Sun
    const paddedDays = Array(startDayOfWeek).fill(null).concat(days);
    
    const hMap = paddedDays.map(d => {
      if (!d) return null;
      const count = mData.filter(l => l.date === format(d, 'yyyy-MM-dd')).length;
      let color = '#E5E5E5';
      if (count === 1) color = '#AFA9EC';
      else if (count === 2) color = '#7F77DD';
      else if (count === 3) color = '#534AB7';
      else if (count >= 4) color = '#26215C';
      return { date: d, count, color };
    });
    setHeatmap(hMap);

    // Stats
    const thisCount = mData.length;
    const lastCount = lastMData?.length || 0;
    let pct = 0;
    if (lastCount === 0 && thisCount > 0) pct = 100;
    else if (lastCount > 0) pct = Math.round(((thisCount - lastCount) / lastCount) * 100);

    const habitTotals: Record<string, number> = {};
    mData.forEach(l => habitTotals[l.habit] = (habitTotals[l.habit] || 0) + 1);
    let topHabit = '';
    let topCount = 0;
    Object.entries(habitTotals).forEach(([h, c]) => {
      if (c > topCount) { topCount = c; topHabit = h; }
    });

    setMonthlyStats({
      logs: thisCount,
      compareLogs: lastCount,
      percent: pct,
      topHabit
    });

    // 8 Weeks Area Chart
    const eightWeeksAgo = subDays(today, 56);
    const { data: areaData } = await supabase.from('logs').select('date').eq('user_name', user).eq('habit', topHabit).gte('date', format(eightWeeksAgo, 'yyyy-MM-dd'));
    
    const aData = [];
    for (let i = 0; i < 8; i++) {
      const wStart = subDays(today, (7-i)*7);
      const wEnd = subDays(today, (7-i-1)*7);
      const wCount = areaData?.filter(l => l.date >= format(wStart, 'yyyy-MM-dd') && l.date < format(wEnd, 'yyyy-MM-dd')).length || 0;
      aData.push({ name: `W${i+1}`, logs: wCount });
    }
    setMonthlyChart(aData);

    // AI Summary
    if (thisCount > 0 && !aiSummary) {
      try {
        const res = await callGeminiAPI(
          "You are Cogni Coach.",
          `In exactly 2 warm, specific sentences, summarize this Cognify user's growth this month based on ${thisCount} total logs, mostly focusing on '${topHabit}'. Give them one motivating insight.`
        );
        setAiSummary(res);
      } catch (e) {
        setAiSummary("You've been making steady progress this month. Keep up the momentum!");
      }
    }
  };

  const downloadReport = () => {
    const text = `COGNIFY GROWTH REPORT
-----------------------
Name: ${user}
Total XP: ${xp}

WEEKLY SUMMARY
Logs this week: ${weeklyStats.logs}
Most consistent habit: ${weeklyStats.consistent}
Best day: ${weeklyStats.bestDay}

MONTHLY SUMMARY
Logs this month: ${monthlyStats.logs} (${monthlyStats.percent >= 0 ? '+' : ''}${monthlyStats.percent}% vs last month)
Top habit: ${monthlyStats.topHabit}

Cogni Coach says:
${aiSummary}
-----------------------
Generated on ${new Date().toLocaleDateString()}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognify-report-${format(new Date(), 'MMM-yyyy')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLineColor = (index: number, habit: string) => {
    if (['DSA & Coding', 'Career & Projects'].includes(habit)) return '#534AB7';
    if (['Reading a Book'].includes(habit)) return '#1D9E75';
    if (habit === 'Exercise & Workout') return '#EF9F27';
    const colors = ['#378ADD', '#D4537E', '#97C459', '#AFA9EC'];
    return colors[index % colors.length];
  };

  return (
    <div className="flex flex-col gap-8 fade-in-animation pb-8">
      <div className="flex justify-between items-center mt-4">
        <h1 className="text-3xl font-bold">Your Growth Reports</h1>
        <button onClick={downloadReport} className="flex items-center gap-2 bg-gray-100 dark:bg-[#242424] px-4 py-2 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-800 transition">
          <Download size={18} /> Export
        </button>
      </div>

      {/* WEEKLY */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Weekly Report (Mon–Sun)</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg">
            <div className="text-2xl font-bold">{weeklyStats.logs}</div>
            <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase font-semibold">Logs this week</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg">
            <div className="text-lg font-bold truncate">{weeklyStats.consistent}</div>
            <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase font-semibold">Most consistent</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg">
            <div className="text-2xl font-bold">{weeklyStats.bestDay}</div>
            <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase font-semibold">Best Day</div>
          </div>
          <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg">
            <div className="text-2xl font-bold text-primary-accent">{xp}</div>
            <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase font-semibold">Total XP Earned</div>
          </div>
        </div>

        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyChart}>
              <XAxis dataKey="name" stroke="#A0A0A0" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }} />
              {activeLines.map((h, i) => (
                <Line key={h} type="monotone" dataKey={h} stroke={getLineColor(i, h)} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* MONTHLY */}
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <h2 className="text-xl font-bold mb-4">Monthly Report</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-secondary-light mb-2">
              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {heatmap.map((d, i) => {
                if (!d) return <div key={i} className="aspect-square"></div>;
                return (
                  <div key={i} className="aspect-square rounded-sm transition-colors" style={{ backgroundColor: d.color }} title={`${format(d.date, 'MMM d')}: ${d.count} logs`}></div>
                );
              })}
            </div>
            <div className="flex justify-end gap-1 mt-2 text-[10px] items-center">
              <span>Less</span>
              {['#E5E5E5', '#AFA9EC', '#7F77DD', '#534AB7', '#26215C'].map(c => <div key={c} className="w-3 h-3 rounded-sm" style={{backgroundColor: c}}></div>)}
              <span>More</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-gray-50 dark:bg-[#1A1A1A] p-4 rounded-lg flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold">{monthlyStats.logs}</div>
                <div className="text-xs text-secondary-light dark:text-secondary-dark uppercase font-semibold">Total Logs</div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold ${monthlyStats.percent >= 0 ? 'bg-[#E5F5EF] text-[#1D9E75] dark:bg-[#1A3028]' : 'bg-[#FBEFF3] text-[#E24B4A] dark:bg-[#3A1F2A]'}`}>
                {monthlyStats.percent >= 0 ? '↑' : '↓'} {Math.abs(monthlyStats.percent)}% vs Last Month
              </div>
            </div>
            
            <div className="h-32 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyChart}>
                  <defs>
                    <linearGradient id="colorLogs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#534AB7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#534AB7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }} />
                  <Area type="monotone" dataKey="logs" stroke="#1D9E75" strokeWidth={2} fillOpacity={1} fill="url(#colorLogs)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-secondary-light mt-1">8-Week Trend ({monthlyStats.topHabit})</div>
            </div>
          </div>
        </div>

        {/* AI Summary Quote */}
        {aiSummary && (
          <div className="p-4 rounded-r-xl border-l-4 border-primary-accent bg-[#EEEDFE] dark:bg-[#2A2550] shadow-sm italic text-primary-light dark:text-primary-dark relative">
            <span className="text-xs font-bold text-primary-accent uppercase tracking-wider not-italic mb-2 block">Cogni Coach says...</span>
            "{aiSummary}"
          </div>
        )}
      </div>
    </div>
  );
}
