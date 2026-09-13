import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LivingStage } from '../components/landing/LivingStage';

const API_URL = (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('YOUR_BACKEND_URL'))
  ? import.meta.env.VITE_API_URL
  : 'https://tessera-e1w0.onrender.com';

const BEATS = [
  {
    id: 'cursors',
    title: 'Shared cursors',
    body: 'See who is looking, reaching, and placing. Presence is drawn on the stage, not hidden in a list.',
    visual: 'cursors',
  },
  {
    id: 'locks',
    title: 'Soft locks',
    body: 'When someone takes an object, the rest of the room can see it. Collision becomes choreography.',
    visual: 'locks',
  },
  {
    id: 'sync',
    title: 'One shared field',
    body: 'Moves travel as they happen. The canvas is not a copy you refresh — it is the same space.',
    visual: 'sync',
  },
  {
    id: 'invite',
    title: 'A link is enough',
    body: 'Open a room, send the URL, and the other person lands on the same composition. No account wall.',
    visual: 'invite',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beat, setBeat] = useState(BEATS[0].id);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data: { roomId: string } = await res.json();
      navigate(`/room/${data.roomId}`);
    } catch {
      setError('Could not reach the server. Make sure the backend is running.');
      setLoading(false);
    }
  };

  const active = BEATS.find((b) => b.id === beat) ?? BEATS[0];

  return (
    <div className="landing">
      <header className="site-nav">
        <a className="nav-cluster nav-brand" href="/" aria-label="Tessera home">
          <TesseraMark />
          <span>Tessera</span>
        </a>
        <nav className="nav-cluster nav-mid" aria-label="Page">
          <a href="#stage">The stage</a>
          <a href="#presence">Presence</a>
          <a href="#close">Open a room</a>
        </nav>
        <div className="nav-cluster nav-end">
          <a className="btn-ghost" href="#presence">
            How it feels
          </a>
          <button
            id="nav-create-room"
            className="btn-solid"
            type="button"
            onClick={createRoom}
            disabled={loading}
          >
            Open a room
          </button>
        </div>
      </header>

      <section className="hero" aria-label="Introduction">
        <div className="hero-copy">
          <div className="hero-badge" aria-hidden="true">
            <span className="badge-dot" />
            <span>Spatial Collaboration Field</span>
          </div>
          <h1>
            Compose together.
            <span>In real time.</span>
          </h1>
          <p>
            Tessera is a shared canvas for spatial composition — objects, cursors, and state
            moving in the same field as you work.
          </p>
          <div className="hero-cta-group">
            <button
              id="create-room-btn"
              className="btn-hero"
              type="button"
              onClick={createRoom}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="spinner light" aria-hidden="true" />
                  Opening room…
                </>
              ) : (
                'Open a room'
              )}
            </button>
            <a href="#stage" className="btn-hero-secondary">
              Explore the stage ↓
            </a>
          </div>
          {error && (
            <p className="hero-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="hero-stage-card">
          <div className="product-chrome">
            <span className="product-dot" />
            <span className="product-name">Tessera Stage · Live Composition Field</span>
            <span className="product-invite">Live Sync</span>
          </div>
          <div className="hero-visual">
            <LivingStage />
          </div>
        </div>
      </section>

      <section className="band" id="stage">
        <div className="band-grid">
          <div className="band-copy">
            <p className="eyebrow">The stage</p>
            <h2>Everyone shares one spatial field.</h2>
            <p className="lede">
              Tessera is not a document you pass around. It is a live composition surface:
              tiles you can move, locks you can see, and collaborators drawn as they arrive.
            </p>
            <ul className="stage-feature-list">
              <li>
                <span className="feature-icon">✦</span>
                <div>
                  <strong>Zero-latency interpolation</strong>
                  <p>Cursor motions smooth out locally so presence feels immediate.</p>
                </div>
              </li>
              <li>
                <span className="feature-icon">✦</span>
                <div>
                  <strong>Visual soft-locking</strong>
                  <p>Selecting an object reserves it for your edits in real time.</p>
                </div>
              </li>
              <li>
                <span className="feature-icon">✦</span>
                <div>
                  <strong>Instant room links</strong>
                  <p>No account wall. Send a URL to drop anyone straight into the field.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="product-frame" aria-hidden="true">
            <div className="product-chrome">
              <span className="product-dot" />
              <span className="product-name">Live Spatial Workspace · Demo</span>
              <span className="product-invite">Active Session</span>
            </div>
            <div className="product-field">
              <article className="tile tile-lg" style={{ ['--tile' as string]: '#E8A87C' }}>
                <span className="tile-kind">Product</span>
                <strong>Hero Product</strong>
              </article>
              <article className="tile tile-sm" style={{ ['--tile' as string]: '#9BB8C9' }}>
                <span className="tile-kind">Hotspot</span>
                <strong>AR Anchor</strong>
              </article>
              <article className="tile tile-md" style={{ ['--tile' as string]: '#8FBFB0' }}>
                <span className="tile-kind">CTA</span>
                <strong>Shop Now</strong>
              </article>
              <article className="tile tile-md alt" style={{ ['--tile' as string]: '#D4A017' }}>
                <span className="tile-kind">Offer</span>
                <strong>20% Off Today</strong>
              </article>
              <article className="tile tile-wide" style={{ ['--tile' as string]: '#C9A0C4' }}>
                <span className="tile-kind">Poll</span>
                <strong>Quick Poll</strong>
              </article>
              <span className="ghost-cursor c-a">Mira</span>
              <span className="ghost-cursor c-b">Jules</span>
            </div>
          </div>
        </div>
      </section>

      <section className="presence" id="presence">
        <div className="presence-head">
          <p className="eyebrow">How it feels</p>
          <h2>Collaboration is visible, not implied.</h2>
        </div>
        <div className="presence-split">
          <div className="beat-rail" role="tablist" aria-label="Collaboration qualities">
            {BEATS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={beat === item.id}
                className={`beat ${beat === item.id ? 'is-active' : ''}`}
                onClick={() => setBeat(item.id)}
                type="button"
              >
                {item.title}
              </button>
            ))}
          </div>
          <div className="beat-stage" role="tabpanel">
            <BeatVisual kind={active.visual} />
            <div className="beat-copy">
              <h3>{active.title}</h3>
              <p>{active.body}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="principles">
        <p className="eyebrow">What stays true</p>
        <h2>A room is a composition, not a chat.</h2>
        <div className="principle-row">
          <figure className="principle">
            <div className="principle-art art-align" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <figcaption>
              <h3>Spatial thinking</h3>
              <p>Place, scale, and relation matter. The work lives in coordinates, not threads.</p>
            </figcaption>
          </figure>
          <figure className="principle">
            <div className="principle-art art-sync" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <figcaption>
              <h3>Low-latency presence</h3>
              <p>Cursor motion interpolates locally. The room stays fluid even as the network breathes.</p>
            </figcaption>
          </figure>
          <figure className="principle">
            <div className="principle-art art-link" aria-hidden="true" />
            <figcaption>
              <h3>Share the URL</h3>
              <p>The session is the product. Anyone with the link enters the same field.</p>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="close" id="close">
        <div className="close-card">
          <p className="eyebrow">Begin Now</p>
          <h2>Open a room and leave a link.</h2>
          <p className="lede">
            No sign-up. The canvas is ready the moment your session starts.
          </p>
          <button className="btn-hero invert" type="button" onClick={createRoom} disabled={loading}>
            {loading ? 'Opening room…' : 'Open a room'}
          </button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <TesseraMark />
          <div>
            <strong>Tessera</strong>
            <p>Compose together. In real time.</p>
          </div>
        </div>
        <div className="footer-cols">
          <div>
            <span>Product</span>
            <a href="#stage">The stage</a>
            <a href="#presence">Presence</a>
            <button type="button" onClick={createRoom}>
              Open a room
            </button>
          </div>
          <div>
            <span>Session</span>
            <p>Anonymous display names. Shared over a room link.</p>
          </div>
        </div>
        <p className="footer-legal">Tessera — collaborative canvas</p>
      </footer>
    </div>
  );
}

