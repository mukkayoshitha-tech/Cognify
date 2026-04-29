import confetti from 'canvas-confetti';
import { supabase } from './supabase';

export const BADGES = [
  { id: 'first_step', name: 'First Step 🌱', desc: 'Log your first habit' },
  { id: 'warrior_7', name: '7-Day Warrior 🥉', desc: 'Reach a 7-day Cogni Streak on any habit' },
  { id: 'multi_tracker', name: 'Multi-Tracker 🎯', desc: 'Log 3+ different habits on the same day' },
  { id: 'night_owl', name: 'Night Owl 🦉', desc: 'Log a habit between 10 PM and 12 AM' },
  { id: 'early_bird', name: 'Early Bird 🌅', desc: 'Log a habit between 5 AM and 8 AM' },
  { id: 'legend_30', name: '30-Day Legend 🥈', desc: 'Reach a 30-day Cogni Streak on any habit' },
  { id: 'squad_captain', name: 'Squad Captain ⚡', desc: 'Create your first squad' },
  { id: 'knowledge_seeker', name: 'Knowledge Seeker 💻', desc: 'Log 10+ DSA & Coding sessions' },
  { id: 'bookworm', name: 'Bookworm 📚', desc: 'Log 10+ Reading sessions' }
];

export async function checkBadges(user: string, currentBadgesStr: string) {
  const currentBadges = currentBadgesStr ? JSON.parse(currentBadgesStr) : [];
  const newBadges: typeof currentBadges = [];
  const newlyUnlocked: string[] = [];

  const hasBadge = (id: string) => currentBadges.some((b: any) => b.id === id && b.unlocked);

  const unlock = (id: string) => {
    if (!hasBadge(id)) {
      const b = { id, unlocked: true, unlockedDate: new Date().toISOString() };
      newBadges.push(b);
      newlyUnlocked.push(BADGES.find(x => x.id === id)?.name);
    }
  };

  try {
    const { data: logs } = await supabase.from('logs').select('*').eq('user_name', user);
    if (!logs || logs.length === 0) return { newlyUnlocked, newBadgesList: currentBadges };

    // first_step
    unlock('first_step');

    // Time based
    logs.forEach(log => {
      const h = new Date(log.created_at).getHours();
      if (h >= 22 || h <= 23) unlock('night_owl');
      if (h >= 5 && h <= 7) unlock('early_bird');
    });

    // Multi-tracker: group by date (local), count distinct habits
    const dateHabits: Record<string, Set<string>> = {};
    logs.forEach(log => {
      if (!dateHabits[log.date]) dateHabits[log.date] = new Set();
      dateHabits[log.date].add(log.habit);
    });
    if (Object.values(dateHabits).some(s => s.size >= 3)) {
      unlock('multi_tracker');
    }

    // specific counts
    const dsaCount = logs.filter(l => l.habit === 'DSA & Coding').length;
    if (dsaCount >= 10) unlock('knowledge_seeker');

    const readingCount = logs.filter(l => l.habit === 'Reading a Book').length;
    if (readingCount >= 10) unlock('bookworm');

    // streaks
    // (A full streak check takes more logic, we can simplify here by relying on DB aggregation or just grouping)
    // For simplicity, we assume we calculate streak elsewhere or do a quick check
    const habitStreaks: Record<string, number> = {};
    // ... complete streak logic would go here, omitting for brevity or using a helper function.
    // If we want exact streak logic:
    const today = new Date().toLocaleDateString('en-CA');
    
    for (const habit of new Set(logs.map(l => l.habit))) {
      const habitLogs = logs.filter(l => l.habit === habit).map(l => l.date).sort().reverse();
      const distinctDates = Array.from(new Set(habitLogs));
      let streak = 0;
      let current = new Date(today);
      
      // If today has no log, check yesterday
      if (distinctDates[0] !== today) {
        current.setDate(current.getDate() - 1);
      }

      for (const d of distinctDates) {
        if (d === current.toLocaleDateString('en-CA')) {
          streak++;
          current.setDate(current.getDate() - 1);
        } else if (d > current.toLocaleDateString('en-CA')) {
          continue; // multiple logs same day or newer
        } else {
          break; // streak broken
        }
      }
      
      if (streak >= 7) unlock('warrior_7');
      if (streak >= 30) unlock('legend_30');
    }

    // Squads
    const { count: squadCount } = await supabase.from('squads').select('*', { count: 'exact', head: true }).eq('created_by', user);
    if (squadCount && squadCount > 0) unlock('squad_captain');

  } catch (e) {
    console.error(e);
  }

  const finalBadgesList = [...currentBadges, ...newBadges];
  return { newlyUnlocked, newBadgesList: finalBadgesList };
}

export function triggerConfetti() {
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#534AB7', '#1D9E75']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#534AB7', '#1D9E75']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
}
