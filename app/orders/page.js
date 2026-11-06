'use client';
import { useEffect, useState } from 'react';
import { api, rupees } from '@/lib/client';

const TAGS = ['tasty', 'fresh', 'value-for-money', 'spicy', 'cold', 'oily', 'small-portion', 'late'];

function ReviewForm({ orderId, item, onDone }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [tags, setTags] = useState([]);
  const [err, setErr] = useState('');
  const toggle = (t) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));
  const submit = async () => {
    try {
      await api('/api/feedback', { method: 'POST', body: { order_id: orderId, item_id: item.item_id, rating, comment, tags } });
      onDone();
    } catch (e) { setErr(e.message); }
  };
  return (
    <div className="card stack" style={{ background: '#fffaf5' }}>
      <b>Rate {item.name}</b>
      {err && <div className="msg err">{err}</div>}
      <div className="row">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" className={n <= rating ? 'small' : 'ghost small'} onClick={() => setRating(n)}>★</button>
        ))}
      </div>
      <div className="row">
        {TAGS.map((t) => (
          <button key={t} type="button" className={tags.includes(t) ? 'small' : 'ghost small'} onClick={() => toggle(t)}>{t}</button>
        ))}
      </div>
      <textarea placeholder="Tell us more (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
      <button onClick={submit}>Submit review</button>
    </div>
  );
}

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [reviewed, setReviewed] = useState(new Set());
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    const [o, f] = await Promise.all([api('/api/orders'), api('/api/feedback')]);
    setOrders(o.orders);
    setReviewed(new Set(f.feedback.map((x) => `${x.orderId}-${x.itemId}`)));
  };
  useEffect(() => { load().catch((e) => setMsg({ err: e.message })); }, []);

  const cancel = async (id) => {
    try { await api(`/api/orders/${id}`, { method: 'PATCH', body: { status: 'cancelled' } }); setMsg({ ok: `Order #${id} cancelled, stock returned.` }); load(); }
    catch (e) { setMsg({ err: e.message }); }
  };

  return (
    <div>
      <h1>My orders</h1>
      <p className="muted">Orders refresh when you reload. You can rate dishes once an order is completed.</p>
      {msg && <div className={'msg ' + (msg.err ? 'err' : '')}>{msg.err || msg.ok}</div>}
      {orders.length === 0 && <p className="muted">No orders yet.</p>}
      <div className="stack">
        {orders.map((o) => (
          <div key={o.order_id} className="card stack">
            <div className="spread">
              <b>Order #{o.order_id}</b>
              <span className={'badge status-' + o.status}>{o.status}</span>
            </div>
            <div className="muted">{new Date(o.created_at).toLocaleString()} · {o.method?.toUpperCase()} ({o.payment_status}) · <b>{rupees(o.total_amount)}</b></div>
            {o.items.map((it) => {
              const key = `${o.order_id}-${it.item_id}`;
              return (
                <div key={key}>
                  <div className="spread">
                    <span>{it.qty} × {it.name}</span>
                    {o.status === 'completed' && (reviewed.has(key)
                      ? <span className="badge">Reviewed ✓</span>
                      : <button className="ghost small" onClick={() => setOpen(open === key ? null : key)}>Rate</button>)}
                  </div>
                  {open === key && <ReviewForm orderId={o.order_id} item={it} onDone={() => { setOpen(null); load(); }} />}
                </div>
              );
            })}
            {o.status === 'placed' && <div><button className="danger small" onClick={() => cancel(o.order_id)}>Cancel order</button></div>}
          </div>
        ))}
      </div>
    </div>
  );
}
