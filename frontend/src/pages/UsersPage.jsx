import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api, { fieldErrorsFrom, messageFrom } from '../services/api.js';
import Button from '../components/Button.jsx';
import DataTable from '../components/DataTable.jsx';
import Spinner from '../components/Spinner.jsx';
import Modal from '../components/Modal.jsx';
import FormInput from '../components/FormInput.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

function UserForm({ user, saving, onSave, onClose }) {
  const [values, setValues] = useState(() => ({
    name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'staff', password: '',
  }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const editing = Boolean(user);

  function change(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setMessage('');
  }

  async function submit(event) {
    event.preventDefault();
    const found = {};
    if (!values.name.trim()) found.name = 'Name is required.';
    else if (values.name.trim().length > 100) found.name = 'Maximum 100 characters.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.length > 255) found.email = 'Enter a valid email address.';
    if (!['admin', 'staff'].includes(values.role)) found.role = 'Choose a role.';
    if ((!editing || values.password) && values.password.length < 8) found.password = 'Password needs at least 8 characters.';
    setErrors(found);
    if (Object.keys(found).length) return;

    try {
      const payload = {
        name: values.name.trim(), email: values.email.trim(), role: values.role,
      };
      if (!editing || values.password) payload.password = values.password;
      await onSave(payload);
    } catch (error) {
      setErrors(fieldErrorsFrom(error));
      setMessage(messageFrom(error, 'Unable to save user.'));
    }
  }

  return <Modal show title={editing ? 'Edit user account' : 'Add user account'} onClose={saving ? () => {} : onClose}
    footer={<>
      <Button variant="outline-secondary" disabled={saving} onClick={onClose}>Cancel</Button>
      <Button form="user-management-form" type="submit" loading={saving}>{editing ? 'Save changes' : 'Add user'}</Button>
    </>}>
    <form id="user-management-form" noValidate onSubmit={submit}>
      {message && <div className="alert alert-danger" role="alert">{message}</div>}
      <FormInput label="Full name" required maxLength={100} value={values.name} error={errors.name}
        onChange={(event) => change('name', event.target.value)} />
      <FormInput label="Email address" type="email" required maxLength={255} value={values.email} error={errors.email}
        onChange={(event) => change('email', event.target.value)} />
      <div className="mb-3">
        <label htmlFor="managed-user-role" className="form-label fw-semibold">Role</label>
        <select id="managed-user-role" className={`form-select ${errors.role ? 'is-invalid' : ''}`}
          value={values.role} onChange={(event) => change('role', event.target.value)}>
          <option value="staff">Staff</option>
          <option value="admin">Admin / Owner</option>
        </select>
        {errors.role && <div className="invalid-feedback">{errors.role}</div>}
      </div>
      <FormInput label={editing ? 'New password (leave blank to keep current password)' : 'Password'}
        type="password" required={!editing} autoComplete="new-password" minLength={8} value={values.password} error={errors.password}
        onChange={(event) => change('password', event.target.value)} />
      {editing && <p className="small text-secondary">Changing this user's role or password revokes their existing sessions.</p>}
    </form>
  </Modal>;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/users', { signal: controller.signal });
        if (!Array.isArray(response.data?.data)) throw new Error('Unexpected users response.');
        if (!controller.signal.aborted) setItems(response.data.data);
      } catch (err) {
        if (!controller.signal.aborted) setError(messageFrom(err, 'Could not load users.'));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [reload]);

  function openForm(item = null) {
    setEditing(item);
    setFormOpen(true);
  }

  async function save(payload) {
    setSaving(true);
    try {
      if (editing) await api.put(`/users/${editing.id}`, payload);
      else await api.post('/users', payload);
      notify(`User ${editing ? 'updated' : 'created'} successfully.`);
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
      await api.delete(`/users/${deleting.id}`);
      notify('User deleted successfully.');
      setDeleting(null);
      setReload((number) => number + 1);
    } catch (err) {
      notify(messageFrom(err, 'Could not delete user.'), err.response?.status === 409 ? 'warning' : 'danger');
      setDeleting(null);
    } finally {
      setDeletingBusy(false);
    }
  }

  const columns = [
    { key: 'name', label: 'Name', render: (row) => <span className="fw-semibold">{row.name}</span> },
    { key: 'email', label: 'Email', render: (row) => <span className="text-break">{row.email}</span> },
    { key: 'role', label: 'Role', render: (row) => <span className={`badge text-bg-${row.role === 'admin' ? 'primary' : 'secondary'} text-capitalize`}>{row.role}</span> },
    { key: 'actions', label: 'Actions', render: (row) => (
      <div className="d-flex flex-wrap gap-2">
        <Button className="btn-sm" variant="outline-primary" onClick={() => openForm(row)}>Edit</Button>
        <Button className="btn-sm" variant="outline-danger" disabled={row.id === user?.id} onClick={() => setDeleting(row)}>Delete</Button>
      </div>
    ) },
  ];

  return <>
    <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-4">
      <div><p className="eyebrow mb-2">ADMIN ONLY / ACCOUNTS</p>
        <h1 className="page-title mb-1">Users</h1>
        <p className="text-secondary mb-0">Manage owner and staff accounts. Only admins can access this page.</p></div>
      <Button onClick={() => openForm()}>+ Add user</Button>
    </div>
    {error && <div role="alert" className="alert alert-danger d-flex gap-3 justify-content-between">
      <span>{error}</span><Button variant="outline-danger" onClick={() => setReload((x) => x + 1)}>Retry</Button>
    </div>}
    <section className="surface-card overflow-hidden">
      <div className="d-flex px-3 px-md-4 py-3 justify-content-between align-items-center border-bottom">
        <span className="fw-semibold">Accounts {!loading && !error && `(${items.length})`}</span>
        <Button variant="outline-secondary" className="btn-sm" disabled={loading} onClick={() => setReload((x) => x + 1)}>Refresh</Button>
      </div>
      {loading ? <div className="p-4"><Spinner label="Loading accounts..." /></div> :
        !error && <DataTable columns={columns} rows={items} emptyTitle="No accounts found" />}
    </section>
    {formOpen && <UserForm key={editing?.id ?? 'new'} user={editing} saving={saving} onSave={save}
      onClose={() => { setFormOpen(false); setEditing(null); }} />}
    <ConfirmModal show={Boolean(deleting)} busy={deletingBusy} title="Delete user?" confirmText="Delete user"
      message={`Delete ${deleting?.name || 'this user'}? Users with stock or order history cannot be deleted.`}
      onConfirm={remove} onClose={() => setDeleting(null)} />
  </>;
}
