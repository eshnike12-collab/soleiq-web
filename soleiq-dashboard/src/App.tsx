import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { DashboardProvider, useDashboard } from './context/DashboardContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import Overview from './sections/Overview';
import SoleMap from './sections/SoleMap';
import Analytics from './sections/Analytics';
import Therapy from './sections/Therapy';
import Alerts from './sections/Alerts';
import Profile from './sections/Profile';
import Gear from './sections/Gear';

function DashboardPage() {
  const { activeSection } = useDashboard();

  const sectionMap: Record<string, React.ReactNode> = {
    overview: <Overview />,
    solemap: <SoleMap />,
    analytics: <Analytics />,
    therapy: <Therapy />,
    alerts: <Alerts />,
    profile: <Profile />,
    gear: <Gear />,
  };

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        <div key={activeSection} className="section-wrapper">
          {sectionMap[activeSection]}
        </div>
      </AnimatePresence>
    </DashboardLayout>
  );
}

function LoginRoute() {
  const navigate = useNavigate();

  // If admin deep-links a patient (?userId=...), skip the login screen entirely
  // and jump straight into their dashboard, preserving the query params.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('userId')) {
      navigate('/dashboard' + window.location.search, { replace: true });
    }
  }, [navigate]);

  return <LoginPage onLogin={() => navigate('/dashboard')} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginRoute />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <DashboardProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </DashboardProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
