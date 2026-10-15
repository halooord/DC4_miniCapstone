import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="surface-card p-4 p-md-5 text-center">
      <p className="eyebrow">403 · FORBIDDEN</p>
      <h1 className="page-title">You do not have permission.</h1>
      <p className="text-secondary">This area is only available to the shop owner.</p>
      <Link to="/dashboard" className="btn btn-primary mt-2">Return to dashboard</Link>
    </div>
  );
}
