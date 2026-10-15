import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <>
      <p className="eyebrow mb-2">POULTRYSTOCK / OVERVIEW</p>
      <h1 className="page-title mb-2">Welcome, {user?.name?.split(' ')[0]}.</h1>
      <p className="text-secondary mb-4">You are signed in as <strong className="text-capitalize">{user?.role}</strong>.</p>
      <div className="row g-3">
        <div className="col-lg-8"><section className="surface-card p-4 h-100">
          <div className="card-kicker mb-3">Phase A · Authentication ready to test</div>
          <h2 className="h4 fw-bold">Your inventory dashboard is next.</h2>
          <p className="text-secondary mb-0">The real product counts, low-stock alerts, purchase orders, and recent stock movements will be connected to GET /dashboard during Phase B.</p>
        </section></div>
        <div className="col-lg-4"><section className="surface-card p-4 h-100">
          <div className="card-kicker mb-3">YOUR ACCOUNT</div>
          <dl className="mb-0"><dt className="small text-secondary">Name</dt><dd>{user?.name}</dd><dt className="small text-secondary">Email</dt><dd className="text-break">{user?.email}</dd><dt className="small text-secondary">Role</dt><dd className="text-capitalize mb-0">{user?.role}</dd></dl>
        </section></div>
      </div>
    </>
  );
}
