import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import BotDetails from './components/BotDetails';
import { ThemeProvider } from './store/ThemeContext';
import { KeyboardShortcutsModal } from './components/keyboard-shortcuts';

function App() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (blobRef.current) {
        blobRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(124, 58, 237, 0.12), transparent 40%)`;
      }
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
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
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/terminal" element={<Terminal />} />
              <Route path="/user/dashboard" element={<Dashboard />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />    
              <Route path="/admin/dashboard/bot/:id" element={<BotDetails />} />
            </Routes>
          </BrowserRouter>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
