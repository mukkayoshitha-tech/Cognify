import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar, TabBar, StudyBuddyFAB } from './components/Layout';
import { useLocalStorage } from './lib/store';

// Placeholder imports for pages
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import LogToday from './pages/LogToday';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import CogniCoach from './pages/CogniCoach';
import Reports from './pages/Reports';

function AppContent() {
  const [user] = useLocalStorage('cognify_user', '');

  if (!user) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-0 sm:pt-16">
      {/* Mobile nav puts tabbar at bottom, desktop could have it on top but per prompt: tab bar is bottom/top, we'll keep bottom for consistency or responsive. */}
      <Navbar />
      <div className="max-w-4xl mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/log-today" element={<LogToday />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/cogni-coach" element={<CogniCoach />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <TabBar />
      <StudyBuddyFAB />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
