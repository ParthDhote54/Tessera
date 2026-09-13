import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoomPage from './pages/RoomPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh', gap: '16px',
      color: '#94A3B8', fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <span style={{ fontSize: 48 }}>⬡</span>
      <h2 style={{ color: '#F1F5F9', margin: 0 }}>Page not found</h2>
      <a href="/" style={{ color: '#6366F1' }}>Back to Tessera</a>
    </div>
  );
}
