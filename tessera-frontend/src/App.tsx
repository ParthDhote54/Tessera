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
    <div className="not-found-screen">
      <div className="not-found-card">
        <div className="not-found-icon-badge" aria-hidden="true">
          <svg className="tessera-mark" width="22" height="22" viewBox="0 0 22 22">
            <path fill="currentColor" d="M11 1.4 19.4 6v10L11 20.6 2.6 16V6L11 1.4Zm0 2.3L4.8 7.1v7.8L11 18.3l6.2-3.4V7.1L11 3.7Zm0 3.2 3.8 2.1v4.2L11 15.3l-3.8-2.1V9l3.8-2.1Z" />
          </svg>
        </div>
        <h1 className="not-found-title">This path is empty.</h1>
        <p className="not-found-desc">
          The address does not match a Tessera page. Return to the stage, or open a room from there.
        </p>
        <a href="/" className="btn-hero invert">
          Back to Tessera
        </a>
      </div>
    </div>
  );
}
