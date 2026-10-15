import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import FormInput from '../components/FormInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fieldErrorsFrom, messageFrom } from '../services/api.js';

export default function LoginPage() {
  const { login } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setFormError('');
  }

  async function submit(event) {
    event.preventDefault();
    const next = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (!form.password) next.password = 'Password is required.';
    if (Object.keys(next).length) { setErrors(next); return; }

    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      await login({ email: form.email.trim(), password: form.password });
      notify('Welcome back to PoultryStock!');
      const destination = location.state?.from?.pathname;
      navigate(destination && destination !== '/login' ? destination : '/dashboard', { replace: true });
    } catch (error) {
      const serverErrors = fieldErrorsFrom(error);
      setErrors(serverErrors);
      if (!Object.keys(serverErrors).length) setFormError(messageFrom(error, error.message));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page min-vh-100 d-flex align-items-center py-5">
      <div className="container"><div className="auth-card mx-auto row g-0 overflow-hidden shadow-lg">
        <div className="col-lg-5 auth-side p-4 p-md-5 d-flex flex-column justify-content-between">
          <div><div className="auth-brand mb-5"><span className="brand-mark me-2">P</span> PoultryStock</div>
            <h1 className="display-6 fw-bold">A clearer view of your shop.</h1>
            <p className="mt-3 auth-description">Manage poultry stock, track changes, and keep restocking organized.</p>
          </div>
          <p className="small auth-description mb-0">Inventory · Accountability · Restocking</p>
        </div>
        <div className="col-lg-7 bg-white p-4 p-md-5">
          <div className="mb-4"><p className="eyebrow">WELCOME BACK</p><h2 className="h3 fw-bold mb-2">Sign in</h2><p className="text-secondary">Enter your PoultryStock account.</p></div>
          {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
          <form onSubmit={submit} noValidate>
            <FormInput label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={change} error={errors.email} required />
            <FormInput label="Password" name="password" type="password" autoComplete="current-password" value={form.password} onChange={change} error={errors.password} required />
            <Button type="submit" loading={submitting} className="w-100 py-2 mt-2">Sign in</Button>
          </form>
          <p className="text-center text-secondary small mt-4 mb-0">Need a staff account? <Link to="/register">Register here</Link></p>
        </div>
      </div></div>
    </main>
  );
}
