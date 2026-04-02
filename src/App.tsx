import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import LandingPage from './components/LandingPage';
import { ThemeProvider } from './store/ThemeContext';
import { KeyboardShortcutsModal } from './components/keyboard-shortcuts';

const Terminal = lazy(() => import('./components/Terminal'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const BotDetails = lazy(() => import('./components/BotDetails'));

function App() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId = 0;
    let latestX = 0;
    let latestY = 0;

    const draw = () => {
      rafId = 0;
      if (blobRef.current) {
        blobRef.current.style.background = `radial-gradient(600px circle at ${latestX}px ${latestY}px, rgba(124, 58, 237, 0.12), transparent 40%)`;
      }
    };

    const handleMove = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-bg-terminal text-text-primary font-sans selection:bg-accent/25 overflow-x-hidden relative transition-colors">
        {/* Global Gradient Blob following mouse subtly */}
        <div 
            ref={blobRef}
            className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 opacity-20"
        />
        <div className="relative z-10 flex-1 flex flex-col w-full">
          <BrowserRouter>
            <KeyboardShortcutsModal />
            <Suspense fallback={<div className="flex h-screen items-center justify-center text-text-secondary text-sm">Loading...</div>}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/terminal" element={<Terminal />} />
                <Route path="/user/dashboard" element={<Dashboard />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/dashboard/bot/:id" element={<BotDetails />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
