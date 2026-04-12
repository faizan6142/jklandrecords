import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const features = [
  {
    icon: '🗨️',
    title: 'Real-time Chat',
    description:
      'Communicate instantly with researchers worldwide in dedicated topic rooms — Biology, Medical Physics, Biophysics, and more.',
  },
  {
    icon: '📚',
    title: 'Research Database',
    description:
      'Upload, discover, and download research papers. Search by keyword, filter by category, and track citations.',
  },
  {
    icon: '💬',
    title: 'Discussion Forums',
    description:
      'Create and join topic threads, vote on ideas, and engage in deep scientific discussions with the community.',
  },
  {
    icon: '👥',
    title: 'Researcher Profiles',
    description:
      'Build your academic profile, showcase your expertise, follow colleagues, and grow your research network.',
  },
];

const stats = [
  { number: '500+', label: 'Researchers' },
  { number: '1,000+', label: 'Papers' },
  { number: '50+', label: 'Topics' },
  { number: '24/7', label: 'Chat' },
];

const Home = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <h1>Biology &amp; Medical Physics Research Hub</h1>
          <p>
            A collaborative platform for researchers to share discoveries, discuss breakthroughs,
            and connect with the global scientific community in real time.
          </p>
          <div className="hero-buttons">
            {user ? (
              <>
                <Link to="/research" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700 }}>
                  Browse Research
                </Link>
                <Link to="/chat" className="btn btn-lg btn-outline" style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#fff' }}>
                  Join Chat
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn-lg" style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700 }}>
                  Get Started Free
                </Link>
                <Link to="/research" className="btn btn-lg btn-outline" style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#fff' }}>
                  Browse Research
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="grid grid-4" style={{ padding: '1.5rem 0' }}>
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="stat-number">{s.number}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2
            style={{
              textAlign: 'center',
              fontSize: '1.9rem',
              fontWeight: 800,
              marginBottom: '0.6rem',
            }}
          >
            Everything you need for research collaboration
          </h2>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              marginBottom: '2.5rem',
              maxWidth: 560,
              margin: '0 auto 2.5rem',
            }}
          >
            From real-time communication to structured research archives — all the tools in one place.
          </p>

          <div className="grid grid-2" style={{ gap: '1.5rem' }}>
            {features.map((f) => (
              <div key={f.title} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2.2rem', flexShrink: 0 }}>{f.icon}</span>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section
          style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
            padding: '4rem 1rem',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <div className="container">
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>
              Ready to advance your research?
            </h2>
            <p style={{ opacity: 0.9, marginBottom: '2rem', fontSize: '1.05rem' }}>
              Join thousands of researchers already collaborating on BioResearch Hub.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/register"
                className="btn btn-lg"
                style={{ background: '#fff', color: 'var(--primary)', fontWeight: 700 }}
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="btn btn-lg"
                style={{ background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.7)' }}
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer
        style={{
          background: 'var(--bg-dark)',
          color: 'var(--text-light)',
          textAlign: 'center',
          padding: '2rem 1rem',
          fontSize: '0.875rem',
        }}
      >
        <p>🔬 BioResearch Hub &copy; {new Date().getFullYear()}. Built for the scientific community.</p>
      </footer>
    </div>
  );
};

export default Home;
