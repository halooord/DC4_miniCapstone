import { useEffect, useId } from 'react';

export default function Modal({ show, title, children, footer, onClose }) {
  const titleId = useId();
  useEffect(() => {
    if (!show) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 id={titleId} className="modal-title fs-5">{title}</h2>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
