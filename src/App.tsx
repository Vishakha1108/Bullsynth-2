import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';
import Dashboard from './components/Dashboard';
import { ThemeProvider } from './store/ThemeContext';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <KeyboardShortcutsModal />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/user/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
