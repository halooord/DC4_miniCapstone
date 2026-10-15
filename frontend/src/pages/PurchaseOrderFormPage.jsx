import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { fieldErrorsFrom, messageFrom } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/Button.jsx';
import Spinner from '../components/Spinner.jsx';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const LIMIT = 99999999.99;
const blankItem = () => ({ product_id: '', quantity: '', unit_cost: '' });
const emptyForm = () => ({ supplier_id: '', notes: '', items: [blankItem()] });
const validAmount = (value) => /^\d+(?:\.\d{1,2})?$/.test(String(value).trim()) && Number(value) > 0 && Number(value) <= LIMIT;

function check(values, products) {
  const errors = {};
  if (!values.supplier_id) errors.supplier_id = 'Choose a supplier.';
  if (values.notes.length > 500) errors.notes = 'Notes cannot exceed 500 characters.';
  if (!values.items.length) errors.items = 'Add at least one product to the order.';
  if (values.items.length > 50) errors.items = 'An order can contain at most 50 products.';
  const used = new Set();
  values.items.forEach((item, index) => {
    const prefix = `items.${index}`;
    if (!item.product_id) errors[`${prefix}.product_id`] = 'Select a product.';
    else if (!products.some((p) => String(p.id) === String(item.product_id))) errors[`${prefix}.product_id`] = 'Select a product from this supplier.';
    else if (used.has(String(item.product_id))) errors[`${prefix}.product_id`] = 'This product is already in the order.';
    used.add(String(item.product_id));
    if (!validAmount(item.quantity)) errors[`${prefix}.quantity`] = 'Enter a quantity greater than 0 (up to 2 decimals).';
    if (!validAmount(item.unit_cost)) errors[`${prefix}.unit_cost`] = 'Enter a cost greater than 0 (up to 2 decimals).';
  });
  return errors;
}

