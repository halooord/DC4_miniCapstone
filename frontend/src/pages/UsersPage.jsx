export default function UsersPage() {
  return (
    <>
      <p className="eyebrow mb-2">ADMIN ONLY</p>
      <h1 className="page-title">User management</h1>
      <section className="surface-card p-4 mt-4">
        <h2 className="h5 fw-bold">Admin route check</h2>
        <p className="text-secondary mb-0">Only admins can open this screen. The real staff management table and forms will be built in Phase B and protected again by the Laravel API.</p>
      </section>
    </>
  );
}
