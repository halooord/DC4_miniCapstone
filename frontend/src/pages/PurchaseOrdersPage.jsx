import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { messageFrom } from '../services/api.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const names = { pending: 'Pending', approved: 'Approved', received: 'Received', rejected: 'Rejected' };
const colors = { pending: 'text-bg-warning', approved: 'text-bg-primary', received: 'text-bg-success', rejected: 'text-bg-danger' };

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(date);
}

export default function PurchaseOrdersPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/suppliers', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setSuppliers(Array.isArray(data.data) ? data.data : []);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setSupplierError(messageFrom(err, 'Unable to load suppliers.'));
      });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    async function fetchOrders() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/purchase-orders', {
          params: Object.fromEntries(new URLSearchParams(query).entries()),
          signal: controller.signal,
        });
        if (!Array.isArray(response.data?.data)) throw new Error('Unexpected purchase orders response.');
        if (!controller.signal.aborted) {
          setOrders(response.data.data);
          setMeta(response.data.meta || null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(messageFrom(err, 'Could not load purchase orders.'));
          setOrders([]);
          setMeta(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchOrders();
    return () => controller.abort();
  }, [query, reload]);

  function updateFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  const columns = [
    { key: 'id', label: 'Order', render: (order) => (
      <div><Link className="fw-semibold" to={`/purchase-orders/${order.id}`}>#{order.id}</Link>
        <div className="small text-secondary">{displayDate(order.created_at)}</div></div>
    ) },
    { key: 'supplier', label: 'Supplier', render: (order) => order.supplier?.name || '—' },
    { key: 'requester', label: 'Requested by', render: (order) => order.requester?.name || '—' },
    { key: 'items', label: 'Items', render: (order) => order.items_count ?? order.items?.length ?? 0 },
    { key: 'total', label: 'Total cost', render: (order) => money.format(Number(order.total) || 0) },
    { key: 'status', label: 'Status', render: (order) => (
      <span className={`badge ${colors[order.status] || 'text-bg-secondary'}`}>{names[order.status] || order.status}</span>
    ) },
    { key: 'actions', label: '', render: (order) => (
      <Link className="btn btn-outline-primary btn-sm" to={`/purchase-orders/${order.id}`}>View details</Link>
    ) },
  ];

  return (
    <>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">POULTRYSTOCK / RESTOCKING</p>
          <h1 className="page-title mb-1">Purchase Orders</h1>
          <p className="text-secondary mb-0">Request stock from suppliers, review orders, and track deliveries.</p>
        </div>
        <Link className="btn btn-primary" to="/purchase-orders/new">+ Create order</Link>
      </div>

      <section className="surface-card p-3 p-md-4 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label className="form-label fw-semibold" htmlFor="po-status">Status</label>
            <select id="po-status" className="form-select" value={params.get('status') || ''}
              onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All statuses</option>
              {Object.entries(names).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
          <div className="col-md-5">
            <label className="form-label fw-semibold" htmlFor="po-supplier">Supplier</label>
            <select id="po-supplier" className="form-select" value={params.get('supplier_id') || ''}
              onChange={(e) => updateFilter('supplier_id', e.target.value)}>
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <Button className="w-100" variant="outline-secondary" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>
          </div>
        </div>
      </section>

      {supplierError && <div className="alert alert-warning" role="alert">Supplier filter unavailable: {supplierError}</div>}
      {error && <div className="alert alert-danger d-flex justify-content-between flex-wrap gap-2" role="alert">
        <span>{error}</span><Button variant="outline-danger" onClick={() => setReload((x) => x + 1)}>Retry</Button>
      </div>}

      <section className="surface-card overflow-hidden">
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom gap-2">
          <strong>Orders {meta && <span className="text-secondary fw-normal">({meta.total} found)</span>}</strong>
          <Button variant="outline-secondary" className="btn-sm" disabled={loading} onClick={() => setReload((x) => x + 1)}>Refresh</Button>
        </div>
        {loading ? <div className="p-4"><Spinner label="Loading purchase orders..." /></div> :
          !error && <DataTable rows={orders} columns={columns} emptyTitle="No purchase orders match these filters" />}
      </section>
      {!loading && !error && <Pagination meta={meta} />}
    </>
  );
}
