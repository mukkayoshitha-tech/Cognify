import { useState, useEffect } from 'react';

export const HABIT_OPTIONS_DEFAULT = [
  "DSA & Coding", "Reading a Book", "Exercise & Workout", "Meditation", "Water Intake",
  "Language Learning", "Journaling", "Music Practice", "Nutrition & Diet",
  "Sleep Tracking", "Career & Projects"
];

export const HABIT_OPTIONS_UNIVERSITY = [
  "Assignment Tracker", "Exam Preparation", "Attendance Log",
  "CGPA Tracker", "Project Deadline", "Internship Hours"
];

export const ADD_CUSTOM_HABIT_OPTION = "✨ Add Custom Habit...";

export function getLevelFromXP(xp: number) {
  if (xp >= 1000) return 5;
  if (xp >= 500) return 4;
  if (xp >= 250) return 3;
  if (xp >= 100) return 2;
  return 1;
}

export function getXPProgress(xp: number) {
  const level = getLevelFromXP(xp);
  let minXP = 0;
  let maxXP = 99;
  
  if (level === 2) { minXP = 100; maxXP = 249; }
  else if (level === 3) { minXP = 250; maxXP = 499; }
  else if (level === 4) { minXP = 500; maxXP = 999; }
  else if (level === 5) { return 100; } // maxed out visual

  return ((xp - minXP) / (maxXP - minXP + 1)) * 100;
}

export const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event('storage-update')); // Custom event for cross-component sync
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (e) {
        console.error(e);
      }
    };
    window.addEventListener('storage-update', handleStorageChange);
    // Also listen to real storage events from other tabs
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage-update', handleStorageChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue] as const;
};
