import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import BotDetails from './components/BotDetails';
import { ThemeProvider } from './store/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="/user/dashboard" element={<Dashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />    
          <Route path="/admin/dashboard/bot/:id" element={<BotDetails />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
