export default function EmptyState({ title = 'No records yet', description = 'There is nothing to show here.' }) {
  return (
    <div className="empty-state text-center py-5 px-3">
      <div className="empty-state-icon mx-auto mb-3" aria-hidden="true">○</div>
      <h3 className="h6 fw-bold">{title}</h3>
      <p className="text-secondary mb-0">{description}</p>
    </div>
  );
}