export default function PurchaseOrderFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();
  const [values, setValues] = useState(emptyForm);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [productsError, setProductsError] = useState('');
  const [notAllowed, setNotAllowed] = useState(false);
  const [productsRetry, setProductsRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function prepare() {
      setLoading(true);
      setMessage('');
      setNotAllowed(false);
      try {
        const [suppliersResult, orderResult] = await Promise.all([
          api.get('/suppliers', { signal: controller.signal }),
          editing ? api.get(`/purchase-orders/${id}`, { signal: controller.signal }) : Promise.resolve(null),
        ]);
        if (controller.signal.aborted) return;
        setSuppliers(Array.isArray(suppliersResult.data?.data) ? suppliersResult.data.data : []);
        if (editing) {
          const order = orderResult.data?.data;
          if (!order) throw new Error('Unexpected purchase order response.');
          if (!order.can?.edit) { setNotAllowed(true); return; }
          setValues({
            supplier_id: String(order.supplier?.id || ''),
            notes: order.notes || '',
            items: (order.items || []).map((item) => ({
              product_id: String(item.product_id),
              quantity: String(item.quantity),
              unit_cost: String(item.unit_cost),
            })),
          });
        }
      } catch (err) {
        if (!controller.signal.aborted) setMessage(messageFrom(err, 'Unable to load order form.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    prepare();
    return () => controller.abort();
  }, [editing, id]);

  useEffect(() => {
    const controller = new AbortController();
    if (!values.supplier_id) {
      setProducts([]);
      setProductsLoading(false);
      setProductsError('');
      return () => controller.abort();
    }
    async function loadProducts() {
      setProductsLoading(true);
      setProducts([]);
      setProductsError('');
      try {
        let page = 1;
        let last = 1;
        const results = [];
        do {
          const { data } = await api.get('/products', {
            params: { supplier_id: values.supplier_id, per_page: 50, page },
            signal: controller.signal,
          });
          if (!Array.isArray(data?.data)) throw new Error('Unexpected supplier products response.');
          results.push(...data.data);
          last = Number(data.meta?.last_page) || 1;
          page += 1;
        } while (page <= last && !controller.signal.aborted);
        if (!controller.signal.aborted) setProducts(results);
      } catch (err) {
        if (!controller.signal.aborted) setProductsError(messageFrom(err, 'Unable to load supplier products.'));
      } finally {
        if (!controller.signal.aborted) setProductsLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [values.supplier_id, productsRetry]);

  function setField(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setMessage('');
  }
  function supplierChanged(value) {
    setValues((current) => ({ ...current, supplier_id: value, items: [blankItem()] }));
    setErrors({});
    setMessage('');
  }
  function setItem(index, key, value) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item, i) => i === index ? { ...item, [key]: value } : item),
    }));
    setErrors((current) => ({ ...current, [`items.${index}.${key}`]: '', items: '' }));
    setMessage('');
  }
  function addItem() {
    setValues((current) => ({ ...current, items: [...current.items, blankItem()] }));
    setErrors({});
  }
  function removeItem(index) {
    setValues((current) => ({ ...current, items: current.items.filter((_, i) => i !== index) }));
    setErrors({});
  }

  const total = useMemo(() => values.items.reduce((sum, item) =>
    sum + (Number(item.quantity) > 0 && Number(item.unit_cost) > 0
      ? Number(item.quantity) * Number(item.unit_cost) : 0), 0), [values.items]);

  async function submit(event) {
    event.preventDefault();
    const found = check(values, products);
    setErrors(found);
    if (Object.keys(found).length || productsLoading || productsError) return;
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        supplier_id: Number(values.supplier_id),
        notes: values.notes.trim() || null,
        items: values.items.map((item) => ({
          product_id: Number(item.product_id), quantity: Number(item.quantity), unit_cost: Number(item.unit_cost),
        })),
      };
      const { data } = editing ? await api.put(`/purchase-orders/${id}`, payload) : await api.post('/purchase-orders', payload);
      notify(editing ? 'Purchase order updated.' : 'Purchase order created and awaiting approval.');
      navigate(`/purchase-orders/${data.data.id}`, { replace: true });
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setMessage(messageFrom(err, 'Could not save purchase order.'));
    } finally {
      setSaving(false);
    }
  }

  const returnTo = editing ? `/purchase-orders/${id}` : '/purchase-orders';
  return (
    <>
      <p className="eyebrow mb-2">POULTRYSTOCK / RESTOCKING</p>
      <h1 className="page-title mb-1">{editing ? `Edit Purchase Order #${id}` : 'Create Purchase Order'}</h1>
      <p className="text-secondary mb-4">{editing ? 'Only pending orders may be edited by their requester or an admin.' : 'Send a restocking request for owner approval.'}</p>
      {loading && <section className="surface-card p-4"><Spinner label="Preparing purchase order..." /></section>}
      {!loading && notAllowed && <div className="alert alert-warning" role="alert">You cannot edit this order. Only its requester or an admin may edit pending orders. <Link to={returnTo}>View order</Link>.</div>}
      {!loading && message && <div className="alert alert-danger" role="alert">{message}</div>}
      {!loading && !notAllowed && suppliers.length > 0 && <form onSubmit={submit} noValidate>
        <section className="surface-card p-3 p-md-4 mb-3">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold" htmlFor="po-form-supplier">Supplier</label>
              <select id="po-form-supplier" className={`form-select ${errors.supplier_id ? 'is-invalid' : ''}`}
                value={values.supplier_id} disabled={saving} onChange={(e) => supplierChanged(e.target.value)}>
                <option value="">Choose a supplier</option>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
              </select>
              {errors.supplier_id && <div className="invalid-feedback">{errors.supplier_id}</div>}
            </div>
            <div className="col-12">
              <label className="form-label fw-semibold" htmlFor="po-notes">Notes (optional)</label>
              <textarea id="po-notes" rows="2" maxLength={500} className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                value={values.notes} onChange={(e) => setField('notes', e.target.value)} />
              {errors.notes && <div className="invalid-feedback">{errors.notes}</div>}
            </div>
          </div>
        </section>
        <section className="surface-card p-3 p-md-4 mb-3">
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
            <div><h2 className="h5 fw-bold mb-1">Order items</h2>
              <p className="small text-secondary mb-0">Products are limited to the chosen supplier. Unit cost is what the shop pays, not the selling price.</p></div>
            <Button variant="outline-primary" disabled={saving || productsLoading || !values.supplier_id || !!productsError || !products.length || values.items.length >= 50} onClick={addItem}>+ Add item</Button>
          </div>
          {productsLoading && <div className="mb-3"><Spinner label="Loading products for this supplier..." /></div>}
          {productsError && <div className="alert alert-warning d-flex justify-content-between flex-wrap gap-2" role="alert"><span>{productsError}</span>
            <Button variant="outline-secondary" onClick={() => setProductsRetry((x) => x + 1)}>Retry</Button></div>}
          {values.supplier_id && !productsLoading && !productsError && !products.length &&
            <div className="alert alert-info">No products are assigned to this supplier. Choose another supplier or ask an admin to assign products first.</div>}
          {errors.items && <div className="alert alert-danger" role="alert">{errors.items}</div>}
          {values.items.map((item, index) => {
            const picked = products.find((p) => String(p.id) === item.product_id);
            return <div className="border rounded-3 p-3 mb-3" key={index}>
              <div className="d-flex align-items-center justify-content-between mb-3"><strong>Item {index + 1}</strong>
                <Button variant="outline-danger" className="btn-sm" disabled={saving} onClick={() => removeItem(index)}>Remove</Button></div>
              <div className="row g-3">
                <div className="col-lg-5">
                  <label htmlFor={`po-item-product-${index}`} className="form-label fw-semibold">Product</label>
                  <select id={`po-item-product-${index}`} className={`form-select ${errors[`items.${index}.product_id`] ? 'is-invalid' : ''}`}
                    disabled={saving || productsLoading || !values.supplier_id} value={item.product_id}
                    onChange={(e) => setItem(index, 'product_id', e.target.value)}>
                    <option value="">Choose a product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                  </select>
                  {errors[`items.${index}.product_id`] && <div className="invalid-feedback">{errors[`items.${index}.product_id`]}</div>}
                  {picked && <div className="small text-secondary mt-1">Unit: {picked.unit}</div>}
                </div>
                <div className="col-sm-6 col-lg-3">
                  <label htmlFor={`po-item-qty-${index}`} className="form-label fw-semibold">Quantity</label>
                  <input id={`po-item-qty-${index}`} type="number" min="0.01" step="0.01" className={`form-control ${errors[`items.${index}.quantity`] ? 'is-invalid' : ''}`}
                    value={item.quantity} disabled={saving} onChange={(e) => setItem(index, 'quantity', e.target.value)} />
                  {errors[`items.${index}.quantity`] && <div className="invalid-feedback">{errors[`items.${index}.quantity`]}</div>}
                </div>
                <div className="col-sm-6 col-lg-4">
                  <label htmlFor={`po-item-cost-${index}`} className="form-label fw-semibold">Unit cost (₱)</label>
                  <input id={`po-item-cost-${index}`} type="number" min="0.01" step="0.01" className={`form-control ${errors[`items.${index}.unit_cost`] ? 'is-invalid' : ''}`}
                    value={item.unit_cost} disabled={saving} onChange={(e) => setItem(index, 'unit_cost', e.target.value)} />
                  {errors[`items.${index}.unit_cost`] && <div className="invalid-feedback">{errors[`items.${index}.unit_cost`]}</div>}
                </div>
              </div>
              <div className="small text-secondary text-end mt-2">Subtotal: <strong>{money.format(Number(item.quantity || 0) * Number(item.unit_cost || 0) || 0)}</strong></div>
            </div>;
          })}
          <div className="text-end"><span className="text-secondary">Running total: </span><strong className="fs-4">{money.format(total)}</strong></div>
        </section>
        <div className="d-flex flex-wrap gap-2 justify-content-end mb-4">
          <Link className="btn btn-outline-secondary" to={returnTo}>Cancel</Link>
          <Button type="submit" loading={saving} disabled={productsLoading || !!productsError || !values.supplier_id || !products.length}>
            {editing ? 'Save changes' : 'Create purchase order'}
          </Button>
        </div>
      </form>}
      {!loading && !notAllowed && !suppliers.length && <div className="alert alert-warning">No suppliers available. Ask an admin to add a supplier before creating an order.</div>}
    </>
  );
}
