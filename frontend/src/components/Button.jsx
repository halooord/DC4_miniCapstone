export default function Button({ children, variant = 'primary', type = 'button', loading = false, disabled = false, className = '', ...props }) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`.trim()} disabled={loading || disabled} {...props}>
      {loading && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
      {children}
    </button>
  );
}
