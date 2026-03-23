import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Terminal from './components/Terminal';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/terminal" element={<Terminal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
