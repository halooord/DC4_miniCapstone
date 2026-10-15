import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import FormInput from '../components/FormInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { fieldErrorsFrom, messageFrom } from '../services/api.js';

export default function RegisterPage() {
  const { register } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
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
    if (form.name.trim().length < 2) next.name = 'Enter your full name (at least 2 characters).';
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    if (form.password.length < 8) next.password = 'Password must be at least 8 characters.';
    if (form.password_confirmation !== form.password) next.password_confirmation = 'Passwords do not match.';
    if (Object.keys(next).length) { setErrors(next); return; }

    setSubmitting(true);
    setErrors({});
    setFormError('');
    try {
      await register({ ...form, name: form.name.trim(), email: form.email.trim() });
      notify('Staff account created successfully.');
      navigate('/dashboard', { replace: true });
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
        <div className="col-lg-5 auth-side p-4 p-md-5">
          <div className="auth-brand mb-5"><span className="brand-mark me-2">P</span> PoultryStock</div>
          <h1 className="display-6 fw-bold">Join your shop team.</h1>
          <p className="auth-description mt-3">New accounts are created as Staff. Only the owner can manage administrative access.</p>
        </div>
        <div className="col-lg-7 bg-white p-4 p-md-5">
          <p className="eyebrow">NEW ACCOUNT</p><h2 className="h3 fw-bold">Staff registration</h2>
          <p className="text-secondary mb-4">Create your account using your own details.</p>
          {formError && <div className="alert alert-danger" role="alert">{formError}</div>}
          <form onSubmit={submit} noValidate>
            <FormInput label="Full name" name="name" autoComplete="name" value={form.name} onChange={change} error={errors.name} required />
            <FormInput label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={change} error={errors.email} required />
            <FormInput label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={change} error={errors.password} required />
            <FormInput label="Confirm password" name="password_confirmation" type="password" autoComplete="new-password" value={form.password_confirmation} onChange={change} error={errors.password_confirmation} required />
            <Button type="submit" loading={submitting} className="w-100 py-2 mt-2">Create staff account</Button>
          </form>
          <p className="text-center text-secondary small mt-4 mb-0">Already registered? <Link to="/login">Sign in</Link></p>
        </div>
      </div></div>
    </main>
  );
}