function BeatVisual({ kind }: { kind: string }) {
  return (
    <div className={`beat-visual visual-${kind}`} aria-hidden="true">
      {kind === 'cursors' && (
        <>
          <div className="mini-tile" />
          <div className="mini-tile t2" />
          <span className="ghost-cursor c-a">Mira</span>
          <span className="ghost-cursor c-b">Jules</span>
        </>
      )}
      {kind === 'locks' && (
        <>
          <div className="lock-tile">
            <em>Editing</em>
            Hero Product
          </div>
          <span className="ghost-cursor c-a">Mira</span>
        </>
      )}
      {kind === 'sync' && (
        <div className="sync-rings">
          <span />
          <span />
          <span />
        </div>
      )}
      {kind === 'invite' && (
        <div className="invite-chip">
          tessera.local/room/8f2a…
        </div>
      )}
    </div>
  );
}

function TesseraMark() {
  return (
    <svg className="tessera-mark" width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11 1.4 19.4 6v10L11 20.6 2.6 16V6L11 1.4Zm0 2.3L4.8 7.1v7.8L11 18.3l6.2-3.4V7.1L11 3.7Zm0 3.2 3.8 2.1v4.2L11 15.3l-3.8-2.1V9l3.8-2.1Z"
      />
    </svg>
  );
}
