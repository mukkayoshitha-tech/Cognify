import { useState } from 'react';
import { useLocalStorage } from '../lib/store';

export default function Onboarding() {
  const [, setUser] = useLocalStorage('cognify_user', '');
  const [inputName, setInputName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      setUser(inputName.trim());
      // Navigate will be handled by App.tsx when user changes
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4">
      <div className="max-w-md w-full bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark p-8 text-center slide-up-animation">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-accent rounded-[10px] flex items-center justify-center text-white font-bold text-2xl shadow-md">
            Co
          </div>
        </div>
        <h1 className="text-4xl font-bold text-primary-accent mb-2 tracking-tight">Cognify</h1>
        <p className="text-xl font-medium text-primary-light dark:text-primary-dark mb-4">Think better. Grow daily.</p>
        <p className="text-secondary-light dark:text-secondary-dark mb-8">
          Track every habit. Build every skill. Understand your growth.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="What's your name?"
            required
            className="px-4 py-3 rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-[#242424] text-primary-light dark:text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-accent transition-shadow text-center text-lg"
          />
          <button
            type="submit"
            disabled={!inputName.trim()}
            className="bg-primary-accent text-white font-semibold py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            Let's Go <span aria-hidden="true">&rarr;</span>
          </button>
        </form>
      </div>
    </div>
  );
}
