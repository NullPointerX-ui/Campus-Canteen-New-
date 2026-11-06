'use client';
import { useEffect, useState } from 'react';
import { api, rupees } from '@/lib/client';

const NEXT = { placed: 'preparing', preparing: 'ready', ready: 'completed' };

function OrderQueue({ setMsg }) {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const load = () => api('/api/orders' + (status ? `?status=${status}` : '')).then((d) => setOrders(d.orders));
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const move = async (id, s) => {
    try { await api(`/api/orders/${id}`, { method: 'PATCH', body: { status: s } }); load(); }
    catch (e) { setMsg({ err: e.message }); }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['placed', 'preparing', 'ready', 'completed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="ghost" onClick={load}>Refresh</button>
      </div>
      <table>
        <thead><tr><th>#</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.order_id}>
              <td>{o.order_id}</td>
              <td>{o.customer}<div className="muted">{new Date(o.created_at).toLocaleString()}</div></td>
              <td>{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
              <td>{rupees(o.total_amount)}</td>
              <td>{o.method} · {o.payment_status}</td>
              <td><span className={'badge status-' + o.status}>{o.status}</span></td>
              <td className="row">
                {NEXT[o.status] && <button className="small" onClick={() => move(o.order_id, NEXT[o.status])}>→ {NEXT[o.status]}</button>}
                {['placed', 'preparing'].includes(o.status) && <button className="danger small" onClick={() => move(o.order_id, 'cancelled')}>Cancel</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MenuManager({ setMsg }) {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const blank = { name: '', description: '', price: '', stock_qty: 50, category_id: '', is_veg: true };
  const [form, setForm] = useState(blank);
  const load = () => api('/api/items').then((d) => { setItems(d.items); setCats(d.categories); });
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api('/api/items', { method: 'POST', body: { ...form, price: Number(form.price), stock_qty: Number(form.stock_qty), category_id: Number(form.category_id) } });
      setForm(blank); setMsg({ ok: 'Dish added (and its AI embedding was created).' }); load();
    } catch (err) { setMsg({ err: err.message }); }
  };
  const patch = async (id, body, ok) => {
    try { const r = await api(`/api/items/${id}`, { method: 'PATCH', body }); setMsg({ ok: ok || 'Updated' }); load(); return r; }
    catch (err) { setMsg({ err: err.message }); }
  };
  const del = async (id) => {
    if (!confirm('Delete this dish?')) return;
    try { const r = await api(`/api/items/${id}`, { method: 'DELETE' }); setMsg({ ok: r.message }); load(); }
    catch (err) { setMsg({ err: err.message }); }
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <>
      <form className="card row" onSubmit={add} style={{ marginBottom: 16 }}>
        <input placeholder="Dish name" value={form.name} onChange={set('name')} />
        <input placeholder="Description" style={{ flex: 1, minWidth: 220 }} value={form.description} onChange={set('description')} />
        <input placeholder="Price" type="number" style={{ width: 90 }} value={form.price} onChange={set('price')} />
        <input placeholder="Stock" type="number" style={{ width: 80 }} value={form.stock_qty} onChange={set('stock_qty')} />
        <select value={form.category_id} onChange={set('category_id')}>
          <option value="">Category</option>
          {cats.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
        </select>
        <label className="row" style={{ gap: 4 }}><input type="checkbox" checked={form.is_veg} onChange={set('is_veg')} /> Veg</label>
        <button>Add dish</button>
      </form>
      <table>
        <thead><tr><th>Dish</th><th>Category</th><th>Price</th><th>Stock</th><th>Available</th><th>Actions</th></tr></thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.item_id}>
              <td>{i.name}</td>
              <td>{i.category}</td>
              <td>
                <input type="number" defaultValue={Number(i.price)} style={{ width: 80 }}
                  onBlur={(e) => Number(e.target.value) !== Number(i.price) && patch(i.item_id, { price: Number(e.target.value) }, 'Price updated')} />
              </td>
              <td>{i.stock_qty}</td>
              <td>
                <input type="checkbox" checked={i.is_available} onChange={(e) => patch(i.item_id, { is_available: e.target.checked })} />
              </td>
              <td className="row">
                <button className="ghost small" onClick={() => patch(i.item_id, { restock: 20 }, 'Restocked +20 (stored procedure sp_restock)')}>+20 stock</button>
                <button className="danger small" onClick={() => del(i.item_id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function FeedbackSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [recent, setRecent] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/feedback').then((d) => setRecent(d.feedback)); }, []);
  const search = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { setResults((await api('/api/feedback/search?q=' + encodeURIComponent(q))).results); } finally { setBusy(false); }
  };
  const list = results || recent;
  return (
    <>
      <form className="card ai row" onSubmit={search} style={{ marginBottom: 16 }}>
        <input style={{ flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder='Find feedback by meaning, e.g. "food was not hot"' />
        <button disabled={busy}>{busy ? 'Searching…' : 'Semantic search'}</button>
        {results && <button type="button" className="ghost" onClick={() => setResults(null)}>Show recent</button>}
      </form>
      <h3>{results ? 'Most similar feedback' : 'Recent feedback'}</h3>
      <div className="stack">
        {list.map((f) => (
          <div key={f._id} className="card">
            <div className="spread">
              <b>{f.itemName} · {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</b>
              <span className="muted">{f.similarity !== undefined && `match ${Math.round(f.similarity * 100)}% · `}{f.userName} · {f.sentiment}</span>
            </div>
            <div>{f.comment || <i className="muted">no comment</i>}</div>
            <div className="row" style={{ marginTop: 6 }}>{(f.tags || []).map((t) => <span key={t} className="badge">{t}</span>)}</div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Staff() {
  const [tab, setTab] = useState('orders');
  const [msg, setMsg] = useState(null);
  return (
    <div>
      <h1>Staff panel</h1>
      <div className="tabs">
        {[['orders', 'Order queue'], ['menu', 'Manage menu'], ['feedback', 'Feedback']].map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>
        ))}
      </div>
      {msg && <div className={'msg ' + (msg.err ? 'err' : '')}>{msg.err || msg.ok}</div>}
      {tab === 'orders' && <OrderQueue setMsg={setMsg} />}
      {tab === 'menu' && <MenuManager setMsg={setMsg} />}
      {tab === 'feedback' && <FeedbackSearch />}
    </div>
  );
}
