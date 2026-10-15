import Button from './Button.jsx';
import Modal from './Modal.jsx';

export default function ConfirmModal({ show, title = 'Confirm action', message, confirmText = 'Confirm', confirmVariant = 'danger', busy = false, onConfirm, onClose }) {
  return (
    <Modal
      show={show}
      title={title}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <Button variant="outline-secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} loading={busy}>{confirmText}</Button>
        </>
      }
    >
      <p className="mb-0">{message}</p>
    </Modal>
  );
}
