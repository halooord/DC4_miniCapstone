import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { messageFrom } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';
import Button from '../components/Button.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Spinner from '../components/Spinner.jsx';

const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
const qty = new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 });
const labels = { pending: 'Pending', approved: 'Approved', received: 'Received', rejected: 'Rejected' };
const colors = { pending: 'text-bg-warning', approved: 'text-bg-primary', received: 'text-bg-success', rejected: 'text-bg-danger' };
const prompts = {
  approve: { title: 'Approve this order?', message: 'Approve this supplier order so it can be received later.', label: 'Approve order', variant: 'primary' },
  reject: { title: 'Reject this order?', message: 'This order will be rejected and cannot be received.', label: 'Reject order', variant: 'danger' },
  receive: { title: 'Mark order as received?', message: 'This adds the ordered quantities to inventory and creates stock-in movements. Only confirm when the delivery has arrived.', label: 'Mark as received', variant: 'success' },
  delete: { title: 'Delete purchase order?', message: 'Delete this pending order and its items? This action cannot be undone.', label: 'Delete order', variant: 'danger' },
};
function formattedDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
function Stage({ title, name, date, detail }) {
  return <div className="border-start border-3 ps-3 py-2 mb-3">
    <div className="fw-semibold">{title}</div>
    <div className="text-secondary small">{name || detail || 'Not yet'}</div>
    {date && <div className="small text-secondary">{formattedDate(date)}</div>}
  </div>;
}

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function getOrder() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get(`/purchase-orders/${id}`, { signal: controller.signal });
        if (!data?.data) throw new Error('Unexpected purchase order response.');
        if (!controller.signal.aborted) setOrder(data.data);
      } catch (err) {
        if (!controller.signal.aborted) { setError(messageFrom(err, 'Unable to load order.')); setOrder(null); }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    getOrder();
    return () => controller.abort();
  }, [id, reload]);

  async function applyAction() {
    if (!action || !order) return;
    setBusy(true);
    try {
      if (action === 'delete') {
        await api.delete(`/purchase-orders/${id}`);
        notify('Pending purchase order deleted.');
        navigate('/purchase-orders', { replace: true });
        return;
      }
      const { data } = await api.post(`/purchase-orders/${id}/${action}`);
      if (data?.data) setOrder(data.data);
      notify(action === 'approve' ? 'Purchase order approved.' : action === 'reject' ? 'Purchase order rejected.' : 'Order received. Inventory was updated.');
    } catch (err) {
      notify(messageFrom(err, 'Could not update order.'), err.response?.status === 409 ? 'warning' : 'danger');
      setReload((value) => value + 1);
    } finally {
      setAction(null);
      setBusy(false);
    }
  }

  const prompt = prompts[action];
  return (
    <>
      <div className="d-flex justify-content-between gap-3 align-items-start flex-wrap mb-4">
        <div>
          <p className="eyebrow mb-2">POULTRYSTOCK / ORDER DETAILS</p>
          <h1 className="page-title mb-1">Purchase Order #{id}</h1>
          <Link to="/purchase-orders" className="small">← Back to purchase orders</Link>
        </div>
        <Button variant="outline-secondary" disabled={loading} onClick={() => setReload((x) => x + 1)}>Refresh</Button>
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}
      {loading && <section className="surface-card p-4"><Spinner label="Loading order details..." /></section>}

      {!loading && order && <>
        <section className="surface-card p-4 mb-3">
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div><span className="small text-secondary d-block mb-1">CURRENT STATUS</span>
              <span className={`badge fs-6 ${colors[order.status] || 'text-bg-secondary'}`}>{labels[order.status] || order.status}</span></div>
            <div className="d-flex flex-wrap gap-2">
              {order.can?.edit && <Link className="btn btn-outline-primary" to={`/purchase-orders/${id}/edit`}>Edit</Link>}
              {order.can?.approve && <Button onClick={() => setAction('approve')}>Approve</Button>}
              {order.can?.reject && <Button variant="outline-danger" onClick={() => setAction('reject')}>Reject</Button>}
              {order.can?.receive && <Button variant="success" onClick={() => setAction('receive')}>Mark as received</Button>}
              {order.can?.delete && <Button variant="outline-danger" onClick={() => setAction('delete')}>Delete</Button>}
            </div>
          </div>
          <div className="row g-3">
            <div className="col-md-6"><span className="small text-secondary">Supplier</span><div className="fw-semibold">{order.supplier?.name || '—'}</div></div>
            <div className="col-md-6"><span className="small text-secondary">Requested by</span><div className="fw-semibold">{order.requester?.name || '—'}</div></div>
            <div className="col-12"><span className="small text-secondary">Notes</span><div className="text-break">{order.notes || 'No notes provided.'}</div></div>
          </div>
        </section>

        <div className="row g-3">
          <div className="col-lg-8"><section className="surface-card overflow-hidden h-100">
            <div className="border-bottom p-4"><h2 className="h5 fw-bold mb-0">Ordered items</h2></div>
            <div className="table-responsive"><table className="table align-middle mb-0">
              <thead className="table-light"><tr><th>Product</th><th>Quantity</th><th>Unit cost</th><th>Subtotal</th></tr></thead>
              <tbody>{(order.items || []).map((item) => <tr key={item.id || item.product_id}>
                <td><div className="fw-semibold">{item.product?.name || 'Unknown product'}</div><span className="small text-secondary">{item.product?.sku || '—'}</span></td>
                <td className="text-nowrap">{qty.format(Number(item.quantity) || 0)} {item.product?.unit || ''}</td>
                <td className="text-nowrap">{money.format(Number(item.unit_cost) || 0)}</td>
                <td className="text-nowrap fw-semibold">{money.format(Number(item.subtotal) || 0)}</td>
              </tr>)}</tbody>
              <tfoot><tr><th colSpan={3} className="text-end">Total order cost</th><th>{money.format(Number(order.total) || 0)}</th></tr></tfoot>
            </table></div>
          </section></div>
          <div className="col-lg-4"><section className="surface-card p-4 h-100">
            <h2 className="h5 fw-bold mb-3">Order timeline</h2>
            <Stage title="Requested" name={order.requester?.name} date={order.created_at} />
            {order.status === 'rejected' ?
              <Stage title="Rejected" name={order.approver?.name} date={order.approved_at} /> :
              <Stage title="Approved" name={order.approver?.name} date={order.approved_at} detail="Awaiting owner approval" />}
            {order.status !== 'rejected' && <Stage title="Received" name={order.receiver?.name} date={order.received_at} detail="Awaiting delivery" />}
          </section></div>
        </div>
      </>}
      <ConfirmModal show={Boolean(action)} title={prompt?.title || ''} message={prompt?.message || ''}
        confirmText={prompt?.label || 'Confirm'} confirmVariant={prompt?.variant || 'primary'}
        busy={busy} onClose={() => setAction(null)} onConfirm={applyAction} />
    </>
  );
}
