import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalStorage, HABIT_OPTIONS_DEFAULT, HABIT_OPTIONS_UNIVERSITY } from '../lib/store';
import { BookOpen } from 'lucide-react';

export default function Notes() {
  const [user] = useLocalStorage('cognify_user', '');
  const [notes, setNotes] = useState<any[]>([]);
  const [filterHabit, setFilterHabit] = useState('All habits');

  const allHabits = ['All habits', ...HABIT_OPTIONS_DEFAULT, ...HABIT_OPTIONS_UNIVERSITY];

  useEffect(() => {
    fetchNotes();
  }, [user, filterHabit]);

  const fetchNotes = async () => {
    let query = supabase
      .from('logs')
      .select('*')
      .eq('user_name', user)
      .not('note', 'is', null)
      .order('created_at', { ascending: false });

    if (filterHabit !== 'All habits') {
      query = query.eq('habit', filterHabit);
    }

    const { data } = await query;
    setNotes((data || []).filter(d => d.note.trim() !== ''));
  };

  const getBorderColor = (habit: string) => {
    if (['DSA & Coding', 'Career & Projects'].includes(habit)) return 'border-l-primary-accent bg-[#EEEDFE] dark:bg-[#2A2550]';
    if (['Reading a Book', 'Assignment Tracker', 'Exam Preparation'].includes(habit)) return 'border-l-secondary-accent bg-[#E5F5EF] dark:bg-[#1A3028]';
    if (habit === 'Exercise & Workout') return 'border-l-[#EF9F27] bg-[#FDF5E9] dark:bg-[#3D2E1A]';
    if (['Meditation', 'Water Intake', 'Sleep Tracking', 'Attendance Log'].includes(habit)) return 'border-l-[#378ADD] bg-[#EBF3FB] dark:bg-[#1C2C3D]';
    return 'border-l-[#D4537E] bg-[#FBEFF3] dark:bg-[#3A1F2A]'; // Custom
  };

  return (
    <div className="flex flex-col gap-6 fade-in-animation">
      <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="text-secondary-accent" size={28} />
            <h2 className="text-2xl font-bold">All Notes</h2>
          </div>
          <select 
            className="form-input w-auto py-2 text-sm"
            value={filterHabit}
            onChange={e => setFilterHabit(e.target.value)}
          >
            {allHabits.map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-4">
          {notes.length === 0 ? (
            <div className="text-center py-8 text-secondary-light dark:text-secondary-dark">
              No notes found. Add some notes when you log your habits!
            </div>
          ) : (
            notes.map(note => {
              const dateObj = new Date(note.date);
              const dateStr = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={note.id} className={`p-4 rounded-r-xl border-l-4 ${getBorderColor(note.habit)} shadow-sm transition-transform hover:-translate-y-0.5`}>
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-xs text-secondary-light dark:text-secondary-dark font-medium uppercase tracking-wider">
                      {note.habit}
                    </div>
                    <div className="text-xs text-secondary-light dark:text-secondary-dark font-medium">
                      {dateStr}
                    </div>
                  </div>
                  <div className="font-bold text-lg mb-2 text-primary-light dark:text-primary-dark">
                    {note.topic || note.description || 'Log update'}
                  </div>
                  <p className="text-sm text-primary-light dark:text-primary-dark whitespace-pre-wrap">
                    {note.note}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
