import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api, { messageFrom } from '../services/api.js';
import Spinner from '../components/Spinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import DataTable from '../components/DataTable.jsx';
import Button from '../components/Button.jsx';

const moneyFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const quantityFormatter = new Intl.NumberFormat('en-PH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const countFormatter = new Intl.NumberFormat('en-PH');

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatQuantity(value, unit) {
  return `${quantityFormatter.format(Number(value) || 0)}${unit ? ` ${unit}` : ''}`;
}

const movementNames = {
  in: 'Stock in',
  out: 'Stock out',
  spoilage: 'Spoilage',
  adjustment: 'Adjustment',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/dashboard', { signal: controller.signal });
        if (!response.data?.data) {
          throw new Error('Unexpected dashboard response from the API.');
        }
        if (!controller.signal.aborted) setDashboard(response.data.data);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(messageFrom(requestError, 'Could not load the dashboard.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadDashboard();
    return () => controller.abort();
  }, [refreshKey]);

  const refresh = () => setRefreshKey((number) => number + 1);
  const lowStock = Array.isArray(dashboard?.low_stock_products)
    ? dashboard.low_stock_products : [];
  const movements = Array.isArray(dashboard?.recent_movements)
    ? dashboard.recent_movements : [];

  const metrics = dashboard ? [
    { label: 'Total products', value: countFormatter.format(dashboard.total_products ?? 0), note: 'Products in the catalog' },
    { label: 'Low-stock products', value: countFormatter.format(dashboard.low_stock_count ?? 0), note: 'At or below reorder level', alert: Number(dashboard.low_stock_count) > 0 },
    { label: 'Pending orders', value: countFormatter.format(dashboard.pending_orders ?? 0), note: 'Awaiting owner approval' },
    { label: 'Approved orders', value: countFormatter.format(dashboard.approved_orders ?? 0), note: 'Awaiting stock receipt' },
    { label: 'Inventory value', value: moneyFormatter.format(Number(dashboard.inventory_value) || 0), note: 'Stock valued at selling price' },
    { label: 'Movements this week', value: countFormatter.format(dashboard.movements_this_week ?? 0), note: `All shop movements since ${dashboard.week_starts_on || 'Monday'}` },
  ] : [];

  const movementColumns = [
    { key: 'created_at', label: 'Date', render: (row) => formatDate(row.created_at) },
    { key: 'product', label: 'Product', render: (row) => (
      <div>
        <span className="fw-semibold">{row.product?.name || 'Unknown product'}</span>
        <span className="d-block small text-secondary">{row.product?.sku || '—'}</span>
      </div>
    ) },
    { key: 'type', label: 'Type', render: (row) => movementNames[row.type] || row.type || '—' },
    { key: 'quantity', label: 'Change', render: (row) => (
      <span className={row.effect === 'increase' ? 'text-success fw-semibold' : 'text-danger fw-semibold'}>
        {row.effect === 'increase' ? '+' : row.effect === 'decrease' ? '−' : ''}
        {formatQuantity(row.quantity, row.product?.unit)}
      </span>
    ) },
    { key: 'user', label: 'Recorded by', render: (row) => row.user?.name || '—' },
  ];

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">POULTRYSTOCK / OVERVIEW</p>
          <h1 className="page-title mb-1">Welcome, {user?.name?.split(' ')[0] || 'there'}.</h1>
          <p className="text-secondary mb-0">
            Shop inventory at a glance · Signed in as <strong className="text-capitalize">{user?.role}</strong>
          </p>
        </div>
        <Button variant="outline-primary" onClick={refresh} loading={loading}>
          Refresh data
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2" role="alert">
          <span>{error}{dashboard ? ' Displaying the last loaded figures.' : ''}</span>
          <Button variant="outline-danger" onClick={refresh}>Try again</Button>
        </div>
      )}

      {loading && !dashboard && (
        <section className="surface-card p-4" aria-label="Loading dashboard">
          <Spinner label="Loading inventory dashboard from Laravel..." />
        </section>
      )}

      {dashboard && (
        <>
          <div className="row g-3 mb-4" aria-label="Inventory summary figures">
            {metrics.map((metric) => (
              <div className="col-12 col-sm-6 col-xl-4" key={metric.label}>
                <section className={`surface-card dashboard-stat p-4 h-100 ${metric.alert ? 'dashboard-stat-alert' : ''}`}>
                  <p className="text-secondary small fw-semibold mb-2">{metric.label}</p>
                  <p className="dashboard-stat-value mb-2">{metric.value}</p>
                  <p className="text-secondary small mb-0">{metric.note}</p>
                </section>
              </div>
            ))}
          </div>

          <div className="row g-3">
            <div className="col-lg-5">
              <section className="surface-card h-100 overflow-hidden">
                <div className="p-4 pb-3 border-bottom">
                  <p className="card-kicker mb-2">STOCK WATCH</p>
                  <h2 className="h5 fw-bold mb-1">Low-stock products</h2>
                  <p className="text-secondary small mb-0">
                    {Number(dashboard.low_stock_count) > 0
                      ? `Showing up to 5 of ${dashboard.low_stock_count} low-stock products.`
                      : 'All products are above their reorder levels.'}
                  </p>
                </div>
                {lowStock.length === 0 ? (
                  <EmptyState title="No low-stock products" description="Nothing needs restocking right now." />
                ) : (
                  <ul className="list-group list-group-flush">
                    {lowStock.map((product) => (
                      <li className="list-group-item p-3" key={product.id}>
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div className="min-w-0">
                            <div className="fw-semibold text-break">{product.name}</div>
                            <div className="small text-secondary text-break">
                              {product.category?.name || 'Uncategorized'} · {product.sku}
                            </div>
                            <div className="small text-secondary mt-1">
                              Reorder level: {formatQuantity(product.reorder_level, product.unit)}
                            </div>
                          </div>
                          <span className="dashboard-stock-badge text-nowrap">
                            {formatQuantity(product.stock_qty, product.unit)} left
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="col-lg-7">
              <section className="surface-card h-100 overflow-hidden">
                <div className="p-4 pb-3 border-bottom">
                  <p className="card-kicker mb-2">ACCOUNTABILITY</p>
                  <h2 className="h5 fw-bold mb-1">Recent stock movements</h2>
                  <p className="text-secondary small mb-0">
                    {user?.role === 'admin'
                      ? 'The latest five shop-wide stock changes.'
                      : 'Your latest five recorded stock changes.'}
                  </p>
                </div>
                <DataTable
                  columns={movementColumns}
                  rows={movements}
                  emptyTitle="No stock movements to display"
                />
              </section>
            </div>
          </div>
          <p className="small text-secondary mt-3 mb-0">
            Counts and stock figures come from the Laravel API. Use Refresh data to load updates.
          </p>
        </>
      )}
    </>
  );
}
