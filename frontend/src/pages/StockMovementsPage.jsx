import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { messageFrom } from '../services/api.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import Pagination from '../components/Pagination.jsx';
import Spinner from '../components/Spinner.jsx';
import StockMovementForm from './StockMovementForm.jsx';

const typeLabels = { in: 'Stock in', out: 'Stock out', spoilage: 'Spoilage', adjustment: 'Adjustment' };
const qty = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });
const dateFormatter = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
const dateText = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
};

export default function StockMovementsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [movements, setMovements] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      try {
        // The API returns up to 50 products per page; collect every page for the dropdown.
        const allProducts = [];
        let page = 1;
        let lastPage = 1;
        do {
          const response = await api.get('/products', { params: { per_page: 50, page }, signal: controller.signal });
          if (!Array.isArray(response.data?.data)) throw new Error('Invalid products response.');
          allProducts.push(...response.data.data);
          lastPage = response.data.meta?.last_page || 1;
          page += 1;
        } while (page <= lastPage && !controller.signal.aborted);
        const userResponse = admin ? await api.get('/users', { signal: controller.signal }) : null;
        if (!controller.signal.aborted) {
          setProducts(allProducts);
          setUsers(Array.isArray(userResponse?.data?.data) ? userResponse.data.data : []);
          setOptionsError('');
        }
      } catch (requestError) {
        if (!controller.signal.aborted) setOptionsError(messageFrom(requestError, 'Could not load filter options.'));
      }
    }
    loadOptions();
    return () => controller.abort();
  }, [admin, reload]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadMovements() {
      setLoading(true);
      setError('');
      try {
        const values = Object.fromEntries(new URLSearchParams(queryString));
        if (values.date_from && values.date_to && values.date_from > values.date_to) {
          throw new Error('End date must be the same as or after the start date.');
        }
        const response = await api.get('/stock-movements', { params: values, signal: controller.signal });
        if (!Array.isArray(response.data?.data)) throw new Error('Invalid stock movements response.');
        if (!controller.signal.aborted) {
          setMovements(response.data.data);
          setMeta(response.data.meta || null);
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(messageFrom(requestError, 'Could not load stock movements.'));
          setMovements([]);
          setMeta(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadMovements();
    return () => controller.abort();
  }, [queryString, reload]);

  function updateFilter(name, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete('page');
    setParams(next);
  }

  async function saveMovement(payload) {
    await api.post('/stock-movements', payload);
    notify('Stock movement recorded. Inventory has been updated.');
    setFormOpen(false);
    // Show the latest activity on page 1, not a stale filtered page.
    setParams(new URLSearchParams());
    setReload((value) => value + 1);
  }

  const columns = [
    { key: 'created_at', label: 'Date', render: (row) => dateText(row.created_at) },
    { key: 'product', label: 'Product', render: (row) => (
      <div><span className="fw-semibold">{row.product?.name || 'Unknown product'}</span>
        <div className="small text-secondary">{row.product?.sku || '—'}</div></div>
    ) },
    { key: 'type', label: 'Type', render: (row) => (
      <div><span className="fw-semibold">{typeLabels[row.type] || row.type}</span>
        {row.type === 'adjustment' && <div className="small text-secondary text-capitalize">{row.direction}</div>}</div>
    ) },
    { key: 'quantity', label: 'Stock change', render: (row) => (
      <span className={`fw-semibold ${row.effect === 'increase' ? 'text-success' : 'text-danger'}`}>
        {row.effect === 'increase' ? '+' : row.effect === 'decrease' ? '−' : ''}
        {qty.format(Number(row.quantity))} {row.product?.unit || ''}
      </span>
    ) },
    { key: 'reason', label: 'Reason', render: (row) => (
      <span className="text-break">{row.reason || (row.purchase_order_id ? `Received PO #${row.purchase_order_id}` : '—')}</span>
    ) },
    { key: 'user', label: 'Recorded by', render: (row) => row.user?.name || '—' },
  ];

  return (
    <>
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">POULTRYSTOCK / ACCOUNTABILITY</p>
          <h1 className="page-title mb-1">Stock Movements</h1>
          <p className="text-secondary mb-0">Record stock changes and review the permanent inventory history.</p>
        </div>
        <Button disabled={!!optionsError || products.length === 0} onClick={() => setFormOpen(true)}>+ Record movement</Button>
      </div>
      <section className="surface-card p-3 p-md-4 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-4 col-lg-3">
            <label htmlFor="movement-filter-product" className="form-label fw-semibold">Product</label>
            <select id="movement-filter-product" className="form-select" value={params.get('product_id') || ''}
              onChange={(e) => updateFilter('product_id', e.target.value)}>
              <option value="">All products</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
            </select>
          </div>
          <div className="col-12 col-sm-6 col-md-4 col-lg-2">
            <label htmlFor="movement-filter-type" className="form-label fw-semibold">Type</label>
            <select id="movement-filter-type" className="form-select" value={params.get('type') || ''}
              onChange={(e) => updateFilter('type', e.target.value)}>
              <option value="">All types</option>
              {Object.entries(typeLabels).map(([type, label]) => <option key={type} value={type}>{label}</option>)}
            </select>
          </div>
          {admin && <div className="col-12 col-sm-6 col-md-4 col-lg-3">
            <label htmlFor="movement-filter-user" className="form-label fw-semibold">Recorded by</label>
            <select id="movement-filter-user" className="form-select" value={params.get('user_id') || ''}
              onChange={(e) => updateFilter('user_id', e.target.value)}>
              <option value="">All users</option>
              {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>}
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="movement-filter-from" className="form-label fw-semibold">From date</label>
            <input type="date" id="movement-filter-from" className="form-control" value={params.get('date_from') || ''}
              onChange={(e) => updateFilter('date_from', e.target.value)} />
          </div>
          <div className="col-6 col-md-3 col-lg-2">
            <label htmlFor="movement-filter-to" className="form-label fw-semibold">To date</label>
            <input type="date" id="movement-filter-to" className="form-control" value={params.get('date_to') || ''}
              onChange={(e) => updateFilter('date_to', e.target.value)} />
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
          <Button variant="outline-secondary" className="btn-sm" onClick={() => setParams(new URLSearchParams())}>Clear filters</Button>
          <span className="small text-secondary">{admin ? 'Admin view: all staff movements.' : 'Staff view: movements recorded by you only.'}</span>
        </div>
      </section>

      {optionsError && <div className="alert alert-warning" role="alert">{optionsError}</div>}
      {error && <div className="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
        <span>{error}</span><Button variant="outline-danger" onClick={() => setReload((value) => value + 1)}>Retry</Button>
      </div>}

      <section className="surface-card overflow-hidden">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 px-md-4 py-3 border-bottom">
          <div className="fw-semibold">Movement history {meta && <span className="text-secondary fw-normal">({meta.total} records)</span>}</div>
          <Button variant="outline-secondary" className="btn-sm" disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh</Button>
        </div>
        {loading ? <div className="p-4"><Spinner label="Loading stock movements..." /></div>
          : !error && <DataTable columns={columns} rows={movements} emptyTitle="No movements match your filters" />}
      </section>
      {!loading && !error && <Pagination meta={meta} />}
      {formOpen && <StockMovementForm products={products} onSave={saveMovement} onClose={() => setFormOpen(false)} />}
    </>
  );
}
