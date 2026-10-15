import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { fieldErrorsFrom, messageFrom } from '../services/api.js';
import DataTable from './DataTable.jsx';
import Button from './Button.jsx';
import Spinner from './Spinner.jsx';
import Modal from './Modal.jsx';
import FormInput from './FormInput.jsx';
import ConfirmModal from './ConfirmModal.jsx';

function initialValues(fields, record) {
  return Object.fromEntries(fields.map((field) => [field.name, String(record?.[field.name] ?? '')]));
}

function checkValues(fields, values) {
  const found = {};
  for (const field of fields) {
    const value = values[field.name].trim();
    if (field.required && !value) found[field.name] = `${field.label} is required.`;
    else if (field.maxLength && value.length > field.maxLength) found[field.name] = `${field.label} must have no more than ${field.maxLength} characters.`;
    else if (field.name === 'phone' && value && !/^[0-9+\-\s()]+$/.test(value)) {
      found.phone = 'Use only digits, spaces, +, -, and parentheses.';
    }
  }
  return found;
}

function ResourceForm({ fields, item, title, busy, onSave, onClose }) {
  const [values, setValues] = useState(() => initialValues(fields, item));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  function change(name, value) {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    const found = checkValues(fields, values);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await onSave(Object.fromEntries(fields.map((field) => [field.name, values[field.name].trim() || null])));
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      setMessage(messageFrom(error, 'Could not save the record.'));
    }
  }

  return (
    <Modal show title={item ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`} onClose={busy ? () => {} : onClose}
      footer={<>
        <Button variant="outline-secondary" disabled={busy} onClick={onClose}>Cancel</Button>
        <Button type="submit" form="resource-editor-form" loading={busy}>{item ? 'Save changes' : 'Add record'}</Button>
      </>}>
      <form id="resource-editor-form" onSubmit={submit} noValidate>
        {message && <div role="alert" className="alert alert-danger">{message}</div>}
        {fields.map((field) => field.multiline ? (
          <div className="mb-3" key={field.name}>
            <label htmlFor={`resource-${field.name}`} className="form-label fw-semibold">{field.label}</label>
            <textarea id={`resource-${field.name}`} rows={3} className={`form-control ${errors[field.name] ? 'is-invalid' : ''}`}
              maxLength={field.maxLength} value={values[field.name]} onChange={(event) => change(field.name, event.target.value)} />
            {errors[field.name] && <div className="invalid-feedback">{errors[field.name]}</div>}
          </div>
        ) : <FormInput key={field.name} label={field.label} type={field.type || 'text'} required={Boolean(field.required)}
          maxLength={field.maxLength} value={values[field.name]} error={errors[field.name]}
          onChange={(event) => change(field.name, event.target.value)} />)}
      </form>
    </Modal>
  );
}

export default function ResourceManager({ title, singular, description, endpoint, fields, columns }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const admin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(endpoint, { signal: controller.signal });
        if (!Array.isArray(response.data?.data)) throw new Error('Unexpected API list response.');
        if (!controller.signal.aborted) setItems(response.data.data);
      } catch (err) {
        if (!controller.signal.aborted) setError(messageFrom(err, 'Could not load records.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [endpoint, reload]);

  function openForm(item = null) {
    setEditing(item);
    setFormOpen(true);
  }

  async function save(payload) {
    setSaving(true);
    try {
      if (editing) await api.put(`${endpoint}/${editing.id}`, payload);
      else await api.post(endpoint, payload);
      notify(`${title} ${editing ? 'updated' : 'added'} successfully.`);
      setFormOpen(false);
      setEditing(null);
      setReload((number) => number + 1);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await api.delete(`${endpoint}/${deleting.id}`);
      notify(`${title} deleted successfully.`);
      setDeleting(null);
      setReload((number) => number + 1);
    } catch (err) {
      notify(messageFrom(err, 'Delete failed.'), err.response?.status === 409 ? 'warning' : 'danger');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  const tableColumns = [
    ...columns,
    ...(admin ? [{ key: 'actions', label: 'Actions', render: (row) => (
      <div className="d-flex flex-wrap gap-2">
        <Button variant="outline-primary" className="btn-sm" onClick={() => openForm(row)}>Edit</Button>
        <Button variant="outline-danger" className="btn-sm" onClick={() => setDeleting(row)}>Delete</Button>
      </div>
    ) }] : []),
  ];

  return <>
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        <p className="eyebrow mb-2">POULTRYSTOCK / MANAGEMENT</p>
        <h1 className="page-title mb-1">{title}</h1>
        <p className="text-secondary mb-0">{description}</p>
      </div>
      {admin && <Button onClick={() => openForm()}>+ Add {singular.toLowerCase()}</Button>}
    </div>
    {error && <div role="alert" className="alert alert-danger d-flex gap-3 flex-wrap justify-content-between">
      <span>{error}</span><Button variant="outline-danger" onClick={() => setReload((value) => value + 1)}>Retry</Button>
    </div>}
    <section className="surface-card overflow-hidden">
      <div className="d-flex align-items-center justify-content-between px-3 px-md-4 py-3 border-bottom">
        <span className="fw-semibold">{title} {!loading && !error && <span className="fw-normal text-secondary">({items.length})</span>}</span>
        <Button variant="outline-secondary" className="btn-sm" disabled={loading} onClick={() => setReload((value) => value + 1)}>Refresh</Button>
      </div>
      {loading ? <div className="p-4"><Spinner label={`Loading ${title.toLowerCase()}...`} /></div> :
        !error && <DataTable columns={tableColumns} rows={items} emptyTitle={`No ${title.toLowerCase()} found`} />}
    </section>
    {formOpen && <ResourceForm key={editing?.id ?? 'new'} fields={fields} item={editing} title={singular}
      busy={saving} onSave={save} onClose={() => { setFormOpen(false); setEditing(null); }} />}
    <ConfirmModal show={Boolean(deleting)} title={`Delete ${singular.toLowerCase()}?`}
      message={`Delete ${deleting?.name || 'this record'}? Deletion will be blocked if related products or orders exist.`}
      busy={deletingBusy} confirmText="Delete" onClose={() => setDeleting(null)} onConfirm={remove} />
  </>;
}
