import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { messageFrom } from '../services/api.js';
import DataTable from '../components/DataTable.jsx';
import Spinner from '../components/Spinner.jsx';
import Button from '../components/Button.jsx';
import Pagination from '../components/Pagination.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import ProductForm from './ProductForm.jsx';

const php = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const quantity = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });

export default function ProductsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const admin = user?.role === 'admin';
  const [params, setParams] = useSearchParams();
  const urlSearch = params.get('search') || '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const timer = useRef(null);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [optionsError, setOptionsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const queryString = params.toString();

  useEffect(() => setSearchInput(urlSearch), [urlSearch]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadOptions() {
      try {
        const [categoryRes, supplierRes] = await Promise.all([
          api.get('/categories', { signal: controller.signal }),
          api.get('/suppliers', { signal: controller.signal }),
        ]);
        if (!controller.signal.aborted) {
          setCategories(categoryRes.data.data || []);
          setSuppliers(supplierRes.data.data || []);
          setOptionsError('');
        }
      } catch (err) {
        if (!controller.signal.aborted) setOptionsError(messageFrom(err, 'Could not load categories and suppliers.'));
      }
    }
    loadOptions();
    return () => controller.abort();
  }, [reload]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/products', {
          params: Object.fromEntries(new URLSearchParams(queryString).entries()),
          signal: controller.signal,
        });
        if (!Array.isArray(response.data?.data)) throw new Error('Unexpected products response.');
        if (!controller.signal.aborted) {
          setProducts(response.data.data);
          setMeta(response.data.meta || null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(messageFrom(err, 'Could not fetch products.'));
          setProducts([]);
          setMeta(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [queryString, reload]);

  function changeFilter(key, value) {
    clearTimeout(timer.current);
    const next = new URLSearchParams(params);
    if (key !== 'search' && searchInput.trim()) next.set('search', searchInput.trim());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  }

  function changeSearch(value) {
    setSearchInput(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (value.trim()) next.set('search', value.trim());
      else next.delete('search');
      next.delete('page');
      setParams(next);
    }, 350);
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setFormOpen(true);
  }

  async function saveProduct(payload) {
    if (editing) await api.put(`/products/${editing.id}`, payload);
    else await api.post('/products', payload);
    notify(editing ? 'Product updated successfully.' : 'Product added successfully.');
    setFormOpen(false);
    setEditing(null);
    setReload((number) => number + 1);
  }

  async function deleteProduct() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.delete(`/products/${deleting.id}`);
      notify('Product deleted successfully.');
      setDeleting(null);
      setReload((number) => number + 1);
    } catch (err) {
      notify(messageFrom(err, 'Could not delete product.'), err.response?.status === 409 ? 'warning' : 'danger');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Product', render: (row) => (
      <div><div className="fw-semibold">{row.name}</div><div className="small text-secondary">{row.sku}</div></div>
    ) },
    { key: 'category', label: 'Category', render: (row) => row.category?.name || '—' },
    { key: 'supplier', label: 'Supplier', render: (row) => row.supplier?.name || '—' },
    { key: 'price', label: 'Price', render: (row) => php.format(Number(row.price) || 0) },
    { key: 'stock_qty', label: 'Stock', render: (row) => (
      <div>
        <span className="fw-semibold">{quantity.format(Number(row.stock_qty) || 0)} {row.unit}</span>
        {row.is_low_stock && <span className="badge text-bg-warning ms-2">Low stock</span>}
        <div className="small text-secondary">Reorder at {quantity.format(Number(row.reorder_level) || 0)}</div>
      </div>
    ) },
    ...(admin ? [{ key: 'actions', label: 'Actions', render: (row) => (
      <div className="d-flex flex-wrap gap-2">
        <Button variant="outline-primary" className="btn-sm" onClick={() => openEdit(row)}>Edit</Button>
        <Button variant="outline-danger" className="btn-sm" onClick={() => setDeleting(row)}>Delete</Button>
      </div>
    ) }] : []),
  ];

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <p className="eyebrow mb-2">POULTRYSTOCK / INVENTORY</p>
          <h1 className="page-title mb-1">Products</h1>
          <p className="text-secondary mb-0">Search the inventory, monitor stock and manage products.</p>
        </div>
        {admin && <Button onClick={openNew} disabled={Boolean(optionsError) || !categories.length || !suppliers.length}>+ Add product</Button>}
      </div>

      <section className="surface-card p-3 p-md-4 mb-3">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <label htmlFor="product-search" className="form-label fw-semibold">Search name or SKU</label>
            <input id="product-search" type="search" className="form-control" value={searchInput}
              placeholder="e.g. Chicken, EGG-001" onChange={(event) => changeSearch(event.target.value)} />
          </div>
          <div className="col-md-4">
            <label htmlFor="category-filter" className="form-label fw-semibold">Category</label>
            <select id="category-filter" className="form-select" value={params.get('category_id') || ''}
              onChange={(event) => changeFilter('category_id', event.target.value)}>
              <option value="">All categories</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <div className="form-check mb-2">
              <input id="low-stock-filter" type="checkbox" className="form-check-input"
                checked={params.get('low_stock') === '1'}
                onChange={(event) => changeFilter('low_stock', event.target.checked ? '1' : '')} />
              <label className="form-check-label" htmlFor="low-stock-filter">Low stock only</label>
            </div>
            <Button variant="outline-secondary" className="btn-sm" onClick={() => {
              clearTimeout(timer.current); setSearchInput(''); setParams(new URLSearchParams());
            }}>Clear filters</Button>
          </div>
        </div>
      </section>

      {optionsError && <div className="alert alert-warning" role="alert">Unable to load filter choices: {optionsError}</div>}
      {error && (
        <div className="alert alert-danger d-flex flex-wrap justify-content-between align-items-center gap-2" role="alert">
          <span>{error}</span>
          <Button variant="outline-danger" onClick={() => setReload((value) => value + 1)}>Retry</Button>
        </div>
      )}

      <section className="surface-card overflow-hidden">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 px-3 px-md-4 py-3 border-bottom">
          <div className="fw-semibold">Product catalog {meta && <span className="text-secondary fw-normal">({meta.total} found)</span>}</div>
          <Button variant="outline-secondary" className="btn-sm" onClick={() => setReload((value) => value + 1)} disabled={loading}>Refresh</Button>
        </div>
        {loading ? <div className="p-4"><Spinner label="Loading products from Laravel..." /></div> :
          !error && <DataTable columns={columns} rows={products} emptyTitle="No products match your filters" />}
      </section>
      {!loading && !error && <Pagination meta={meta} />}

      {formOpen && <ProductForm
        key={editing?.id || 'new'} product={editing} categories={categories} suppliers={suppliers}
        onSave={saveProduct} onClose={() => { setFormOpen(false); setEditing(null); }}
      />}
      <ConfirmModal
        show={Boolean(deleting)} title="Delete product?" message={
          deleting ? `Delete ${deleting.name} (${deleting.sku})? Products with stock movements or purchase orders cannot be deleted.` : ''
        }
        confirmText="Delete product" busy={deletingBusy}
        onClose={() => setDeleting(null)} onConfirm={deleteProduct}
      />
    </>
  );
}
