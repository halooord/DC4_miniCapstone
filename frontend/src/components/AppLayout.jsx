import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import Button from './Button.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      notify('You have logged out successfully.');
    } catch (error) {
      notify(error.message, 'warning');
    } finally {
      setLoggingOut(false);
      navigate('/login', { replace: true });
    }
  }

  const navClass = ({ isActive }) => `nav-link app-nav-link ${isActive ? 'active' : ''}`;
  const navItems = [
    ['Dashboard', '/dashboard'],
    ['Products', '/products'],
    ['Categories', '/categories'],
    ['Suppliers', '/suppliers'],
    ['Stock Movements', '/stock-movements'],
    ['Purchase Orders', '/purchase-orders'],
    ...(user?.role === 'admin' ? [['Users', '/users']] : []),
  ];

  return (
    <div className="app-wrapper min-vh-100">
      <header className="app-header">
        <nav className="navbar navbar-expand-xl navbar-dark container py-3" aria-label="Main navigation">
          <NavLink className="navbar-brand d-flex align-items-center gap-2 fw-bold" to="/dashboard" onClick={() => setMenuOpen(false)}>
            <span className="brand-mark" aria-hidden="true">P</span>
            PoultryStock
          </NavLink>
          <button className="navbar-toggler" type="button" aria-controls="main-menu" aria-expanded={menuOpen} aria-label="Toggle navigation" onClick={() => setMenuOpen((open) => !open)}>
            <span className="navbar-toggler-icon" />
          </button>
          <div className={`collapse navbar-collapse ${menuOpen ? 'show' : ''}`} id="main-menu">
            <div className="navbar-nav me-auto mt-3 mt-xl-0">
              {navItems.map(([label, route]) => (
                <NavLink key={route} to={route} className={navClass} onClick={() => setMenuOpen(false)}>{label}</NavLink>
              ))}
            </div>
            <div className="d-flex flex-wrap gap-3 align-items-center mt-3 mt-xl-0">
              <div className="user-meta text-xl-end">
                <span className="d-block fw-semibold">{user?.name}</span>
                <span className="d-block text-capitalize small">{user?.role}</span>
              </div>
              <Button variant="outline-light" onClick={handleLogout} loading={loggingOut}>Logout</Button>
            </div>
          </div>
        </nav>
      </header>
      <main className="container py-4 py-md-5"><Outlet /></main>
      <footer className="container text-secondary small pb-4">PoultryStock · Inventory management for a neighborhood poultry shop</footer>
    </div>
  );
}
