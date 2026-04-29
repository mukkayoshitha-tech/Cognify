import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocalStorage, HABIT_OPTIONS_DEFAULT, HABIT_OPTIONS_UNIVERSITY } from '../lib/store';
import { Users, Trophy, Copy, Check } from 'lucide-react';
import { subDays } from 'date-fns';

export default function Friends() {
  const [user] = useLocalStorage('cognify_user', '');
  const [inviteCode, setInviteCode] = useLocalStorage('cognify_invite_code', '');

  // Squads
  const [squads, setSquads] = useState<any[]>([]);
  const [newSquadName, setNewSquadName] = useState('');
  const [joinSquadCode, setJoinSquadCode] = useState('');
  const [squadError, setSquadError] = useState('');
  const [copiedCode, setCopiedCode] = useState('');

  // Challenges
  const [challenges, setChallenges] = useState<any[]>([]);
  const [newChallenge, setNewChallenge] = useState({ title: '', habit: HABIT_OPTIONS_DEFAULT[0], duration_days: 7, stake_label: '' });
  const [joinChallengeCode, setJoinChallengeCode] = useState('');
  const [challengeError, setChallengeError] = useState('');

  const allHabits = [...HABIT_OPTIONS_DEFAULT, ...HABIT_OPTIONS_UNIVERSITY];

  useEffect(() => {
    if (!inviteCode && user) {
      const code = (user.substring(0,3) + Math.random().toString(36).substring(2,5)).toUpperCase();
      setInviteCode(code);
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Squads
    const { data: memberData } = await supabase.from('squad_members').select('squad_id').eq('user_name', user);
    if (memberData && memberData.length > 0) {
      const squadIds = memberData.map(m => m.squad_id);
      const { data: squadData } = await supabase.from('squads').select('*').in('id', squadIds);
      
      const enrichedSquads = await Promise.all((squadData || []).map(async (sq) => {
        const { data: members } = await supabase.from('squad_members').select('user_name').eq('squad_id', sq.id);
        const memberNames = members?.map(m => m.user_name) || [];
        
        // Fetch logs for these members in last 7 days
        const sevenDaysAgo = subDays(new Date(), 7).toLocaleDateString('en-CA');
        const { data: logs } = await supabase.from('logs').select('user_name, date').in('user_name', memberNames).gte('date', sevenDaysAgo);
        
        const leaderboard = memberNames.map(name => {
          const mLogs = logs?.filter(l => l.user_name === name) || [];
          const distinctDates = new Set(mLogs.map(l => l.date)).size;
          return { name, habitsThisWeek: distinctDates, longestStreak: distinctDates }; // Simplified streak for UI
        }).sort((a, b) => b.habitsThisWeek - a.habitsThisWeek);

        return { ...sq, leaderboard };
      }));
      setSquads(enrichedSquads);
    } else {
      setSquads([]);
    }

    // Challenges
    const { data: partData } = await supabase.from('challenge_participants').select('challenge_id').eq('user_name', user);
    if (partData && partData.length > 0) {
      const chalIds = partData.map(p => p.challenge_id);
      const { data: chalData } = await supabase.from('challenges').select('*').in('id', chalIds);
      
      const todayStr = new Date().toLocaleDateString('en-CA');
      const active = [];
      const past = [];

      for (const ch of (chalData || [])) {
        const { data: participants } = await supabase.from('challenge_participants').select('user_name').eq('challenge_id', ch.id);
        const partNames = participants?.map(p => p.user_name) || [];
        
        const { data: logs } = await supabase.from('logs').select('user_name, date').eq('habit', ch.habit).in('user_name', partNames).gte('date', ch.start_date).lte('date', todayStr);
        
        const leaderboard = partNames.map(name => {
          const pLogs = logs?.filter(l => l.user_name === name) || [];
          const distinctDates = new Set(pLogs.map(l => l.date)).size;
          return { name, daysLogged: distinctDates, progress: Math.round((distinctDates / ch.duration_days) * 100) };
        }).sort((a, b) => b.daysLogged - a.daysLogged);
        
        const enriched = { ...ch, leaderboard };
        if (ch.end_date >= todayStr) active.push(enriched);
      }
      setChallenges(active);
    } else {
      setChallenges([]);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const createSquad = async () => {
    if (!newSquadName.trim()) return;
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    const { data } = await supabase.from('squads').insert({ name: newSquadName, invite_code: code, created_by: user }).select().single();
    if (data) {
      await supabase.from('squad_members').insert({ squad_id: data.id, user_name: user });
      setNewSquadName('');
      fetchData();
    }
  };

  const joinSquad = async () => {
    if (!joinSquadCode.trim()) return;
    const { data } = await supabase.from('squads').select('id').eq('invite_code', joinSquadCode.toUpperCase()).single();
    if (data) {
      await supabase.from('squad_members').insert({ squad_id: data.id, user_name: user });
      setJoinSquadCode('');
      setSquadError('');
      fetchData();
    } else {
      setSquadError('No squad found with that code.');
    }
  };

  const createChallenge = async () => {
    if (!newChallenge.title.trim()) return;
    const today = new Date();
    const endDate = subDays(today, -newChallenge.duration_days); // add days
    const code = Math.random().toString(36).substring(2,8).toUpperCase();
    
    const { data } = await supabase.from('challenges').insert({
      title: newChallenge.title,
      habit: newChallenge.habit,
      duration_days: newChallenge.duration_days,
      stake_label: newChallenge.stake_label,
      start_date: today.toLocaleDateString('en-CA'),
      end_date: endDate.toLocaleDateString('en-CA'),
      invite_code: code,
      created_by: user
    }).select().single();

    if (data) {
      await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_name: user });
      setNewChallenge({ title: '', habit: HABIT_OPTIONS_DEFAULT[0], duration_days: 7, stake_label: '' });
      fetchData();
    }
  };

  const joinChallenge = async () => {
    if (!joinChallengeCode.trim()) return;
    const { data } = await supabase.from('challenges').select('*').eq('invite_code', joinChallengeCode.toUpperCase()).single();
    if (data) {
      const todayStr = new Date().toLocaleDateString('en-CA');
      if (data.end_date >= todayStr) {
        await supabase.from('challenge_participants').insert({ challenge_id: data.id, user_name: user });
        setJoinChallengeCode('');
        setChallengeError('');
        fetchData();
      } else {
        setChallengeError('This challenge has ended.');
      }
    } else {
      setChallengeError('No challenge found with that code.');
    }
  };

  return (
    <div className="flex flex-col gap-8 fade-in-animation">
      {/* SQUADS */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Users className="text-primary-accent" size={28} />
          <h2 className="text-2xl font-bold">Squads</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
            <h3 className="font-bold mb-4">Your Invite Code</h3>
            <div className="flex items-center gap-2 bg-background-light dark:bg-[#242424] border border-border-light dark:border-border-dark p-3 rounded-lg">
              <span className="flex-1 font-mono text-xl tracking-widest text-center">{inviteCode}</span>
              <button onClick={() => handleCopy(inviteCode)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 transition">
                {copiedCode === inviteCode ? <Check size={18} className="text-secondary-accent" /> : <Copy size={18} />}
              </button>
            </div>
          </div>
          
          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold mb-2">Create a Squad</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Squad Name" value={newSquadName} onChange={e=>setNewSquadName(e.target.value)} className="form-input flex-1 py-2" />
                <button onClick={createSquad} className="bg-primary-accent text-white px-4 rounded-lg font-medium whitespace-nowrap">Create</button>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="font-bold mb-2">Join a Squad</h3>
              <div className="flex gap-2">
                <input type="text" placeholder="Invite Code" value={joinSquadCode} onChange={e=>setJoinSquadCode(e.target.value)} className="form-input flex-1 py-2 uppercase" />
                <button onClick={joinSquad} className="bg-secondary-accent text-white px-4 rounded-lg font-medium whitespace-nowrap">Join</button>
              </div>
              {squadError && <p className="text-xs text-difficulty-hard mt-1">{squadError}</p>}
            </div>
          </div>
        </div>

        {squads.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-lg">My Squads</h3>
            {squads.map((sq, i) => (
              <div key={i} className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-[#1A1A1A]">
                  <div>
                    <h4 className="font-bold text-lg">{sq.name}</h4>
                    <span className="text-xs text-secondary-light">Code: {sq.invite_code}</span>
                  </div>
                  <div className="text-sm font-medium">{sq.leaderboard.length} members</div>
                </div>
                <div className="p-0">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-background-light dark:bg-[#242424] text-secondary-light dark:text-secondary-dark uppercase text-xs">
                      <tr>
                        <th className="p-3 font-semibold">Rank</th>
                        <th className="p-3 font-semibold">Name</th>
                        <th className="p-3 font-semibold text-center">Active Days</th>
                        <th className="p-3 font-semibold text-center">Streak</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-light dark:divide-border-dark">
                      {sq.leaderboard.map((m: any, idx: number) => (
                        <tr key={idx} className={m.name === user ? 'bg-[#EEEDFE] dark:bg-[#2A2550]' : ''}>
                          <td className="p-3 font-bold">{idx + 1}</td>
                          <td className="p-3 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-accent text-white flex items-center justify-center text-[10px] font-bold">
                              {m.name.substring(0,2).toUpperCase()}
                            </div>
                            {m.name} {m.name === user && '(You)'}
                          </td>
                          <td className="p-3 text-center">{m.habitsThisWeek}</td>
                          <td className="p-3 text-center">{m.longestStreak}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CHALLENGES */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="text-primary-accent" size={28} />
          <h2 className="text-2xl font-bold">Challenges</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm">
            <h3 className="font-bold mb-4">Create a Challenge</h3>
            <div className="flex flex-col gap-3">
              <input type="text" placeholder="Challenge Title" value={newChallenge.title} onChange={e=>setNewChallenge({...newChallenge, title: e.target.value})} className="form-input py-2 text-sm" />
              <select value={newChallenge.habit} onChange={e=>setNewChallenge({...newChallenge, habit: e.target.value})} className="form-input py-2 text-sm">
                {allHabits.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
              <div className="flex gap-2 text-sm">
                {[7,14,21,30].map(d => (
                  <label key={d} className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" name="duration" checked={newChallenge.duration_days===d} onChange={()=>setNewChallenge({...newChallenge, duration_days: d})} />
                    {d}d
                  </label>
                ))}
              </div>
              <input type="text" placeholder="Stake (e.g. No Netflix if I fail)" value={newChallenge.stake_label} onChange={e=>setNewChallenge({...newChallenge, stake_label: e.target.value})} className="form-input py-2 text-sm" />
              <button onClick={createChallenge} className="bg-primary-accent text-white py-2 rounded-lg font-medium mt-1">Launch Challenge &rarr;</button>
            </div>
          </div>

          <div className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark p-6 rounded-xl shadow-sm flex flex-col">
            <h3 className="font-bold mb-2">Join a Challenge</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="Challenge Code" value={joinChallengeCode} onChange={e=>setJoinChallengeCode(e.target.value)} className="form-input flex-1 py-2 uppercase" />
              <button onClick={joinChallenge} className="bg-secondary-accent text-white px-4 rounded-lg font-medium whitespace-nowrap">Join</button>
            </div>
            {challengeError && <p className="text-xs text-difficulty-hard mt-1">{challengeError}</p>}
          </div>
        </div>

        {challenges.length > 0 && (
          <div className="flex flex-col gap-4 mb-8">
            <h3 className="font-bold text-lg">Active Challenges</h3>
            {challenges.map((ch, i) => {
              const daysRemaining = Math.ceil((new Date(ch.end_date).getTime() - new Date().getTime()) / (1000*3600*24));
              
              return (
                <div key={i} className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-sm p-4">
                  <div className="flex flex-wrap gap-2 items-center mb-4">
                    <h4 className="font-bold text-lg">{ch.title}</h4>
                    <span className="bg-[#EEEDFE] dark:bg-[#2A2550] text-primary-accent px-2 py-1 rounded-full text-xs font-bold">{ch.habit}</span>
                    <span className="bg-secondary-accent text-white px-2 py-1 rounded-full text-xs font-bold">{daysRemaining} days remaining</span>
                    {ch.stake_label && <span className="bg-[#FDF5E9] dark:bg-[#3D2E1A] text-[#EF9F27] px-2 py-1 rounded-full text-xs font-bold border border-[#EF9F27]">Stake: {ch.stake_label}</span>}
                    <span className="text-xs text-secondary-light ml-auto">Code: {ch.invite_code}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {ch.leaderboard.map((m: any, idx: number) => (
                      <div key={idx} className={`flex items-center gap-4 p-2 rounded-lg ${m.name === user ? 'bg-[#EEEDFE] dark:bg-[#2A2550]' : ''}`}>
                        <div className="font-bold w-4">{idx + 1}</div>
                        <div className="flex items-center gap-2 w-32 truncate">
                          <div className="w-6 h-6 rounded-full bg-primary-accent text-white flex items-center justify-center text-[10px] font-bold">
                            {m.name.substring(0,2).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{m.name}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>{m.daysLogged} / {ch.duration_days} days</span>
                            <span>{m.progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-accent" style={{width: `${m.progress}%`}}></div>
                          </div>
                        </div>
                        <div className="w-20 text-right">
                          {m.progress > (100 - (daysRemaining / ch.duration_days * 100)) 
                            ? <span className="text-xs font-bold text-secondary-accent">On track</span>
                            : <span className="text-xs font-bold text-secondary-light">Behind</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
