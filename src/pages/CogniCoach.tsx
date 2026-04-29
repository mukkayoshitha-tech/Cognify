import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useLocalStorage } from '../lib/store';
import { callGeminiAPI } from '../lib/gemini';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { subDays } from 'date-fns';

export default function CogniCoach() {
  const navigate = useNavigate();
  const [user] = useLocalStorage('cognify_user', '');
  const [aiCache, setAiCache] = useLocalStorage<any>('cognify_ai_cache', null);
  
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [atRiskHabits, setAtRiskHabits] = useState<any[]>([]);

  useEffect(() => {
    if (aiCache && aiCache.timestamp) {
      const isFresh = (new Date().getTime() - new Date(aiCache.timestamp).getTime()) < 24 * 60 * 60 * 1000;
      if (isFresh && aiCache.insights) {
        setInsights(aiCache.insights);
      }
    }
    fetchForecast();
  }, [user]);

  const fetchForecast = async () => {
    const today = new Date();
    const fourteenAgo = subDays(today, 14).toLocaleDateString('en-CA');
    
    const { data } = await supabase
      .from('logs')
      .select('habit, date')
      .eq('user_name', user)
      .gte('date', fourteenAgo);
      
    if (!data) return;

    const sevenAgo = subDays(today, 7).toLocaleDateString('en-CA');
    
    const olderHalf = new Set(data.filter(d => d.date < sevenAgo).map(d => d.habit));
    const recentHalf = new Set(data.filter(d => d.date >= sevenAgo).map(d => d.habit));
    
    const atRisk = [];
    for (const h of Array.from(olderHalf)) {
      if (!recentHalf.has(h)) {
        // Find days since last logged
        const lastLogDate = data.filter(d => d.habit === h).map(d => d.date).sort().reverse()[0];
        const daysSince = Math.floor((today.getTime() - new Date(lastLogDate).getTime()) / (1000*3600*24));
        atRisk.push({ habit: h, days: daysSince });
      }
    }
    setAtRiskHabits(atRisk);
  };

  const getInsights = async () => {
    setLoading(true);
    try {
      const thirtyAgo = subDays(new Date(), 30).toLocaleDateString('en-CA');
      const { data } = await supabase
        .from('logs')
        .select('habit, date, topic, amount, duration')
        .eq('user_name', user)
        .gte('date', thirtyAgo);

      const promptData = JSON.stringify(data || []);
      
      const response = await callGeminiAPI(
        "You are Cogni Coach, a warm and intelligent personal growth advisor inside the Cognify app. Be specific, actionable, and encouraging.",
        `Here are my habit logs for the last 30 days: ${promptData}. Analyze my consistency patterns and give me exactly 3 specific, actionable suggestions to improve. Return ONLY a valid JSON array with objects: {title, suggestion, habit}`
      );
      
      const parsed = JSON.parse(response);
      setInsights(parsed);
      setAiCache({ timestamp: new Date().toISOString(), insights: parsed });
    } catch (e) {
      console.error(e);
      // Fallback or handle error
      setInsights([{
        title: "Stay Consistent",
        suggestion: "Keep logging your habits daily to see insights here. The more you log, the better the AI can help!",
        habit: "General"
      }]);
    }
    setLoading(false);
  };

  const getBorderColor = (habit: string) => {
    if (['DSA & Coding', 'Career & Projects'].includes(habit)) return 'border-l-primary-accent bg-[#EEEDFE] dark:bg-[#2A2550]';
    if (['Reading a Book', 'Assignment Tracker', 'Exam Preparation'].includes(habit)) return 'border-l-secondary-accent bg-[#E5F5EF] dark:bg-[#1A3028]';
    if (habit === 'Exercise & Workout') return 'border-l-[#EF9F27] bg-[#FDF5E9] dark:bg-[#3D2E1A]';
    if (['Meditation', 'Water Intake', 'Sleep Tracking', 'Attendance Log'].includes(habit)) return 'border-l-[#378ADD] bg-[#EBF3FB] dark:bg-[#1C2C3D]';
    if (habit === 'General') return 'border-l-primary-light dark:border-l-primary-dark bg-gray-50 dark:bg-[#242424]';
    return 'border-l-[#D4537E] bg-[#FBEFF3] dark:bg-[#3A1F2A]'; // Custom
  };

  return (
    <div className="flex flex-col gap-8 fade-in-animation">
      <div className="text-center mt-4 mb-2">
        <h1 className="text-3xl font-bold flex justify-center items-center gap-3">
          <Sparkles className="text-primary-accent" />
          Your Personal Cogni Coach
        </h1>
        <p className="text-secondary-light dark:text-secondary-dark mt-2">
          AI-powered insights built from your actual habit data.
        </p>
      </div>

      <div className="flex justify-center">
        <button 
          onClick={getInsights}
          disabled={loading}
          className="bg-primary-accent text-white px-8 py-3 rounded-lg font-bold shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
        >
          {loading ? 'Analyzing your progress...' : 'Get Today\'s Insight'}
        </button>
      </div>

      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((ins, i) => (
            <div key={i} className={`p-5 rounded-r-xl border-l-4 ${getBorderColor(ins.habit)} shadow-sm`}>
              <div className="text-xs font-bold uppercase tracking-wider mb-2 text-secondary-light dark:text-secondary-dark">{ins.habit}</div>
              <h3 className="font-bold text-lg mb-2">{ins.title}</h3>
              <p className="text-sm">{ins.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* FORECAST */}
      <div className="mt-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="text-[#EF9F27]" />
          Habit Forecast
        </h2>
        
        {atRiskHabits.length === 0 ? (
          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm text-center text-secondary-light">
            All your recent habits are on track! No streaks are currently at risk.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {atRiskHabits.map((risk, i) => (
              <div key={i} className="bg-[#FDF5E9] dark:bg-[#3D2E1A] border border-[#EF9F27] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <p className="font-bold text-[#EF9F27]">{risk.habit} — At Risk</p>
                  <p className="text-sm text-primary-light dark:text-primary-dark mt-1">
                    You haven't logged this in {risk.days} days. Your Cogni Streak is at risk.
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/log-today', { state: { habit: risk.habit } })}
                  className="bg-[#EF9F27] text-white px-4 py-2 rounded-lg font-medium whitespace-nowrap"
                >
                  Log it now &rarr;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
