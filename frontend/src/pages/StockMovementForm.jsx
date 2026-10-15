import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import FormInput from '../components/FormInput.jsx';
import { fieldErrorsFrom, messageFrom } from '../services/api.js';

const types = [
  ['in', 'Stock in — increases stock'],
  ['out', 'Stock out — decreases stock'],
  ['spoilage', 'Spoilage / breakage / mortality — decreases stock'],
  ['adjustment', 'Stock adjustment — increase or decrease'],
];
const quantityPattern = /^\d+(?:\.\d{1,2})?$/;

export default function StockMovementForm({ products, onSave, onClose }) {
  const [form, setForm] = useState({ product_id: '', type: 'out', direction: '', quantity: '', reason: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const selectedProduct = products.find((item) => String(item.id) === form.product_id);
  const needsReason = ['spoilage', 'adjustment'].includes(form.type);
  const decreasing = ['out', 'spoilage'].includes(form.type)
    || (form.type === 'adjustment' && form.direction === 'decrease');

  function setField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value };
      if (name === 'type' && value !== 'adjustment') next.direction = '';
      return next;
    });
    setErrors((current) => ({ ...current, [name]: '' }));
    setMessage('');
  }

  function validate() {
    const found = {};
    if (!form.product_id || !selectedProduct) found.product_id = 'Choose a product.';
    if (!types.some(([type]) => type === form.type)) found.type = 'Choose a valid movement type.';
    if (form.type === 'adjustment' && !['increase', 'decrease'].includes(form.direction)) {
      found.direction = 'Choose increase or decrease.';
    }
    const amount = Number(form.quantity);
    if (!quantityPattern.test(form.quantity.trim()) || !Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
      found.quantity = 'Enter a quantity above 0 with at most two decimal places.';
    }
    if (needsReason && !form.reason.trim()) found.reason = 'Enter a reason for this movement.';
    if (form.reason.trim().length > 255) found.reason = 'Reason cannot exceed 255 characters.';
    return found;
  }

  async function submit(event) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      product_id: Number(form.product_id),
      type: form.type,
      quantity: Number(form.quantity),
    };
    if (form.type === 'adjustment') payload.direction = form.direction;
    if (form.reason.trim()) payload.reason = form.reason.trim();

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      setMessage(messageFrom(error, 'Unable to record the movement.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show title="Record stock movement" onClose={saving ? () => {} : onClose}
      footer={<>
        <Button variant="outline-secondary" disabled={saving} onClick={onClose}>Cancel</Button>
        <Button type="submit" form="record-stock-movement" loading={saving}>Record movement</Button>
      </>}
    >
      <form id="record-stock-movement" onSubmit={submit} noValidate>
        <p className="small text-secondary">This creates a permanent movement record and changes the product's stock immediately. Movements cannot be edited or deleted.</p>
        {message && <div role="alert" className="alert alert-danger">{message}</div>}
        <div className="mb-3">
          <label htmlFor="movement-product" className="form-label fw-semibold">Product</label>
          <select id="movement-product" className={`form-select ${errors.product_id ? 'is-invalid' : ''}`}
            value={form.product_id} onChange={(e) => setField('product_id', e.target.value)}>
            <option value="">Choose a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku}) — {Number(product.stock_qty).toLocaleString('en-PH')} {product.unit} available
              </option>
            ))}
          </select>
          {errors.product_id && <div className="invalid-feedback">{errors.product_id}</div>}
          {selectedProduct && <div className="form-text">Current displayed stock: <strong>{Number(selectedProduct.stock_qty).toLocaleString('en-PH')} {selectedProduct.unit}</strong>. The server verifies the actual available stock when you save.</div>}
        </div>
        <div className="mb-3">
          <label htmlFor="movement-type" className="form-label fw-semibold">Movement type</label>
          <select id="movement-type" className={`form-select ${errors.type ? 'is-invalid' : ''}`}
            value={form.type} onChange={(e) => setField('type', e.target.value)}>
            {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {errors.type && <div className="invalid-feedback">{errors.type}</div>}
        </div>
        {form.type === 'adjustment' && (
          <div className="mb-3">
            <label htmlFor="movement-direction" className="form-label fw-semibold">Adjustment direction</label>
            <select id="movement-direction" className={`form-select ${errors.direction ? 'is-invalid' : ''}`}
              value={form.direction} onChange={(e) => setField('direction', e.target.value)}>
              <option value="">Choose direction</option>
              <option value="increase">Increase stock</option>
              <option value="decrease">Decrease stock</option>
            </select>
            {errors.direction && <div className="invalid-feedback">{errors.direction}</div>}
          </div>
        )}
        <FormInput label={`Quantity${selectedProduct ? ` (${selectedProduct.unit})` : ''}`} type="number" min="0.01" step="0.01"
          value={form.quantity} error={errors.quantity} onChange={(e) => setField('quantity', e.target.value)} required />
        {decreasing && selectedProduct && Number(form.quantity) > Number(selectedProduct.stock_qty) && (
          <p className="small text-danger" role="status">This exceeds the displayed stock. The API will reject any change that makes stock negative.</p>
        )}
        <div className="mb-1">
          <label htmlFor="movement-reason" className="form-label fw-semibold">Reason {needsReason ? '(required)' : '(optional)'}</label>
          <textarea id="movement-reason" rows={3} maxLength={255}
            className={`form-control ${errors.reason ? 'is-invalid' : ''}`}
            value={form.reason} onChange={(e) => setField('reason', e.target.value)}
            placeholder={form.type === 'spoilage' ? 'e.g. Broken eggs or spoiled chicken' : 'Explain why stock changed'} />
          {errors.reason && <div className="invalid-feedback">{errors.reason}</div>}
        </div>
      </form>
    </Modal>
  );
}
