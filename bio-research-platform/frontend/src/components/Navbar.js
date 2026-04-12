import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    navigate('/');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/research', label: 'Research' },
    { to: '/chat', label: 'Chat' },
    { to: '/forums', label: 'Forums' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
          🔬 BioResearch Hub
        </Link>

        {/* Desktop Links */}
        <ul className="navbar-links">
          {navLinks.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={isActive(link.to) ? 'active' : ''}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {user ? (
            <>
              <li>
                <Link
                  to={`/profile/${user._id}`}
                  className={location.pathname.startsWith('/profile') ? 'active' : ''}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FiUser size={14} />
                  {user.username}
                </Link>
              </li>
              <li>
                <button onClick={handleLogout} title="Logout" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FiLogOut size={14} />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login" className={isActive('/login') ? 'active' : ''}>
                  Login
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  style={{
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 'var(--radius)',
                    padding: '0.45rem 1rem',
                  }}
                >
                  Register
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Mobile Hamburger */}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile-menu${menuOpen ? ' open' : ''}`}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setMenuOpen(false)}
            className={isActive(link.to) ? 'active' : ''}
          >
            {link.label}
          </Link>
        ))}

        {user ? (
          <>
            <Link
              to={`/profile/${user._id}`}
              onClick={() => setMenuOpen(false)}
            >
              👤 {user.username}
            </Link>
            <button onClick={handleLogout}>🚪 Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
