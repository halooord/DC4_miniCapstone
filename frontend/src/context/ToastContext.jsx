import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, kind = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current.slice(-2), { id, message, kind }]);
    return id;
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const timeouts = toasts.map(({ id }) => window.setTimeout(() => dismiss(id), 5000));
    return () => timeouts.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`alert alert-${toast.kind} shadow-sm d-flex gap-3 align-items-start`} role="status">
            <div className="flex-grow-1">{toast.message}</div>
            <button className="btn-close" type="button" aria-label="Dismiss message" onClick={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider.');
  return context;
}
