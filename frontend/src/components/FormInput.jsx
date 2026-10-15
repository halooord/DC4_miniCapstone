import { useId } from 'react';

export default function FormInput({ label, error, id, className = '', ...props }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  return (
    <div className={`mb-3 ${className}`.trim()}>
      <label className="form-label fw-semibold" htmlFor={inputId}>{label}</label>
      <input id={inputId} className={`form-control ${error ? 'is-invalid' : ''}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputId}-error` : undefined} {...props} />
      {error && <div className="invalid-feedback" id={`${inputId}-error`}>{error}</div>}
    </div>
  );
}
