import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <main className="min-vh-100 d-flex justify-content-center align-items-center p-4">
      <div className="text-center"><p className="eyebrow">404 · NOT FOUND</p><h1 className="page-title">Page not found</h1>
        <p className="text-secondary">The page you requested does not exist.</p><Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
      </div>
    </main>
  );
}
