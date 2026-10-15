import { useState } from 'react';
import Modal from '../components/Modal.jsx';
import Button from '../components/Button.jsx';
import FormInput from '../components/FormInput.jsx';
import { fieldErrorsFrom, messageFrom } from '../services/api.js';

const UNITS = ['kg', 'piece', 'tray', 'sack', 'pack', 'bottle'];
const MAX_AMOUNT = 99999999.99;

function initialValues(product) {
  return {
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category_id: String(product?.category_id ?? ''),
    supplier_id: String(product?.supplier_id ?? ''),
    unit: product?.unit ?? '',
    price: String(product?.price ?? ''),
    reorder_level: String(product?.reorder_level ?? ''),
  };
}

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Enter a product name.';
  else if (values.name.trim().length > 150) errors.name = 'Name cannot exceed 150 characters.';

  if (!values.sku.trim()) errors.sku = 'Enter a unique SKU.';
  else if (!/^[A-Za-z0-9_-]{1,50}$/.test(values.sku.trim())) {
    errors.sku = 'Use up to 50 letters, numbers, hyphens or underscores.';
  }

  if (!values.category_id) errors.category_id = 'Choose a category.';
  if (!values.supplier_id) errors.supplier_id = 'Choose a supplier.';
  if (!UNITS.includes(values.unit)) errors.unit = 'Choose a valid unit.';

  const validMoney = (value) => /^\d+(?:\.\d{1,2})?$/.test(value.trim()) && Number(value) <= MAX_AMOUNT;
  if (!validMoney(values.price) || Number(values.price) <= 0) {
    errors.price = 'Enter a price above 0 with no more than 2 decimal places.';
  }
  if (!validMoney(values.reorder_level) || Number(values.reorder_level) < 0) {
    errors.reorder_level = 'Enter 0 or more with no more than 2 decimal places.';
  }
  return errors;
}

function SelectField({ name, label, options, placeholder, value, error, onChange }) {
    const id = `product-${name}`;
    return (
      <div className="mb-3">
        <label className="form-label fw-semibold" htmlFor={id}>{label}</label>
        <select
          id={id}
          className={`form-select ${error ? 'is-invalid' : ''}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {error && <div className="invalid-feedback">{error}</div>}
      </div>
    );
  }


export default function ProductForm({ product, categories, suppliers, onSave, onClose }) {
  const [values, setValues] = useState(() => initialValues(product));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const editing = Boolean(product);

  function setField(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      category_id: Number(values.category_id),
      supplier_id: Number(values.supplier_id),
      unit: values.unit,
      price: Number(values.price),
      reorder_level: Number(values.reorder_level),
    };

    setSaving(true);
    try {
      await onSave(payload);
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      setMessage(messageFrom(error, 'Unable to save the product.'));
    } finally {
      setSaving(false);
    }
  }


  return (
    <Modal
      show
      title={editing ? `Edit product: ${product.name}` : 'Add product'}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="poultrystock-product-form" loading={saving}>
            {editing ? 'Save changes' : 'Add product'}
          </Button>
        </>
      }
    >
      <form id="poultrystock-product-form" onSubmit={submit} noValidate>
        <p className="small text-secondary">Products start with 0 stock. Record stock changes under Stock Movements later.</p>
        {message && <div className="alert alert-danger" role="alert">{message}</div>}
        <FormInput
          label="Product name" value={values.name} maxLength={150}
          error={errors.name} onChange={(event) => setField('name', event.target.value)} required
        />
        <FormInput
          label="SKU" value={values.sku} maxLength={50} placeholder="e.g. EGG-TRAY-001"
          error={errors.sku} onChange={(event) => setField('sku', event.target.value)} required
        />
        <SelectField
          name="category_id" value={values.category_id} error={errors.category_id}
          onChange={(value) => setField('category_id', value)} label="Category" placeholder="Select category"
          options={categories.map((row) => ({ value: String(row.id), label: row.name }))}
        />
        <SelectField
          name="supplier_id" value={values.supplier_id} error={errors.supplier_id}
          onChange={(value) => setField('supplier_id', value)} label="Supplier" placeholder="Select supplier"
          options={suppliers.map((row) => ({ value: String(row.id), label: row.name }))}
        />
        <SelectField
          name="unit" value={values.unit} error={errors.unit}
          onChange={(value) => setField('unit', value)} label="Unit" placeholder="Select unit"
          options={UNITS.map((unit) => ({ value: unit, label: unit }))}
        />
        <div className="row g-2">
          <div className="col-sm-6">
            <FormInput label="Selling price (₱)" type="number" min="0.01" step="0.01" value={values.price}
              error={errors.price} onChange={(event) => setField('price', event.target.value)} required />
          </div>
          <div className="col-sm-6">
            <FormInput label="Reorder level" type="number" min="0" step="0.01" value={values.reorder_level}
              error={errors.reorder_level} onChange={(event) => setField('reorder_level', event.target.value)} required />
          </div>
        </div>
      </form>
    </Modal>
  );
}
